/** The six bands on the receiver. Unlit bands are on the dial but not live yet. */
export const BANDS = [
  { band: "io", domain: "datspace.io", live: true },
  { band: "ai", domain: "datspace.ai", live: true },
  { band: "dev", domain: "datspace.dev", live: false },
  { band: "fm", domain: "datspace.fm", live: false },
  { band: "music", domain: "datspace.music", live: false },
  { band: "studio", domain: "datspace.studio", live: false },
] as const;

export type Band = (typeof BANDS)[number]["band"];

/** The band this page is being served on, from the browser's host. */
export function currentBand(hostname: string): Band {
  return hostname === "datspace.ai" || hostname.startsWith("datspace-ai.") ? "ai" : "io";
}

/**
 * Where a band's button goes. Crossing domains is a cut, not a transition, so
 * the dial position rides along in the fragment. Unlit bands go to datspace.io.
 */
export function bandHref(band: (typeof BANDS)[number], fragment = ""): string {
  return band.live ? `https://${band.domain}/${fragment}` : "https://datspace.io/";
}
