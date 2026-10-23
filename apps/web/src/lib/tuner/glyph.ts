/**
 * Every station's signal is a 1-bit glyph grown from its seed: the SHA-256 of
 * its slug at launch, its Work actor's id after. No photography, no video.
 */

/** sfc32 seeded from the first 16 bytes of a hex seed. */
function prng(seedHex: string): () => number {
  const words = [0, 1, 2, 3].map((i) => Number.parseInt(seedHex.slice(i * 8, i * 8 + 8), 16) >>> 0);
  let [a, b, c, d] = words as [number, number, number, number];
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

const MIN_DENSITY = 0.3;
const MAX_DENSITY = 0.6;

/**
 * An n×n bitmap, row-major, 1 for lit. Random left half, mirrored, then two
 * smoothing passes so it reads as a shape rather than noise. If the result is
 * too sparse or too dense, the fill is nudged and the glyph grown again, still
 * from the same seed.
 */
export function glyphBits(seedHex: string, n = 24): Uint8Array {
  return glyphSteps(seedHex, n).at(-1)!;
}

/**
 * The stages of the accepted glyph: the mirrored random field, then each
 * smoothing pass. The last stage is the glyph. The 1-bit studies draw these.
 */
export function glyphSteps(seedHex: string, n = 24): Uint8Array[] {
  if (!/^[0-9a-f]{32,}$/i.test(seedHex)) throw new RangeError("glyph seed must be at least 32 hex digits");
  const random = prng(seedHex);
  // Skip the first outputs; sfc32 needs a few rounds to mix a raw seed.
  for (let i = 0; i < 12; i++) random();

  let fill = 0.42 + random() * 0.12;
  let steps = grow(random, n, fill);
  for (let attempt = 0; attempt < 16; attempt++) {
    const d = density(steps.at(-1)!);
    if (d >= MIN_DENSITY && d <= MAX_DENSITY) break;
    fill += d < MIN_DENSITY ? 0.03 : -0.03;
    steps = grow(random, n, fill);
  }
  return steps;
}

function grow(random: () => number, n: number, fill: number): Uint8Array[] {
  const bits: Uint8Array = new Uint8Array(n * n);
  const half = Math.ceil(n / 2);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < half; x++) {
      const lit = random() < fill ? 1 : 0;
      bits[y * n + x] = lit;
      bits[y * n + (n - 1 - x)] = lit;
    }
  }
  const steps = [bits];
  for (let pass = 0; pass < 2; pass++) steps.push(smooth(steps.at(-1)!, n));
  return steps;
}

function density(bits: Uint8Array): number {
  return bits.reduce((sum, b) => sum + b, 0) / bits.length;
}

/** One cellular-automaton step: a cell lives with five or more lit neighbors (counting itself). */
function smooth(bits: Uint8Array, n: number): Uint8Array {
  const next = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy >= 0 && yy < n && xx >= 0 && xx < n) count += bits[yy * n + xx]!;
        }
      }
      next[y * n + x] = count >= 5 ? 1 : 0;
    }
  }
  return next;
}

/** The station's color, shown only while it's locked: a hue from the seed at fixed saturation and lightness. */
export function stationHue(seedHex: string): [number, number, number] {
  const hue = (Number.parseInt(seedHex.slice(-6), 16) % 360) / 360;
  return hslToRgb(hue, 0.85, 0.6);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const u = ((t % 1) + 1) % 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}
