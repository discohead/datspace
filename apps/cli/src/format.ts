import type { SearchHit, Station, Work } from "@datspace/contract";

export interface Style {
  bold(text: string): string;
  width: number;
}

export const plain: Style = { bold: (t) => t, width: 80 };

/** Word-wraps `text` to `width`, indenting every line after the first. */
export function wrap(text: string, width: number, indent = 0): string {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width - indent) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.join(`\n${" ".repeat(indent)}`);
}

export function formatStations(stations: Station[], style: Style): string {
  const titleWidth = Math.max(...stations.map((s) => s.title.length));
  const domainWidth = Math.max(...stations.map((s) => s.domain.length));
  return stations
    .map((s) => {
      const freq = s.frequency.toFixed(1).padStart(5);
      const title = style.bold(s.title) + " ".repeat(titleWidth - s.title.length);
      const status = s.status === "unlit" ? "  (not yet)" : "";
      return `${freq}  ${title}  ${s.domain.padEnd(domainWidth)}  ${s.summary}${status}`;
    })
    .join("\n");
}

export function formatWork(work: Work, style: Style): string {
  const beats: [string, string][] = [
    ["Question", work.story.question],
    ["Prototype", work.story.prototype],
    ["Finding", work.story.finding],
    ["Future", work.story.future],
  ];
  const out = [
    style.bold(work.title),
    `${work.frequency.toFixed(1)} MHz, ${work.domain}`,
    "",
    wrap(work.summary, style.width),
    "",
    ...beats.map(([term, text]) => `${term.padEnd(11)}${wrap(text, style.width, 11)}`),
    "",
    work.markdown,
  ];
  if (work.links.length > 0) {
    const labelWidth = Math.max(...work.links.map((l) => l.label.length));
    out.push("", style.bold("Links"), ...work.links.map((l) => `  ${l.label.padEnd(labelWidth)}  ${l.url}`));
  }
  return out.join("\n");
}

export function formatHits(hits: SearchHit[], query: string, style: Style): string {
  if (hits.length === 0) return `No matches for "${query}".`;
  return hits.map((h) => `${style.bold(h.title)}  (${h.slug})\n  ${wrap(h.snippet, style.width, 2)}`).join("\n\n");
}

export const HEWITT = `Carl Hewitt, Peter Bishop, and Richard Steiger.
"A Universal Modular ACTOR Formalism for Artificial Intelligence." IJCAI, 1973.

When an actor receives a message, it can:
  1. send messages to actors it knows,
  2. create new actors,
  3. decide how it will handle the next message.`;
