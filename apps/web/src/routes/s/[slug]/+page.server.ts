import { error } from "@sveltejs/kit";
import { content } from "#lib/server/content.ts";
import { renderMarkdown } from "#lib/server/markdown.ts";

export function entries() {
  return content.stations.map(({ slug }) => ({ slug }));
}

export function load({ params }) {
  const station = content.stations.find((s) => s.slug === params.slug);
  if (!station) error(404, "No station has that slug.");
  const { hash: _hash, body, ...work } = station;
  return { work, html: renderMarkdown(body) };
}
