import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../src/lib/server/markdown.ts";

describe("renderMarkdown", () => {
  it("renders headings, lists, code, and links", () => {
    const html = renderMarkdown(
      "## Heading\n\n- one\n- two\n\n`npx datspace ls`\n\n[Source](https://github.com/discohead/datspace) and [about](/about)",
    );
    expect(html).toContain("<h2>Heading</h2>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<code>npx datspace ls</code>");
    expect(html).toContain('<a href="https://github.com/discohead/datspace" rel="noopener">Source</a>');
    expect(html).toContain('<a href="/about">about</a>');
  });
});
