import { API_VERSION } from "@datspace/contract";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const BASE = "https://datspace.ai";

function deploy(commit: string, token?: string) {
  return exports.default.fetch(`${BASE}/admin/deploy`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ commit }),
  });
}

describe("datspace-ai", () => {
  it("lists stations with apiVersion", async () => {
    const res = await exports.default.fetch(`${BASE}/api/stations`);
    expect(res.status).toBe(200);
    const body = await res.json<{ apiVersion: string; stations: { slug: string }[] }>();
    expect(body.apiVersion).toBe(API_VERSION);
    expect(body.stations.map((s) => s.slug)).toContain("agent-native-interface");
  });

  it("refuses /admin/deploy without the token", async () => {
    expect((await deploy("abc1234")).status).toBe(401);
    expect((await deploy("abc1234", "wrong")).status).toBe(401);
    const ledger = await exports.default.fetch(`${BASE}/api/ledger`);
    expect((await ledger.json<{ events: unknown[] }>()).events).toEqual([]);
  });

  it("records a deploy and serves it from /api/ledger", async () => {
    const res = await deploy("0123456789abcdef", "test-deploy-token");
    expect(res.status).toBe(200);
    const ledger = await exports.default.fetch(`${BASE}/api/ledger?limit=5`);
    const body = await ledger.json<{ apiVersion: string; events: { type: string; data: unknown }[] }>();
    expect(body.apiVersion).toBe(API_VERSION);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({ type: "deploy", data: { commit: "0123456789abcdef" } });
  });

  it("rejects a malformed deploy body", async () => {
    expect((await deploy("not a sha", "test-deploy-token")).status).toBe(400);
  });

  it("explains bad input and unknown endpoints", async () => {
    const bad = await exports.default.fetch(`${BASE}/api/ledger?limit=500`);
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ apiVersion: API_VERSION, error: { code: "invalid_input" } });

    const missing = await exports.default.fetch(`${BASE}/api/nope`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: { fix: expect.stringContaining("/api/stations") } });
  });

  it("forwards every other path to datspace-web", async () => {
    const res = await exports.default.fetch(`${BASE}/colophon`);
    expect(await res.text()).toBe("web /colophon");
  });
});
