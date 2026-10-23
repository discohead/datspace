import { describe, expect, it } from "vitest";
import { clearTape, readTape, recordLock } from "../src/lib/tuner/tape.ts";

function memory(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

describe("tape", () => {
  it("records locks in order and skips an immediate repeat", () => {
    const s = memory();
    recordLock({ slug: "a", title: "A", frequency: 88.7, at: 1 }, s);
    recordLock({ slug: "a", title: "A", frequency: 88.7, at: 2 }, s);
    recordLock({ slug: "b", title: "B", frequency: 92.3, at: 3 }, s);
    recordLock({ slug: "a", title: "A", frequency: 88.7, at: 4 }, s);
    expect(readTape(s).map((e) => e.slug)).toEqual(["a", "b", "a"]);
  });

  it("survives junk and clears", () => {
    const s = memory();
    s.setItem("datspace:tape", "not json");
    expect(readTape(s)).toEqual([]);
    s.setItem("datspace:tape", JSON.stringify([{ slug: 1 }, { slug: "a", title: "A", frequency: 88.7, at: 1 }]));
    expect(readTape(s)).toHaveLength(1);
    clearTape(s);
    expect(readTape(s)).toEqual([]);
  });

  it("works without storage", () => {
    expect(recordLock({ slug: "a", title: "A", frequency: 88.7, at: 1 }, undefined)).toHaveLength(1);
    expect(readTape(undefined)).toEqual([]);
  });
});
