import { tools } from "@datspace/contract";
import { parse } from "yaml";
import { renderMarkdown } from "#lib/server/markdown.ts";
import { parseCases, type Case } from "./answerability.ts";
import { EXAMPLES, cliCommand, jsonCall, mcpCall } from "./calls.ts";
import { blob } from "./links.ts";
import { nestHeadings, parseRoadmap } from "./roadmap.ts";

// Files from outside the app, inlined by Vite at build. Paths are relative to this file.
import roadmapSource from "../../../../../.planning/ROADMAP.md?raw";
import answerabilitySource from "../../../../../tests/answerability.yaml?raw";

const ROOT = "../../../../../";
const PHASE_FILES = import.meta.glob<string>("../../../../../.planning/phases/*/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export interface ToolView {
  name: string;
  title: string;
  description: string;
  readOnly: boolean;
  /** JSON Schema, without its $schema line. */
  inputSchema: string;
  json: string;
  mcp: string;
  cli: string | null;
}

/** Every tool in the contract, and how each surface calls it with its example input. */
export function contract(): ToolView[] {
  return tools.map((tool) => {
    const example = EXAMPLES[tool.name];
    const checked = tool.input.safeParse(example);
    if (!checked.success) throw new Error(`EXAMPLES.${tool.name} doesn't match its input schema: ${checked.error.message}`);
    // The input side of the schema, which is what MCP's tools/list advertises: defaulted fields aren't required.
    const schema: Record<string, unknown> = { ...tool.input["~standard"].jsonSchema.input({ target: "draft-2020-12" }) };
    delete schema.$schema;
    return {
      name: tool.name,
      title: tool.title,
      description: tool.description,
      readOnly: tool.readOnly,
      inputSchema: JSON.stringify(schema, null, 2),
      json: jsonCall(tool.name, example),
      mcp: mcpCall(tool.name, example),
      cli: cliCommand(tool.name, example),
    };
  });
}

export function answerabilityCases(): Case[] {
  return parseCases(
    parse(answerabilitySource),
    tools.map((tool) => tool.name),
  );
}

export interface PhaseView {
  number: string;
  title: string;
  status: string;
  completed: string | null;
  /** HTML. */
  goal: string;
  /** HTML. */
  doneWhen: string;
  files: { name: string; url: string }[];
  /** SUMMARY.md as HTML, its headings nested under the phase's h3, or null if there isn't one yet. */
  summary: string | null;
}

/** Each phase in .planning/phases, with its goal, done-when, and status from ROADMAP.md. */
export function history(): { phases: PhaseView[]; cutLine: string } {
  const roadmap = parseRoadmap(roadmapSource);
  const byPhase = new Map<string, { path: string; source: string }[]>();
  for (const [key, source] of Object.entries(PHASE_FILES)) {
    const path = key.slice(ROOT.length);
    const number = /^\.planning\/phases\/(\d+)-/.exec(path)?.[1];
    if (!number) throw new Error(`${path} isn't in a numbered phase directory.`);
    if (!roadmap.phases.some((phase) => phase.number === number)) throw new Error(`${path} has no phase ${number} in ROADMAP.md.`);
    byPhase.set(number, [...(byPhase.get(number) ?? []), { path, source }]);
  }

  const phases = roadmap.phases.map((phase): PhaseView => {
    const files = byPhase.get(phase.number) ?? [];
    const summary = files.find((file) => file.path.endsWith("/SUMMARY.md"));
    return {
      number: phase.number,
      title: phase.title,
      status: phase.status,
      completed: phase.completed,
      goal: renderMarkdown(phase.goal),
      doneWhen: renderMarkdown(phase.doneWhen),
      files: files.map((file) => ({ name: file.path.slice(file.path.lastIndexOf("/") + 1), url: blob(file.path) })),
      summary: summary ? nestHeadings(renderMarkdown(summary.source), 3) : null,
    };
  });
  return { phases, cutLine: renderMarkdown(roadmap.cutLine) };
}
