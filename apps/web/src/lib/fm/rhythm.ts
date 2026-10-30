/**
 * Rhythm generators. Both return one bar of steps, true for a hit, and both
 * are pure, so a station's bar 41,000,000 plays the same for every listener.
 */

/** `hits` spread as evenly as possible over `steps`, turned right by `rotate`. */
export function euclid(hits: number, steps: number, rotate = 0): boolean[] {
  const k = Math.max(0, Math.min(steps, Math.round(hits)));
  return Array.from({ length: steps }, (_, i) => {
    const j = (((i - rotate) % steps) + steps) % steps;
    return k > 0 && Math.floor(((j + 1) * k) / steps) - Math.floor((j * k) / steps) === 1;
  });
}

/**
 * The 32 sixteen-step primes, masks, and factors of the Numeric Repetitor, as
 * Curves for Processing implements it in NR.java: a prime pattern, optionally
 * masked, multiplied by a factor, and folded back into 16 bits.
 */
const PRIMES = [
  0x8888, 0x888a, 0x8892, 0x8894, 0x88a2, 0x88a4, 0x8912, 0x8914, 0x8922, 0x8924, 0x8a8a, 0x8aaa, 0x9292, 0x92aa, 0x94aa,
  0x952a, 0x8282, 0x828a, 0x8292, 0x82a2, 0x8484, 0x848a, 0x8492, 0x8494, 0x84a2, 0x84a4, 0x850a, 0x8512, 0x8514, 0x8522,
  0x8524, 0x8544,
];
const MASKS = [0xffff, 0x0f0f, 0xf003, 0x01f0];

export function nr(prime: number, mask: number, factor: number): boolean[] {
  const p = PRIMES[((prime % 32) + 32) % 32]!;
  const m = MASKS[((mask % 4) + 4) % 4]!;
  const f = ((factor % 17) + 17) % 17;
  const product = (p & m) * f;
  const pattern = (product & 0xffff) | (product >>> 16);
  return Array.from({ length: 16 }, (_, i) => ((pattern >>> (15 - i)) & 1) === 1);
}

/** How many hits a pattern has. */
export function count(pattern: readonly boolean[]): number {
  return pattern.reduce((n, hit) => n + (hit ? 1 : 0), 0);
}
