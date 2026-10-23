import { handleAdmin } from "./admin.ts";
import { handleApi } from "./api.ts";

export { Ledger } from "./ledger.ts";

/**
 * datspace.ai: the agent-facing surfaces live here; every other path is a
 * human page, served by datspace-web over the WEB service binding.
 */
export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) return handleApi(request, env);
    if (pathname.startsWith("/admin/")) return handleAdmin(request, env);
    return env.WEB.fetch(request);
  },
} satisfies ExportedHandler<Env>;
