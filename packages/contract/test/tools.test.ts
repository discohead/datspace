import { describe, expect, it } from "vitest";
import { callTool, tools } from "../src/index.ts";
import { readOnlySource, sent, source } from "./fixture.ts";

describe("tools", () => {
  it("defines the seven tools with one-sentence descriptions; only transmit writes", () => {
    expect(tools.map((t) => t.name)).toEqual([
      "list_stations",
      "get_work",
      "search",
      "get_graph",
      "get_profile",
      "get_ledger",
      "transmit",
    ]);
    expect(tools.filter((t) => !t.readOnly).map((t) => t.name)).toEqual(["transmit"]);
    for (const tool of tools) {
      // One sentence: no period followed by a space before the final one.
      expect(tool.description).toMatch(/^[A-Z][^.]*(\.[^ ][^.]*)*\.$/);
    }
  });

  it.each([
    ["list_stations", { extra: 1 }],
    ["get_work", {}],
    ["get_work", { slug: "Not A Slug" }],
    ["search", { query: "" }],
    ["search", { query: "x", limit: 21 }],
    ["get_graph", { extra: true }],
    ["get_profile", { extra: true }],
    ["get_ledger", { limit: 101 }],
    ["transmit", { body: "Hi" }],
    ["transmit", { reply_to: "not-an-email", body: "Hi" }],
    ["transmit", { reply_to: "a@example.com", body: "" }],
    ["transmit", { reply_to: "a@example.com", body: "x".repeat(2001) }],
  ])("%s rejects %j with a fix", async (name, input) => {
    const result = await callTool(name, source, input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_input");
    expect(result.error.message).toContain(name);
    expect(result.error.fix).toBeTruthy();
  });

  it("names the valid tools when the tool doesn't exist", async () => {
    const result = await callTool("nope", source, {});
    expect(result).toMatchObject({ ok: false, error: { code: "not_found" } });
    if (!result.ok) expect(result.error.fix).toContain("list_stations");
  });

  it("list_stations returns every station", async () => {
    const result = await callTool("list_stations", source, {});
    expect(result).toMatchObject({
      ok: true,
      data: { stations: [{ slug: "datspace", frequency: 88.7 }, { slug: "agent-native-interface" }] },
    });
  });

  it("get_work returns the story and markdown", async () => {
    const result = await callTool("get_work", source, { slug: "agent-native-interface" });
    expect(result).toMatchObject({
      ok: true,
      data: { story: { question: "What is the question?" }, domain: "datspace.ai" },
    });
    if (result.ok) expect((result.data as { markdown: string }).markdown).toContain("npx datspace");
  });

  it("get_work points to list_stations for an unknown slug", async () => {
    const result = await callTool("get_work", source, { slug: "missing" });
    expect(result).toMatchObject({ ok: false, error: { code: "not_found" } });
    if (!result.ok) expect(result.error.fix).toContain("list_stations");
  });

  it("search finds a work and returns a snippet", async () => {
    const result = await callTool("search", source, { query: "agent" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { hits } = result.data as { hits: { slug: string; snippet: string }[] };
    expect(hits[0]?.slug).toBe("agent-native-interface");
    expect(hits[0]?.snippet.toLowerCase()).toContain("agent");
  });

  it("search requires every term", async () => {
    const result = await callTool("search", source, { query: "static agents" });
    expect(result).toEqual({ ok: true, data: { hits: [] } });
  });

  it("get_graph links works to their domains and facets", async () => {
    const result = await callTool("get_graph", source, {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const graph = result.data as { nodes: { id: string }[]; edges: unknown[] };
    expect(graph.nodes.map((n) => n.id)).toContain("datspace.fm");
    expect(graph.edges).toContainEqual({ from: "datspace", to: "datspace.io", kind: "lives-on" });
    expect(graph.edges).toContainEqual({ from: "datspace", to: "datspace.ai", kind: "facet" });
    expect(graph.edges).not.toContainEqual({ from: "datspace", to: "datspace.io", kind: "facet" });
  });

  it("get_profile returns the contact email", async () => {
    const result = await callTool("get_profile", source, {});
    expect(result).toMatchObject({ ok: true, data: { contact: { email: "jared@datspace.io" } } });
  });

  it("transmit delivers a trimmed message and returns its id", async () => {
    const result = await callTool("transmit", source, { name: " Ada ", reply_to: "ada@example.com", body: " Hello. " });
    expect(result).toEqual({ ok: true, data: { id: "m1", at: "2026-10-23T00:00:00.000Z" } });
    expect(sent.at(-1)).toEqual({ name: "Ada", reply_to: "ada@example.com", body: "Hello." });
  });

  it("transmit points to email when a source can't deliver", async () => {
    const result = await callTool("transmit", readOnlySource, { reply_to: "ada@example.com", body: "Hello." });
    expect(result).toMatchObject({ ok: false, error: { code: "internal", fix: expect.stringContaining("jared@datspace.io") } });
  });

  it("get_ledger returns recent events with a default limit", async () => {
    const result = await callTool("get_ledger", source, undefined);
    expect(result).toMatchObject({ ok: true, data: { events: [{ seq: 1, type: "deploy" }] } });
  });
});

describe("toolPath", async () => {
  const { toolPath, toolRequest } = await import("../src/index.ts");
  it("maps every tool to its JSON route", () => {
    expect(toolPath("list_stations")).toBe("/api/stations");
    expect(toolPath("get_work", { slug: "datspace" })).toBe("/api/work/datspace");
    expect(toolPath("search", { query: "Cloudflare Workers", limit: 5 })).toBe("/api/search?q=Cloudflare+Workers&limit=5");
    expect(toolPath("search", { query: "x" })).toBe("/api/search?q=x");
    expect(toolPath("get_ledger")).toBe("/api/ledger");
    expect(toolPath("get_ledger", { type: "deploy", limit: 3 })).toBe("/api/ledger?limit=3&type=deploy");
    expect(toolRequest("transmit", { reply_to: "a@example.com", body: "Hi" })).toEqual({
      method: "POST",
      path: "/api/transmit",
      body: '{"reply_to":"a@example.com","body":"Hi"}',
    });
    expect(toolRequest("list_stations")).toEqual({ method: "GET", path: "/api/stations" });
  });
});
