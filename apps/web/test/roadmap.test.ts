import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { nestHeadings, parseRoadmap } from "../src/lib/dev/roadmap.ts";

const ROADMAP = `# Roadmap

## Phase Details

### Phase 01: Foundation
**Goal**: A push to \`main\` deploys both Workers.
**Depends on**: Prerequisites
**Done when**: CI is green.

### Phase 02: The tuner
**Goal**: The first ten seconds.
**Depends on**: Phase 01
**Done when**: The dial works by keyboard.

**Film shot list**:
1. Static.

## Cut line

If the schedule slips, cut sound.

Never cut: the tuner.

## Progress

| Phase | Status | Completed |
| --- | --- | --- |
| 01. Foundation | Complete | 2026-10-22 |
| 02. The tuner | In progress | - |
`;

describe("parseRoadmap", () => {
  it("reads each phase's goal, done-when, and status, and the cut line", () => {
    expect(parseRoadmap(ROADMAP)).toEqual({
      phases: [
        {
          number: "01",
          title: "Foundation",
          goal: "A push to `main` deploys both Workers.",
          doneWhen: "CI is green.",
          status: "Complete",
          completed: "2026-10-22",
        },
        {
          number: "02",
          title: "The tuner",
          goal: "The first ten seconds.",
          doneWhen: "The dial works by keyboard.",
          status: "In progress",
          completed: null,
        },
      ],
      cutLine: "If the schedule slips, cut sound.\n\nNever cut: the tuner.",
    });
  });

  it("refuses a roadmap it can't read completely", () => {
    expect(() => parseRoadmap(ROADMAP.replace("## Cut line", "## Cuts"))).toThrow('"Cut line"');
    expect(() => parseRoadmap(ROADMAP.replace("**Done when**: CI is green.", ""))).toThrow("phase 01 needs");
    expect(() => parseRoadmap(ROADMAP.replace("| 02. The tuner | In progress | - |", ""))).toThrow("phase 02 needs");
    expect(() => parseRoadmap(ROADMAP.replace("### Phase 02: The tuner", "### The tuner"))).toThrow("isn't \"Phase NN: Title\"");
  });

  it("reads .planning/ROADMAP.md", async () => {
    const source = await readFile(new URL("../../../.planning/ROADMAP.md", import.meta.url), "utf8");
    const { phases, cutLine } = parseRoadmap(source);
    expect(phases[0]).toMatchObject({ number: "01", title: "Foundation", status: "Complete" });
    expect(phases.map((p) => Number(p.number))).toEqual(phases.map((_, i) => i + 1));
    expect(cutLine).toContain("Never cut");
  });
});

describe("nestHeadings", () => {
  it("drops the leading h1 and moves the rest under the parent heading", () => {
    const html = "<h1>Phase 01: Foundation Summary</h1>\n<p>Done.</p>\n<h2>Accomplishments</h2>\n<h3>Detail</h3>\n";
    expect(nestHeadings(html, 3)).toBe("<p>Done.</p>\n<h4>Accomplishments</h4>\n<h5>Detail</h5>\n");
  });

  it("stops at h6, keeps attributes, and leaves escaped markup in code alone", () => {
    expect(nestHeadings('<h2 id="a">A</h2><h5>B</h5>', 3)).toBe('<h4 id="a">A</h4><h6>B</h6>');
    expect(nestHeadings("<pre><code>&lt;h2&gt;</code></pre>", 3)).toBe("<pre><code>&lt;h2&gt;</code></pre>");
  });
});
