import { describe, expect, it } from "vitest";
import { glyphBits, stationHue } from "../src/lib/tuner/glyph.ts";

async function seed(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

describe("glyphs", () => {
  it("is deterministic per seed and differs across seeds", async () => {
    const a = await seed("datspace");
    const b = await seed("agent-native-interface");
    expect(glyphBits(a)).toEqual(glyphBits(a));
    expect(glyphBits(a)).not.toEqual(glyphBits(b));
  });

  it("is mirror-symmetric with density between 30% and 60%", async () => {
    for (const slug of ["datspace", "agent-native-interface", "aux", "mixpanel-headless", "1-bit-studies", "x"]) {
      const n = 24;
      const bits = glyphBits(await seed(slug), n);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) expect(bits[y * n + x]).toBe(bits[y * n + (n - 1 - x)]);
      }
      const density = bits.reduce((s, b) => s + b, 0) / bits.length;
      expect(density).toBeGreaterThanOrEqual(0.3);
      expect(density).toBeLessThanOrEqual(0.6);
    }
  });

  it("rejects a short seed", () => {
    expect(() => glyphBits("abc")).toThrow(RangeError);
  });

  it("gives each station a valid color", async () => {
    const [r, g, b] = stationHue(await seed("datspace"));
    for (const c of [r, g, b]) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });
});
