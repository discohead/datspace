import type { ToolName } from "@datspace/contract";
import { toolRequest } from "@datspace/contract/paths";

/** One case in tests/answerability.yaml: a question, the tool that answers it, and what the answer must hold. */
export interface Case {
  question: string;
  tool: ToolName;
  input: Record<string, unknown>;
  mustContain?: string[];
  mustError?: string;
}

/**
 * Checks parsed YAML against the shape tests/answerability.ts expects, so a
 * case the runner would reject fails this page's build too.
 */
export function parseCases(value: unknown, toolNames: readonly string[]): Case[] {
  if (!Array.isArray(value)) throw new Error("tests/answerability.yaml must be a list of cases.");
  return value.map((item: unknown, i) => {
    const where = `tests/answerability.yaml, case ${i + 1}`;
    if (item === null || typeof item !== "object") throw new Error(`${where} isn't a mapping.`);
    const { question, tool, input, mustContain, mustError, ...rest } = item as Record<string, unknown>;
    const extra = Object.keys(rest);
    if (extra.length) throw new Error(`${where} has unknown keys: ${extra.join(", ")}.`);
    if (typeof question !== "string") throw new Error(`${where} needs a question.`);
    if (typeof tool !== "string" || !toolNames.includes(tool)) throw new Error(`${where} names no known tool.`);
    if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error(`${where} needs an input mapping.`);
    if (mustContain !== undefined && !(Array.isArray(mustContain) && mustContain.every((f) => typeof f === "string"))) {
      throw new Error(`${where}: mustContain must be a list of strings.`);
    }
    if (mustError !== undefined && typeof mustError !== "string") throw new Error(`${where}: mustError must be a string.`);
    return {
      question,
      tool: tool as ToolName,
      input: input as Record<string, unknown>,
      ...(mustContain === undefined ? {} : { mustContain: mustContain as string[] }),
      ...(mustError === undefined ? {} : { mustError }),
    };
  });
}

export interface Outcome {
  /** The response as compact JSON. */
  text: string;
  errorCode?: string;
}

/** The runner's check: the expected error code or none, then every fact. Returns the problems; none is a pass. */
export function check(c: Case, outcome: Outcome): string[] {
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

/**
 * Calls one case's tool over the JSON API, as tests/answerability.ts does.
 * The body is re-serialized compactly before checking, as the runner does, so
 * a fact like "type":"deploy" matches however the server spaces its JSON.
 */
export async function runCase(c: Case, base: string, apiVersion: string, get: typeof fetch = fetch): Promise<string[]> {
  const { method, path, body: requestBody } = toolRequest(c.tool, c.input);
  let res: Response;
  try {
    res = await get(base + path, {
      method,
      body: requestBody,
      headers: requestBody ? { "content-type": "application/json" } : {},
      cache: "no-store",
    });
  } catch {
    return [`couldn't fetch ${base + path}`];
  }
  let body: { apiVersion?: string; error?: { code?: string } };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    return [`${res.status} without JSON`];
  }
  if (body.apiVersion !== apiVersion) return [`apiVersion ${body.apiVersion}, expected ${apiVersion}`];
  return check(c, { text: JSON.stringify(body), errorCode: body.error?.code });
}
