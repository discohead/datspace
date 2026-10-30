import { GENESIS_MS } from "@datspace/clock";
import { hash32, type Decision, type Scale, type System } from "@datspace/fm";
import { fold, quantize, sine, tri, type Crv } from "./crvs.ts";
import { euclid, nr } from "./rhythm.ts";

/**
 * The station's score. Every event is a pure function of the station's key,
 * the bar, and the step, and bars count from 1973-01-01 at the station's
 * tempo, so two listeners with the same answers hear the same thing at the
 * same moment. Nothing here touches audio; engine.ts sends what this returns.
 */

/** An OSC message: address, then arguments. */
export type Packet = [string, ...(string | number)[]];

export interface Timed {
  /** Wall-clock time in epoch milliseconds. */
  at: number;
  packets: Packet[];
}

export const VOICES = 100;
export const MASTER = 200;
export const MIX_BUS = 16;
const STEPS = 16;

export interface Station {
  decision: Decision;
  /** Node ids for this station's persistent synths, one per layer, so a retune can fade the old ones out. */
  nodes: Record<Layer, number>;
  /** The answers' hash, as an integer: the station's seed. */
  seed: number;
  /** The runner-up system, if it came close, and how loud it plays. */
  second: { system: System; level: number } | null;
  root: number;
}

export type Layer = "primary" | "second";

export function station(decision: Decision, key: string, nodes: Record<Layer, number> = { primary: 1001, second: 1002 }): Station {
  const seed = Number.parseInt(key, 16) >>> 0;
  const ranked = (Object.entries(decision.systems) as [System, number][]).sort((a, b) => b[1] - a[1]);
  // A near tie plays both: the runner-up comes in once it has half the winner's probability.
  const level = Math.max(0, decision.sigma - 0.5) * 1.2;
  const runnerUp = ranked[1]?.[0];
  return {
    decision,
    nodes,
    seed,
    second: runnerUp && level > 0.05 ? { system: runnerUp, level } : null,
    root: ROOTS[seed % ROOTS.length]!,
  };
}

/** Roots by MIDI note, E first: E2, G2, A2, D2, F2, C2. */
const ROOTS = [40, 43, 45, 38, 41, 36];

const SCALE_STEPS: Record<Exclude<Scale, "harmonic">, number[]> = {
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  pentatonic: [0, 3, 5, 7, 10],
  wholetone: [0, 2, 4, 6, 8, 10],
};

const midiHz = (note: number) => 440 * 2 ** ((note - 69) / 12);

/**
 * The frequency of a scale degree above `root`, a MIDI note. The harmonic
 * scale is the harmonic series' fourth octave, partials 8 to 15 scaled down
 * to the root: ratios 1, 9/8, 5/4, 11/8, 3/2, 13/8, 7/4, 15/8.
 */
export function degreeHz(scale: Scale, root: number, degree: number): number {
  if (scale === "harmonic") {
    const octave = Math.floor(degree / 8);
    return midiHz(root) * ((8 + (((degree % 8) + 8) % 8)) / 8) * 2 ** octave;
  }
  const steps = SCALE_STEPS[scale];
  const octave = Math.floor(degree / steps.length);
  return midiHz(root + steps[((degree % steps.length) + steps.length) % steps.length]! + 12 * octave);
}

/** Milliseconds per sixteenth note. */
export const stepMs = (bpm: number) => 60_000 / bpm / 4;

/** The global step at a time: sixteenths since 1973 at this tempo. */
export const stepAt = (bpm: number, at: number) => Math.floor((at - GENESIS_MS) / stepMs(bpm));
export const timeOfStep = (bpm: number, step: number) => GENESIS_MS + step * stepMs(bpm);

/** A uniform value from its coordinates, the same for everyone. */
export function chance(...parts: (string | number)[]): number {
  return hash32(parts.join("|")) / 4294967296;
}

/** Position in [0, 1) through a cycle of `bars` bars. */
const cycle = (bar: number, step: number, bars: number) => (((bar % bars) + bars) % bars + step / STEPS) / bars;

/** How many bars a slow change takes: from 64 when motion is 0 to 4 when it's 1. */
const span = (motion: number) => 2 ** Math.round(6 - motion * 4);

interface Context {
  s: Station;
  d: Decision;
  bar: number;
  step: number;
  /** The step's start, epoch ms. */
  at: number;
  ms: number;
  /** 1 for the winning system, less for the runner-up. */
  gain: number;
  id: Layer;
}

type Voice = (c: Context) => Packet[];

const s_new = (def: string, ...args: (string | number)[]): Packet => ["/s_new", def, -1, 0, VOICES, "out", MIX_BUS, ...args];

/** Test tones: Ikeda's grid of sines, clicks, and noise. Left and right sit at a ratio, so the scope draws it. */
const sineVoice: Voice = ({ s, d, bar, step, gain, id }) => {
  const out: Packet[] = [];
  const block = Math.floor(bar / Math.max(1, span(d.motion) / 4));
  const density = 0.12 + d.density * 0.55;
  const ratios = [1, 1.5, 2, 4 / 3, 1.25, 1.001, 3];
  const ratio = ratios[Math.floor(chance(s.seed, id, "ratio", block) * ratios.length)]!;
  if (step === 0 && chance(s.seed, id, "low", bar) < 0.6) {
    out.push(s_new("ds_sine", "freq", degreeHz(d.scale, s.root - 12, 0), "ratio", 1.001, "amp", 0.22 * gain, "attack", 0.01, "dur", 0.5, "release", 0.3));
  }
  if (chance(s.seed, id, "tone", block, step) < density) {
    const degree = Math.floor(chance(s.seed, id, "deg", block, step) * 8) + 28 + Math.round(d.brightness * 7);
    const dur = 0.015 + chance(s.seed, id, "dur", block, step) * 0.09;
    out.push(s_new("ds_sine", "freq", degreeHz(d.scale, s.root, degree), "ratio", ratio, "amp", 0.1 * gain, "dur", dur));
  }
  if (chance(s.seed, id, "click", bar, step) < density * 0.5) {
    out.push(s_new("ds_click", "amp", 0.25 * gain, "hp", 2000 + d.brightness * 6000, "pan", chance(s.seed, id, "pan", bar, step) * 2 - 1));
  }
  if (step % 4 === 2 && chance(s.seed, id, "burst", block, step) < density * 0.6) {
    out.push(s_new("ds_burst", "amp", 0.06 * gain, "dur", 0.004 + d.density * 0.02, "hp", 6000 + d.brightness * 6000, "pan", step % 8 === 2 ? -0.7 : 0.7));
  }
  return out;
};

/** FM blips in a Euclidean pattern that turns by one step at a time, after Mark Fell. */
const pulseVoice: Voice = ({ s, d, bar, step, gain, id }) => {
  const out: Packet[] = [];
  const turn = Math.floor(bar / Math.max(1, span(d.motion) / 8));
  const hits = 3 + Math.round(d.density * 8);
  if (euclid(hits, STEPS, turn % STEPS)[step]) {
    // A triangle through the bar picks the degree, quantized to the scale's steps.
    const contour = quantize(tri(chance(s.seed, id, "sym", turn), { rate: 1 + (turn % 3) }), 6);
    const degree = 14 + Math.round(contour(step / STEPS) * 5);
    const ratios = [1, 2, 3, 1.5, 0.5, 3.5];
    const ratio = ratios[Math.floor(chance(s.seed, id, "ratio", Math.floor(bar / 4)) * ratios.length)]!;
    const index = 0.5 + d.brightness * 5 * sine(0, { rate: 1 })(cycle(bar, step, 8));
    out.push(
      s_new("ds_fm", "freq", degreeHz(d.scale, s.root, degree), "ratio", ratio, "index", index, "amp", 0.22 * gain,
        "decay", 0.05 + (1 - d.density) * 0.2, "pan", (step / STEPS) * 1.4 - 0.7),
    );
  }
  // A second line from the Numeric Repetitor, an octave down, its factor moving each bar.
  if (nr(s.seed % 32, 0, 1 + ((turn + bar) % 16))[step] && chance(s.seed, id, "nr", bar, step) < 0.4 + d.density * 0.5) {
    out.push(s_new("ds_fm", "freq", degreeHz(d.scale, s.root, 7 + (bar % 3)), "ratio", 1, "index", 1 + d.brightness * 2, "amp", 0.16 * gain, "decay", 0.08));
  }
  return out;
};

/** A cloud of grains whose four pitches change with the harmony, after Curtis Roads. Persistent; set each bar. */
const grainVoice: Voice = ({ s, d, bar, step, gain, id }) => {
  if (step !== 0) return [];
  const change = Math.max(1, span(d.motion) / 8);
  const chord = Math.floor(bar / change);
  const base = 14 + Math.floor(chance(s.seed, id, "chord", chord) * 5);
  const density = 3 + d.density * 70 * (0.6 + 0.4 * sine()(cycle(bar, 0, 16)));
  const grain = 0.015 + (1 - d.density) * 0.09;
  const overlap = Math.max(1, density * grain);
  return [
    ["/n_set", s.nodes[id], "density", density, "grain", grain, "amp", (0.11 * gain) / Math.sqrt(overlap),
      "f0", degreeHz(d.scale, s.root, base), "f1", degreeHz(d.scale, s.root, base + 2), "f2", degreeHz(d.scale, s.root, base + 4),
      "f3", degreeHz(d.scale, s.root, base + 7 + Math.round(d.brightness * 7)), "width", 0.4 + d.space * 0.6,
      "lpf", 1500 + d.brightness * 12000],
  ];
};

/** Six partials in just intonation, one of them moving every few bars, after La Monte Young. Persistent; set each bar. */
const SERIES = [1, 1.5, 2, 2.25, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7];
const droneVoice: Voice = ({ s, d, bar, step, gain, id }) => {
  const out: Packet[] = [];
  const every = Math.max(2, span(d.motion) / 2);
  if (step === 0) {
    const ratios = [0, 1, 2, 3, 4, 5].map((i) => SERIES[Math.floor(chance(s.seed, id, "partial", i, Math.floor((bar + i * 3) / every)) * SERIES.length)]!);
    out.push(["/n_set", s.nodes[id], "root", degreeHz(d.scale, s.root - 12, 0), "amp", 0.1 * gain, "beat", 0.05 + d.motion * 0.4,
      "lpf", 600 + d.brightness * 6000, "r0", 1, "r1", ratios[1]!, "r2", ratios[2]!, "r3", ratios[3]!, "r4", ratios[4]!, "r5", ratios[5]!]);
  }
  if (chance(s.seed, id, "bell", bar, step) < 0.01 + d.density * 0.05) {
    const degree = 21 + Math.floor(chance(s.seed, id, "bd", bar, step) * 7);
    out.push(s_new("ds_sine", "freq", degreeHz(d.scale, s.root, degree), "ratio", 1.002, "amp", 0.05 * gain, "attack", 0.4, "dur", 1.2, "release", 2.5));
  }
  return out;
};

/** Hypnotic techno: four kicks, hats between, and one wavefolded bass line. The bass is persistent and retriggered. */
const foldVoice: Voice = ({ s, d, bar, step, gain, id }) => {
  const out: Packet[] = [];
  const kicks = d.density < 0.2 ? step % 8 === 0 : step % 4 === 0;
  if (kicks) out.push(s_new("ds_kick", "freq", 46, "amp", 0.42 * gain, "decay", 0.3 + d.space * 0.2));
  if (step % 4 === 2 || (d.density > 0.55 && chance(s.seed, id, "hat", bar, step) < d.density - 0.4)) {
    out.push(s_new("ds_burst", "amp", (step % 4 === 2 ? 0.1 : 0.05) * gain, "dur", 0.012 + d.brightness * 0.02, "hp", 7000 + d.brightness * 3000, "pan", 0.25));
  }
  // The line: a Numeric Repetitor pattern, its prime from the key and its factor drifting over the cycle.
  const pattern = nr(s.seed % 32, Math.floor(bar / span(d.motion)) % 4, 1 + Math.floor(fold(sine(0.3, { rate: 2 }), 0.8)(cycle(bar, 0, 32)) * 10));
  if (pattern[step]) {
    const degree = chance(s.seed, id, "note", Math.floor(bar / 2), step) < 0.7 ? 0 : [1, 3, 7, 5][Math.floor(chance(s.seed, id, "alt", bar, step) * 4)]!;
    const drive = 1.3 + d.brightness * 3 * sine(0, { rate: 1 })(cycle(bar, step, 8));
    const ratios = [2, 1.5, 3, 1.25];
    out.push(["/n_set", s.nodes[id], "freq", degreeHz(d.scale, s.root, degree), "drive", drive,
      "ratio", ratios[Math.floor(bar / 8) % ratios.length]!, "cutoff", 300 + d.brightness * 2500, "decay", 0.12 + (1 - d.density) * 0.25,
      "amp", 0.55 * gain, "t_trig", 1]);
  }
  return out;
};

/** One bit: an arpeggio and its bass through a single comparator. Persistent and retriggered. */
const bitsVoice: Voice = ({ s, d, bar, step, gain, id }) => {
  const every = d.density > 0.5 ? 1 : 2;
  if (step % every !== 0) return [];
  const chord = Math.floor(bar / Math.max(1, span(d.motion) / 8));
  const shape: Crv = quantize(sine(0.6, { rate: 1 + (chord % 4) }), 8);
  const degree = 14 + Math.round(shape(step / STEPS) * 7) + (chance(s.seed, id, "chord", chord) < 0.5 ? 0 : 2);
  return [
    ["/n_set", s.nodes[id], "f1", degreeHz(d.scale, s.root, degree), "f2", degreeHz(d.scale, s.root, chord % 2 ? 0 : 4),
      "decay", 0.04 + (1 - d.density) * 0.2, "lpf", 2500 + d.brightness * 9000, "amp", 0.07 * gain, "t_trig", 1],
  ];
};

const VOICES_BY_SYSTEM: Record<System, Voice> = {
  sine: sineVoice,
  pulse: pulseVoice,
  grain: grainVoice,
  drone: droneVoice,
  fold: foldVoice,
  bits: bitsVoice,
};

/** Systems that hold one synth for the whole broadcast. */
const PERSISTENT: Partial<Record<System, string>> = { grain: "ds_cloud", drone: "ds_drone", fold: "ds_fold", bits: "ds_bits" };

export const MASTER_ID = 1000;

/** The layers playing: the winner, and the runner-up if it came close. */
export function layers(s: Station): { id: Layer; system: System; gain: number }[] {
  const out: { id: Layer; system: System; gain: number }[] = [{ id: "primary", system: s.decision.system, gain: 1 }];
  if (s.second) out.push({ id: "second", system: s.second.system, gain: s.second.level });
  return out;
}

/** The room, once per broadcast: a group for voices, one after it for the master, then the master. */
export function roomPackets(s: Station): Packet[] {
  return [
    ["/g_new", VOICES, 0, 0],
    ["/g_new", MASTER, 3, VOICES],
    ["/s_new", "ds_master", MASTER_ID, 0, MASTER, "in", MIX_BUS, "out", 0, ...masterArgs(s.decision)],
  ];
}

/** Tune the room to a station and start its persistent synths. */
export function startPackets(s: Station): Packet[] {
  const packets: Packet[] = [["/n_set", MASTER_ID, ...masterArgs(s.decision)]];
  for (const layer of layers(s)) {
    const def = PERSISTENT[layer.system];
    if (def) packets.push(["/s_new", def, s.nodes[layer.id], 0, VOICES, "out", MIX_BUS, "amp", 0]);
  }
  return packets;
}

/** Release a station's persistent synths; each fades on its own envelope and frees itself. */
export function releasePackets(s: Station): Packet[] {
  return layers(s)
    .filter((layer) => PERSISTENT[layer.system])
    .map((layer): Packet => ["/n_set", s.nodes[layer.id], "gate", 0]);
}

function masterArgs(d: Decision): (string | number)[] {
  return [
    "echo", ((d.space > 0.5 ? 0.75 : 0.5) * 60) / d.bpm,
    "space", 0.05 + d.space * 0.55,
    "room", 0.5 + d.space * 0.45,
    "echoMix", 0.02 + d.space * 0.22,
    "feedback", 0.2 + d.space * 0.35,
    "lpf", 1500 * 10 ** (d.brightness * 1.03),
    // The decision's uncertainty is heard as static: none on a lock, a radio between stations at σ = 1.
    "static", d.sigma < 0.12 ? 0 : d.sigma ** 2 * 0.08,
  ];
}

/**
 * What persistent synths need at a bar's start. Sent at once when playback
 * begins mid-bar, so a cloud or a drone doesn't wait for the next bar line.
 */
export function initialPackets(s: Station, globalStep: number): Packet[] {
  const barStart = globalStep - (((globalStep % STEPS) + STEPS) % STEPS);
  return eventsAt(s, barStart).packets.filter((p) => p[0] === "/n_set");
}

/** Fade the room out; voices end on their own, persistent synths on their gates. */
export function stopPackets(s: Station): Packet[] {
  return [["/n_set", MASTER_ID, "gate", 0], ...releasePackets(s)];
}

/** Everything that happens on one step, for every layer. */
export function eventsAt(s: Station, globalStep: number): Timed {
  const d = s.decision;
  const bar = Math.floor(globalStep / STEPS);
  const step = globalStep - bar * STEPS;
  const at = timeOfStep(d.bpm, globalStep);
  const packets = layers(s).flatMap((layer) =>
    VOICES_BY_SYSTEM[layer.system]({ s, d, bar, step, at, ms: stepMs(d.bpm), gain: layer.gain, id: layer.id }),
  );
  return { at, packets };
}

/** The bar and beat a listener is on: what the readout shows. */
export function position(bpm: number, at: number): { bar: number; beat: number; step: number } {
  const global = stepAt(bpm, at);
  return { bar: Math.floor(global / STEPS), beat: Math.floor((global % STEPS) / 4) + 1, step: global % STEPS };
}
