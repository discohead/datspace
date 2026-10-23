import { callTool, workToMarkdown, type ToolName, type Work } from "@datspace/contract";
import { source } from "./env.ts";
import { deliver } from "./transmit.ts";
import { json, jsonError } from "./http.ts";
import { logCall, surfaceOf } from "./log.ts";

interface Route {
  path: RegExp;
  tool: ToolName;
  input: (url: URL, match: RegExpExecArray) => Record<string, unknown>;
  cache: string;
  markdown?: boolean;
}

const limit = (url: URL) =>
  url.searchParams.has("limit") ? { limit: Number(url.searchParams.get("limit")) } : {};

/** One route per tool; each wraps the contract's definition and nothing else. */
const ROUTES: Route[] = [
  { path: /^\/api\/stations$/, tool: "list_stations", input: () => ({}), cache: "public, max-age=60" },
  {
    path: /^\/api\/work\/([^/]+)\.md$/,
    tool: "get_work",
    input: (_, m) => ({ slug: decodeURIComponent(m[1]!) }),
    cache: "public, max-age=60",
    markdown: true,
  },
  {
    path: /^\/api\/work\/([^/]+)$/,
    tool: "get_work",
    input: (_, m) => ({ slug: decodeURIComponent(m[1]!) }),
    cache: "public, max-age=60",
  },
  {
    path: /^\/api\/search$/,
    tool: "search",
    input: (url) => ({ query: url.searchParams.get("q") ?? "", ...limit(url) }),
    cache: "public, max-age=60",
  },
  { path: /^\/api\/graph$/, tool: "get_graph", input: () => ({}), cache: "public, max-age=60" },
  { path: /^\/api\/profile$/, tool: "get_profile", input: () => ({}), cache: "public, max-age=60" },
  {
    path: /^\/api\/ledger$/,
    tool: "get_ledger",
    input: (url) => ({ ...limit(url), ...(url.searchParams.has("type") ? { type: url.searchParams.get("type") } : {}) }),
    cache: "no-store",
  },
];

export const API_ENDPOINTS = [
  "/api/stations",
  "/api/work/<slug>",
  "/api/work/<slug>.md",
  "/api/search?q=<query>&limit=<1-20>",
  "/api/graph",
  "/api/profile",
  "/api/ledger?limit=<1-100>&type=<deploy|agent.call>",
  "POST /api/transmit with JSON { name?, reply_to, body }",
];

export async function handleApi(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/transmit") return handleTransmit(request, env, ctx);
  let route: Route | undefined;
  let match: RegExpExecArray | null = null;
  for (const r of ROUTES) {
    match = r.path.exec(url.pathname);
    if (match) {
      route = r;
      break;
    }
  }
  if (!route || !match) {
    return jsonError({
      error: {
        code: "not_found",
        message: `No endpoint at ${url.pathname}.`,
        fix: `Use one of: ${API_ENDPOINTS.join(", ")}.`,
      },
    });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonError(
      { error: { code: "invalid_input", message: `${url.pathname} only accepts GET.`, fix: "Send a GET request." } },
      405,
    );
  }

  logCall(env, ctx, surfaceOf(request), route.tool);
  const result = await callTool(route.tool, source(env), route.input(url, match));
  if (!result.ok) return jsonError(result);
  if (route.markdown) {
    return new Response(workToMarkdown(result.data as Work), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": route.cache,
      },
    });
  }
  return json(result.data as object, { headers: { "cache-control": route.cache } });
}

/** `POST /api/transmit`: the one write on the JSON API. */
async function handleTransmit(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "POST") {
    return jsonError(
      {
        error: {
          code: "invalid_input",
          message: "/api/transmit only accepts POST.",
          fix: 'POST JSON like {"reply_to": "you@example.com", "body": "Hello"}.',
        },
      },
      405,
    );
  }
  const input = await request.json().catch(() => null);
  if (input === null) {
    return jsonError({
      error: {
        code: "invalid_input",
        message: "The body isn't JSON.",
        fix: 'Send JSON like {"reply_to": "you@example.com", "body": "Hello"} with content-type application/json.',
      },
    });
  }
  const surface = surfaceOf(request);
  logCall(env, ctx, surface, "transmit");
  const result = await callTool(
    "transmit",
    source(env, (message) => deliver(env, ctx, request, surface, message)),
    input,
  );
  if (!result.ok) return jsonError(result);
  return json(result.data as object, { status: 201, headers: { "cache-control": "no-store" } });
}
