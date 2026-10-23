import { API_VERSION, type ContentBundle } from "@datspace/contract";
import { API_ENDPOINTS } from "./api.ts";

/** llms.txt for any agent that can fetch a URL: facts and links, no instructions. */
export function llmsTxt(content: ContentBundle, origin: string): string {
  const stations = content.stations
    .filter((s) => s.status === "live")
    .map((s) => `- [${s.title}](${origin}/api/work/${s.slug}.md): ${s.frequency.toFixed(1)} MHz, ${s.summary}`);
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
    ...API_ENDPOINTS.map((e) => `  - ${origin}${e}`),
    "",
    "## Stations",
    "",
    ...stations,
    "",
    "## Contact",
    "",
    `- ${content.profile.contact.email}`,
    "",
  ].join("\n");
}
