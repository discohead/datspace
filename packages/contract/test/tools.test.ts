import { describe, expect, it } from "vitest";
import { callTool, tools } from "../src/index.ts";
import { source } from "./fixture.ts";

describe("tools", () => {
  it("defines the six launch tools with one-sentence descriptions", () => {
    expect(tools.map((t) => t.name)).toEqual([
      "list_stations",
      "get_work",
      "search",
      "get_graph",
      "get_profile",
      "get_ledger",
    ]);
    for (const tool of tools) {
      expect(tool.description).toMatch(/^Returns [^.]+(\.[^ ][^.]*)*\.$/);
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

  it("get_ledger returns recent events with a default limit", async () => {
    const result = await callTool("get_ledger", source, undefined);
    expect(result).toMatchObject({ ok: true, data: { events: [{ seq: 1, type: "deploy" }] } });
  });
});
