/**
 * A sleeve read as a score, the way a player piano reads its roll. Rows are
 * steps, top to bottom. The cells across each row's left half are notes of a
 * scale, lowest at the left edge; the right half is the mirror image and stays
 * silent. A note sounds only where a run of lit cells begins, and a wider run
 * plays it louder. Bytes 16 to 18 of the seed pick the scale, the root, and the
 * tempo; the glyph grows from bytes 0 to 15, so the two never share a byte.
 */

/** Semitones above the root. */
export const SCALES = {
  "minor pentatonic": [0, 3, 5, 7, 10],
  "major pentatonic": [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
} as const satisfies Record<string, readonly number[]>;

export type Scale = keyof typeof SCALES;
export const SCALE_NAMES = Object.keys(SCALES) as Scale[];

/** Each row is an eighth note at one of these tempos, so 24 rows make three bars of 4/4. */
export const TEMPOS = [100, 112, 120, 128] as const;

/** Roots run from C3 up to B3. */
const LOWEST_ROOT = 48;

/** Pitch classes, spelled the way keys usually are. */
const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;

/** A wider run plays louder, up to this many cells. */
const LOUDEST_WIDTH = 8;

export interface Onset {
  /** Column in the left half, 0 at the left edge. */
  column: number;
  /** Width of the run this cell begins, across the whole row, mirror included. */
  width: number;
}

export interface Note {
  column: number;
  /** MIDI note number. */
  midi: number;
  velocity: number;
}

export interface Score {
  scale: Scale;
  /** Pitch class of the root, 0 for C. */
  root: number;
  bpm: number;
  /** The notes each row plays, top to bottom. An empty row is a rest. */
  steps: Note[][];
}

/**
 * Where runs of lit cells begin in row `y` of an n×n bitmap's left half: lit
 * cells whose left neighbor is unlit or off the edge. Two onsets in a row are
 * at least two columns apart, so a row never sounds neighboring scale degrees.
 */
export function onsets(bits: Uint8Array, n: number, y: number): Onset[] {
  const lit = (x: number) => bits[y * n + x] === 1;
  const found: Onset[] = [];
  for (let x = 0; x < Math.ceil(n / 2); x++) {
    if (!lit(x) || (x > 0 && lit(x - 1))) continue;
    let end = x;
    while (end + 1 < n && lit(end + 1)) end++;
    found.push({ column: x, width: end - x + 1 });
  }
  return found;
}

/** `count` ascending MIDI notes: consecutive degrees of the scale from the root. */
export function pitches(scale: Scale, rootMidi: number, count: number): number[] {
  const degrees = SCALES[scale];
  return Array.from(
    { length: count },
    (_, i) => rootMidi + 12 * Math.floor(i / degrees.length) + degrees[i % degrees.length]!,
  );
}

/** 0.65 for a single cell, rising to 1 for a run eight cells wide or wider. */
export function velocity(width: number): number {
  return 0.6 + (0.4 * Math.min(width, LOUDEST_WIDTH)) / LOUDEST_WIDTH;
}

/** Reads a sleeve from its seed and the n×n glyph grown from it. */
export function readScore(seedHex: string, bits: Uint8Array, n = 24): Score {
  if (!/^[0-9a-f]{38,}$/i.test(seedHex)) throw new RangeError("score seed must be at least 38 hex digits");
  if (bits.length !== n * n) throw new RangeError(`a ${n}×${n} glyph has ${n * n} cells, not ${bits.length}`);
  const byte = (i: number) => Number.parseInt(seedHex.slice(i * 2, i * 2 + 2), 16);
  const scale = SCALE_NAMES[byte(16) % SCALE_NAMES.length]!;
  const root = byte(17) % 12;
  const bpm = TEMPOS[byte(18) % TEMPOS.length]!;
  const notes = pitches(scale, LOWEST_ROOT + root, Math.ceil(n / 2));
  const steps = Array.from({ length: n }, (_, y) =>
    onsets(bits, n, y).map(({ column, width }) => ({ column, midi: notes[column]!, velocity: velocity(width) })),
  );
  return { scale, root, bpm, steps };
}

/** The root and scale, as in "Eb dorian". */
export function keyName(score: Pick<Score, "root" | "scale">): string {
  return `${NAMES[score.root]} ${score.scale}`;
}

/** Scientific pitch notation, where MIDI 60 is C4. */
export function noteName(midi: number): string {
  return `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Equal temperament, A4 at 440 Hz. */
export function frequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
