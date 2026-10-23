import { GENESIS_HASH } from "@datspace/contract";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Ledger } from "../src/ledger.ts";

function stub(name: string) {
  return (env.LEDGER as DurableObjectNamespace<Ledger>).getByName(name);
}

describe("Ledger", () => {
  it("chains each event to the one before it", async () => {
    const ledger = stub("chain");
    const first = await ledger.append({ type: "deploy", data: { commit: "abc1234" } });
    const second = await ledger.append({ type: "agent.call", data: { surface: "mcp", tool: "search" } });
    expect(first).toMatchObject({ seq: 1, prevHash: GENESIS_HASH });
    expect(second).toMatchObject({ seq: 2, prevHash: first.hash });
    expect(await ledger.recent({ limit: 10 })).toEqual([second, first]);
  });

  it("serializes concurrent appends", async () => {
    const ledger = stub("concurrent");
    const events = await Promise.all(
      Array.from({ length: 10 }, () => ledger.append({ type: "deploy", data: { commit: "abc1234" } })),
    );
    expect(events.map((e) => e.seq).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(await ledger.verify()).toEqual({ ok: true });
  });

  it("rejects events that could carry arguments", async () => {
    const ledger = stub("strict");
    let error: unknown;
    try {
      // @ts-expect-error: arguments are not part of an agent.call event
      await ledger.append({ type: "agent.call", data: { surface: "mcp", tool: "search", query: "secret" } });
    } catch (err) {
      error = err;
    }
    expect(String(error)).toContain("Unrecognized key");
    expect(await ledger.recent({ limit: 10 })).toEqual([]);
  });

  it("pages backward and clamps the limit", async () => {
    const ledger = stub("paging");
    for (let i = 0; i < 5; i++) await ledger.append({ type: "deploy", data: { commit: "abc1234" } });
    expect((await ledger.recent({ limit: 2 })).map((e) => e.seq)).toEqual([5, 4]);
    expect((await ledger.recent({ limit: 2, beforeSeq: 4 })).map((e) => e.seq)).toEqual([3, 2]);
    expect(await ledger.recent({ limit: 0 })).toHaveLength(1);
    expect(await ledger.recent({ limit: 1000 })).toHaveLength(5);
    await ledger.append({ type: "agent.call", data: { surface: "mcp", tool: "search" } });
    expect((await ledger.recent({ limit: 10, type: "deploy" })).map((e) => e.seq)).toEqual([5, 4, 3, 2, 1]);
    expect((await ledger.recent({ limit: 10, type: "agent.call" })).map((e) => e.seq)).toEqual([6]);
  });

  it("verifies the chain, then finds a tampered row", async () => {
    const ledger = stub("tamper");
    for (let i = 0; i < 3; i++) await ledger.append({ type: "deploy", data: { commit: `abc123${i}` } });
    expect(await ledger.verify()).toEqual({ ok: true });
    expect(await ledger.verify(2)).toEqual({ ok: true });

    await runInDurableObject(ledger, (_instance: Ledger, state) => {
      state.storage.sql.exec(`UPDATE events SET data = '{"commit":"fffffff"}' WHERE seq = 2`);
    });
    expect(await ledger.verify()).toEqual({ ok: false, brokenAt: 2 });
  });
});
