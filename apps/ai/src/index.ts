import { handleAdmin } from "./admin.ts";
import { handleApi } from "./api.ts";
import { handleDecide } from "./decide.ts";
import { content, ledger } from "./env.ts";
import { json, jsonError } from "./http.ts";
import { llmsTxt } from "./llms.ts";
import { handleMcp } from "./mcp.ts";

export { Budget } from "./budget.ts";
export { Inbox } from "./inbox.ts";
export { Ledger } from "./ledger.ts";

/**
 * Each band's front page on datspace-web, by domain; `/` on any other host
 * (workers.dev, local) is datspace.ai's. datspace-web's reroute hook maps
 * client-side navigation the same way.
 */
const FRONT_PAGES: Record<string, string> = {
  "datspace.ai": "/ai",
  "datspace.dev": "/dev",
  "datspace.fm": "/fm",
  "datspace.music": "/music",
};

/**
 * datspace.studio is patter, on a route that takes precedence over this
 * Worker's custom domain. If that route is ever removed, the band falls back
 * to the dial.
 */
const UNLIT: Record<string, string> = { "datspace.studio": "studio" };

/**
 * datspace.ai: the agent-facing surfaces live here. Every band domain but
 * datspace.studio also reaches this Worker; human pages on all of them are
 * served by datspace-web over the WEB service binding.
 */
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const band = UNLIT[url.hostname];
    if (band) return Response.redirect(`https://datspace.io/#${band}`, 302);

    // The vibe check, everywhere but datspace.ai, whose surfaces never call a model.
    if (url.pathname === "/decide" && url.hostname !== "datspace.ai") return handleDecide(request, env, ctx);

    const agentFacing = url.pathname === "/mcp" || url.pathname.startsWith("/api/");
    if (agentFacing && !(await withinLimit(request, env))) {
      return jsonError(
        {
          error: {
            code: "rate_limited",
            message: "Too many requests from this client.",
            fix: "Wait a minute, then retry.",
          },
        },
        429,
      );
    }

    if (request.method === "OPTIONS" && agentFacing) return preflight();
    if (url.pathname === "/mcp") return handleMcp(request, env, ctx);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env, ctx);
    if (url.pathname.startsWith("/admin/")) return handleAdmin(request, env);
    if (url.pathname === "/llms.txt") {
      return new Response(llmsTxt(content, url.origin), {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" },
      });
    }
    // The live view's feed. Not a tool, so reading it doesn't add to the Ledger it shows.
    if (url.pathname === "/live.json") {
      return json({ events: await ledger(env).recent({ limit: 50 }) }, { headers: { "cache-control": "no-store" } });
    }
    // datspace.dev's explorer pages backward through the whole log to check its chain. Not a tool either.
    if (url.pathname === "/ledger.json") {
      const before = Number(url.searchParams.get("before"));
      return json(
        { events: await ledger(env).recent({ limit: 100, ...(Number.isInteger(before) && before > 0 ? { beforeSeq: before } : {}) }) },
        { headers: { "cache-control": "no-store" } },
      );
    }
    if (url.pathname === "/") {
      return env.WEB.fetch(new Request(new URL(FRONT_PAGES[url.hostname] ?? "/ai", url), request));
    }
    return env.WEB.fetch(request);
  },
} satisfies ExportedHandler<Env>;

/** CORS preflight for browser clients of the JSON API. */
function preflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-datspace-client",
      "access-control-max-age": "86400",
    },
  });
}

/** 120 requests a minute per client, per location. The address is the limiter key only; it's never stored. */
async function withinLimit(request: Request, env: Env): Promise<boolean> {
  const key = request.headers.get("cf-connecting-ip") ?? "local";
  const { success } = await env.AGENT_LIMIT.limit({ key });
  return success;
}
