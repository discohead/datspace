# Phase 04: datspace.ai Summary

**datspace.ai is a working agent interface: stateless MCP and a JSON API over the same six tools, llms.txt, a public live feed of agent calls, rate limits, and an answerability suite that passes 16 of 16 over MCP and JSON after every deploy. No model runs on our side.**

## Accomplishments

- **MCP** at `https://datspace.ai/mcp`: `createMcpHandler` from `agents` 0.30.0 with `@modelcontextprotocol/server` 2.3.1, both pinned as that release requires. The six contract tools are registered with title, description, input and output schemas, and read-only annotations. Results carry `structuredContent` plus a JSON text block; contract errors come back as `isError` with `{ error: { code, message, fix } }`.
- **JSON API**: `/api/stations`, `/api/work/:slug`, `/api/work/:slug.md`, `/api/search?q=&limit=`, `/api/graph`, `/api/profile`, `/api/ledger?limit=&type=`. Each response carries `apiVersion`.
- **Logging**: every tool call on MCP and JSON appends `agent.call { surface, tool }` via `waitUntil`; the CLI header sets the surface to `cli`. Tests prove the arguments never reach the Ledger.
- **Rate limits**: a Workers rate-limit binding, 120 requests a minute per client per location, on `/mcp` and `/api/*`; 429 with a `fix`.
- **llms.txt**: facts and links (MCP URL, CLI, every JSON endpoint, one line per station linking to its markdown, contact).
- **datspace.ai `/`** serves the web Worker's `/ai` page: how to connect (including the Claude Code one-liner), the tools with their descriptions, and the live feed from `/live.json`, which isn't a tool and isn't logged, so watching doesn't add rows.
- **Contract additions**: `workToMarkdown`, `toolPath` (the JSON route per tool, for the CLI and the suite), literal tool names so `ToolName` is the exact union, and a `type` filter on `get_ledger`.
- **Answerability suite**: `tests/answerability.yaml`, eight recruiter questions including one error case, run by `pnpm check:answers` over MCP (`@modelcontextprotocol/client`) and JSON. It runs in CI after every deploy, alongside the axe-core audit (now including `/ai`).
- **A real agent**: headless Claude Code with only datspace.ai's MCP answered "how do I reach Jared, and what's on the dial?" correctly.

## Decisions Made

- **`get_ledger` takes `type`.** "When was the network last deployed?" read the latest 20 events, and agent traffic pushed every deploy out of the window. Agents would hit the same wall.
- **`Ledger.recent()` takes an options object** so fields can be added without breaking callers on older code.
- **Deploys wait for the Ledger.** New code reaches a Durable Object minutes after a deploy (observed: at least 4 minutes, about 90 seconds, and 5 minutes). The ai Worker deploys with `--var COMMIT:<sha>`, the Ledger reports it through `version()`, and CI polls `GET /admin/version` until both match before recording the deploy and running checks.
- **The MCP handler is built per request** with a closure over `env`; nothing uses `notify`.

## Issues Encountered

- The `type` filter passed every local test and failed in production. Sending the new options object proved the cause: production returned one event, which is what the old `recent(limit)` code does with an object. The old Ledger was still serving requests. Fixed by the wait step above; recorded in CLAUDE.md.
- My first note in CLAUDE.md said "over 20 minutes" before I had measured; corrected to the observed times.
- Tests needed a `Host` header on MCP requests (real clients always send one).
- The live feed and the Ledger now include CI's own answerability calls: 16 per deploy, labeled with their surface like any other agent.

## Next Phase Readiness

Phase 05 (CLI) builds on `toolPath`, the `cli/<version>` surface header, and the contract types. `npx datspace ls` must work on a clean machine, and the name is already held on npm at 0.0.0.
