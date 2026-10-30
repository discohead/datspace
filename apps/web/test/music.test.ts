import { describe, expect, it } from "vitest";
import { CATALOG, catalogNumber } from "../src/lib/music/catalog.ts";
import {
  SCALES,
  SCALE_NAMES,
  TEMPOS,
  frequency,
  keyName,
  noteName,
  onsets,
  pitches,
  readScore,
  velocity,
} from "../src/lib/music/score.ts";
import { glyphBits } from "../src/lib/tuner/glyph.ts";

async function seed(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** An n×n bitmap from rows of "#" (lit) and "." (unlit). */
function bitmap(rows: string[]): Uint8Array {
  return Uint8Array.from(rows.join(""), (c) => (c === "#" ? 1 : 0));
}

describe("catalog", () => {
  it("numbers twelve sleeves from DSM001 to DSM012, none pressed", () => {
    expect(CATALOG).toHaveLength(12);
    expect(CATALOG[0]!.number).toBe("DSM001");
    expect(CATALOG[11]!.number).toBe("DSM012");
    expect(catalogNumber(99)).toBe("DSM100");
    expect(CATALOG.every((entry) => entry.status === "unpressed")).toBe(true);
  });
});

describe("reading a sleeve", () => {
  const rows = [
    "##.##.##",
    "........",
    ".#....#.",
    "...##...",
    "########",
    ".##..##.",
    "#......#",
    ".#.##.#.",
  ];
  const bits = bitmap(rows);

  it("plays only where a run of lit cells begins in the left half", () => {
    expect(rows.map((_, y) => onsets(bits, 8, y))).toEqual([
      [
        { column: 0, width: 2 },
        { column: 3, width: 2 },
      ],
      [],
      [{ column: 1, width: 1 }],
      // A run that crosses the middle is measured whole.
      [{ column: 3, width: 2 }],
      [{ column: 0, width: 8 }],
      [{ column: 1, width: 2 }],
      // The mirror's cells start runs too, but the right half is silent.
      [{ column: 0, width: 1 }],
      [
        { column: 1, width: 1 },
        { column: 3, width: 2 },
      ],
    ]);
  });

  it("lays twelve degrees of a scale across the left half, lowest at the left edge", () => {
    expect(pitches("minor pentatonic", 48, 12)).toEqual([48, 51, 53, 55, 58, 60, 63, 65, 67, 70, 72, 75]);
    expect(pitches("dorian", 50, 12)).toEqual([50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69]);
    for (const scale of SCALE_NAMES) {
      const notes = pitches(scale, 48, 12);
      expect(notes[0]).toBe(48);
      for (let i = 1; i < notes.length; i++) expect(notes[i]).toBeGreaterThan(notes[i - 1]!);
      expect(SCALES[scale][0]).toBe(0);
    }
  });

  it("plays a wider run louder", () => {
    expect(velocity(1)).toBeCloseTo(0.65);
    expect(velocity(8)).toBe(1);
    expect(velocity(24)).toBe(1);
    for (let w = 1; w < 12; w++) expect(velocity(w + 1)).toBeGreaterThanOrEqual(velocity(w));
  });

  it("takes the scale, root, and tempo from bytes 16 to 18 of the seed", () => {
    const seedHex = "00".repeat(16) + "02" + "0e" + "05" + "00".repeat(13);
    const score = readScore(seedHex, new Uint8Array(24 * 24));
    expect(score).toMatchObject({ scale: SCALE_NAMES[2], root: 2, bpm: TEMPOS[1] });
    expect(keyName(score)).toBe("D dorian");
    expect(score.steps).toHaveLength(24);
    expect(score.steps.every((step) => step.length === 0)).toBe(true);
  });

  it("reads every sleeve in the catalog the same way twice, from its own glyph", async () => {
    for (const entry of CATALOG) {
      const seedHex = await seed(entry.number.toLowerCase());
      const glyph = glyphBits(seedHex);
      const score = readScore(seedHex, glyph);
      expect(readScore(seedHex, glyphBits(seedHex))).toEqual(score);
      expect(SCALE_NAMES).toContain(score.scale);
      expect(TEMPOS).toContain(score.bpm);
      expect(score.steps).toHaveLength(24);

      const notes = pitches(score.scale, 48 + score.root, 12);
      let count = 0;
      score.steps.forEach((step, y) => {
        step.forEach((note, i) => {
          expect(note.column).toBeLessThan(12);
          expect(glyph[y * 24 + note.column]).toBe(1);
          if (note.column > 0) expect(glyph[y * 24 + note.column - 1]).toBe(0);
          expect(note.midi).toBe(notes[note.column]);
          if (i > 0) expect(note.column - step[i - 1]!.column).toBeGreaterThanOrEqual(2);
        });
        count += step.length;
      });
      expect(count).toBeGreaterThan(0);
    }
  });

  it("rejects a short seed and a glyph of the wrong size", () => {
    expect(() => readScore("abc", new Uint8Array(24 * 24))).toThrow(RangeError);
    expect(() => readScore("0".repeat(64), new Uint8Array(10))).toThrow(RangeError);
  });
});

describe("notes", () => {
  it("names notes in scientific pitch notation", () => {
    expect([48, 60, 61, 63, 69, 70, 86].map(noteName)).toEqual(["C3", "C4", "C#4", "Eb4", "A4", "Bb4", "D6"]);
  });

  it("tunes A4 to 440 Hz in equal temperament", () => {
    expect(frequency(69)).toBe(440);
    expect(frequency(81)).toBe(880);
    expect(frequency(60)).toBeCloseTo(261.626, 3);
  });
});
