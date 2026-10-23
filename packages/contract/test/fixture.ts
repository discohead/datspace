import type { BundledStation, ContentBundle, LedgerEvent, MessageInput } from "../src/index.ts";
import { createStaticSource } from "../src/index.ts";

function station(partial: Partial<BundledStation> & Pick<BundledStation, "slug" | "title" | "frequency">): BundledStation {
  return {
    domain: "datspace.io",
    status: "live",
    summary: `${partial.title}, in one line.`,
    question: "What is the question?",
    prototype: "A prototype.",
    finding: "A finding.",
    future: "A future.",
    links: [],
    facets: [],
    body: "",
    hash: "a".repeat(64),
    glyphSeed: "b".repeat(64),
    ...partial,
  };
}

export const content: ContentBundle = {
  stations: [
    station({
      slug: "datspace",
      title: "datspace",
      frequency: 88.7,
      facets: ["io", "ai"],
      body: "The tuner draws 1-bit static. Distance from a station is the noise level.",
    }),
    station({
      slug: "agent-native-interface",
      title: "The agent-native interface",
      frequency: 92.3,
      domain: "datspace.ai",
      summary: "MCP, the CLI, and the answerability tests.",
      body: "Agents connect over MCP, or run npx datspace ls in a terminal.",
    }),
  ],
  pages: [],
  profile: {
    basics: { name: "Jared McFarland", label: "Prototype researcher", summary: "Builds things.", profiles: [] },
    work: [],
    projects: [],
    skills: [],
    contact: { email: "jared@datspace.io" },
  },
  clock: { genesis: "1973-01-01T00:00:00Z", bpm: 120, beatsPerBar: 4 },
};

export const events: LedgerEvent[] = [
  { seq: 1, at: "2026-10-23T00:00:00.000Z", type: "deploy", data: { commit: "abc1234" }, prevHash: "0".repeat(64), hash: "c".repeat(64) },
];

export const sent: MessageInput[] = [];

const ledger = {
  async recent({ limit = 50, type }: { limit?: number; type?: string }) {
    return events.filter((e) => !type || e.type === type).slice(-limit).reverse();
  },
};

export const source = createStaticSource(content, ledger, async (message) => {
  sent.push(message);
  return { id: `m${sent.length}`, at: "2026-10-23T00:00:00.000Z" };
});

/** A source with no way to deliver messages. */
export const readOnlySource = createStaticSource(content, ledger);
