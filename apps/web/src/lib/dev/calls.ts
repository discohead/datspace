import type { ToolName } from "@datspace/contract";
import { toolRequest } from "@datspace/contract/paths";

export const AI_ORIGIN = "https://datspace.ai";

/** One input per tool for the example calls. The page's load checks each against its tool's schema. */
export const EXAMPLES = {
  list_stations: {},
  get_work: { slug: "datspace" },
  search: { query: "Cloudflare" },
  get_graph: {},
  get_profile: {},
  get_ledger: { type: "deploy", limit: 3 },
  transmit: { reply_to: "you@example.com", body: "Hello" },
} satisfies Record<ToolName, Record<string, unknown>>;

/** The JSON API request, from the contract's toolRequest, as the CLI sends it. */
export function jsonCall(tool: ToolName, input: Record<string, unknown>): string {
  const { method, path, body } = toolRequest(tool, input);
  const line = `${method} ${AI_ORIGIN}${path}`;
  return body === undefined ? line : `${line}\ncontent-type: application/json\n\n${body}`;
}

/** The JSON-RPC body of an MCP tools/call request. */
export function mcpCall(tool: ToolName, input: Record<string, unknown>): string {
  return JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: input } });
}

/** The CLI command for a tool, if apps/cli has one (see apps/cli/src/main.ts). */
export function cliCommand(tool: ToolName, input: Record<string, unknown>): string | null {
  const arg = (value: unknown) => shellQuote(String(value));
  switch (tool) {
    case "list_stations":
      return "npx datspace ls";
    case "get_work":
      return `npx datspace show ${arg(input.slug)}`;
    case "search":
      return `npx datspace search ${arg(input.query)}${input.limit === undefined ? "" : ` --limit ${arg(input.limit)}`}`;
    case "get_graph":
      return "npx datspace graph";
    case "transmit":
      return [
        "npx datspace transmit",
        ...(input.name === undefined ? [] : [`--name ${arg(input.name)}`]),
        `--reply-to ${arg(input.reply_to)}`,
        `--body ${arg(input.body)}`,
      ].join(" ");
    case "get_profile":
    case "get_ledger":
      return null;
  }
}

/** Single-quotes a shell argument unless it's plain. */
function shellQuote(value: string): string {
  return /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replaceAll("'", `'\\''`)}'`;
}
