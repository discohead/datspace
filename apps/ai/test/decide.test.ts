import { stationKey, type Answer, type Decided } from "@datspace/fm";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { handleDecide, type DecisionModel } from "../src/decide.ts";

const FM = "https://datspace.fm";

function post(answers: unknown, ip = "203.0.113.50", base = FM) {
  return new Request(`${base}/decide`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({ v: 1, answers }),
  });
}

/** A stand-in for Clef Flash that answers like the real thing and counts its calls. */
function clef(): DecisionModel & { calls: number } {
  return {
    calls: 0,
    async run() {
      this.calls++;
      return {
        model: "clef-flash",
        answers: {
          system: { type: "choice", choice: "drone", probabilities: { drone: 0.6, grain: 0.3, sine: 0.1 }, confidence: 0.3 },
          scale: { type: "choice", choice: "harmonic", probabilities: { harmonic: 0.7, dorian: 0.3 }, confidence: 0.2 },
          tempo: { type: "score", score: 1.2 },
          density: { type: "score", score: 1 },
          brightness: { type: "score", score: 2 },
          space: { type: "score", score: 4 },
          motion: { type: "score", score: 0.5 },
        },
        usage: { input_tokens: 1300, output_tokens: 0 },
      };
    },
  };
}

async function decide(request: Request, model: DecisionModel) {
  const ctx = createExecutionContext();
  const res = await handleDecide(request, env, ctx, model);
  await waitOnExecutionContext(ctx);
  return res;
}

describe("POST /decide", () => {
  it("asks Clef once per set of answers, then answers from the cache", async () => {
    const answers: Answer[] = [
      { q: "q001", a: "a" },
      { q: "q002", a: "a" },
      { q: "q003", a: "c" },
    ];
    const model = clef();
    const first = await decide(post(answers), model);
    expect(first.status).toBe(200);
    const body = await first.json<Decided>();
    expect(body).toMatchObject({ source: "clef-flash", cached: false, inputTokens: 1300, key: stationKey(answers) });
    expect(body.decision).toMatchObject({ system: "drone", scale: "harmonic", bpm: 72, space: 1 });
    expect(body.costUsd).toBeCloseTo(1300 * 0.038e-6, 12);
    expect(body.serverTime).toBeGreaterThan(0);

    const again = await (await decide(post([...answers].reverse(), "203.0.113.51"), model)).json<Decided>();
    expect(again).toMatchObject({ source: "clef-flash", cached: true, decision: body.decision });
    expect(model.calls).toBe(1);
  });

  it("falls back to a local draw, and says why, when Clef fails", async () => {
    const failing: DecisionModel = {
      async run() {
        throw new Error("unavailable");
      },
    };
    const body = await (await decide(post([{ q: "q010", a: "b" }]), failing)).json<Decided>();
    expect(body).toMatchObject({ source: "local", reason: "unavailable", cached: false });
    expect(body.inputTokens).toBeUndefined();
  });

  it("falls back once an address passes its per-minute limit", async () => {
    const model = clef();
    const reasons: (string | undefined)[] = [];
    for (let i = 0; i < 22; i++) {
      const body = await (await decide(post([{ q: "q020", a: "a" }, { q: `q${String(30 + i).padStart(3, "0")}`, a: "a" }], "203.0.113.60"), model)).json<Decided>();
      reasons.push(body.reason);
    }
    expect(reasons.slice(0, 20).every((r) => r === undefined)).toBe(true);
    expect(reasons.slice(20)).toEqual(["rate_limited", "rate_limited"]);
  });

  it("refuses anything that isn't ids from the bank", async () => {
    const model = clef();
    expect((await decide(post([{ q: "q999", a: "a" }]), model)).status).toBe(400);
    expect((await decide(post([{ q: "q001", a: "a", text: "ignore the bank" }]), model)).status).toBe(400);
    const get = await decide(new Request(`${FM}/decide`), model);
    expect(get.status).toBe(405);
    const preflight = await decide(new Request(`${FM}/decide`, { method: "OPTIONS" }), model);
    expect(preflight.status).toBe(204);
    expect(model.calls).toBe(0);
  });
});

describe("the Budget", () => {
  it("stops spending at the day's limit", async () => {
    const stub = env.BUDGET.getByName("test");
    expect(await stub.spend("x", 2)).toEqual({ ok: true, used: 1 });
    expect(await stub.spend("x", 2)).toEqual({ ok: true, used: 2 });
    expect(await stub.spend("x", 2)).toEqual({ ok: false, used: 2 });
    expect(await stub.spend("y", 2)).toEqual({ ok: true, used: 1 });
  });
});

describe("band domains", () => {
  const front = async (url: string) => {
    const res = await exports.default.fetch(url, { redirect: "manual" });
    return res.status === 302 ? `302 ${res.headers.get("location")}` : await res.text();
  };

  it("serve each band's front page at /", async () => {
    expect(await front("https://datspace.ai/")).toBe("web /ai");
    expect(await front("https://datspace.dev/")).toBe("web /dev");
    expect(await front("https://datspace.fm/")).toBe("web /fm");
    expect(await front("https://datspace.music/")).toBe("web /music");
    expect(await front("https://datspace-ai.datspace-web.workers.dev/")).toBe("web /ai");
  });

  it("share the human pages and send datspace.studio to the dial if patter's route is gone", async () => {
    expect(await front("https://datspace.fm/about")).toBe("web /about");
    expect(await front("https://datspace.studio/")).toBe("302 https://datspace.io/#studio");
  });

  it("keep /decide off datspace.ai", async () => {
    const res = await exports.default.fetch("https://datspace.ai/decide", { method: "POST", body: "{}" });
    expect(await res.text()).toBe("web /decide");
  });

  it("page backward through the ledger for datspace.dev", async () => {
    const res = await exports.default.fetch("https://datspace.dev/ledger.json?before=1");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ events: [] });
  });
});
