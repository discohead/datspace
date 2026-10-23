/**
 * The network clock: whole bars since 1973-01-01T00:00:00Z, the year Carl
 * Hewitt proposed the actor model. Every page computes the same bar from the
 * same tempo, so nothing ticks on a server.
 *
 * These functions are pure. Callers pass the current time in, which keeps the
 * tuner and the tests deterministic.
 */

export const GENESIS_MS = Date.UTC(1973, 0, 1);

export function msPerBar(bpm: number, beatsPerBar: number): number {
  if (!(bpm > 0) || !Number.isFinite(bpm)) {
    throw new RangeError(`bpm must be a positive number, got ${bpm}`);
  }
  if (!Number.isInteger(beatsPerBar) || beatsPerBar < 1) {
    throw new RangeError(`beatsPerBar must be a positive integer, got ${beatsPerBar}`);
  }
  return (60_000 / bpm) * beatsPerBar;
}

export function barAt(nowMs: number, bpm: number, beatsPerBar: number): number {
  return Math.floor((nowMs - GENESIS_MS) / msPerBar(bpm, beatsPerBar));
}
