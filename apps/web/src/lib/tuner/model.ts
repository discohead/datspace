import { DIAL_MAX, DIAL_MIN } from "@datspace/contract";

export { DIAL_MAX, DIAL_MIN };

/** What the tuner needs to know about a station. */
export interface DialStation {
  slug: string;
  title: string;
  frequency: number;
  domain: string;
  status: "live" | "unlit";
  summary: string;
  glyphSeed: string;
}

export const STEP = 0.1;

/** σ at or below this locks the station. */
export const LOCK_SIGMA = 0.12;

/** Distance in MHz at which the static fully returns (σ = 1). */
export const FALLOFF_MHZ = 1.6;

/** Clamps to the dial and rounds to the nearest 0.1 MHz. */
export function tune(frequency: number): number {
  if (!Number.isFinite(frequency)) return DIAL_MIN;
  const clamped = Math.min(DIAL_MAX, Math.max(DIAL_MIN, frequency));
  return Math.round(clamped * 10) / 10;
}

export interface Nearest {
  station: DialStation;
  index: number;
  distance: number;
}

/** The nearest live station and its index among live stations, or null if none are live. */
export function nearestLive(stations: readonly DialStation[], frequency: number): Nearest | null {
  let best: Nearest | null = null;
  let index = 0;
  for (const station of stations) {
    if (station.status !== "live") continue;
    const distance = Math.abs(station.frequency - frequency);
    if (!best || distance < best.distance) best = { station, index, distance };
    index++;
  }
  return best;
}

/** The noise level: 0.03 on a station, 1 at 1.6 MHz or more away. */
export function sigma(distance: number): number {
  return Math.min(1, Math.max(0.03, distance / FALLOFF_MHZ));
}

export function isLocked(s: number): boolean {
  return s < LOCK_SIGMA;
}

/** Signal-to-noise in dB, clamped to −20…+30 for the readout. */
export function snrDb(s: number): number {
  if (s >= 1) return -20;
  const db = 20 * Math.log10((1 - s) / s);
  return Math.min(30, Math.max(-20, db));
}

export function formatFrequency(frequency: number): string {
  return frequency.toFixed(1);
}

export function valueText(frequency: number, locked: DialStation | null): string {
  return `${formatFrequency(frequency)} MHz, ${locked ? locked.title : "between stations"}`;
}

/** Reads `#96.1` into a frequency on the dial; anything else is null. */
export function parseFragment(hash: string): number | null {
  const match = /^#?(\d{2,3}(?:\.\d)?)$/.exec(hash.trim());
  if (!match) return null;
  const value = Number(match[1]);
  return value >= DIAL_MIN && value <= DIAL_MAX ? tune(value) : null;
}

export function formatFragment(frequency: number): string {
  return `#${formatFrequency(frequency)}`;
}

/** The sine heard at a lock: a fourth above the last, from A2. Used by phase 03's sound. */
export function stationPitch(index: number): number {
  return 110 * 2 ** ((index * 5) / 12);
}
