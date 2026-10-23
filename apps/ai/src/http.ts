import { API_VERSION, type ErrorBody, type ErrorCode } from "@datspace/contract";

const STATUS: Record<ErrorCode, number> = { invalid_input: 400, not_found: 404, internal: 500 };

/** Every JSON response carries `apiVersion`. */
export function json(body: object, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("access-control-allow-origin", "*");
  return new Response(JSON.stringify({ apiVersion: API_VERSION, ...body }, null, 2), {
    ...init,
    headers,
  });
}

export function jsonError(body: ErrorBody, status = STATUS[body.error.code]): Response {
  return json(body, { status, headers: { "cache-control": "no-store" } });
}
