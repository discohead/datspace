import { z } from "zod";
import { inbox, ledger } from "./env.ts";
import { json, jsonError } from "./http.ts";

const DeployBody = z.strictObject({ commit: z.string().regex(/^[0-9a-f]{7,40}$/) });

/**
 * `GET /admin/version`: which commit the Worker and the Ledger are running.
 * `POST /admin/deploy`: CI records each deploy's commit in the Ledger.
 */
export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const route = `${request.method} ${url.pathname}`;
  if (route !== "POST /admin/deploy" && route !== "GET /admin/version" && route !== "GET /admin/messages") {
    return jsonError({
      error: {
        code: "not_found",
        message: "Not found.",
        fix: "GET /admin/version, GET /admin/messages, or POST /admin/deploy.",
      },
    });
  }
  if (!(await authorized(request, env))) {
    return jsonError(
      {
        error: {
          code: "invalid_input",
          message: "Missing or wrong bearer token.",
          fix: "Send Authorization: Bearer <DEPLOY_TOKEN>.",
        },
      },
      401,
    );
  }

  if (route === "GET /admin/messages") {
    return json({ messages: await inbox(env).list(100) }, { headers: { "cache-control": "no-store" } });
  }

  if (route === "GET /admin/version") {
    // A Ledger still on code from before `version()` existed rejects the call.
    const ledgerVersion = await ledger(env)
      .version()
      .catch(() => "unknown");
    return json({ worker: env.COMMIT, ledger: ledgerVersion }, { headers: { "cache-control": "no-store" } });
  }

  const parsed = DeployBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError({
      error: {
        code: "invalid_input",
        message: "The body must be { commit } with a hex commit SHA.",
        fix: 'Send {"commit": "<git sha>"}.',
      },
    });
  }
  const event = await ledger(env).append({ type: "deploy", data: { commit: parsed.data.commit } });
  return json({ event }, { headers: { "cache-control": "no-store" } });
}

/** Compares SHA-256 digests in constant time, so neither length nor content leaks. */
async function authorized(request: Request, env: Env): Promise<boolean> {
  const expected = env.DEPLOY_TOKEN;
  const header = request.headers.get("authorization") ?? "";
  if (!expected || !header.startsWith("Bearer ")) return false;
  const [a, b] = await Promise.all([digest(header.slice(7)), digest(expected)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

async function digest(text: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
}
