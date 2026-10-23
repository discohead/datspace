/**
 * Hashing shared by the content build and the Ledger. Web Crypto only, so the
 * same code runs in Node, Workers, and browsers.
 */

/** JSON with object keys sorted at every depth, so equal values hash equally. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The first event's `prevHash`. */
export const GENESIS_HASH = "0".repeat(64);

/**
 * Each event's hash covers the previous one, so changing any row breaks every
 * hash after it. Anyone holding the events from `/api/ledger` can check this.
 */
export function ledgerHash(
  prevHash: string,
  event: { seq: number; at: string; type: string; data: unknown },
): Promise<string> {
  const { seq, at, type, data } = event;
  return sha256Hex(`${prevHash}\n${canonicalJson({ seq, at, type, data })}`);
}
