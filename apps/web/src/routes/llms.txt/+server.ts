import { llmsTxt } from "@datspace/contract";
import { content } from "#lib/server/content.ts";

// datspace-ai answers /llms.txt on every band it holds. datspace.io is this Worker's, so it prerenders the same file.
export const prerender = true;

export function GET(): Response {
  return new Response(llmsTxt(content, "https://datspace.ai"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
