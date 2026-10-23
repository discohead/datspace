import { content } from "#lib/server/content.ts";

export function load() {
  return {
    stations: content.stations.map(({ slug, title, frequency, domain, status, summary }) => ({
      slug,
      title,
      frequency,
      domain,
      status,
      summary,
    })),
  };
}
