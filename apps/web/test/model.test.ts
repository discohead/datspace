import { describe, expect, it } from "vitest";
import {
  type DialStation,
  formatFragment,
  isLocked,
  nearestLive,
  parseFragment,
  sigma,
  snrDb,
  stationPitch,
  tune,
  valueText,
} from "../src/lib/tuner/model.ts";

function station(slug: string, frequency: number, status: "live" | "unlit" = "live"): DialStation {
  return { slug, title: slug, frequency, domain: "datspace.io", status, summary: "", glyphSeed: "0".repeat(64) };
}

const stations = [station("a", 88.7), station("later", 90.5, "unlit"), station("b", 92.3)];

describe("tuner model", () => {
  it("clamps to the dial and rounds to 0.1", () => {
    expect(tune(80)).toBe(87.5);
    expect(tune(120)).toBe(108);
    expect(tune(92.34)).toBe(92.3);
    expect(tune(92.35)).toBe(92.4);
    expect(tune(Number.NaN)).toBe(87.5);
  });

  it("finds the nearest live station and its live index", () => {
    expect(nearestLive(stations, 90.4)).toMatchObject({ station: { slug: "a" }, index: 0 });
    expect(nearestLive(stations, 91.0)).toMatchObject({ station: { slug: "b" }, index: 1 });
    expect(nearestLive([station("x", 95, "unlit")], 95)).toBeNull();
  });

  it("maps distance to σ", () => {
    expect(sigma(0)).toBe(0.03);
    expect(sigma(0.1)).toBeCloseTo(0.0625);
    expect(sigma(1.6)).toBe(1);
    expect(sigma(5)).toBe(1);
  });

  it("locks within about 0.19 MHz", () => {
    expect(isLocked(sigma(0.1))).toBe(true);
    expect(isLocked(sigma(0.2))).toBe(false);
  });

  it("clamps SNR to −20…+30 dB", () => {
    expect(snrDb(0.03)).toBe(30);
    expect(snrDb(0.5)).toBeCloseTo(0);
    expect(snrDb(1)).toBe(-20);
  });

  it("describes the position for screen readers", () => {
    expect(valueText(88.7, stations[0]!)).toBe("88.7 MHz, a");
    expect(valueText(90, null)).toBe("90.0 MHz, between stations");
  });

  it("round-trips the fragment and ignores junk", () => {
    expect(parseFragment(formatFragment(96.1))).toBe(96.1);
    expect(parseFragment("#100")).toBe(100);
    expect(parseFragment("#ai")).toBeNull();
    expect(parseFragment("#200.0")).toBeNull();
    expect(parseFragment("")).toBeNull();
  });

  it("tunes each station a fourth above the last", () => {
    expect(stationPitch(0)).toBe(110);
    expect(stationPitch(12 / 5)).toBeCloseTo(220);
  });
});
