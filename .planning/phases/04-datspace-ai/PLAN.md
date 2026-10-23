---
phase: 04-datspace-ai
type: execute
---

<objective>
The agent-native interface on datspace.ai: stateless MCP with the six tools, the full JSON API, llms.txt, a public live view of agent calls, rate limiting, and the answerability suite in CI.

Purpose: The posting asks for "new interfaces and interaction paradigms for … agentic systems." This is that, working: any agent can connect and answer a recruiter's questions about Jared with no model on our side.
Output: `/mcp`, `/api/{stations,work/:slug,work/:slug.md,search,graph,profile,ledger}`, `/llms.txt`, `/live.json`, the `/ai` page as datspace.ai's front door, and `pnpm check:answers` running after every deploy.
</objective>

<context>
@CLAUDE.md
@.planning/ARCHITECTURE.md (Surfaces on datspace.ai, Answerability suite)
@.planning/phases/03-datspace-io/SUMMARY.md
</context>

<decisions>
- **Versions:** `agents` 0.30.0 requires `@modelcontextprotocol/server` 2.3.1 and `@modelcontextprotocol/client` 2.3.1, both pinned exactly (verified October 22).
- **The MCP handler is built per request** with a closure over `env`. The docs allow it for ordinary tools, and nothing here uses `notify`.
- **Every tool call on MCP and JSON appends `agent.call { surface, tool }`** via `waitUntil`. The CLI's `x-datspace-client: cli/<version>` header makes the surface `cli`.
- **The live view reads `/live.json`, which is not a tool and isn't logged.** Otherwise every viewer's polling would fill the Ledger with its own reads.
- **Rate limiting:** a Workers rate-limit binding, 120 requests per minute per client IP per location, on `/mcp` and `/api/*`. Each call writes a Ledger row, so this bounds the writes too. The IP is the limiter key only; it is never stored or logged.
- **datspace.ai `/` serves the web Worker's `/ai` page**: how to connect, and the live feed. Every other path is unchanged.
</decisions>

<tasks>

### Task 1: JSON API and logging

**Files**: `apps/ai/src/{api,log,http}.ts`, tests
**Action**: Routes for every tool, plus `/api/work/:slug.md` (`text/markdown`: title, summary, the four beats, body, links). Log each tool call; never arguments. 429 with `{ error: { code: "rate_limited", … fix } }` over the limit.
**Done**: Tests cover each route, the markdown route, unknown slugs, logging (surface json and cli), and that nothing in a logged event contains the input.

### Task 2: MCP

**Files**: `apps/ai/src/mcp.ts`, `apps/ai/test/mcp.test.ts`
**Action**: `createMcpHandler` with a factory that registers the six tools from the contract (`title`, `description`, `inputSchema`, `outputSchema`), returning `structuredContent` plus a JSON text block; contract errors come back as `isError` results carrying the `{ error }` body. `allowedHostnames` covers datspace.ai and the workers.dev host.
**Done**: In-worker tests list the tools and call `get_profile` and an unknown slug through the MCP protocol.

### Task 3: llms.txt and live.json

**Files**: `apps/ai/src/{llms,live}.ts`
**Action**: `llms.txt` from the content bundle: one paragraph, the MCP URL, the CLI, the JSON endpoints, and one line per station linking to `/api/work/<slug>.md`. `/live.json`: the latest 50 events, CORS open, `no-store`.
**Done**: Both are served and tested.

### Task 4: The /ai page

**Files**: `apps/web/src/routes/ai/*`, `apps/ai/src/index.ts`
**Action**: How to connect (MCP URL with a Claude Code one-liner, `npx datspace ls`, llms.txt, JSON) and the live feed: time, surface, and tool for each event, plus a short hash, polled every 5 seconds while the tab is visible. datspace.ai `/` serves it.
**Done**: The axe-core audit includes `/ai`.

### Task 5: The answerability suite

**Files**: `tests/answerability.yaml`, `tests/answerability.ts`, root `package.json`, `.github/workflows/deploy.yml`
**Action**: Questions a recruiter's agent would ask, each mapped to a tool, its input, and strings the result must contain (or an error code it must return). The runner calls each over MCP (`@modelcontextprotocol/client`, Streamable HTTP) and over JSON. No model. Runs after each deploy.
**Done**: Passes against production on both surfaces.

</tasks>

<verification>
- [ ] `pnpm build && pnpm typecheck && pnpm test` pass
- [ ] `pnpm check:answers` passes against datspace.ai over MCP and JSON
- [ ] Claude Code can add `https://datspace.ai/mcp` and list the tools
- [ ] `/api/ledger` shows `agent.call` events with surface and tool only
</verification>

<output>
`.planning/phases/04-datspace-ai/SUMMARY.md`
</output>
