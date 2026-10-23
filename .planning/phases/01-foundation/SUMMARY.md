# Phase 01: Foundation Summary

**A push to `main` now builds, tests, and deploys both Workers to workers.dev, and the Ledger records the commit in a hash chain anyone can verify.**

## Accomplishments

- pnpm monorepo: TypeScript 6 strict with `erasableSyntaxOnly`, so Node 24 runs `.ts` files directly (the content build and scripts need no compiler).
- `@datspace/clock`: `GENESIS_MS`, `msPerBar`, `barAt`, pure. 5 tests.
- `@datspace/contract`: zod 4 schemas (each doubles as its type), the six launch tools as data, `callTool` (validates, never throws, returns `{ error: { code, message, fix } }`), the `Source` interface with `createStaticSource`, `canonicalJson`, `sha256Hex`, `ledgerHash`, and `API_VERSION`. 21 tests.
- `@datspace/content`: loads `stations/*.md`, `profile.json`, and `clock.json`; rejects missing fields, slug and file-name mismatches, duplicate slugs and frequencies, off-dial frequencies, and live stations closer than 3.2 MHz, naming file and field; writes `.generated/content.json` with content hashes and glyph seeds. 8 tests.
- `datspace-web`: SvelteKit 3 and adapter-cloudflare 8, prerendered `/` placeholder and `/index/`, 1-bit base styles, self-hosted Geist and Geist Mono.
- `datspace-ai`: the Ledger Durable Object (declared in the `exports` block, SQLite), `GET /api/stations`, `GET /api/ledger`, `POST /admin/deploy`, everything else forwarded to `WEB`. 11 tests in workerd, including concurrent appends, argument-bearing events rejected, and tamper detection.
- CI: `ci.yml` on pull requests; `deploy.yml` on `main` deploys web, then ai, then records the deploy. First run green on every step.
- `pnpm verify:ledger`: recomputes the production chain from the public `/api/ledger`; no token needed.

## Files Created/Modified

- Root: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`, `LICENSE`, `README.md`, `.gitignore`, `scripts/verify-ledger.ts`
- `packages/{clock,contract,content}/**`
- `apps/web/**`, `apps/ai/**`
- `.github/workflows/{ci,deploy}.yml`
- `CLAUDE.md` (commands, SvelteKit 3 notes), `.planning/ROADMAP.md` (progress)

## Decisions Made

- **The schema lives in `contract`, not `content`.** `content` imports `StationFrontmatter` from `contract`, so the shape is defined once. Contract tests use a fixture rather than the built content, which would be a dependency cycle.
- **Ledger `seq` is assigned in code, not by `AUTOINCREMENT`,** because the hash covers it. `append` runs inside `blockConcurrencyWhile`, since the Web Crypto await doesn't close the input gate and concurrent appends would otherwise claim the same `seq`.
- **Ledger event data is a flat record of scalars.** Recursive JSON types broke RPC stub typing, and flat data also enforces "facts, not payloads."
- **The Ledger throws plain `Error`s with a readable message,** because a `ZodError` loses its details crossing RPC.
- **Fonts: Geist and Geist Mono** as the grotesk and mono sibling (OFL, true family, tabular figures). Provisional; Jared can swap them in `app.css` and `+layout.svelte`.
- **`/index` lives at `/index/`.** `/index` prerenders to the root `index.html`, and Cloudflare's asset handling redirects `/index` to `/`. `_redirects` sends `/index` to `/index/` with a 308.
- **`@cloudflare/vitest-plugin`** replaces `@cloudflare/vitest-pool-workers`; Vitest is pinned to 4.1 as its docs specify.
- **workers.dev subdomain is `datspace-web`,** set automatically on the first deploy. It's temporary until phase 06 attaches the domains.
- **`DEPLOY_TOKEN`** was generated locally, set as a Worker secret and a GitHub secret, and written to the gitignored `apps/ai/.dev.vars`. It was never printed.

## Issues Encountered

- SvelteKit 3 moved config from `svelte.config.js` into the Vite plugin, renamed `$lib` to `#lib`, and requires `tsconfig.json` to extend `$app/tsconfig`. ARCHITECTURE's sketches predate this; CLAUDE.md now records it.
- The prerender crawler silently skips `/index` because its output file collides with the root page. Fixed as above.
- A new workers.dev subdomain takes a few minutes to get a TLS certificate; the first smoke tests failed with a handshake error and then passed.

## Next Phase Readiness

Phase 02 (the tuner) can start. It reads `content.json` (frequencies, glyph seeds, `clock`) through `#lib/server/content.ts`, imports `@datspace/clock`, and replaces the placeholder `/`. Nothing in phase 02 touches the ai Worker.
