import { handleAdmin } from "./admin.ts";
import { handleApi } from "./api.ts";

export { Ledger } from "./ledger.ts";

/** Domains on the dial that aren't live yet. They redirect to datspace.io until their phase. */
const UNLIT: Record<string, string> = {
  "datspace.dev": "dev",
  "datspace.fm": "fm",
  "datspace.music": "music",
  "datspace.studio": "studio",
};

/**
 * datspace.ai: the agent-facing surfaces live here; every other path is a
 * human page, served by datspace-web over the WEB service binding.
 */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const band = UNLIT[url.hostname];
    if (band) return Response.redirect(`https://datspace.io/#${band}`, 302);

    if (url.pathname.startsWith("/api/")) return handleApi(request, env);
    if (url.pathname.startsWith("/admin/")) return handleAdmin(request, env);
    return env.WEB.fetch(request);
  },
} satisfies ExportedHandler<Env>;
