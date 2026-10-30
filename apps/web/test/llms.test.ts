import { describe, expect, it } from "vitest";
import { GET, prerender } from "../src/routes/llms.txt/+server.ts";

describe("datspace.io/llms.txt", () => {
  it("is prerendered plain text naming datspace.ai's surfaces, where MCP answers", async () => {
    expect(prerender).toBe(true);
    const res = GET();
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const text = await res.text();
    expect(text).toContain("- MCP (Streamable HTTP, stateless, no auth): https://datspace.ai/mcp");
    expect(text).toContain("https://datspace.ai/api/work/agent-native-interface.md");
    expect(text).not.toContain("datspace.io/mcp");
    expect(text).not.toContain("datspace.io/api/");
  });
});
