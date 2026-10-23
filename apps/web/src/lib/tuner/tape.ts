/**
 * The tape: the stations a visitor locked, in order. It lives in this tab's
 * sessionStorage and is never sent anywhere.
 */

export interface TapeEntry {
  slug: string;
  title: string;
  frequency: number;
  /** Epoch milliseconds. */
  at: number;
}

const KEY = "datspace:tape";
const MAX = 50;

export function readTape(storage: Storage | undefined = globalThis.sessionStorage): TapeEntry[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

/** Appends a lock unless it repeats the last one. Returns the tape. */
export function recordLock(
  entry: TapeEntry,
  storage: Storage | undefined = globalThis.sessionStorage,
): TapeEntry[] {
  const tape = readTape(storage);
  if (tape.at(-1)?.slug === entry.slug) return tape;
  const next = [...tape, entry].slice(-MAX);
  try {
    storage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked; the tape is a convenience.
  }
  return next;
}

export function clearTape(storage: Storage | undefined = globalThis.sessionStorage): void {
  try {
    storage?.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

function isEntry(value: unknown): value is TapeEntry {
  const v = value as TapeEntry;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.slug === "string" &&
    typeof v.title === "string" &&
    typeof v.frequency === "number" &&
    typeof v.at === "number"
  );
}
