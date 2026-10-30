import { describe, expect, it } from "vitest";
import {
  BANK,
  SCALE_NAMES,
  SYSTEM_NAMES,
  TEMPOS,
  answerText,
  canonical,
  clefRequest,
  draw,
  fromClef,
  localDecision,
  seeded,
  sigma,
  stationKey,
  type Answer,
} from "../src/index.ts";
import { ClefResponse, VibeRequest } from "../src/request.ts";

const answers: Answer[] = [
  { q: "q007", a: "a" },
  { q: "q008", a: "a" },
  { q: "q009", a: "a" },
];

describe("the bank", () => {
  it("has stable, unique ids and two to four short answers per question", () => {
    expect(BANK.length).toBeGreaterThanOrEqual(150);
    expect(new Set(BANK.map((q) => q.id)).size).toBe(BANK.length);
    expect(new Set(BANK.map((q) => q.prompt)).size).toBe(BANK.length);
    for (const q of BANK) {
      expect(q.id).toMatch(/^q\d{3}$/);
      expect(q.prompt.length).toBeLessThanOrEqual(64);
      expect(q.answers.length).toBeGreaterThanOrEqual(2);
      expect(q.answers.length).toBeLessThanOrEqual(4);
      expect(new Set(q.answers).size).toBe(q.answers.length);
      for (const a of q.answers) expect(a.length).toBeLessThanOrEqual(40);
    }
  });

  it("looks answers up by letter", () => {
    expect(answerText("q001", "a")).toBe("watch until it goes out");
    expect(answerText("q001", "e")).toBeUndefined();
    expect(answerText("q999", "a")).toBeUndefined();
  });

  it("draws distinct questions, honoring exclusions", () => {
    const random = seeded(1);
    const picked = draw(5, random, new Set(["q001", "q002"]));
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map((q) => q.id)).size).toBe(5);
    expect(picked.map((q) => q.id)).not.toContain("q001");
  });
});

describe("keys", () => {
  it("ignore the order the questions were asked in", () => {
    expect(canonical([...answers].reverse())).toBe(canonical(answers));
    expect(stationKey([...answers].reverse())).toBe(stationKey(answers));
    expect(stationKey(answers)).toMatch(/^[0-9a-f]{8}$/);
  });

  it("change when an answer changes", () => {
    expect(stationKey([{ q: "q007", a: "b" }, ...answers.slice(1)])).not.toBe(stationKey(answers));
  });
});

describe("the Clef request", () => {
  it("fits the published limits", () => {
    const request = clefRequest(answers);
    const entries = Object.entries(request.questions);
    expect(entries.length).toBeLessThanOrEqual(64);
    for (const [id, q] of entries) {
      expect(id).toMatch(/^[A-Za-z0-9_.-]{1,100}$/);
      if (q.type === "choice") {
        const n = Object.keys(q.criteria).length;
        expect(n).toBeGreaterThanOrEqual(2);
        expect(n).toBeLessThanOrEqual(255);
      } else {
        expect(q.criteria.length).toBeGreaterThanOrEqual(2);
        expect(q.criteria.length).toBeLessThanOrEqual(10);
      }
    }
  });

  it("sends the bank's text, never anything the client wrote", () => {
    const request = clefRequest(answers);
    expect(request.state.answers[0]).toEqual({ question: "The dance floor at 6 a.m. is:", answer: "still full" });
  });

  it("is a pure function of the answers, with every option present", () => {
    const one = clefRequest(answers);
    expect(clefRequest([...answers].reverse())).toEqual(one);
    const choice = one.questions.system;
    expect(choice.type).toBe("choice");
    if (choice.type === "choice") expect(Object.keys(choice.criteria).sort()).toEqual([...SYSTEM_NAMES].sort());
  });
});

describe("decisions", () => {
  const clef = {
    system: { choice: "fold", probabilities: { sine: 0.02, pulse: 0.11, grain: 0.12, drone: 0.19, fold: 0.51, bits: 0.05 } },
    scale: { choice: "dorian", probabilities: { dorian: 0.4, phrygian: 0.3, aeolian: 0.3 } },
    tempo: { score: 3.57 },
    density: { score: 2.53 },
    brightness: { score: 1.04 },
    space: { score: 0.76 },
    motion: { score: 1.96 },
  };

  it("map Clef's answers onto the station", () => {
    const d = fromClef(clef);
    expect(d.system).toBe("fold");
    expect(d.scale).toBe("dorian");
    expect(d.bpm).toBe(TEMPOS[4]);
    expect(d.density).toBeCloseTo(2.53 / 4);
    expect(d.sigma).toBeCloseTo(0.19 / 0.51, 2);
    expect(Object.values(d.systems).reduce((s, p) => s + p, 0)).toBeCloseTo(1);
    expect(d.scales.lydian).toBe(0);
  });

  it("clamp scores outside the rubric", () => {
    const d = fromClef({ ...clef, tempo: { score: 12 }, space: { score: -3 } });
    expect(d.bpm).toBe(TEMPOS.at(-1));
    expect(d.space).toBe(0);
  });

  it("fall back to a seeded draw that repeats for the same answers", () => {
    const one = localDecision(answers);
    expect(localDecision([...answers].reverse())).toEqual(one);
    expect(SYSTEM_NAMES).toContain(one.system);
    expect(SCALE_NAMES).toContain(one.scale);
    expect(Object.values(one.systems).reduce((s, p) => s + p, 0)).toBeCloseTo(1);
    expect(one.sigma).toBeGreaterThanOrEqual(0.03);
    expect(one.sigma).toBeLessThanOrEqual(1);
  });

  it("measure σ as the runner-up against the winner", () => {
    expect(sigma({ a: 0.9, b: 0.05, c: 0.05 })).toBeCloseTo(0.0556, 3);
    expect(sigma({ a: 0.99, b: 0.01 })).toBe(0.03);
    expect(sigma({ a: 0.5, b: 0.5 })).toBe(1);
  });
});

describe("request validation", () => {
  it("accepts ids from the bank", () => {
    expect(VibeRequest.safeParse({ v: 1, answers }).success).toBe(true);
  });

  it("refuses unknown questions, repeats, missing answers, text, and too many answers", () => {
    expect(VibeRequest.safeParse({ v: 1, answers: [{ q: "q999", a: "a" }] }).success).toBe(false);
    expect(VibeRequest.safeParse({ v: 1, answers: [answers[0], answers[0]] }).success).toBe(false);
    expect(VibeRequest.safeParse({ v: 1, answers: [] }).success).toBe(false);
    expect(VibeRequest.safeParse({ v: 1, answers: [{ q: "q001", a: "a", text: "hi" }] }).success).toBe(false);
    expect(VibeRequest.safeParse({ v: 2, answers }).success).toBe(false);
    const many = BANK.slice(0, 8).map((q) => ({ q: q.id, a: "a" }));
    expect(VibeRequest.safeParse({ v: 1, answers: many }).success).toBe(false);
  });

  it("reads the response shape Clef publishes", () => {
    const parsed = ClefResponse.safeParse({
      model: "clef-flash",
      answers: {
        system: { type: "choice", choice: "drone", probabilities: { drone: 0.6, sine: 0.4 }, confidence: 0.2 },
        scale: { type: "choice", choice: "harmonic", probabilities: { harmonic: 1 }, confidence: 1 },
        tempo: { type: "score", score: 1.8, legend: {}, probabilities: {}, confidence: 0.3 },
        density: { type: "score", score: 1.2 },
        brightness: { type: "score", score: 1.5 },
        space: { type: "score", score: 3.4 },
        motion: { type: "score", score: 1.3 },
      },
      usage: { input_tokens: 1305, output_tokens: 0 },
    });
    expect(parsed.success).toBe(true);
  });
});
