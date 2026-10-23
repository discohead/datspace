import { ToolError } from "./errors.ts";
import { Domain as DomainSchema } from "./schemas.ts";
import type {
  BundledStation,
  ContentBundle,
  Graph,
  LedgerEvent,
  LedgerEventType,
  MessageInput,
  Profile,
  SearchHit,
  Station,
  Transmitted,
  Work,
} from "./schemas.ts";

/**
 * Everything the tools can read. At launch `createStaticSource` answers from
 * the content bundle; after launch an actor-backed Source replaces it, and no
 * surface changes.
 */
export interface Source {
  stations(): Promise<Station[]>;
  work(slug: string): Promise<Work | null>;
  search(query: string, limit: number): Promise<SearchHit[]>;
  graph(): Promise<Graph>;
  profile(): Promise<Profile>;
  ledger(limit: number, type?: LedgerEventType): Promise<LedgerEvent[]>;
  transmit(message: MessageInput): Promise<Transmitted>;
}

/**
 * Delivers a message. The Worker supplies one per request, bound to that
 * request's surface and sender, so tools never see either.
 */
export type Transmitter = (message: MessageInput) => Promise<Transmitted>;

export interface RecentOptions {
  limit?: number;
  beforeSeq?: number;
  type?: LedgerEventType;
}

export interface LedgerReader {
  recent(options: RecentOptions): Promise<LedgerEvent[]>;
}

const SNIPPET_RADIUS = 60;

export function createStaticSource(
  content: ContentBundle,
  ledger: LedgerReader,
  transmitter?: Transmitter,
): Source {
  const bySlug = new Map(content.stations.map((s) => [s.slug, s]));

  return {
    async stations() {
      return content.stations.map(toStation);
    },

    async work(slug) {
      const doc = bySlug.get(slug);
      return doc ? toWork(doc) : null;
    },

    async search(query, limit) {
      const terms = tokenize(query);
      if (terms.length === 0) return [];
      return content.stations
        .map((doc) => ({ doc, score: score(doc, terms) }))
        .filter((hit) => hit.score > 0)
        .sort((a, b) => b.score - a.score || a.doc.frequency - b.doc.frequency)
        .slice(0, limit)
        .map(({ doc }) => ({ slug: doc.slug, title: doc.title, snippet: snippet(doc, terms) }));
    },

    async graph() {
      return buildGraph(content.stations);
    },

    async profile() {
      return content.profile;
    },

    ledger(limit, type) {
      return ledger.recent({ limit, type });
    },

    async transmit(message) {
      if (!transmitter) {
        throw new ToolError("internal", "This source can't deliver messages.", "Email jared@datspace.io instead.");
      }
      return transmitter(message);
    },
  };
}

function toStation(doc: BundledStation): Station {
  const { slug, title, frequency, domain, status, summary } = doc;
  return { slug, title, frequency, domain, status, summary };
}

function toWork(doc: BundledStation): Work {
  const { question, prototype, finding, future } = doc;
  return {
    ...toStation(doc),
    story: { question, prototype, finding, future },
    links: doc.links,
    facets: doc.facets,
    markdown: doc.body,
    hash: doc.hash,
  };
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function occurrences(haystack: string, term: string): number {
  let count = 0;
  for (let i = haystack.indexOf(term); i !== -1; i = haystack.indexOf(term, i + term.length)) {
    count++;
  }
  return count;
}

/** Every term must appear somewhere; matches in the title count most. */
function score(doc: BundledStation, terms: string[]): number {
  const title = doc.title.toLowerCase();
  const summary = doc.summary.toLowerCase();
  const rest = [doc.question, doc.prototype, doc.finding, doc.future, doc.body]
    .join("\n")
    .toLowerCase();
  let total = 0;
  for (const term of terms) {
    const weighted =
      3 * occurrences(title, term) + 2 * occurrences(summary, term) + occurrences(rest, term);
    if (weighted === 0) return 0;
    total += weighted;
  }
  return total;
}

function snippet(doc: BundledStation, terms: string[]): string {
  const fields = [doc.body, doc.summary, doc.question, doc.prototype, doc.finding, doc.future];
  for (const field of fields) {
    const text = field.replace(/\s+/g, " ").trim();
    const lower = text.toLowerCase();
    const at = Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i !== -1));
    if (!Number.isFinite(at)) continue;
    const start = Math.max(0, at - SNIPPET_RADIUS);
    const end = Math.min(text.length, at + SNIPPET_RADIUS);
    return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
  }
  return doc.summary;
}

function buildGraph(stations: BundledStation[]): Graph {
  const nodes: Graph["nodes"] = DomainSchema.options.map((domain) => ({
    id: domain,
    kind: "domain",
    label: domain,
  }));
  const edges: Graph["edges"] = [];
  for (const doc of stations) {
    nodes.push({ id: doc.slug, kind: "work", label: doc.title });
    edges.push({ from: doc.slug, to: doc.domain, kind: "lives-on" });
    for (const band of doc.facets) {
      const domain = `datspace.${band}`;
      if (domain !== doc.domain) edges.push({ from: doc.slug, to: domain, kind: "facet" });
    }
  }
  return { nodes, edges };
}
