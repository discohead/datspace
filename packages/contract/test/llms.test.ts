import { describe, expect, it } from "vitest";
import { llmsTxt, type ContentBundle } from "../src/index.ts";
import { content } from "./fixture.ts";

describe("llmsTxt", () => {
  it("puts every surface on the given origin", () => {
    const text = llmsTxt(content, "https://example.test");
    expect(text).toContain("- MCP (Streamable HTTP, stateless, no auth): https://example.test/mcp");
    expect(text).toContain("  - https://example.test/api/stations\n");
    expect(text).toContain("  - POST https://example.test/api/transmit with JSON");
  });

  it("links each live station's markdown and leaves out the rest", () => {
    const later = { ...content.stations[0]!, slug: "later", title: "Later", status: "unlit" as const };
    const withUnlit: ContentBundle = { ...content, stations: [...content.stations, later] };
    const text = llmsTxt(withUnlit, "https://example.test");
    expect(text).toContain("- [datspace](https://example.test/api/work/datspace.md) (88.7 MHz)");
    expect(text).not.toContain("later.md");
  });
});
