/** One phase as .planning/ROADMAP.md states it. Goal and done-when are markdown. */
export interface PhasePlan {
  number: string;
  title: string;
  goal: string;
  doneWhen: string;
  status: string;
  completed: string | null;
}

export interface Roadmap {
  phases: PhasePlan[];
  /** The "Cut line" section, as markdown. */
  cutLine: string;
}

const PROGRESS_ROW = /^\|\s*(\d+)\.[^|]*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$/gm;

/**
 * Reads the phases (title, goal, done-when) from "Phase Details", their status
 * from the "Progress" table, and the "Cut line" section. Throws if any of them
 * is missing, so the roadmap and this page can't quietly drift apart.
 */
export function parseRoadmap(markdown: string): Roadmap {
  const top = sections(markdown, "## ");
  const details = top.get("Phase Details");
  const progress = top.get("Progress");
  const cutLine = top.get("Cut line")?.trim();
  if (details === undefined || progress === undefined || !cutLine) {
    throw new Error('ROADMAP.md needs "Phase Details", "Progress", and "Cut line" sections.');
  }

  const rows = new Map<string, { status: string; completed: string | null }>();
  for (const [, number = "", status = "", completed = ""] of progress.matchAll(PROGRESS_ROW)) {
    rows.set(number, { status, completed: completed === "-" || completed === "" ? null : completed });
  }

  const phases = [...sections(details, "### ")].map(([heading, body]): PhasePlan => {
    const [, number = "", title = ""] = /^Phase (\d+): (.+)$/.exec(heading) ?? [];
    if (!number) throw new Error(`ROADMAP.md: "${heading}" isn't "Phase NN: Title".`);
    const goal = field(body, "Goal");
    const doneWhen = field(body, "Done when");
    const row = rows.get(number);
    if (!goal || !doneWhen || !row) {
      throw new Error(`ROADMAP.md: phase ${number} needs a **Goal**, a **Done when**, and a row in Progress.`);
    }
    return { number, title, goal, doneWhen, ...row };
  });
  return { phases, cutLine };
}

/** Splits markdown at headings that start with `marker`, such as "## ", keyed by heading text. */
function sections(markdown: string, marker: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of markdown.split(new RegExp(`^${marker}`, "m")).slice(1)) {
    const end = part.indexOf("\n");
    out.set((end === -1 ? part : part.slice(0, end)).trim(), end === -1 ? "" : part.slice(end + 1));
  }
  return out;
}

/** The text of a `**Name**: text` line. */
function field(body: string, name: string): string | undefined {
  return new RegExp(`^\\*\\*${name}\\*\\*: (.+)$`, "m").exec(body)?.[1]?.trim();
}

/**
 * Fits a rendered markdown document under a heading of level `parent`: drops
 * its leading h1, which repeats that heading, and moves h2 to parent + 1, h3
 * to parent + 2, and so on, stopping at h6.
 */
export function nestHeadings(html: string, parent: number): string {
  return html
    .replace(/^\s*<h1[^>]*>.*?<\/h1>\s*/s, "")
    .replace(/<(\/?)h([1-6])(\s[^>]*)?>/g, (_, slash: string, level: string, attributes = "") => {
      return `<${slash}h${Math.min(6, Number(level) + parent - 1)}${attributes}>`;
    });
}
