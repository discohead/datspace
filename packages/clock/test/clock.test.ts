import { describe, expect, it } from "vitest";
import { GENESIS_MS, barAt, msPerBar } from "../src/index.ts";

describe("clock", () => {
  it("starts at bar 0 on 1973-01-01", () => {
    expect(GENESIS_MS).toBe(Date.parse("1973-01-01T00:00:00Z"));
    expect(barAt(GENESIS_MS, 120, 4)).toBe(0);
  });

  it("reaches bar 1 exactly one bar later", () => {
    expect(msPerBar(120, 4)).toBe(2000);
    expect(barAt(GENESIS_MS + 2000, 120, 4)).toBe(1);
  });

  it("floors fractional bars", () => {
    expect(barAt(GENESIS_MS + 1999, 120, 4)).toBe(0);
    expect(barAt(GENESIS_MS + 4500, 120, 4)).toBe(2);
  });

  it("rejects a non-positive bpm", () => {
    expect(() => barAt(GENESIS_MS, 0, 4)).toThrow(RangeError);
    expect(() => msPerBar(-120, 4)).toThrow(RangeError);
  });

  it("rejects a bar with no beats", () => {
    expect(() => msPerBar(120, 0)).toThrow(RangeError);
  });
});
