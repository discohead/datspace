import type { Surface } from "@datspace/contract";
import { ledger } from "./env.ts";

/**
 * Records that a tool was called: the surface and the tool name, never the
 * arguments, the caller's address, or its user agent.
 */
export function logCall(env: Env, ctx: ExecutionContext, surface: Surface, tool: string): void {
  ctx.waitUntil(
    ledger(env)
      .append({ type: "agent.call", data: { surface, tool } })
      .catch(() => {
        // Logging never fails a call.
      }),
  );
}

/** The CLI identifies itself with `x-datspace-client: cli/<version>`. */
export function surfaceOf(request: Request): Surface {
  return request.headers.get("x-datspace-client")?.startsWith("cli/") ? "cli" : "json";
}
