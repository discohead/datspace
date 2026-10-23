import { error } from "@sveltejs/kit";
import { content } from "#lib/server/content.ts";

export function entries() {
  return content.stations.map(({ slug }) => ({ slug }));
}

export function load({ params }) {
  const station = content.stations.find((s) => s.slug === params.slug);
  if (!station) error(404, "No station has that slug.");
  const { hash: _hash, glyphSeed: _seed, ...work } = station;
  return { work };
}
