---
phase: 01-foundation
type: execute
---

<objective>
Stand up the monorepo, the three shared packages, both Workers with the Ledger, and deploy on push.

Purpose: Every later phase builds on this contract and this pipeline. Proving the Durable Object declaration, the service binding, and SvelteKit 3 on Workers on day one takes the riskiest unknowns off the tuner's path.
Output: The `clock`, `content`, and `contract` packages; a `datspace-web` Worker that prerenders a placeholder `/` and `/index` from content; a `datspace-ai` Worker with the Ledger, `/api/stations`, `/api/ledger`, and `/admin/deploy`; and GitHub Actions that deploy both on every push to `main`.
</objective>

<context>
@CLAUDE.md
@.planning/BRIEF.md
@.planning/ROADMAP.md
@.planning/ARCHITECTURE.md (read "At launch" first; it overrides the rest)
</context>

<tasks>

### Task 1: Scaffold the pnpm monorepo

**Files**: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`, `README.md`, `LICENSE`
**Action**: Workspaces `apps/*`, `packages/*` (add `workers/*` after launch). TypeScript 6, strict, ESM, `"moduleResolution": "bundler"`. Root scripts `typecheck`, `test`, `build` (each `pnpm -r`). Node 24 in `.nvmrc`; `packageManager` pinned to the installed pnpm. MIT license, copyright Jared McFarland. The README says what datspace is in three sentences and links `.planning/`. Avoid scaffolders that create nested git repos or their own lockfiles.
**Verify**: `pnpm install && pnpm -r typecheck` exits 0.
**Done**: A clean clone installs and typechecks with no errors or warnings.

### Task 2: Build `packages/clock`

**Files**: `packages/clock/package.json`, `packages/clock/src/index.ts`, `packages/clock/test/clock.test.ts`
**Action**: Export `GENESIS_MS = Date.UTC(1973, 0, 1)`, `msPerBar(bpm, beatsPerBar)`, and `barAt(nowMs, bpm, beatsPerBar)`, which returns whole bars since genesis. Pure functions only; never call `Date.now()` inside, so the tuner and tests stay deterministic.
**Verify**: `pnpm --filter @datspace/clock test`
**Done**: Tests cover genesis returning 0, exactly one bar later returning 1, fractional bars flooring, and a non-positive bpm throwing.

### Task 3: Build `packages/content`

**Files**: `packages/content/package.json`, `packages/content/src/{schema,load,hash,build}.ts`, `packages/content/stations/{datspace,agent-native-interface}.md`, `packages/content/clock.json`, `packages/content/profile.json`, `packages/content/test/content.test.ts`
**Action**: A zod schema for station frontmatter exactly as in ARCHITECTURE's content model. The loader reads `stations/*.md`, parses frontmatter with the `yaml` package, validates, and returns typed docs sorted by frequency. `hash()` is the SHA-256 hex of canonical JSON (sorted keys) over frontmatter plus body, using Web Crypto so it runs in Node and Workers. Reject duplicate slugs, duplicate frequencies, frequencies outside 87.5 to 108.0, and live stations closer than 3.2 MHz. The `build` script writes `.generated/content.json` with `{ stations: [{ ...doc, hash, glyphSeed }], profile, clock }`, where `glyphSeed` is the SHA-256 hex of the slug; packages that need content depend on this build. Use the frequencies in `.planning/CONTENT.md`. Placeholder text is fine; the answerability phrase `npx datspace` must appear in `agent-native-interface`.
**Verify**: `pnpm --filter @datspace/content test && pnpm --filter @datspace/content build`
**Done**: Valid files load and build. A missing field, a duplicate slug, and two stations 3.0 MHz apart each fail with a message naming the file and the field.

### Task 4: Build `packages/contract`

**Files**: `packages/contract/package.json`, `packages/contract/src/{types,schemas,tools,source,errors,index}.ts`, `packages/contract/test/{tools,source}.test.ts`
**Action**: Types and zod 4 schemas from ARCHITECTURE's contract section. Define the `Source` interface and `createStaticSource(content, ledger)` from "At launch", with search as a case-insensitive term match over title, summary, and body that returns a short snippet around the first hit. Define the six launch tools as data (`name`, `title`, `description`, `input` schema, `run(source, input)`), so MCP, JSON, and the CLI share one implementation. Each description is one factual sentence; no adjectives and no instructions to the agent. Export `API_VERSION = "2026-10-30"`. Import nothing from Cloudflare, because the CLI and tests run this package in Node.
**Verify**: `pnpm --filter @datspace/contract typecheck && pnpm --filter @datspace/contract test`
**Done**: Each tool rejects bad input with `{ error: { code, message, fix } }`; with the built content and an in-memory ledger, every tool's happy path passes and `search` for "agent" finds `agent-native-interface`.

### Task 5: Build the `datspace-web` skeleton

**Files**: `apps/web/package.json`, `apps/web/svelte.config.js`, `apps/web/vite.config.ts`, `apps/web/wrangler.jsonc`, `apps/web/src/app.html`, `apps/web/src/routes/{+layout.ts,+page.svelte,index/+page.svelte,index/+page.ts}`
**Action**: **Verify first**: read the current SvelteKit 3 and `@sveltejs/adapter-cloudflare` 8 docs and use their config keys, not the sketches in ARCHITECTURE. Prerender every route. `/` is a placeholder heading for now (phase 02 replaces it with the tuner). `/index` lists stations from `content.json`: frequency, title, summary, in tabular figures. Set the 1-bit base styles now: `#000` and `#fff` tokens, one grotesk and its mono sibling (self-hosted, no font CDN), `font-variant-numeric: tabular-nums` on readouts. No bindings.
**Verify**: `pnpm --filter @datspace/web build && pnpm --filter @datspace/web exec wrangler deploy --dry-run`; then `pnpm --filter @datspace/web dev` and `curl -s localhost:<port>/index` lists both stations.
**Done**: The site builds, prerenders, and passes a Wrangler dry run.

### Task 6: Build the `datspace-ai` skeleton with the Ledger

**Files**: `apps/ai/package.json`, `apps/ai/wrangler.jsonc`, `apps/ai/src/{index,ledger,api,admin}.ts`, `apps/ai/vitest.config.ts`, `apps/ai/test/{ledger,api}.test.ts`
**Action**: **Verify first**: read the Durable Objects get-started docs for the `exports` block with SQLite storage and `getByName()`, and the Workers Vitest integration docs for the current test package. `Ledger` extends `DurableObject` from `cloudflare:workers` with the schema, hash chain, `append`, `recent`, and `verify` from ARCHITECTURE; skip the WebSocket `fetch` for now. Consume SQL cursors with `.toArray()` before any `await`. Declare it in the `exports` block, never the legacy `migrations` array. Bind `WEB` to the `datspace-web` service. Routes: `GET /api/stations` and `GET /api/ledger?limit=` (both include `apiVersion`, both run through the contract's tools and `createStaticSource`), `POST /admin/deploy` (bearer `DEPLOY_TOKEN`, constant-time comparison, body `{ commit }`, appends one `deploy` event); everything else is `env.WEB.fetch(request)`. Put `DEPLOY_TOKEN` in `.dev.vars` locally, which is gitignored.
**Verify**: `pnpm --filter @datspace/ai test`
**Done**: Tests prove that `/admin/deploy` returns 401 without the token and appends one event with it; `/api/ledger` returns that event with `apiVersion`; `Ledger.verify()` passes, then fails after a row is tampered with; and an unknown path is forwarded to `WEB`.

### Task 7: Add the GitHub Actions workflows

**Files**: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
**Action**: `ci.yml` on pull requests: install, build content, typecheck, test, build. `deploy.yml` on push to `main`: the same checks, then `wrangler deploy` for web, then for ai, then `POST /admin/deploy` with `GITHUB_SHA`. Use repository secrets and never echo them. Set `DEPLOY_TOKEN` on the ai Worker with `wrangler secret put` once, by hand. Phase 04 adds the answerability suite and phase 05 adds `cli-release.yml`.
**Verify**: Push a one-line change to a station's summary. The workflow goes green, the web Worker's `/index` shows the change, and the ai Worker's `GET /api/ledger?limit=5` shows a `deploy` event with the pushed SHA.
**Done**: The phase 01 check in ROADMAP passes on workers.dev.

</tasks>

<verification>
Before declaring the phase complete:
- [ ] `pnpm install && pnpm -r build && pnpm -r typecheck && pnpm -r test` pass from a clean clone
- [ ] The ai Worker's `/` returns the web Worker's placeholder page (the service binding works)
- [ ] `Ledger.verify()` passes against production
- [ ] `git grep -n "DEPLOY_TOKEN="` finds no secret values in the repo
- [ ] `git grep -niE "openai|anthropic|workers-ai|@cf/" -- apps packages` finds nothing (no inference)
</verification>

<success_criteria>
- All tasks completed and verified
- A push to `main` deploys both Workers and records the commit in the Ledger
- No model calls anywhere in the code
- No errors or warnings introduced
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/SUMMARY.md`:

# Phase 01: Foundation Summary

**[One line on what shipped]**

## Accomplishments
## Files Created/Modified
## Decisions Made
## Issues Encountered
## Next Phase Readiness
</output>
