import type { ToolName } from "./tools.ts";

/**
 * Where each tool lives on the JSON API, for clients such as the CLI and the
 * answerability runner. The server's routes in apps/ai mirror this table; the
 * answerability suite calls both surfaces, so any drift fails CI.
 */
export function toolPath(tool: ToolName, input: Record<string, unknown> = {}): string {
  const query = (params: Record<string, unknown>) => {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return "";
    return `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
  };
  switch (tool) {
    case "list_stations":
      return "/api/stations";
    case "get_work":
      return `/api/work/${encodeURIComponent(String(input.slug ?? ""))}`;
    case "search":
      return `/api/search${query({ q: input.query, limit: input.limit })}`;
    case "get_graph":
      return "/api/graph";
    case "get_profile":
      return "/api/profile";
    case "get_ledger":
      return `/api/ledger${query({ limit: input.limit })}`;
  }
}
