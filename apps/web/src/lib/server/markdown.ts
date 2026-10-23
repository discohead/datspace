import { Marked } from "marked";

const marked = new Marked({ gfm: true, async: false });

/**
 * Renders first-party markdown from the repository at prerender time, so the
 * parser never ships to the browser. External links open with rel="noopener".
 */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source) as string;
  return html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" rel="noopener"');
}
