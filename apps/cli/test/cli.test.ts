import { describe, expect, it } from "vitest";
import { HEWITT } from "../src/format.ts";
import { HELP, run, type IO } from "../src/main.ts";

const stations = [
  { slug: "datspace", title: "datspace", frequency: 88.7, domain: "datspace.io", status: "live", summary: "The network itself." },
  { slug: "agent-native-interface", title: "The agent-native interface", frequency: 92.3, domain: "datspace.ai", status: "live", summary: "MCP and the CLI." },
];

const work = {
  ...stations[1],
  story: { question: "What is an interface for agents?", prototype: "MCP.", finding: "It works.", future: "More of it." },
  links: [{ label: "MCP", url: "https://datspace.ai/mcp" }],
  facets: ["ai"],
  markdown: "Run `npx datspace ls`.",
  hash: "a".repeat(64),
};

function api(routes: Record<string, unknown>, seen: Request[] = []): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    seen.push(request);
    const url = new URL(request.url);
    const body = routes[url.pathname + url.search] ?? {
      apiVersion: "2026-10-30",
      error: { code: "not_found", message: `No work has the slug "x".`, fix: "Call list_stations for the valid slugs." },
    };
    return Response.json(body);
  };
}

function io(fetchImpl: typeof fetch, overrides: Partial<IO> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const value: IO = {
    fetch: fetchImpl,
    readStdin: async () => null,
    prompt: async () => null,
    out: (t) => out.push(t),
    err: (t) => err.push(t),
    env: {},
    isTTY: false,
    columns: 80,
    ...overrides,
  };
  return { io: value, out, err };
}

const routes = {
  "/api/stations": { apiVersion: "2026-10-30", stations },
  "/api/work/agent-native-interface": { apiVersion: "2026-10-30", ...work },
  "/api/search?q=agent": { apiVersion: "2026-10-30", hits: [{ slug: "agent-native-interface", title: "The agent-native interface", snippet: "…an interface for agents…" }] },
  "/api/search?q=agent&limit=2": { apiVersion: "2026-10-30", hits: [] },
  "/api/graph": { apiVersion: "2026-10-30", nodes: [{ id: "datspace", kind: "work", label: "datspace" }], edges: [] },
};

describe("datspace CLI", () => {
  it("lists stations in aligned columns and identifies itself", async () => {
    const seen: Request[] = [];
    const { io: x, out } = io(api(routes, seen));
    expect(await run(["ls"], x, "0.1.0")).toBe(0);
    expect(out[0]).toBe(
      [
        " 88.7  datspace                    datspace.io  The network itself.",
        " 92.3  The agent-native interface  datspace.ai  MCP and the CLI.",
      ].join("\n"),
    );
    expect(seen[0]!.url).toBe("https://datspace.ai/api/stations");
    expect(seen[0]!.headers.get("x-datspace-client")).toBe("cli/0.1.0");
  });

  it("prints the API's JSON with --json", async () => {
    const { io: x, out } = io(api(routes));
    await run(["ls", "--json"], x, "0.1.0");
    expect(JSON.parse(out[0]!)).toEqual({ apiVersion: "2026-10-30", stations });
  });

  it("shows a work's story, body, and links", async () => {
    const { io: x, out } = io(api(routes));
    expect(await run(["show", "agent-native-interface"], x, "0.1.0")).toBe(0);
    expect(out[0]).toContain("The agent-native interface\n92.3 MHz, datspace.ai");
    expect(out[0]).toContain("Question   What is an interface for agents?");
    expect(out[0]).toContain("Run `npx datspace ls`.");
    expect(out[0]).toContain("  MCP  https://datspace.ai/mcp");
  });

  it("searches, with an optional limit", async () => {
    const seen: Request[] = [];
    const { io: x, out } = io(api(routes, seen));
    await run(["search", "agent"], x, "0.1.0");
    expect(out[0]).toContain("The agent-native interface  (agent-native-interface)");
    await run(["search", "agent", "--limit", "2"], x, "0.1.0");
    expect(seen[1]!.url).toBe("https://datspace.ai/api/search?q=agent&limit=2");
    expect(out[1]).toBe('No matches for "agent".');
  });

  it("prints the graph as JSON without the envelope", async () => {
    const { io: x, out } = io(api(routes));
    await run(["graph"], x, "0.1.0");
    expect(JSON.parse(out[0]!)).toEqual({ nodes: [{ id: "datspace", kind: "work", label: "datspace" }], edges: [] });
  });

  it("prints the 1973 citation and the three rules", async () => {
    const { io: x, out } = io(api(routes));
    await run(["hewitt"], x, "0.1.0");
    expect(out[0]).toBe(HEWITT);
    expect(out[0]).toContain("3. decide how it will handle the next message.");
  });

  it("prints the API's error and its fix, and exits 1", async () => {
    const { io: x, err } = io(api(routes));
    expect(await run(["show", "x"], x, "0.1.0")).toBe(1);
    expect(err[0]).toBe('No work has the slug "x".\nCall list_stations for the valid slugs.');
  });

  it("names the URL when the network fails", async () => {
    const { io: x, err } = io(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await run(["ls", "--api", "http://localhost:9"], x, "0.1.0")).toBe(1);
    expect(err[0]).toContain("Couldn't reach http://localhost:9");
  });

  it("explains missing arguments, unknown commands, and unknown flags", async () => {
    const { io: x, err } = io(api(routes));
    expect(await run(["show"], x, "0.1.0")).toBe(2);
    expect(await run(["search"], x, "0.1.0")).toBe(2);
    expect(await run(["nope"], x, "0.1.0")).toBe(2);
    expect(await run(["ls", "--nope"], x, "0.1.0")).toBe(2);
    expect(err.join("\n")).toContain("datspace ls");
    expect(err.at(-1)).toContain("datspace --help");
  });

  it("prints help and the version", async () => {
    const { io: x, out } = io(api(routes));
    await run([], x, "0.1.0");
    await run(["--version"], x, "0.1.0");
    expect(out).toEqual([HELP, "0.1.0"]);
  });

  it("uses bold only on a TTY without NO_COLOR", async () => {
    const tty = io(api(routes), { isTTY: true });
    await run(["ls"], tty.io, "0.1.0");
    expect(tty.out[0]).toContain("\x1b[1mdatspace\x1b[22m");
    const noColor = io(api(routes), { isTTY: true, env: { NO_COLOR: "1" } });
    await run(["ls"], noColor.io, "0.1.0");
    expect(noColor.out[0]).not.toContain("\x1b[");
  });

  it("honors DATSPACE_API", async () => {
    const seen: Request[] = [];
    const { io: x } = io(api(routes, seen), { env: { DATSPACE_API: "http://127.0.0.1:8787" } });
    await run(["ls"], x, "0.1.0");
    expect(seen[0]!.url).toBe("http://127.0.0.1:8787/api/stations");
  });

  it("transmits with flags, as a JSON POST", async () => {
    const seen: Request[] = [];
    const { io: x, out } = io(api({ "/api/transmit": { apiVersion: "2026-10-30", id: "m1", at: "2026-10-23T00:00:00.000Z" } }, seen));
    expect(await run(["transmit", "--reply-to", "ada@example.com", "--name", "Ada", "--body", " Hello. "], x, "0.2.0")).toBe(0);
    expect(seen[0]!.method).toBe("POST");
    expect(seen[0]!.headers.get("content-type")).toBe("application/json");
    expect(await seen[0]!.json()).toEqual({ reply_to: "ada@example.com", body: "Hello.", name: "Ada" });
    expect(out[0]).toBe("Sent. Jared will reply to ada@example.com. (Message m1)");
  });

  it("reads the body from stdin, or asks for what's missing", async () => {
    const seen: Request[] = [];
    const routes = { "/api/transmit": { apiVersion: "2026-10-30", id: "m2", at: "2026-10-23T00:00:00.000Z" } };
    const piped = io(api(routes, seen), { readStdin: async () => "Piped hello\n" });
    expect(await run(["transmit", "--reply-to", "b@example.com"], piped.io, "0.2.0")).toBe(0);
    expect(await seen[0]!.json()).toEqual({ reply_to: "b@example.com", body: "Piped hello" });

    const answers = ["c@example.com", "Typed hello"];
    const asked = io(api(routes, seen), { prompt: async () => answers.shift() ?? null });
    expect(await run(["transmit"], asked.io, "0.2.0")).toBe(0);
    expect(await seen[1]!.json()).toEqual({ reply_to: "c@example.com", body: "Typed hello" });
  });

  it("explains a transmit with nothing to send", async () => {
    const { io: x, err } = io(api({}));
    expect(await run(["transmit"], x, "0.2.0")).toBe(2);
    expect(err[0]).toContain("--reply-to");
  });
});
