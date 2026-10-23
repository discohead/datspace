import type { Work } from "./schemas.ts";

/** One work as a self-contained markdown document: what `/api/work/<slug>.md` serves. */
export function workToMarkdown(work: Work): string {
  const lines = [
    `# ${work.title}`,
    "",
    `${work.frequency.toFixed(1)} MHz on ${work.domain}. ${work.summary}`,
    "",
    `- Question: ${work.story.question}`,
    `- Prototype: ${work.story.prototype}`,
    `- Finding: ${work.story.finding}`,
    `- Future: ${work.story.future}`,
    "",
    work.markdown,
  ];
  if (work.links.length > 0) {
    lines.push("", "## Links", "", ...work.links.map((l) => `- [${l.label}](${l.url})`));
  }
  return `${lines.join("\n").trim()}\n`;
}
