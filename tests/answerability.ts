/**
 * The answerability suite: every case in answerability.yaml, called over MCP
 * and over JSON against a live datspace.ai. Exits non-zero on any miss.
 *
 *   AI_URL=https://datspace.ai pnpm check:answers
 */
import { readFile } from "node:fs/promises";
import { API_VERSION, toolPath, type ToolName } from "@datspace/contract";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { parse } from "yaml";
import { z } from "zod";

const Case = z.strictObject({
  question: z.string(),
  tool: z.string(),
  input: z.record(z.string(), z.unknown()),
  mustContain: z.array(z.string()).optional(),
  mustError: z.string().optional(),
});
type Case = z.infer<typeof Case>;

const base = (process.env.AI_URL ?? "https://datspace.ai").replace(/\/$/, "");
const cases = z.array(Case).parse(parse(await readFile(new URL("answerability.yaml", import.meta.url), "utf8")));

interface Outcome {
  text: string;
  errorCode?: string;
}

async function viaJson(c: Case): Promise<Outcome> {
  const res = await fetch(base + toolPath(c.tool as ToolName, c.input));
  const body = (await res.json()) as { apiVersion?: string; error?: { code: string } };
  if (body.apiVersion !== API_VERSION) throw new Error(`apiVersion ${body.apiVersion}, expected ${API_VERSION}`);
  return { text: JSON.stringify(body), errorCode: body.error?.code };
}

const client = new Client({ name: "datspace-answerability", version: API_VERSION });
await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));

async function viaMcp(c: Case): Promise<Outcome> {
  const result = await client.callTool({ name: c.tool, arguments: c.input });
  const text = JSON.stringify(result.structuredContent ?? result.content);
  if (!result.isError) return { text };
  const block = (result.content as { type: string; text: string }[])[0];
  const parsed = JSON.parse(block?.text ?? "{}") as { error?: { code: string } };
  return { text, errorCode: parsed.error?.code };
}

function check(c: Case, outcome: Outcome): string[] {
  const problems: string[] = [];
  if (c.mustError) {
    if (outcome.errorCode !== c.mustError) problems.push(`expected error ${c.mustError}, got ${outcome.errorCode ?? "a result"}`);
  } else if (outcome.errorCode) {
    problems.push(`unexpected error ${outcome.errorCode}`);
  }
  for (const fact of c.mustContain ?? []) {
    if (!outcome.text.includes(fact)) problems.push(`missing "${fact}"`);
  }
  return problems;
}

let failures = 0;
for (const c of cases) {
  for (const [surface, call] of [
    ["mcp", viaMcp],
    ["json", viaJson],
  ] as const) {
    let problems: string[];
    try {
      problems = check(c, await call(c));
    } catch (err) {
      problems = [(err as Error).message];
    }
    if (problems.length) failures++;
    console.log(`${problems.length ? "FAIL" : "ok  "}  ${surface.padEnd(4)} ${c.question}${problems.length ? `\n        ${problems.join("; ")}` : ""}`);
  }
}
await client.close();
console.log(`\n${cases.length * 2 - failures} of ${cases.length * 2} answered`);
process.exit(failures === 0 ? 0 : 1);
