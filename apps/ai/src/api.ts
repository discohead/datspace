import { callTool } from "@datspace/contract";
import { source } from "./env.ts";
import { json, jsonError } from "./http.ts";

type Route = {
  tool: string;
  input: (url: URL) => Record<string, unknown>;
  cache: string;
};

// Phase 04 adds work, search, graph, profile, llms.txt, and MCP over the same tools.
const ROUTES: Record<string, Route> = {
  "/api/stations": { tool: "list_stations", input: () => ({}), cache: "public, max-age=60" },
  "/api/ledger": {
    tool: "get_ledger",
    input: (url) => (url.searchParams.has("limit") ? { limit: Number(url.searchParams.get("limit")) } : {}),
    cache: "no-store",
  },
};

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const route = ROUTES[url.pathname];
  if (!route) {
    return jsonError({
      error: {
        code: "not_found",
        message: `No endpoint at ${url.pathname}.`,
        fix: `Use one of: ${Object.keys(ROUTES).join(", ")}.`,
      },
    });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonError(
      { error: { code: "invalid_input", message: `${url.pathname} only accepts GET.`, fix: "Send a GET request." } },
      405,
    );
  }
  const result = await callTool(route.tool, source(env), route.input(url));
  if (!result.ok) return jsonError(result);
  return json(result.data as object, { headers: { "cache-control": route.cache } });
}
