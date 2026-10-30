/**
 * patter's takes, recovered. Until October 30, 2026, patter ran at
 * datspace.fm and kept its recordings in that origin's IndexedDB: metadata in
 * the "takes" store, 24-bit PCM in "parts" under [id, index]. Browsers show a
 * site's storage only to that site, so this has to run on datspace.fm. It
 * only reads: it never creates the database, writes to it, or deletes from it.
 */

export const DB_NAME = "patter-takes";
const BYTES = 3;

/** A take as patter stored it (src/app/takes.ts in github.com/discohead/patter). */
export interface StoredTake {
  id: string;
  kind: "recording" | "capture";
  name: string;
  created: number;
  sampleRate: number;
  channels: number;
  frames: number;
  bars?: number;
  bpm?: number;
  patch: string;
  /** [min, max] pairs of the mono mix, one pair per 50 ms. */
  peaks: Float32Array;
  /** The page closed while it was still recording. */
  open: boolean;
  /** Some of it was never stored, so only part of it is here. */
  volatile?: boolean;
}

/** A 44-byte header for 24-bit PCM. */
export function wavHeader(frames: number, channels: number, sampleRate: number): Uint8Array {
  const block = channels * BYTES;
  const size = frames * block;
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);
  const ascii = (at: number, text: string) => [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + size, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * block, true);
  view.setUint16(32, block, true);
  view.setUint16(34, BYTES * 8, true);
  ascii(36, "data");
  view.setUint32(40, size, true);
  return header;
}

/**
 * The parts that make up a take's audio, and how many frames they hold. A
 * finished take stops at its own length, because its last part can run past
 * it. A take the page closed on keeps everything that was stored, because its
 * length was last written a part or two before the end.
 */
export function takeAudio(take: StoredTake, parts: Uint8Array[]): { body: Uint8Array[]; frames: number } {
  const block = take.channels * BYTES;
  const stored = parts.reduce((sum, p) => sum + p.length, 0);
  const wanted = take.open ? stored : Math.min(stored, take.frames * block);
  const usable = wanted - (wanted % block);
  const body: Uint8Array[] = [];
  let left = usable;
  for (const part of parts) {
    if (left <= 0) break;
    const use = part.length <= left ? part : part.subarray(0, left);
    body.push(use);
    left -= use.length;
  }
  return { body, frames: usable / block };
}

/** The WAV file patter would have downloaded. */
export function takeWav(take: StoredTake, parts: Uint8Array[]): Blob {
  const { body, frames } = takeAudio(take, parts);
  return new Blob([wavHeader(frames, take.channels, take.sampleRate), ...body] as BlobPart[], { type: "audio/wav" });
}

/** patter's file name for a take: patch, take, and when, in local time. */
export function takeFileName(take: StoredTake): string {
  const d = new Date(take.created);
  const pad = (n: number) => String(n).padStart(2, "0");
  const when = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())}`;
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
  return `${safe(take.patch) || "patter"} - ${safe(take.name)} ${when}.wav`;
}

/** "1:07", or "1:02:03" past an hour. */
export function duration(frames: number, sampleRate: number): string {
  const total = Math.round(frames / sampleRate);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** The waveform as one-bit columns: for each of `columns` columns, the lowest and highest point, from -1 to 1. */
export function waveform(peaks: Float32Array, columns: number): [number, number][] {
  const pairs = Math.floor(peaks.length / 2);
  if (pairs === 0) return [];
  return Array.from({ length: Math.min(columns, pairs) }, (_, c) => {
    const from = Math.floor((c * pairs) / Math.min(columns, pairs));
    const to = Math.max(from + 1, Math.floor(((c + 1) * pairs) / Math.min(columns, pairs)));
    let lo = 1;
    let hi = -1;
    for (let i = from; i < to; i++) {
      lo = Math.min(lo, peaks[2 * i]!);
      hi = Math.max(hi, peaks[2 * i + 1]!);
    }
    return [Math.max(-1, lo), Math.min(1, hi)];
  });
}

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/**
 * Opens patter's database if this origin has one, and resolves null if it
 * doesn't. Opening a database that doesn't exist would create it, so the
 * upgrade that creation needs is aborted.
 */
export function openTakes(idb: IDBFactory = indexedDB): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const r = idb.open(DB_NAME);
    r.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) r.transaction?.abort();
    };
    r.onsuccess = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("takes") || !db.objectStoreNames.contains("parts")) {
        db.close();
        resolve(null);
      } else {
        resolve(db);
      }
    };
    r.onerror = (event) => {
      if (r.error?.name === "AbortError") {
        event.preventDefault();
        resolve(null);
      } else {
        reject(r.error);
      }
    };
  });
}

/** Every take, newest first. */
export async function listTakes(db: IDBDatabase): Promise<StoredTake[]> {
  const takes = await request(db.transaction("takes", "readonly").objectStore("takes").getAll() as IDBRequest<StoredTake[]>);
  return takes.sort((a, b) => b.created - a.created);
}

/** A take's stored parts, in order. */
export async function readParts(db: IDBDatabase, take: StoredTake): Promise<Uint8Array[]> {
  const store = db.transaction("parts", "readonly").objectStore("parts");
  const range = IDBKeyRange.bound([take.id, 0], [take.id, Infinity]);
  const [keys, values] = await Promise.all([request(store.getAllKeys(range)), request(store.getAll(range) as IDBRequest<Uint8Array[]>)]);
  return keys
    .map((key, i) => [(key as [string, number])[1], values[i]!] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([, bytes]) => bytes);
}
