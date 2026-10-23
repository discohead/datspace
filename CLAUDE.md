# datspace

A portfolio network: a tuner for people at datspace.io and an actor network for agents at datspace.ai, built on Cloudflare Workers and SQLite-backed Durable Objects. Launch is **October 30, 2026**.

Read these before any work:

- @.planning/BRIEF.md: what we're building and why
- @.planning/ROADMAP.md: phases, done-when checks, and the cut line
- @.planning/ARCHITECTURE.md: Workers, actors, contract, surfaces, and pinned versions. Its "At launch" section overrides the rest until October 30.
- @.planning/CONTENT.md: what each station needs, and when Jared's writing is due

## Layout

```
apps/web            SvelteKit 3 site → Worker "datspace-web" (datspace.io, unlit domains, human pages on datspace.ai)
apps/ai             Worker "datspace-ai": MCP, JSON API, llms.txt, admin deploy, and the Ledger actor
apps/cli            TypeScript CLI, published to npm as "datspace"
packages/contract   Types, zod schemas, tool definitions, Source, API_VERSION (the single source of truth)
packages/content    Station markdown, schema, loader, content hashes, build to .generated/content.json
packages/clock      Pure clock math: bars since 1973
tests/              answerability.yaml and its runner

After launch: workers/actors (Network, Work, Ledger, Inbox), scripts/publish.ts, and Cap'n Web RPC.
```

## Commands

Keep this table in sync with `package.json`.

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Build everything (content first; typecheck and test need it) | `pnpm build` |
| Typecheck everything | `pnpm typecheck` |
| Test everything | `pnpm test` |
| Build content only | `pnpm --filter @datspace/content build` |
| Run the site | `pnpm --filter @datspace/web dev` |
| Run datspace-ai locally | `pnpm --filter @datspace/ai dev` (needs `apps/ai/.dev.vars` with `DEPLOY_TOKEN`) |
| Check the public Ledger's hash chain | `AI_URL=https://datspace.ai pnpm verify:ledger` |
| Audit accessibility (axe-core, installed Chrome) | `WEB_URL=https://datspace.io pnpm check:a11y` |
| Deploy | CI only, on push to `main`: web → ai, then `POST /admin/deploy` |

`datspace-web` serves datspace.io. `datspace-ai` serves datspace.ai and redirects datspace.dev, .fm, .music, and .studio to `https://datspace.io/#<band>` (static assets on datspace-web would be served before any redirect code). Repo variables `WEB_URL` and `AI_URL` hold the two origins.

## SvelteKit 3 notes

- Config lives in `vite.config.ts` (`sveltekit({ adapter, ... })`); `svelte.config.js` is gone.
- `$lib` is `#lib`, declared in `apps/web/package.json` `imports`. Imports need extensions.
- `tsconfig.json` extends `$app/tsconfig`.
- The index route is `/index/` (trailing slash), and `apps/web/_redirects` sends `/index` there, because `/index` would prerender to the root `index.html`.

## Non-negotiables

1. **No inference.** Runtime code never calls a model: no AI SDKs, no Workers AI, no embeddings. Agents bring their own models.
2. **An actor owns state or coordinates something.** Otherwise it's a function or a file. Don't add a Durable Object without naming the state it owns.
3. **Agent-facing output is facts and links only.** Tool descriptions and results never tell an agent what to conclude or do.
4. **Define once, expose everywhere.** Tools, types, and schemas live in `packages/contract`. MCP, JSON, RPC, and the CLI derive from it. Never redefine a shape inside an app.
5. **Git is the source of truth for content.** Publishing is a message to actors. Never edit actor state by hand.
6. **Static where it can be, actors where it's alive.** Pages prerender from `packages/content`. At runtime, only agent queries, the ledger feed, messages, and publishing touch actors.
7. **1-bit chrome.** True `#000` and `#fff`, one grotesk with a mono sibling and tabular figures. A station's color appears only when it's locked. Threlte only for the tuner, p5.js only for the studies, Tone.js only after a click.
8. **Accessibility floor.** The dial works by keyboard, `prefers-reduced-motion` gets a still frame, and no WebGL falls back to the index.
9. **Public repo.** Secrets live in Wrangler and GitHub secrets, never in files. Write code, comments, and commit messages for a reader who might hire you.

## Don't

- Add Tailwind, UI component kits, or effect libraries such as Svelte Bits or Canvas UI. Effects are authored here.
- Use `McpAgent`. It's deprecated; use the stateless `createMcpHandler`.
- Log tool arguments, IP addresses, user agents, or message contents to the Ledger.
- Declare Durable Objects with the legacy `migrations` array. Use the `exports` block.
- Add a dependency without saying why in the commit message.

## Verify before use

These APIs changed recently. Read the docs before writing code against them, and don't guess binding names:

- Durable Object declaration (`exports` block, SQLite storage) and `getByName()` stubs: https://developers.cloudflare.com/durable-objects/get-started/
- `createMcpHandler`, and the exact `@modelcontextprotocol/server` version the installed `agents` release requires: https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/
- Cap'n Web, which is 0.x and experimental: https://github.com/cloudflare/capnweb
- Sending email from a Worker, and Workers rate limiting: current Cloudflare docs
- SvelteKit 3 hooks (`reroute`) and `@sveltejs/adapter-cloudflare` 8 configuration

## Working style

- Plan each phase in `.planning/phases/NN-name/PLAN.md` and write `SUMMARY.md` when it's done.
- TypeScript strict, ESM only, Vitest for tests.
- Small commits with Conventional Commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- If a decision isn't covered here or in `.planning/`, ask Jared instead of guessing.
