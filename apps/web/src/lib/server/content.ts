import raw from "@datspace/content/content.json" with { type: "json" };
import { ContentBundle, type Page } from "@datspace/contract";
import { error } from "@sveltejs/kit";

/** The content bundle, validated once at build. Server-only, so zod stays out of the client. */
export const content: ContentBundle = ContentBundle.parse(raw);

export function page(slug: string): Page {
  const found = content.pages.find((p) => p.slug === slug);
  if (!found) error(500, `packages/content/pages/${slug}.md is missing.`);
  return found;
}
