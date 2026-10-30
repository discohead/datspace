import { BANK_VERSION, answerText, question, type AnswerId } from "./bank.ts";

/**
 * What the vibe check decides, and how. The page sends the answers' ids; the
 * Worker asks Clef Flash, a decision model, to choose among options defined
 * here. Clef returns a probability for every option and writes no text. When
 * it can't be asked, the same answers seed a local draw instead, and the
 * response says so.
 */

/** The six systems the station can play. Each criterion describes a mood first, then the sound. */
export const SYSTEMS = {
  sine: "Cold, exact, and clinical: white rooms, data, precision, long silences. Pure sine tones, single clicks, and short bursts of white noise on a strict grid.",
  pulse: "Playful, quick, and clever: machines at play, games, light on its feet. Dry FM blips in patterns that shift one step at a time.",
  grain: "Diffuse and shimmering: weather, dust, water, crowds, many small things at once. Clouds of tiny grains of sound, too many to count.",
  drone: "Patient, still, and vast: night, distance, meditation, waiting. Long tones in just intonation that slowly beat against each other.",
  fold: "Physical, nocturnal, and driving: clubs, sweat, the body, repetition. Hypnotic techno: a kick and a hat under one wavefolded bass line.",
  bits: "Bright, bare, and mechanical: early computers, toys, arcades, punch cards. One-bit square waves, on and off and nothing between.",
} as const;

export type System = keyof typeof SYSTEMS;
export const SYSTEM_NAMES = Object.keys(SYSTEMS) as System[];

export const SCALES = {
  phrygian: "Dark, tense, and close: minor with a half step above the root, as in a lot of techno.",
  aeolian: "Sober and grounded: the plain minor scale.",
  dorian: "Cool and moving: minor with a raised sixth, as in deep house and modal jazz.",
  lydian: "Bright and floating: major with a raised fourth, a little unreal.",
  pentatonic: "Open and easy: five notes with no half steps, so nothing clashes.",
  wholetone: "Dreamlike and unresolved: six even steps and no home note.",
  harmonic: "Still and ringing: the overtones of one low note, the way a drone or a bell sounds.",
} as const;

export type Scale = keyof typeof SCALES;
export const SCALE_NAMES = Object.keys(SCALES) as Scale[];

/** Tempo levels, slowest first. Each is a simple ratio of the network clock's 120 BPM. */
export const TEMPOS = [60, 72, 84, 96, 108, 120, 135, 150] as const;
const TEMPO_LEVELS = [
  "Almost still",
  "Slow, like breathing",
  "Unhurried",
  "Walking pace",
  "Steady",
  "Alert",
  "Brisk",
  "Fast and urgent",
];

/** Five-level rubrics, lowest first; the answers come back as 0–1. */
const RUBRICS = {
  density: ["Almost silence: a few sounds a bar", "Sparse", "Balanced", "Busy", "Dense and continuous"],
  brightness: ["Very dark and muffled", "Dark", "Neutral", "Bright", "Glaring and high"],
  space: ["Dry and close, in the room", "A small room", "A hall", "A cathedral", "Endless, like a valley at night"],
  motion: ["Frozen: the same pattern for minutes", "Slow drift", "Gradual change", "Restless", "Constantly mutating"],
} as const;

type Rubric = keyof typeof RUBRICS;

export interface Answer {
  q: string;
  a: AnswerId;
}

export interface Decision {
  system: System;
  /** Probability of each system; they sum to 1. */
  systems: Record<System, number>;
  scale: Scale;
  scales: Record<Scale, number>;
  bpm: number;
  density: number;
  brightness: number;
  space: number;
  motion: number;
  /** How unsure the choice of system was, 0.03 to 1, on the tuner's scale: the station locks below 0.12. */
  sigma: number;
}

export type DecisionSource = "clef-flash" | "local";
export type FallbackReason = "rate_limited" | "over_budget" | "unavailable";

/** What `POST /decide` returns. */
export interface Decided {
  decision: Decision;
  /** A hash of the answers. It names the station and seeds its patterns, so the same answers play the same music. */
  key: string;
  source: DecisionSource;
  reason?: FallbackReason;
  /** Input tokens Clef read; it charges for nothing else. */
  inputTokens?: number;
  costUsd?: number;
  cached: boolean;
  ms: number;
  /** Epoch milliseconds, so every listener's bar count agrees. */
  serverTime: number;
}

export const CLEF_MODEL = "@cf/cloudflare/clef-flash";
/** $0.038 per million input tokens; Clef Flash charges nothing for output. */
export const CLEF_USD_PER_INPUT_TOKEN = 0.038 / 1_000_000;

/** The same answers in any order are the same vibe. */
export function canonical(answers: readonly Answer[]): string {
  const sorted = [...answers].sort((x, y) => (x.q < y.q ? -1 : x.q > y.q ? 1 : 0));
  return `v${BANK_VERSION}|${sorted.map(({ q, a }) => `${q}:${a}`).join("|")}`;
}

/** FNV-1a, 32 bits: enough to name a station and seed its patterns. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function stationKey(answers: readonly Answer[]): string {
  return hash32(canonical(answers)).toString(16).padStart(8, "0");
}

/** mulberry32: a small, fast PRNG with a 32-bit seed. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A question for Clef: pick one option, or rate on a rubric. Its wire format, as published. */
export type ClefQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };

export interface ClefRequest {
  model: "clef-flash";
  state: { note: string; answers: { question: string; answer: string }[] };
  questions: Record<"system" | "scale" | "tempo" | Rubric, ClefQuestion>;
}

/**
 * The request for Clef Flash. Options are shuffled by the answers' own hash,
 * so no option always sits first or last, and the request stays a pure
 * function of the answers (Clef's output is deterministic, so it caches).
 */
export function clefRequest(answers: readonly Answer[]): ClefRequest {
  const random = seeded(hash32(canonical(answers)));
  const shuffled = <T extends Record<string, string>>(criteria: T): Record<string, string> => {
    const keys = Object.keys(criteria);
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [keys[i], keys[j]] = [keys[j]!, keys[i]!];
    }
    return Object.fromEntries(keys.map((k) => [k, criteria[k]!]));
  };
  return {
    model: "clef-flash",
    state: {
      note: "A listener of an experimental radio station answered cryptic multiple-choice questions. Read the answers as a mood, not literally.",
      // In question order, not asking order: the same answers are the same request.
      answers: [...answers]
        .sort((x, y) => (x.q < y.q ? -1 : x.q > y.q ? 1 : 0))
        .map(({ q, a }) => ({ question: question(q)?.prompt ?? q, answer: answerText(q, a) ?? a })),
    },
    questions: {
      system: { type: "choice", instructions: "Which sound system suits the listener's mood?", criteria: shuffled(SYSTEMS) },
      scale: { type: "choice", instructions: "Which scale suits the listener's mood?", criteria: shuffled(SCALES) },
      tempo: { type: "score", instructions: "How fast should the music move for this listener?", criteria: TEMPO_LEVELS },
      density: { type: "score", instructions: "How many sounds at once suit this listener?", criteria: [...RUBRICS.density] },
      brightness: { type: "score", instructions: "How bright should the sound be?", criteria: [...RUBRICS.brightness] },
      space: { type: "score", instructions: "How much space and reverberation suits this listener?", criteria: [...RUBRICS.space] },
      motion: { type: "score", instructions: "How quickly should the patterns change?", criteria: [...RUBRICS.motion] },
    },
  };
}

export interface ClefChoice {
  choice: string;
  probabilities: Record<string, number>;
}

export interface ClefScore {
  score: number;
}

export interface ClefAnswers {
  system: ClefChoice;
  scale: ClefChoice;
  tempo: ClefScore;
  density: ClefScore;
  brightness: ClefScore;
  space: ClefScore;
  motion: ClefScore;
}

/** Turns Clef's answers into a decision. Options Clef didn't return get probability 0. */
export function fromClef(answers: ClefAnswers): Decision {
  const systems = distribution(SYSTEM_NAMES, answers.system.probabilities);
  const scales = distribution(SCALE_NAMES, answers.scale.probabilities);
  const level = (score: number, levels: number) => Math.min(levels - 1, Math.max(0, Math.round(score)));
  const unit = (score: number, levels: number) => Math.min(1, Math.max(0, score / (levels - 1)));
  return {
    system: argmax(systems),
    systems,
    scale: argmax(scales),
    scales,
    bpm: TEMPOS[level(answers.tempo.score, TEMPOS.length)]!,
    density: unit(answers.density.score, RUBRICS.density.length),
    brightness: unit(answers.brightness.score, RUBRICS.brightness.length),
    space: unit(answers.space.score, RUBRICS.space.length),
    motion: unit(answers.motion.score, RUBRICS.motion.length),
    sigma: sigma(systems),
  };
}

/**
 * The fallback: a seeded draw from the answers, so the same answers still play
 * the same station. Probabilities are a flat Dirichlet draw, which is as
 * undecided as it sounds.
 */
export function localDecision(answers: readonly Answer[]): Decision {
  const random = seeded(hash32(`local|${canonical(answers)}`));
  const draw = <K extends string>(names: readonly K[]) => {
    const weights = names.map(() => -Math.log(1 - random()));
    const total = weights.reduce((sum, w) => sum + w, 0);
    return Object.fromEntries(names.map((n, i) => [n, weights[i]! / total])) as Record<K, number>;
  };
  const systems = draw(SYSTEM_NAMES);
  const scales = draw(SCALE_NAMES);
  return {
    system: argmax(systems),
    systems,
    scale: argmax(scales),
    scales,
    bpm: TEMPOS[Math.floor(random() * TEMPOS.length)]!,
    density: random(),
    brightness: random(),
    space: random(),
    motion: random(),
    sigma: sigma(systems),
  };
}

/**
 * The tuner's σ for a decision: how close the runner-up came. A clear winner
 * is a clean signal; a near tie is mostly static.
 */
export function sigma(probabilities: Record<string, number>): number {
  const [first = 0, second = 0] = Object.values(probabilities).sort((x, y) => y - x);
  if (first <= 0) return 1;
  return Math.min(1, Math.max(0.03, second / first));
}

function distribution<K extends string>(names: readonly K[], probabilities: Record<string, number>): Record<K, number> {
  const raw = names.map((n) => Math.max(0, probabilities[n] ?? 0));
  const total = raw.reduce((sum, p) => sum + p, 0);
  return Object.fromEntries(names.map((n, i) => [n, total > 0 ? raw[i]! / total : 1 / names.length])) as Record<K, number>;
}

function argmax<K extends string>(probabilities: Record<K, number>): K {
  let best: K | undefined;
  for (const [name, p] of Object.entries(probabilities) as [K, number][]) {
    if (best === undefined || p > probabilities[best]) best = name;
  }
  return best!;
}
