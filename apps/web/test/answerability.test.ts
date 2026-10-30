import { readFile } from "node:fs/promises";
import { tools } from "@datspace/contract";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { check, parseCases, runCase, type Case } from "../src/lib/dev/answerability.ts";

const NAMES = tools.map((tool) => tool.name);
const API_VERSION = "2026-10-30";

/** A fake datspace.ai that records each request and answers with `body`, pretty-printed like the real one. */
function api(body: unknown, status = 200) {
  const requests: { url: string; method: string; body: string | undefined; contentType: string | null }[] = [];
  const fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    requests.push({
      url: String(input),
      method: init.method ?? "GET",
      body: init.body as string | undefined,
      contentType: new Headers(init.headers).get("content-type"),
    });
    return new Response(JSON.stringify(body, null, 2), { status, headers: { "content-type": "application/json" } });
  };
  return { fetch: fetch as typeof globalThis.fetch, requests };
}

describe("parseCases", () => {
  it("reads tests/answerability.yaml", async () => {
    const source = await readFile(new URL("../../../tests/answerability.yaml", import.meta.url), "utf8");
    const cases = parseCases(parse(source), NAMES);
    expect(cases.length).toBeGreaterThan(0);
    for (const c of cases) {
      expect(NAMES).toContain(c.tool);
      expect(Boolean(c.mustContain?.length) || Boolean(c.mustError)).toBe(true);
    }
  });

  it("rejects what the runner would reject", () => {
    const good = { question: "Q?", tool: "get_profile", input: {}, mustContain: ["email"] };
    expect(parseCases([good], NAMES)).toEqual([good]);
    expect(() => parseCases({}, NAMES)).toThrow("must be a list");
    expect(() => parseCases([{ ...good, tool: "get_weather" }], NAMES)).toThrow("names no known tool");
    expect(() => parseCases([{ ...good, extra: 1 }], NAMES)).toThrow("unknown keys: extra");
    expect(() => parseCases([{ ...good, input: [] }], NAMES)).toThrow("needs an input mapping");
    expect(() => parseCases([{ ...good, mustContain: "email" }], NAMES)).toThrow("mustContain");
  });
});

describe("check", () => {
  const c: Case = { question: "Q?", tool: "get_profile", input: {}, mustContain: ["jared@datspace.io"] };

  it("passes when every fact is present", () => {
    expect(check(c, { text: '{"contact":{"email":"jared@datspace.io"}}' })).toEqual([]);
  });

  it("names each missing fact and any unexpected error", () => {
    expect(check(c, { text: "{}", errorCode: "internal" })).toEqual(["unexpected error internal", 'missing "jared@datspace.io"']);
  });

  it("expects the named error code", () => {
    const err: Case = { question: "Q?", tool: "get_work", input: { slug: "nope" }, mustError: "not_found" };
    expect(check(err, { text: "{}", errorCode: "not_found" })).toEqual([]);
    expect(check(err, { text: "{}" })).toEqual(["expected error not_found, got a result"]);
  });
});

describe("runCase", () => {
  it("GETs a read tool's path and matches facts in compact JSON, as the runner does", async () => {
    const { fetch, requests } = api({ apiVersion: API_VERSION, events: [{ type: "deploy", data: { commit: "61389cb" } }] });
    const c: Case = {
      question: "When was the network last deployed?",
      tool: "get_ledger",
      input: { type: "deploy", limit: 3 },
      mustContain: ['"type":"deploy"', "commit"],
    };
    expect(await runCase(c, "https://datspace.ai", API_VERSION, fetch)).toEqual([]);
    expect(requests).toEqual([
      { url: "https://datspace.ai/api/ledger?limit=3&type=deploy", method: "GET", body: undefined, contentType: null },
    ]);
  });

  it("POSTs transmit's input as JSON", async () => {
    const error = { code: "invalid_input", message: "Invalid input for transmit.", fix: "Send a valid address." };
    const { fetch, requests } = api({ apiVersion: API_VERSION, error }, 400);
    const c: Case = { question: "Q?", tool: "transmit", input: { reply_to: "not-an-email", body: "Hello" }, mustError: "invalid_input" };
    expect(await runCase(c, "https://datspace.ai", API_VERSION, fetch)).toEqual([]);
    expect(requests[0]).toEqual({
      url: "https://datspace.ai/api/transmit",
      method: "POST",
      body: '{"reply_to":"not-an-email","body":"Hello"}',
      contentType: "application/json",
    });
  });

  it("fails a response from another API version", async () => {
    const { fetch } = api({ apiVersion: "2026-01-01", stations: [] });
    const c: Case = { question: "Q?", tool: "list_stations", input: {}, mustContain: ["datspace"] };
    expect(await runCase(c, "https://datspace.ai", API_VERSION, fetch)).toEqual(["apiVersion 2026-01-01, expected 2026-10-30"]);
  });

  it("fails plainly when the API can't be reached or isn't JSON", async () => {
    const c: Case = { question: "Q?", tool: "list_stations", input: {}, mustContain: ["datspace"] };
    const offline = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof globalThis.fetch;
    expect(await runCase(c, "https://datspace.ai", API_VERSION, offline)).toEqual([
      "couldn't fetch https://datspace.ai/api/stations",
    ]);
    const html = (async () => new Response("<!doctype html>", { status: 502 })) as unknown as typeof globalThis.fetch;
    expect(await runCase(c, "https://datspace.ai", API_VERSION, html)).toEqual(["502 without JSON"]);
  });
});
