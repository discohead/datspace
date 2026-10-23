import { error } from "@sveltejs/kit";
import { content } from "#lib/server/content.ts";
import { renderMarkdown } from "#lib/server/markdown.ts";

const STUDIES = "1-bit-studies";

export function entries() {
  return content.stations.map(({ slug }) => ({ slug }));
}

export function load({ params }) {
  const station = content.stations.find((s) => s.slug === params.slug);
  if (!station) error(404, "No station has that slug.");
  const { hash: _hash, body, ...work } = station;
  // The studies station plays with every live station's glyph.
  const seeds =
    station.slug === STUDIES
      ? content.stations.filter((s) => s.status === "live").map(({ slug, title, glyphSeed }) => ({ slug, title, glyphSeed }))
      : [];
  return { work, html: renderMarkdown(body), seeds };
}
