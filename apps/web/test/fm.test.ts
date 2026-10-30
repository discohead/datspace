import { SCALE_NAMES, SYSTEM_NAMES, type Decision, type Scale, type System } from "@datspace/fm";
import { describe, expect, it } from "vitest";
import {
  HAND_BUS,
  HAND_LAG,
  MACROS,
  MASTER_ID,
  eventsAt,
  handPackets,
  macros,
  startPackets,
  station,
  type Packet,
} from "../src/lib/fm/systems.ts";

const X = `c${HAND_BUS}`;
const Y = `c${HAND_BUS + 1}`;
const KEY = "9e3779b9";

/** A decision for one system: locked, or a near tie with `runnerUp`, so both play. */
function decision(system: System, runnerUp?: System): Decision {
  const systems = Object.fromEntries(SYSTEM_NAMES.map((s) => [s, 0])) as Record<System, number>;
  const scales = Object.fromEntries(SCALE_NAMES.map((s) => [s, s === "dorian" ? 1 : 0])) as Record<Scale, number>;
  systems[system] = runnerUp ? 0.55 : 1;
  if (runnerUp) systems[runnerUp] = 0.45;
  return {
    system,
    systems,
    scale: "dorian",
    scales,
    bpm: 120,
    density: 0.5,
    brightness: 0.5,
    space: 0.5,
    motion: 0.5,
    sigma: runnerUp ? 0.45 / 0.55 : 0.03,
  };
}

/** Every packet a station sends from the moment it starts through its first 64 bars. */
function broadcast(system: System, runnerUp?: System): Packet[] {
  const s = station(decision(system, runnerUp), KEY);
  const packets = startPackets(s);
  for (let step = 0; step < 64 * 16; step++) packets.push(...eventsAt(s, 1_000_000 + step).packets);
  return packets;
}

/** A synth's controls that a /s_new maps to a bus, as [control, bus]: "c0" is control bus 0. */
function mapped(packet: Packet): [string, string][] {
  if (packet[0] !== "/s_new") return [];
  const controls = packet.slice(5);
  const out: [string, string][] = [];
  for (let i = 0; i + 1 < controls.length; i += 2) {
    const value = controls[i + 1];
    if (typeof value === "string") out.push([String(controls[i]), value]);
  }
  return out;
}

describe("the scope's pad", () => {
  it.each(SYSTEM_NAMES)("gives %s a named macro on each axis of the hand, and only those", (system) => {
    const buses = new Set(broadcast(system).flatMap((p) => mapped(p).map(([, bus]) => bus)));
    expect(buses).toEqual(new Set([X, Y]));
    expect(MACROS[system].x).not.toBe(MACROS[system].y);
  });

  it.each(SYSTEM_NAMES)("never has the score of %s set a control the hand holds", (system) => {
    const packets = broadcast(system);
    const held = new Map<number, Set<string>>();
    for (const p of packets) {
      if (p[0] === "/s_new" && typeof p[2] === "number" && p[2] > 0) held.set(p[2], new Set(mapped(p).map(([control]) => control)));
    }
    for (const p of packets) {
      const controls = p[0] === "/n_set" ? held.get(p[1] as number) : undefined;
      if (!controls) continue;
      for (let i = 2; i < p.length; i += 2) expect(controls.has(String(p[i]))).toBe(false);
    }
  });

  it("bends the runner-up too when both play, and names its macros", () => {
    expect(macros(station(decision("fold"), KEY))).toEqual({ x: "fold", y: "cutoff" });
    expect(macros(station(decision("fold", "drone"), KEY))).toEqual({ x: "fold and beating", y: "cutoff and overtones" });
    expect(macros(station(decision("pulse", "bits"), KEY))).toEqual({ x: "decay", y: "index and pitch" });
    const buses = new Set(broadcast("fold", "drone").flatMap((p) => mapped(p).map(([control, bus]) => `${control} ${bus}`)));
    expect(buses).toContain(`fold ${X}`);
    expect(buses).toContain(`detune ${X}`);
  });
});

describe("the hand", () => {
  it("is followed quickly while it's held, and stops at the pad's edges", () => {
    expect(handPackets({ x: 0.25, y: -2 })).toEqual([["/n_set", MASTER_ID, "x", 0.25, "y", -1, "lag", HAND_LAG.held]]);
  });

  it("eases back to the centre, the broadcast, when it lets go", () => {
    expect(handPackets(null)).toEqual([["/n_set", MASTER_ID, "x", 0, "y", 0, "lag", HAND_LAG.released]]);
    expect(HAND_LAG.released).toBeGreaterThan(HAND_LAG.held);
  });

  it("reads a position that isn't a number as the centre", () => {
    expect(handPackets({ x: Number.NaN, y: Number.POSITIVE_INFINITY })).toEqual([["/n_set", MASTER_ID, "x", 0, "y", 0, "lag", HAND_LAG.held]]);
  });
});
