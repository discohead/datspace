import { handleAdmin } from "./admin.ts";
import { handleApi } from "./api.ts";
import { content, ledger } from "./env.ts";
import { json, jsonError } from "./http.ts";
import { llmsTxt } from "./llms.ts";
import { handleMcp } from "./mcp.ts";

export { Ledger } from "./ledger.ts";

/** Domains on the dial that aren't live yet. They redirect to datspace.io until their phase. */
const UNLIT: Record<string, string> = {
  "datspace.dev": "dev",
  "datspace.fm": "fm",
  "datspace.music": "music",
  "datspace.studio": "studio",
};

/**
 * datspace.ai: the agent-facing surfaces live here. `/` is the human view of
 * agent activity, and every other path is a human page, all served by
 * datspace-web over the WEB service binding.
 */
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const band = UNLIT[url.hostname];
    if (band) return Response.redirect(`https://datspace.io/#${band}`, 302);

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
    if (url.pathname === "/") return env.WEB.fetch(new Request(new URL("/ai", url), request));
    return env.WEB.fetch(request);
  },
} satisfies ExportedHandler<Env>;

/** 120 requests a minute per client, per location. The address is the limiter key only; it's never stored. */
async function withinLimit(request: Request, env: Env): Promise<boolean> {
  const key = request.headers.get("cf-connecting-ip") ?? "local";
  const { success } = await env.AGENT_LIMIT.limit({ key });
  return success;
}
