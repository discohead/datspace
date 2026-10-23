import { page } from "#lib/server/content.ts";
import { renderMarkdown } from "#lib/server/markdown.ts";

export function load() {
  const { title, description, body } = page("about");
  return { title, description, html: renderMarkdown(body) };
}
