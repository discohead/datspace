import { describe, expect, it } from "vitest";
import { GENESIS_HASH, canonicalJson, ledgerHash, sha256Hex } from "../src/index.ts";

describe("hash", () => {
  it("sorts keys at every depth", () => {
    expect(canonicalJson({ b: 1, a: { d: [{ z: 1, y: 2 }], c: null } })).toBe(
      '{"a":{"c":null,"d":[{"y":2,"z":1}]},"b":1}',
    );
  });

  it("matches a known SHA-256", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("chains each ledger hash to the previous one", async () => {
    const event = { seq: 1, at: "2026-10-23T00:00:00.000Z", type: "deploy", data: { commit: "abc1234" } };
    const first = await ledgerHash(GENESIS_HASH, event);
    expect(first).toHaveLength(64);
    expect(await ledgerHash(GENESIS_HASH, event)).toBe(first);
    expect(await ledgerHash("1".repeat(64), event)).not.toBe(first);
    expect(await ledgerHash(GENESIS_HASH, { ...event, data: { commit: "abc1235" } })).not.toBe(first);
  });
});
