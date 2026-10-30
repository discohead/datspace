import type { LedgerEvent } from "@datspace/contract";
import { GENESIS_HASH, ledgerHash } from "@datspace/contract/hash";
import { describe, expect, it } from "vitest";
import { LogError, countTypes, ledgerUrl, readLog, verifyChain } from "../src/lib/dev/chain.ts";

/** A valid chain of `n` events, oldest first: a deploy every tenth event, tool calls between. */
async function chain(n: number): Promise<LedgerEvent[]> {
  const events: LedgerEvent[] = [];
  let prevHash = GENESIS_HASH;
  for (let seq = 1; seq <= n; seq++) {
    const deploy = seq % 10 === 1;
    const event: Omit<LedgerEvent, "prevHash" | "hash"> = {
      seq,
      at: new Date(Date.UTC(2026, 9, 22) + seq * 1000).toISOString(),
      type: deploy ? "deploy" : "agent.call",
      data: deploy ? { commit: "61389cb" } : { surface: "json", tool: "get_work" },
    };
    const hash = await ledgerHash(prevHash, event);
    events.push({ ...event, prevHash, hash });
    prevHash = hash;
  }
  return events;
}

/** /ledger.json as datspace-ai serves it: newest first, `pageSize` at a time, before `?before=`. */
function server(events: LedgerEvent[], pageSize = 100) {
  const requests: string[] = [];
  const fetch = async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "https://datspace.ai");
    requests.push(url.pathname + url.search);
    const before = Number(url.searchParams.get("before"));
    const page = events
      .filter((e) => !(Number.isInteger(before) && before > 0) || e.seq < before)
      .sort((a, b) => b.seq - a.seq)
      .slice(0, pageSize);
    return Response.json({ apiVersion: "2026-10-30", events: page });
  };
  return { fetch: fetch as typeof globalThis.fetch, requests };
}

describe("ledgerUrl", () => {
  it("is same-origin on datspace.dev and datspace.ai's everywhere else", () => {
    expect(ledgerUrl("datspace.dev")).toBe("/ledger.json");
    expect(ledgerUrl("localhost")).toBe("https://datspace.ai/ledger.json");
    expect(ledgerUrl("datspace.io")).toBe("https://datspace.ai/ledger.json");
  });
});

describe("readLog", () => {
  it("pages backward to seq 1 and stops there", async () => {
    const events = await chain(250);
    const { fetch, requests } = server(events);
    const pages: number[] = [];
    const read = await readLog("/ledger.json", { fetch, onPage: (n) => pages.push(n) });
    expect(read).toHaveLength(250);
    expect(read[0]?.seq).toBe(250);
    expect(requests).toEqual(["/ledger.json", "/ledger.json?before=151", "/ledger.json?before=51"]);
    expect(pages).toEqual([100, 200, 250]);
  });

  it("makes one request for a log of exactly one page", async () => {
    const { fetch, requests } = server(await chain(100));
    expect(await readLog("/ledger.json", { fetch })).toHaveLength(100);
    expect(requests).toHaveLength(1);
  });

  it("doesn't depend on the server's page size", async () => {
    const { fetch, requests } = server(await chain(120), 50);
    expect(await readLog("/ledger.json", { fetch })).toHaveLength(120);
    expect(requests).toHaveLength(3);
  });

  it("reads an empty log", async () => {
    const { fetch } = server([]);
    expect(await readLog("/ledger.json", { fetch })).toEqual([]);
  });

  it("stops at an empty page when the log doesn't reach seq 1", async () => {
    const events = (await chain(150)).filter((e) => e.seq > 20);
    const { fetch, requests } = server(events);
    expect(await readLog("/ledger.json", { fetch })).toHaveLength(130);
    expect(requests.at(-1)).toBe("/ledger.json?before=21");
  });

  it("refuses a server that doesn't page backward", async () => {
    const events = await chain(150);
    const newest = events.slice(-100).reverse();
    const fetch = (async () => Response.json({ events: newest })) as unknown as typeof globalThis.fetch;
    await expect(readLog("/ledger.json", { fetch })).rejects.toThrow("can't be paged backward");
  });

  it("says plainly when a page fails", async () => {
    const notFound = (async () => new Response("<!doctype html>", { status: 404 })) as unknown as typeof globalThis.fetch;
    await expect(readLog("https://datspace.ai/ledger.json", { fetch: notFound })).rejects.toThrow(
      new LogError("https://datspace.ai/ledger.json returned 404."),
    );

    const offline = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof globalThis.fetch;
    await expect(readLog("/ledger.json", { fetch: offline })).rejects.toThrow("Couldn't fetch /ledger.json.");

    const html = (async () => new Response("<!doctype html>")) as unknown as typeof globalThis.fetch;
    await expect(readLog("/ledger.json", { fetch: html })).rejects.toThrow("didn't return JSON");

    const wrong = (async () => Response.json({ events: [{ seq: "1" }] })) as unknown as typeof globalThis.fetch;
    await expect(readLog("/ledger.json", { fetch: wrong })).rejects.toThrow("didn't return a list of ledger events");
  });
});

describe("verifyChain", () => {
  it("verifies an intact chain from the genesis hash, in any order", async () => {
    const events = await chain(250);
    const shuffled = [...events].reverse();
    expect(await verifyChain(shuffled)).toEqual({ checked: 250, verified: { from: 1, to: 250 }, broken: null });
  });

  it("reports an empty log as nothing checked", async () => {
    expect(await verifyChain([])).toEqual({ checked: 0, verified: null, broken: null });
  });

  it("finds an edited event", async () => {
    const events = await chain(250);
    events[119] = { ...events[119]!, data: { surface: "json", tool: "transmit" } };
    expect(await verifyChain(events)).toEqual({
      checked: 250,
      verified: { from: 1, to: 119 },
      broken: { seq: 120, reason: "Its hash doesn't match its contents." },
    });
  });

  it("finds an edited event whose hash was recomputed to match", async () => {
    const events = await chain(250);
    const edited = { ...events[119]!, data: { surface: "json", tool: "transmit" } };
    events[119] = { ...edited, hash: await ledgerHash(edited.prevHash, edited) };
    expect((await verifyChain(events)).broken).toEqual({ seq: 121, reason: "Its prevHash isn't seq 120's hash." });
  });

  it("finds a missing event", async () => {
    const events = (await chain(250)).filter((e) => e.seq !== 60);
    const result = await verifyChain(events);
    expect(result.verified).toEqual({ from: 1, to: 59 });
    expect(result.broken).toEqual({ seq: 60, reason: "It's missing." });
  });

  it("finds a log that doesn't start at seq 1", async () => {
    const events = (await chain(250)).filter((e) => e.seq > 4);
    expect(await verifyChain(events)).toEqual({
      checked: 246,
      verified: null,
      broken: { seq: 1, reason: "The log starts at seq 5." },
    });
  });

  it("finds a first event that doesn't start from the genesis hash", async () => {
    const [first] = await chain(1);
    const forged = { ...first!, prevHash: "f".repeat(64) };
    forged.hash = await ledgerHash(forged.prevHash, forged);
    expect((await verifyChain([forged])).broken).toEqual({ seq: 1, reason: "Its prevHash isn't the genesis hash." });
  });

  it("finds a duplicated event", async () => {
    const events = await chain(10);
    expect((await verifyChain([...events, events[4]!])).broken).toEqual({ seq: 5, reason: "It appears twice." });
  });
});

describe("countTypes", () => {
  it("counts events per type, most common first", async () => {
    expect(countTypes(await chain(25))).toEqual([
      { type: "agent.call", count: 22 },
      { type: "deploy", count: 3 },
    ]);
  });
});
