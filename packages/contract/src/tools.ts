import { z } from "zod";
import { ToolError, invalidInput, type ErrorBody } from "./errors.ts";
import * as s from "./schemas.ts";
import type { Source } from "./source.ts";

/**
 * Tools are data. MCP, JSON, and the CLI all wrap these definitions, so the
 * surfaces can't drift apart. Each description is one factual sentence about
 * what the tool returns.
 */
export interface Tool<I extends z.ZodType = z.ZodType, O extends z.ZodType = z.ZodType> {
  name: string;
  title: string;
  description: string;
  input: I;
  output: O;
  run(source: Source, input: z.output<I>): Promise<z.output<O>>;
}

/** Keeps each tool's name as a literal type, so `ToolName` is the exact union. */
function defineTool<const N extends string, I extends z.ZodType, O extends z.ZodType>(
  tool: Tool<I, O> & { name: N },
): Tool<I, O> & { name: N } {
  return tool;
}

export const listStations = defineTool({
  name: "list_stations",
  title: "List stations",
  description:
    "Returns every station on the datspace dial with its frequency, domain, status, and one-line summary.",
  input: z.strictObject({}),
  output: z.strictObject({ stations: z.array(s.Station) }),
  async run(source) {
    return { stations: await source.stations() };
  },
});

export const getWork = defineTool({
  name: "get_work",
  title: "Get work",
  description:
    "Returns one work's story fields (question, prototype, finding, future), links, and full markdown, by slug.",
  input: z.strictObject({ slug: s.Slug }),
  output: s.Work,
  async run(source, { slug }) {
    const work = await source.work(slug);
    if (!work) {
      throw new ToolError(
        "not_found",
        `No work has the slug "${slug}".`,
        "Call list_stations for the valid slugs.",
      );
    }
    return work;
  },
});

export const search = defineTool({
  name: "search",
  title: "Search",
  description:
    "Returns full-text matches across every work's title, summary, story, and body, each with a snippet.",
  input: z.strictObject({
    query: z.string().trim().min(1).max(200),
    limit: z.int().min(1).max(20).default(10),
  }),
  output: z.strictObject({ hits: z.array(s.SearchHit) }),
  async run(source, { query, limit }) {
    return { hits: await source.search(query, limit) };
  },
});

export const getGraph = defineTool({
  name: "get_graph",
  title: "Get graph",
  description: "Returns the network's works and domains as nodes, and the edges between them.",
  input: z.strictObject({}),
  output: s.Graph,
  run(source) {
    return source.graph();
  },
});

export const getProfile = defineTool({
  name: "get_profile",
  title: "Get profile",
  description: "Returns Jared McFarland's structured CV and contact details.",
  input: z.strictObject({}),
  output: s.Profile,
  run(source) {
    return source.profile();
  },
});

export const getLedger = defineTool({
  name: "get_ledger",
  title: "Get ledger",
  description:
    "Returns the most recent network events, such as deploys and tool calls, optionally of one type, with times and no arguments.",
  input: z.strictObject({
    limit: z.int().min(1).max(100).default(20),
    type: s.LedgerEventType.optional(),
  }),
  output: z.strictObject({ events: z.array(s.LedgerEvent) }),
  async run(source, { limit, type }) {
    return { events: await source.ledger(limit, type) };
  },
});

export const tools = [listStations, getWork, search, getGraph, getProfile, getLedger] as const;

export type ToolName = (typeof tools)[number]["name"];

export const toolsByName: ReadonlyMap<string, Tool> = new Map(tools.map((t) => [t.name, t as Tool]));

export type ToolResult<T = unknown> = { ok: true; data: T } | ({ ok: false } & ErrorBody);

/** Validates raw input, runs the tool, and returns data or an error body. Never throws. */
export async function callTool(name: string, source: Source, rawInput: unknown): Promise<ToolResult> {
  const tool = toolsByName.get(name);
  if (!tool) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: `No tool is named "${name}".`,
        fix: `Use one of: ${tools.map((t) => t.name).join(", ")}.`,
      },
    };
  }
  const parsed = tool.input.safeParse(rawInput ?? {});
  if (!parsed.success) return { ok: false, ...invalidInput(name, parsed.error.issues).toBody() };
  try {
    return { ok: true, data: await tool.run(source, parsed.data) };
  } catch (err) {
    if (err instanceof ToolError) return { ok: false, ...err.toBody() };
    return {
      ok: false,
      error: { code: "internal", message: `${name} failed.`, fix: "Retry the call later." },
    };
  }
}
