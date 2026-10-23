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
    const live = await exports.default.fetch(`${BASE}/live.json`);
    expect((await live.json<{ events: { type: string }[] }>()).events.filter((e) => e.type === "deploy")).toEqual([]);
  });

  it("records a deploy and serves it from /api/ledger", async () => {
    const res = await deploy("0123456789abcdef", "test-deploy-token");
    expect(res.status).toBe(200);
    const ledger = await exports.default.fetch(`${BASE}/api/ledger?limit=5`);
    const body = await ledger.json<{ apiVersion: string; events: { type: string; data: unknown }[] }>();
    expect(body.apiVersion).toBe(API_VERSION);
    expect(body.events.filter((e) => e.type === "deploy")).toEqual([
      expect.objectContaining({ data: { commit: "0123456789abcdef" } }),
    ]);
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

  it("forwards every other path to datspace-web, and / to its /ai page", async () => {
    expect(await (await exports.default.fetch(`${BASE}/colophon`)).text()).toBe("web /colophon");
    expect(await (await exports.default.fetch(`${BASE}/`)).text()).toBe("web /ai");
  });

  it("serves one work as JSON and as markdown", async () => {
    const work = await exports.default.fetch(`${BASE}/api/work/agent-native-interface`);
    expect(await work.json()).toMatchObject({ slug: "agent-native-interface", story: { question: expect.any(String) } });
    const md = await exports.default.fetch(`${BASE}/api/work/agent-native-interface.md`);
    expect(md.headers.get("content-type")).toContain("text/markdown");
    const text = await md.text();
    expect(text).toMatch(/^# The agent-native interface\n/);
    expect(text).toContain("npx datspace");
    expect((await exports.default.fetch(`${BASE}/api/work/missing`)).status).toBe(404);
  });

  it("serves search, graph, and profile", async () => {
    const search = await (await exports.default.fetch(`${BASE}/api/search?q=agent&limit=5`)).json<{ hits: { slug: string }[] }>();
    expect(search.hits[0]?.slug).toBe("agent-native-interface");
    expect((await exports.default.fetch(`${BASE}/api/search`)).status).toBe(400);
    const graph = await (await exports.default.fetch(`${BASE}/api/graph`)).json<{ nodes: unknown[] }>();
    expect(graph.nodes.length).toBeGreaterThan(6);
    expect(await (await exports.default.fetch(`${BASE}/api/profile`)).json()).toMatchObject({
      contact: { email: "jared@datspace.io" },
    });
  });

  it("logs each tool call with surface and tool only", async () => {
    await exports.default.fetch(`${BASE}/api/search?q=secret-query-text`);
    await exports.default.fetch(`${BASE}/api/profile`, { headers: { "x-datspace-client": "cli/0.1.0" } });
    const live = await (await exports.default.fetch(`${BASE}/live.json`)).json<{ events: { type: string; data: unknown }[] }>();
    const calls = live.events.filter((e) => e.type === "agent.call").map((e) => e.data);
    expect(calls).toContainEqual({ surface: "json", tool: "search" });
    expect(calls).toContainEqual({ surface: "cli", tool: "get_profile" });
    expect(JSON.stringify(live.events)).not.toContain("secret-query-text");
  });

  it("serves llms.txt with the MCP URL and every station", async () => {
    const res = await exports.default.fetch(`${BASE}/llms.txt`);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const text = await res.text();
    expect(text).toContain("https://datspace.ai/mcp");
    expect(text).toContain("https://datspace.ai/api/work/agent-native-interface.md");
    expect(text).toContain("npx datspace ls");
  });
});

describe("unlit domains", () => {
  it.each(["dev", "fm", "music", "studio"])("datspace.%s redirects to datspace.io", async (band) => {
    const res = await exports.default.fetch(`https://datspace.${band}/anything`, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`https://datspace.io/#${band}`);
  });
});
