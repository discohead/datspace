import type { z } from "zod";

export type ErrorCode = "invalid_input" | "not_found" | "internal";

/** Every surface returns errors in this shape. `fix` says how to correct the call. */
export interface ErrorBody {
  error: { code: ErrorCode; message: string; fix: string };
}

export class ToolError extends Error {
  readonly code: ErrorCode;
  readonly fix: string;

  constructor(code: ErrorCode, message: string, fix: string) {
    super(message);
    this.name = "ToolError";
    this.code = code;
    this.fix = fix;
  }

  toBody(): ErrorBody {
    return { error: { code: this.code, message: this.message, fix: this.fix } };
  }
}

export function invalidInput(tool: string, issues: z.core.$ZodIssue[]): ToolError {
  const detail = issues
    .map((issue) => `${issue.path.length ? issue.path.join(".") : "input"}: ${issue.message}`)
    .join("; ");
  return new ToolError(
    "invalid_input",
    `Invalid input for ${tool}: ${detail}.`,
    `Send input that matches the ${tool} input schema.`,
  );
}
