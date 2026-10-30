import { tools } from "@datspace/contract";
import { describe, expect, it } from "vitest";
import { EXAMPLES, cliCommand, jsonCall, mcpCall } from "../src/lib/dev/calls.ts";

describe("EXAMPLES", () => {
  it("has one input per tool, each valid for its schema", () => {
    expect(Object.keys(EXAMPLES).sort()).toEqual(tools.map((tool) => tool.name).sort());
    for (const tool of tools) expect(tool.input.safeParse(EXAMPLES[tool.name]).success).toBe(true);
  });
});

describe("jsonCall", () => {
  it("is a GET for a read tool", () => {
    expect(jsonCall("search", { query: "Cloudflare" })).toBe("GET https://datspace.ai/api/search?q=Cloudflare");
    expect(jsonCall("get_ledger", { type: "deploy", limit: 3 })).toBe("GET https://datspace.ai/api/ledger?limit=3&type=deploy");
  });

  it("is a POST with a JSON body for transmit", () => {
    expect(jsonCall("transmit", { reply_to: "you@example.com", body: "Hello" })).toBe(
      'POST https://datspace.ai/api/transmit\ncontent-type: application/json\n\n{"reply_to":"you@example.com","body":"Hello"}',
    );
  });
});

describe("mcpCall", () => {
  it("is a JSON-RPC tools/call with the tool's name and arguments", () => {
    expect(JSON.parse(mcpCall("get_work", { slug: "datspace" }))).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "get_work", arguments: { slug: "datspace" } },
    });
  });
});

describe("cliCommand", () => {
  it("matches the CLI's commands", () => {
    expect(cliCommand("list_stations", {})).toBe("npx datspace ls");
    expect(cliCommand("get_work", { slug: "datspace" })).toBe("npx datspace show datspace");
    expect(cliCommand("search", { query: "Cloudflare", limit: 5 })).toBe("npx datspace search Cloudflare --limit 5");
    expect(cliCommand("get_graph", {})).toBe("npx datspace graph");
    expect(cliCommand("transmit", { reply_to: "you@example.com", body: "Hello" })).toBe(
      "npx datspace transmit --reply-to you@example.com --body Hello",
    );
  });

  it("has no command for tools the CLI doesn't wrap", () => {
    expect(cliCommand("get_profile", {})).toBeNull();
    expect(cliCommand("get_ledger", {})).toBeNull();
  });

  it("quotes arguments the shell would split", () => {
    expect(cliCommand("search", { query: "agent native" })).toBe("npx datspace search 'agent native'");
    expect(cliCommand("transmit", { name: "Jo", reply_to: "jo@example.com", body: "It's me" })).toBe(
      "npx datspace transmit --name Jo --reply-to jo@example.com --body 'It'\\''s me'",
    );
  });
});
