/**
 * Curves, in TypeScript: the sixth port of github.com/discohead/curves-for-processing.
 * A curve maps a position in [0, 1) to a value, usually in [0, 1]. Ops compose,
 * and any rate, phase, amplitude, or bias can be another curve, the way an LFO
 * patches into another LFO. datspace.fm uses the same curves to modulate the
 * music and to draw it.
 */

export type Crv = (pos: number) => number;

/** A parameter: a constant or a curve read at the same position. */
export type P = number | Crv;

const read = (p: P, pos: number): number => (typeof p === "number" ? p : p(pos));
const frac = (x: number): number => x - Math.floor(x);

export interface Mod {
  rate?: P;
  phase?: P;
  amp?: P;
  bias?: P;
}

/** Wraps a unipolar shape with rate, phase, amplitude, and bias, as Crv does in the Java library. */
function shape(op: (x: number, pos: number) => number) {
  return ({ rate = 1, phase = 0, amp = 1, bias = 0 }: Mod = {}): Crv =>
    (pos) => read(amp, pos) * op(frac(pos * read(rate, pos) + read(phase, pos)), pos) + read(bias, pos);
}

export const phasor = shape((x) => x);
export const saw = shape((x) => 1 - x);

/** A triangle; `s` moves its peak, so 0 is a saw and 1 a ramp. */
export const tri = (s: P = 0.5, mod?: Mod): Crv =>
  shape((x, pos) => {
    const k = Math.min(0.999, Math.max(0.001, read(s, pos)));
    return x < k ? x / k : 1 - (x - k) / (1 - k);
  })(mod);

/** A unipolar sine. Feedback bends it toward a saw, as `Ops.sine(fb)` does. */
export const sine = (fb: P = 0, mod?: Mod): Crv =>
  shape((x, pos) => {
    const bent = x + read(fb, pos) * Math.sin(2 * Math.PI * x) * 0.5;
    return Math.sin(2 * Math.PI * bent) * 0.5 + 0.5;
  })(mod);

/** 0 until `w`, then 1. */
export const pulse = (w: P = 0.5, mod?: Mod): Crv => shape((x, pos) => (x < read(w, pos) ? 0 : 1))(mod);

export const easeIn = (e: P = 2, mod?: Mod): Crv => shape((x, pos) => x ** read(e, pos))(mod);
export const easeOut = (e: P = 2, mod?: Mod): Crv => shape((x, pos) => 1 - (1 - x) ** read(e, pos))(mod);

/** Smooth value noise, seeded: the Perlin op's job without the dependency. */
export function noise(seed: number, mod?: Mod): Crv {
  const lattice = (i: number) => {
    let h = Math.imul(i ^ seed, 0x27d4eb2d);
    h ^= h >>> 15;
    h = Math.imul(h, 0x85ebca6b);
    return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  };
  return shape((x, pos) => {
    const t = (pos + x) * 8;
    const i = Math.floor(t);
    const f = t - i;
    const u = f * f * (3 - 2 * f);
    return lattice(i) * (1 - u) + lattice(i + 1) * u;
  })(mod);
}

/** Multiplies two curves, like a ring modulator. */
export const ring = (a: Crv, b: Crv): Crv => (pos) => a(pos) * b(pos);

/** Weighted sum. */
export const mix = (...parts: [Crv, number][]): Crv => (pos) => parts.reduce((sum, [c, w]) => sum + c(pos) * w, 0);

/** Feeds one curve's output into the next as its position. */
export const chain = (...ops: Crv[]): Crv => (pos) => ops.reduce((x, op) => op(x), pos);

/** Reflects anything above `threshold` back under it, and anything below 0 back above, like a wavefolder. */
export const fold = (c: Crv, threshold: P = 1): Crv => (pos) => {
  const t = read(threshold, pos);
  if (t <= 0) return 0;
  const x = frac(c(pos) / (2 * t)) * 2 * t;
  return x > t ? 2 * t - x : x;
};

export const wrap = (c: Crv): Crv => (pos) => frac(c(pos));
export const clip = (c: Crv): Crv => (pos) => Math.min(1, Math.max(0, c(pos)));

/** Rounds to `levels` steps between 0 and 1: the Y resolution of a Crv. */
export const quantize = (c: Crv, levels: number): Crv => (pos) =>
  levels < 2 ? 0 : Math.round(Math.min(1, Math.max(0, c(pos))) * (levels - 1)) / (levels - 1);

/** Holds the value for `steps` equal slices of the position: the X resolution. */
export const hold = (c: Crv, steps: number): Crv => (pos) => c(Math.floor(frac(pos) * steps) / steps);

/** From 0–1 to `lo`–`hi`. */
export const range = (c: Crv, lo: number, hi: number): Crv => (pos) => lo + c(pos) * (hi - lo);
