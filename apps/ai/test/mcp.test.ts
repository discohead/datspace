import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let client: Client;

beforeEach(async () => {
  client = new Client({ name: "datspace-test", version: "0.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL("https://datspace.ai/mcp"), {
    // Real requests always carry Host; the handler checks it against allowedHostnames.
    fetch: (input, init) => {
      const request = new Request(input, init);
      request.headers.set("host", "datspace.ai");
      return exports.default.fetch(request);
    },
  });
  await client.connect(transport);
});

afterEach(() => client.close());

describe("MCP", () => {
  it("lists the seven tools; only transmit is not read-only", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["get_graph", "get_ledger", "get_profile", "get_work", "list_stations", "search", "transmit"].sort(),
    );
    for (const tool of tools) {
      expect(tool.description).toMatch(/\.$/);
      expect(tool.annotations?.readOnlyHint).toBe(tool.name !== "transmit");
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("transmits a message", async () => {
    const result = await client.callTool({
      name: "transmit",
      arguments: { reply_to: "agent@example.com", body: "Hello from an agent." },
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({ id: expect.any(String), at: expect.any(String) });
  });

  it("answers get_profile with structured content", async () => {
    const result = await client.callTool({ name: "get_profile", arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({ contact: { email: "jared@datspace.io" } });
  });

  it("searches", async () => {
    const result = await client.callTool({ name: "search", arguments: { query: "agent" } });
    expect(JSON.stringify(result.structuredContent)).toContain("agent-native-interface");
  });

  it("returns a fixable error for an unknown slug", async () => {
    const result = await client.callTool({ name: "get_work", arguments: { slug: "missing" } });
    expect(result.isError).toBe(true);
    const text = (result.content as { type: string; text: string }[])[0]!.text;
    expect(JSON.parse(text)).toMatchObject({ error: { code: "not_found", fix: expect.stringContaining("list_stations") } });
  });
});
