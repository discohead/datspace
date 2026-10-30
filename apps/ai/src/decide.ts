import { sha256Hex } from "@datspace/contract";
import {
  CLEF_MODEL,
  CLEF_USD_PER_INPUT_TOKEN,
  clefRequest,
  fromClef,
  localDecision,
  stationKey,
  type Decided,
  type FallbackReason,
} from "@datspace/fm";
import { ClefResponse, VibeRequest } from "@datspace/fm/request";
import { z } from "zod";
import { budget } from "./env.ts";
import { json, jsonError } from "./http.ts";

/** Clef Flash calls a day, across the network: at about 1,300 input tokens each, a ceiling near $1. */
export const DAILY_DECISIONS = 20_000;

/** Decided, minus what's stamped on each response. */
type Stored = Omit<Decided, "key" | "ms" | "serverTime" | "cached">;

export interface DecisionModel {
  run(model: string, input: unknown): Promise<unknown>;
}

/**
 * `POST /decide` on datspace.fm: the vibe check's answers in, the station's
 * system out. This is the one place on the network that calls a model, and
 * it's a decision model choosing among options in `@datspace/fm`; it writes no
 * text. Agent-facing routes never reach it.
 *
 * Cached answers come back free; then a per-address limit, then the daily
 * budget. If any of them says no, or Clef fails, the answers seed a local draw
 * and the response names the reason. The station always plays.
 */
export async function handleDecide(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  model: DecisionModel = env.AI as unknown as DecisionModel,
): Promise<Response> {
  const started = Date.now();
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
      },
    });
  }
  if (request.method !== "POST") {
    return jsonError(
      { error: { code: "invalid_input", message: "/decide only accepts POST.", fix: 'POST JSON like {"v":1,"answers":[{"q":"q001","a":"a"}]}.' } },
      405,
    );
  }
  const parsed = VibeRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError({
      error: {
        code: "invalid_input",
        message: z.prettifyError(parsed.error),
        fix: "Send question and answer ids from the bank in @datspace/fm, with v set to its BANK_VERSION.",
      },
    });
  }

  const { answers } = parsed.data;
  const respond = (stored: Stored, cached: boolean) =>
    json(
      { ...stored, key: stationKey(answers), cached, ms: Date.now() - started, serverTime: Date.now() } satisfies Decided,
      { headers: { "cache-control": "no-store" } },
    );
  const fallback = (reason: FallbackReason) => respond({ decision: localDecision(answers), source: "local", reason }, false);

  // Clef's answer is a pure function of the request, so a cached one is exact. The key covers the
  // whole request, so rewording a criterion in @datspace/fm asks again instead of serving the old answer.
  const input = clefRequest(answers);
  const cacheKey = new Request(`https://datspace.fm/decide/${await sha256Hex(`${CLEF_MODEL}|${JSON.stringify(input)}`)}`);
  const hit = await caches.default.match(cacheKey);
  if (hit) return respond(await hit.json<Stored>(), true);

  const address = request.headers.get("cf-connecting-ip") ?? "local";
  if (!(await env.FM_LIMIT.limit({ key: address })).success) return fallback("rate_limited");
  if (!(await budget(env).spend("clef-flash", DAILY_DECISIONS)).ok) return fallback("over_budget");

  let stored: Stored;
  try {
    const clef = ClefResponse.parse(await model.run(CLEF_MODEL, input));
    const inputTokens = clef.usage?.input_tokens;
    stored = {
      decision: fromClef(clef.answers),
      source: "clef-flash",
      ...(inputTokens === undefined ? {} : { inputTokens, costUsd: inputTokens * CLEF_USD_PER_INPUT_TOKEN }),
    };
  } catch {
    return fallback("unavailable");
  }
  ctx.waitUntil(
    caches.default.put(cacheKey, new Response(JSON.stringify(stored), { headers: { "cache-control": "public, max-age=2592000" } })),
  );
  return respond(stored, false);
}
