import { describe, expect, it } from "vitest";
import { jsonPieces } from "../src/lib/dev/wrap.ts";

describe("jsonPieces", () => {
  it("splits after commas and colons, and the pieces join back to the same JSON", () => {
    const json = '{"surface":"json","tool":"get_work"}';
    expect(jsonPieces(json)).toEqual(['{"surface":', '"json",', '"tool":', '"get_work"}']);
    expect(jsonPieces(json).join("")).toBe(json);
    expect(jsonPieces("{}")).toEqual(["{}"]);
  });
});
