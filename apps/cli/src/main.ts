import { parseArgs } from "node:util";
import type { Graph, SearchHit, Station, Work } from "@datspace/contract";
import { ApiError, callTool, type ClientOptions } from "./client.ts";
import { HEWITT, formatHits, formatStations, formatWork, plain, type Style } from "./format.ts";

export interface IO {
  fetch: typeof fetch;
  out(text: string): void;
  err(text: string): void;
  env: Record<string, string | undefined>;
  isTTY: boolean;
  columns: number | undefined;
}

export const DEFAULT_API = "https://datspace.ai";

export const HELP = `datspace: Jared McFarland's portfolio network, from the terminal.

Usage
  datspace ls                  Every station on the dial
  datspace show <slug>         One work: its story, links, and full text
  datspace search <query>      Full-text search, with snippets
  datspace graph               Works, domains, and the links between them, as JSON
  datspace hewitt              The 1973 actor paper and its three rules

Options
  --json         Print the API's JSON instead of text
  --api <url>    Use another datspace API (default ${DEFAULT_API})
  --limit <n>    Number of search results, 1 to 20
  -h, --help     Show this help
  -v, --version  Print the version

The same tools are available to agents over MCP at ${DEFAULT_API}/mcp.`;

/** Runs one command and returns the exit code. */
export async function run(argv: string[], io: IO, version: string): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        json: { type: "boolean", default: false },
        api: { type: "string", default: io.env.DATSPACE_API ?? DEFAULT_API },
        limit: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
    });
  } catch (err) {
    io.err(`${(err as Error).message}\nRun datspace --help for the options.`);
    return 2;
  }
  const { values, positionals } = parsed;
  const [command, ...rest] = positionals;

  if (values.version) {
    io.out(version);
    return 0;
  }
  if (values.help || !command || command === "help") {
    io.out(HELP);
    return 0;
  }

  const color = io.isTTY && !io.env.NO_COLOR;
  const style: Style = {
    bold: color ? (t) => `\x1b[1m${t}\x1b[22m` : plain.bold,
    width: Math.min(io.columns ?? 80, 100),
  };
  const client: ClientOptions = { api: values.api, version, fetch: io.fetch };
  const print = (body: Record<string, unknown>, text: () => string) => io.out(values.json ? JSON.stringify(body, null, 2) : text());

  try {
    switch (command) {
      case "ls": {
        const body = await callTool(client, "list_stations");
        print(body, () => formatStations(body.stations as Station[], style));
        return 0;
      }
      case "show": {
        const slug = rest[0];
        if (!slug) {
          io.err("datspace show needs a slug, like: datspace show datspace\nRun datspace ls for the slugs.");
          return 2;
        }
        const body = await callTool(client, "get_work", { slug });
        print(body, () => formatWork(body as unknown as Work, style));
        return 0;
      }
      case "search": {
        const query = rest.join(" ").trim();
        if (!query) {
          io.err('datspace search needs a query, like: datspace search "Cloudflare"');
          return 2;
        }
        const input: Record<string, unknown> = { query };
        if (values.limit !== undefined) input.limit = Number(values.limit);
        const body = await callTool(client, "search", input);
        print(body, () => formatHits(body.hits as SearchHit[], query, style));
        return 0;
      }
      case "graph": {
        const body = await callTool(client, "get_graph");
        const { nodes, edges } = body as unknown as Graph;
        io.out(JSON.stringify(values.json ? body : { nodes, edges }, null, 2));
        return 0;
      }
      case "hewitt":
        io.out(values.json ? JSON.stringify({ citation: HEWITT.split("\n\n")[0], text: HEWITT }, null, 2) : HEWITT);
        return 0;
      default:
        io.err(`Unknown command "${command}".\n\n${HELP}`);
        return 2;
    }
  } catch (err) {
    if (err instanceof ApiError) {
      io.err(`${err.message}\n${err.fix}`);
    } else {
      io.err((err as Error).message);
    }
    return 1;
  }
}
