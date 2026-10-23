import { toolRequest } from "@datspace/contract/paths";
import type { ToolName } from "@datspace/contract";

export interface ClientOptions {
  api: string;
  version: string;
  fetch: typeof fetch;
}

/** An error the API returned, with its fix. */
export class ApiError extends Error {
  readonly code: string;
  readonly fix: string;

  constructor(code: string, message: string, fix: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fix = fix;
  }
}

/** Calls one tool over datspace.ai's JSON API and returns the response body. */
export async function callTool(
  options: ClientOptions,
  tool: ToolName,
  input: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const { method, path, body: requestBody } = toolRequest(tool, input);
  const url = options.api.replace(/\/$/, "") + path;
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-datspace-client": `cli/${options.version}`,
  };
  if (requestBody !== undefined) headers["content-type"] = "application/json";
  let res: Response;
  try {
    res = await options.fetch(url, { method, headers, body: requestBody });
  } catch {
    throw new Error(`Couldn't reach ${options.api}. Check the connection, or pass --api <url>.`);
  }
  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new Error(`${url} returned ${res.status} without JSON.`);
  }
  const error = body.error as { code: string; message: string; fix: string } | undefined;
  if (error) throw new ApiError(error.code, error.message, error.fix);
  return body;
}
