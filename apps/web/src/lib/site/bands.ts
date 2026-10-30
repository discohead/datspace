/**
 * The six bands on the receiver, one per domain. datspace.studio is served by
 * patter's own Worker; every other band's front page is a route on this site.
 */
export const BANDS = [
  { band: "io", domain: "datspace.io", live: true },
  { band: "ai", domain: "datspace.ai", live: true },
  { band: "dev", domain: "datspace.dev", live: true },
  { band: "fm", domain: "datspace.fm", live: true },
  { band: "music", domain: "datspace.music", live: true },
  { band: "studio", domain: "datspace.studio", live: true },
] as const;

export type Band = (typeof BANDS)[number]["band"];

/** The band this page is being served on, from the browser's host. */
export function currentBand(hostname: string): Band {
  if (hostname.startsWith("datspace-ai.")) return "ai";
  return BANDS.find((b) => b.domain === hostname)?.band ?? "io";
}

/**
 * Where a band's button goes. Crossing domains is a cut, not a transition, so
 * the dial position rides along in the fragment. Unlit bands go to datspace.io.
 */
export function bandHref(band: (typeof BANDS)[number], fragment = ""): string {
  return band.live ? `https://${band.domain}/${fragment}` : "https://datspace.io/";
}

/**
 * The dial, from wherever this page is served. On a band's own domain "/" is
 * the band's page, so the dial is a full URL; on datspace.io and in local
 * development it stays a path.
 */
export function dialHref(hostname: string, fragment = ""): string {
  const away = hostname.startsWith("datspace.") && currentBand(hostname) !== "io";
  return `${away ? "https://datspace.io" : ""}/${fragment}`;
}
