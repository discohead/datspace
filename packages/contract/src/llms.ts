import { API_ENDPOINTS } from "./paths.ts";
import type { ContentBundle } from "./schemas.ts";
import { API_VERSION } from "./version.ts";

/**
 * llms.txt for any agent that can fetch a URL: facts and links, no instructions. `origin` is where the
 * surfaces it lists answer. datspace-ai serves it on the bands it answers for, and datspace-web
 * prerenders the same file for datspace.io.
 */
export function llmsTxt(content: ContentBundle, origin: string): string {
  const stations = content.stations
    .filter((s) => s.status === "live")
    .map((s) => `- [${s.title}](${origin}/api/work/${s.slug}.md) (${s.frequency.toFixed(1)} MHz): ${s.summary}`);
  return [
    "# datspace",
    "",
    "> Jared McFarland's portfolio network: a tuner for people at https://datspace.io and an actor network for agents at https://datspace.ai. Every response is facts and links; no model runs on this side.",
    "",
    "## Connect",
    "",
    `- MCP (Streamable HTTP, stateless, no auth): ${origin}/mcp`,
    "- CLI: `npx datspace ls`",
    `- JSON (API version ${API_VERSION}):`,
    // The origin goes in front of the path, after a method if the endpoint names one: "POST https://…/api/transmit".
    ...API_ENDPOINTS.map((e) => `  - ${e.replace("/api/", `${origin}/api/`)}`),
    "",
    "## Stations",
    "",
    ...stations,
    "",
    "## Bands",
    "",
    "- https://datspace.io: the dial",
    "- https://datspace.ai: this interface, and a live view of agent calls",
    "- https://datspace.dev: the source, the tool contract, and the ledger, verified in the browser",
    "- https://datspace.fm: a generative station that plays in the browser",
    "- https://datspace.music: a catalog",
    "- https://datspace.studio: patter, a synthesizer patched by talking, in listener mode",
    "",
    "## Contact",
    "",
    `- ${content.profile.contact.email}`,
    "",
  ].join("\n");
}
