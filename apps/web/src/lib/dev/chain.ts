import type { LedgerEvent } from "@datspace/contract";
import { GENESIS_HASH, ledgerHash } from "@datspace/contract/hash";

/** The Ledger's page size on /ledger.json. */
export const PAGE_SIZE = 100;

/** /ledger.json is same-origin on datspace.dev; anywhere else, including local development, it's datspace.ai's. */
export function ledgerUrl(hostname: string): string {
  return hostname === "datspace.dev" ? "/ledger.json" : "https://datspace.ai/ledger.json";
}

export class LogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogError";
  }
}

export interface ReadOptions {
  fetch?: typeof fetch;
  /** Called after each page with the number of events read so far. */
  onPage?: (read: number) => void;
}

/**
 * Reads the whole log, newest first: one page, then the events before the
 * oldest so far, until seq 1 or an empty page. A page that fails, isn't
 * events, or doesn't move backward stops the read with a LogError.
 */
export async function readLog(url: string, options: ReadOptions = {}): Promise<LedgerEvent[]> {
  const get = options.fetch ?? fetch;
  const events: LedgerEvent[] = [];
  let before = Infinity;
  while (before > 1) {
    const pageUrl = before === Infinity ? url : `${url}?before=${before}`;
    const page = await readPage(get, pageUrl);
    if (page.length === 0) break;
    const oldest = Math.min(...page.map((event) => event.seq));
    if (Math.max(...page.map((event) => event.seq)) >= before) {
      throw new LogError(`${pageUrl} returned events at or after seq ${before}, so it can't be paged backward.`);
    }
    events.push(...page);
    before = oldest;
    options.onPage?.(events.length);
  }
  return events;
}

async function readPage(get: typeof fetch, url: string): Promise<LedgerEvent[]> {
  let res: Response;
  try {
    res = await get(url, { cache: "no-store" });
  } catch {
    throw new LogError(`Couldn't fetch ${url}.`);
  }
  if (!res.ok) throw new LogError(`${url} returned ${res.status}.`);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new LogError(`${url} didn't return JSON.`);
  }
  const events = (body as { events?: unknown } | null)?.events;
  if (!Array.isArray(events) || !events.every(isEvent)) {
    throw new LogError(`${url} didn't return a list of ledger events.`);
  }
  return events;
}

/** Enough of the contract's LedgerEvent to hash it. The hash itself proves the rest. */
function isEvent(value: unknown): value is LedgerEvent {
  if (value === null || typeof value !== "object") return false;
  const { seq, at, type, data, prevHash, hash } = value as Record<string, unknown>;
  return (
    Number.isInteger(seq) &&
    typeof at === "string" &&
    typeof type === "string" &&
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    typeof prevHash === "string" &&
    typeof hash === "string"
  );
}

export interface Verification {
  /** Events whose hashes were recomputed: all of them. */
  checked: number;
  /** The unbroken run from seq 1, or null if there isn't one. */
  verified: { from: 1; to: number } | null;
  /** The first place the chain doesn't hold, and why. */
  broken: { seq: number; reason: string } | null;
}

/**
 * Checks the chain from the genesis hash: seq runs 1, 2, 3 with no gaps, each
 * prevHash is the hash before it, and each hash is
 * SHA-256(prevHash + "\n" + canonicalJson({ seq, at, type, data })).
 * Every hash is recomputed; the first break is reported.
 */
export async function verifyChain(events: readonly LedgerEvent[]): Promise<Verification> {
  const ascending = [...events].sort((a, b) => a.seq - b.seq);
  const hashes = await Promise.all(ascending.map((event) => ledgerHash(event.prevHash, event)));

  let prev = { seq: 0, hash: GENESIS_HASH };
  for (const [i, event] of ascending.entries()) {
    const broken = check(event, hashes[i]!, prev);
    if (broken) return { checked: ascending.length, verified: run(prev.seq), broken };
    prev = event;
  }
  return { checked: ascending.length, verified: run(prev.seq), broken: null };
}

function run(to: number): Verification["verified"] {
  return to > 0 ? { from: 1, to } : null;
}

function check(event: LedgerEvent, hash: string, prev: { seq: number; hash: string }): Verification["broken"] {
  if (event.seq === prev.seq) return { seq: event.seq, reason: "It appears twice." };
  if (event.seq !== prev.seq + 1) {
    return { seq: prev.seq + 1, reason: prev.seq === 0 ? `The log starts at seq ${event.seq}.` : "It's missing." };
  }
  if (event.prevHash !== prev.hash) {
    return { seq: event.seq, reason: prev.seq === 0 ? "Its prevHash isn't the genesis hash." : `Its prevHash isn't seq ${prev.seq}'s hash.` };
  }
  if (hash !== event.hash) return { seq: event.seq, reason: "Its hash doesn't match its contents." };
  return null;
}

/** Events per type, most common first. */
export function countTypes(events: readonly LedgerEvent[]): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const { type } of events) counts.set(type, (counts.get(type) ?? 0) + 1);
  return [...counts]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}
