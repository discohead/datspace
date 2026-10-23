# datspace architecture

Checked against Cloudflare docs and npm on October 21, 2026. Where a section says **verify**, read the linked docs before writing code.

## At launch (October 30)

Two Workers and one actor class. Nothing calls a model. This section overrides the rest of the document where they differ; everything else describes the target the week after launch.

```
Browsers ── datspace-web (datspace.io): prerendered from packages/content
Agents ──── MCP ──► datspace-ai (datspace.ai) ── LEDGER (Durable Object, same Worker)
CLI ─────── JSON ─► datspace-ai
CI ──────── /admin/deploy ─► datspace-ai
datspace-ai ── service binding (human pages) ──► datspace-web
```

- **Content is bundled.** `pnpm --filter @datspace/content build` validates `stations/*.md`, `profile.json`, and `clock.json` and writes `packages/content/.generated/content.json` (docs, content hashes, and a glyph seed per station, the SHA-256 of its slug). `datspace-web` prerenders from it and `datspace-ai` imports it. Workers never read the filesystem.
- **One actor.** `Ledger` is defined in `apps/ai/src/ledger.ts` and exported from the `datspace-ai` Worker, with the schema, hash chain, and methods in the Ledger section below. It owns the only live state at launch: `deploy` and `agent.call` events. No `publish` or `message.received` events yet.
- **A `Source` interface instead of `Actors`.** `packages/contract` defines `Source { stations(), work(slug), search(q, limit), graph(), profile(), ledger(limit) }`, and the tools' `run(source, input)` call only that. At launch `createStaticSource(content, ledger)` answers from the bundle, with search as a simple in-memory match that returns snippets. The week after, an actor-backed `Source` replaces it with no change to any surface.
- **Six tools.** The seven in the contract section minus `transmit`.
- **Routes on datspace-ai:** `/mcp`, `/api/*` (minus `transmit` and `ledger/watch`), `/llms.txt`, and `POST /admin/deploy` (bearer `DEPLOY_TOKEN`, constant-time comparison, body `{ commit }`, appends one `deploy` event). Everything else goes to `WEB`.
- **`datspace-web` binds nothing.** The `/ai` live view polls `/api/ledger` on its own origin every few seconds. The tape's contact line is a `mailto:` link.
- **Deploy order:** web, then ai (ai's service binding needs web to exist), then `POST /admin/deploy`.

## Target (the week after launch)

Three Workers and four actor classes.

```
Browsers ──────────────────► datspace-web (datspace.io) ──Workers RPC──┐
Agents ──── MCP ───────────► datspace-ai  (datspace.ai) ──Workers RPC──┼──► datspace-actors
CLI ─────── JSON, later RPC ► datspace-ai                              │      Network · Work × N · Ledger · Inbox
CI ──────── /admin/publish ─► datspace-ai ─────────────────────────────┘
datspace-ai ── service binding (human pages) ──► datspace-web
```

Durable Objects never receive requests from the internet; only Workers that bind them can reach them. The `datspace-actors` Worker has no public routes. Moving the Ledger from `datspace-ai` to `datspace-actors` means a new class there and a one-time copy of its events; plan that migration when the Work actors land.

## Versions

Current releases on npm as of October 21, 2026. Pin `capnweb` and `@modelcontextprotocol/server` exactly; caret ranges are fine elsewhere.

| Package | Version | Notes |
| --- | --- | --- |
| `svelte` | 5.57.2 | |
| `@sveltejs/kit` | 3.1.0 | Peers: `vite` ^8, `typescript` ^6, `@sveltejs/vite-plugin-svelte` ^7 |
| `@sveltejs/adapter-cloudflare` | 8.0.1 | Peer: `wrangler` ^4.118 |
| `wrangler` | 4.151.3 | |
| `@threlte/core` | 8.6.1 | Peers: `three` >= 0.172, `svelte` >= 5 |
| `three` | 0.186.1 | |
| `p5` | 2.3.4 | Mounted through `svelte-p5` |
| `svelte-p5` | 1.0.0 | Core package only (`<P5Canvas>`, `createP5Bridge`); peers `p5` >=1.11 <3 and `svelte` ^5; MIT. Pin exactly: one maintainer, small user base. Skip `svelte-p5-components`, which depends on a prerelease drag library |
| `tone` | 15.1.22 | |
| `agents` | 0.29.0 | Requires `@modelcontextprotocol/server` 2.3.1 and `zod` ^4 |
| `@modelcontextprotocol/server` | 2.3.1 | Pin exactly |
| `@modelcontextprotocol/client` | 2.3.1 | Answerability runner only |
| `capnweb` | 0.12.0 | Experimental 0.x; pin exactly |
| `zod` | 4.6.7 | |

## Repo layout

```
datspace/
├── CLAUDE.md
├── .planning/                  BRIEF, ROADMAP, ARCHITECTURE, phases/
├── package.json                workspace scripts
├── pnpm-workspace.yaml         apps/*, workers/*, packages/*
├── tsconfig.base.json
├── apps/
│   ├── web/                    SvelteKit 3 → datspace-web
│   │   ├── src/routes/         /, /index, /s/[slug], /about, /colophon, /tape, /ai
│   │   ├── src/lib/tuner/      Threlte scene, shader, dial, sound
│   │   ├── src/lib/studies/    p5.js sketches, mounted with svelte-p5
│   │   └── wrangler.jsonc
│   ├── ai/                     datspace-ai
│   │   ├── src/index.ts        router: /mcp, /api, /llms.txt, /admin; else WEB
│   │   ├── src/ledger.ts       the Ledger Durable Object (launch only; moves to workers/actors)
│   │   ├── src/mcp.ts          createMcpHandler factory
│   │   ├── src/api.ts          JSON routes
│   │   ├── src/rpc.ts          Cap'n Web RpcTargets (after launch)
│   │   └── wrangler.jsonc
│   └── cli/                    npm package "datspace"
├── workers/actors/             datspace-actors (after launch)
│   ├── src/{index,network,work,ledger,inbox,sql}.ts
│   └── wrangler.jsonc
├── packages/
│   ├── contract/               types, schemas, tools, Source, errors, API_VERSION
│   ├── content/                stations/*.md, profile.json, clock.json, loader, hashes, build
│   └── clock/                  pure functions
├── scripts/publish.ts          (after launch)
├── tests/answerability.yaml
└── .github/workflows/          ci.yml, deploy.yml, cli-release.yml
```

## Domains and routing

| Host | Worker | Behavior |
| --- | --- | --- |
| datspace.io | `datspace-web` | The site |
| datspace.ai | `datspace-ai` | Handles `/mcp`, `/api/*`, `/rpc`, `/llms.txt`, `/admin/*`; forwards everything else to `datspace-web` over the `WEB` service binding |
| datspace.dev, .fm, .music, .studio | `datspace-web` | 302 to `https://datspace.io/#<band>` |

- Attach hosts as Workers custom domains: `"routes": [{ "pattern": "datspace.ai", "custom_domain": true }]`.
- `datspace-web` maps requests whose host is datspace.ai onto its `/ai` routes. **Verify** SvelteKit 3's `reroute` hook for this; fall back to `hooks.server.ts` if needed.
- Until a domain is attached, use the Worker's workers.dev URL so DNS never blocks a phase.

## Worker configuration

Sketches only. **Verify** keys against the current Wrangler docs.

`workers/actors/wrangler.jsonc`:

```jsonc
{
  "name": "datspace-actors",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-21",
  "workers_dev": false,
  "exports": {
    "Network": { "type": "durable-object", "storage": "sqlite" },
    "Work":    { "type": "durable-object", "storage": "sqlite" },
    "Ledger":  { "type": "durable-object", "storage": "sqlite" },
    "Inbox":   { "type": "durable-object", "storage": "sqlite" }
  },
  "durable_objects": {
    "bindings": [
      { "name": "NETWORK", "class_name": "Network" },
      { "name": "WORK",    "class_name": "Work" },
      { "name": "LEDGER",  "class_name": "Ledger" },
      { "name": "INBOX",   "class_name": "Inbox" }
    ]
  }
}
```

- `apps/ai/wrangler.jsonc`: the same four bindings, each with `"script_name": "datspace-actors"`; `"services": [{ "binding": "WEB", "service": "datspace-web" }]`; custom domain datspace.ai; secret `DEPLOY_TOKEN`.
- `apps/web/wrangler.jsonc`: `"main": ".svelte-kit/cloudflare/_worker.js"`; `"assets": { "directory": ".svelte-kit/cloudflare", "binding": "ASSETS" }`; `LEDGER` and `INBOX` with `"script_name": "datspace-actors"` (pages prerender, so it needs no `NETWORK` or `WORK`); custom domains datspace.io plus the four unlit domains; secret `TURNSTILE_SECRET`.
- Deploy order: actors, then ai, then web. Bindings by `script_name` need the actors Worker to exist first.

## Actors

Every class extends `DurableObject` from `cloudflare:workers`. Public methods are RPC methods. Address instances with `env.X.getByName(name)`. Storage is the object's private SQLite database via `this.ctx.storage.sql`. Consume cursors with `.toArray()` before any `await`, because a cursor held across an `await` has no snapshot isolation.

Each actor follows Hewitt's three rules: on a message it can send messages to actors it knows, create actors, and decide how it handles the next message.

### Network: `getByName("network")`

Owns the station list, the search index, the facet graph, and the clock settings.

```sql
CREATE TABLE IF NOT EXISTS stations (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  frequency REAL NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('live', 'unlit')),
  summary TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(slug UNINDEXED, title, summary, body);
CREATE TABLE IF NOT EXISTS edges (
  from_slug TEXT NOT NULL, to_slug TEXT NOT NULL, kind TEXT NOT NULL,
  PRIMARY KEY (from_slug, to_slug, kind)
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
```

```ts
register(slug: string): Promise<{ actorId: string }>      // addresses Work(slug); actorId = stub.id.toString()
index(entry: IndexEntry): Promise<void>                    // sent by Work after each new revision
listStations(): Promise<Station[]>
search(query: string, limit?: number): Promise<SearchHit[]> // FTS5 MATCH, snippet()
graph(): Promise<Graph>
clock(): Promise<ClockConfig>                              // { genesis: "1973-01-01T00:00:00Z", bpm, beatsPerBar }
setClock(config: ClockConfig): Promise<void>               // admin publish only
```

Rules: creates Work actors (by addressing them); becomes the new index after each `index` message.

### Work: `getByName(slug)`

Owns one piece's content and every revision of it.

```sql
CREATE TABLE IF NOT EXISTS revisions (
  revision INTEGER PRIMARY KEY,
  hash TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  published_at TEXT NOT NULL,
  doc TEXT NOT NULL            -- JSON of WorkDoc
);
```

```ts
publish(doc: WorkDoc, commit: string): Promise<{ revision: number; changed: boolean }>
get(): Promise<WorkDoc | null>
render(facet: "story" | "markdown" | "record"): Promise<string>
history(): Promise<RevisionInfo[]>
```

`publish` is idempotent by content hash. On a new hash it stores the revision, sends `NETWORK.index(...)` and `LEDGER.append({ type: "publish", ... })`, and answers the next `get` as the new revision.

### Ledger: `getByName("ledger")`

Owns an append-only, hash-chained event log and the live feed.

```sql
CREATE TABLE IF NOT EXISTS events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,           -- JSON
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL
);
```

- `hash = hex(SHA-256(prev_hash + "\n" + canonicalJSON({ seq, at, type, data })))`. The first event's `prev_hash` is 64 zeros. Use Web Crypto.
- Event types: `deploy { commit }`, `publish { slug, revision, commit }`, `agent.call { surface, tool }`, `message.received {}`. Never arguments, IP addresses, user agents, or message contents.

```ts
append(event: LedgerInput): Promise<LedgerEvent>
recent(limit?: number, beforeSeq?: number): Promise<LedgerEvent[]>   // default 50, max 100
verify(fromSeq?: number): Promise<{ ok: boolean; brokenAt?: number }>
fetch(request: Request): Promise<Response>  // WebSocket upgrade for the live feed
```

Use the WebSocket Hibernation API (`this.ctx.acceptWebSocket(ws)`, `this.ctx.getWebSockets()`) so idle watchers cost nothing, and broadcast each appended event.

### Inbox: `getByName("inbox")`

Owns messages to Jared and per-sender limits.

```sql
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, at TEXT NOT NULL, name TEXT,
  reply_to TEXT NOT NULL, body TEXT NOT NULL, surface TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS limits (
  sender_key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL
);
```

```ts
transmit(input: MessageInput & { senderKey: string; surface: Surface }): Promise<{ id: string; at: string }>
list(limit?: number): Promise<Message[]>   // admin only
```

- The calling Worker computes `senderKey` as SHA-256 of the caller's IP plus a daily salt; the Inbox never sees raw IPs.
- Defaults, tune later: 3 messages per sender per 24 hours, body up to 2,000 characters, `reply_to` must be a valid email address.
- On accept: store, send `LEDGER.append({ type: "message.received" })`, and notify Jared. **Verify** the current way to send email from a Worker; if it isn't ready by launch, store only and read through `/admin/messages`.

## Contract: `packages/contract`

The single source of truth for every surface. It must run in Node (CLI, tests) and Workers, so it imports nothing from Cloudflare.

- `API_VERSION = "2026-10-30"`, included in every JSON response.
- Types and zod schemas: `Station`, `WorkDoc` (frontmatter plus body), `StoryFields { question, prototype, finding, future }`, `Facet`, `SearchHit { slug, title, snippet }`, `Graph { nodes, edges }`, `Profile` (a JSON Resume subset plus contact), `LedgerEvent`, `MessageInput`, `ClockConfig`.
- Errors: `{ error: { code, message, fix } }`, where `fix` says how to correct the call.
- Tools are data: `{ name, title, description, input, run(actors, input) }`, where `run` only calls an `Actors` interface. MCP, JSON, RPC, and the CLI all wrap these seven.

| Tool | Input | Returns |
| --- | --- | --- |
| `list_stations` | `{}` | Every station: frequency, domain, one-line summary, status |
| `get_work` | `{ slug }` | Story fields, links, and full markdown |
| `search` | `{ query, limit? }` (limit at most 20) | Hits with snippets |
| `get_graph` | `{}` | Nodes and edges across the domains |
| `get_profile` | `{}` | Structured CV and how to reach Jared |
| `get_ledger` | `{ limit? }` (limit at most 100) | Recent events |
| `transmit` | `{ name?, reply_to, body }` | `{ id, at }` |

Write each description as one factual sentence about what the tool returns. No adjectives, no persuasion, no instructions to the agent.

## Surfaces on datspace.ai (`apps/ai`)

- **`/mcp`**: `createMcpHandler(createServer, { route: "/mcp", allowedHostnames: ["datspace.ai"] })`, created once at module scope and called from the Worker's `fetch`. Don't export the handler itself as the default export. The factory builds `new McpServer({ name: "datspace", version })` and registers the seven tools with `server.registerTool(name, { description, inputSchema }, handler)`. Stateless, no sessions. Public and unauthenticated by design; only `transmit` writes, and the Inbox limits it.
- **`/api/*`**: `GET /api/stations`, `/api/work/:slug`, `/api/work/:slug.md`, `/api/search?q=`, `/api/graph`, `/api/profile`, `/api/ledger?limit=`, `/api/ledger/watch` (WebSocket, forwarded to the Ledger), and `POST /api/transmit`.
- **`/rpc`** (cut line): `newWorkersRpcResponse(request, new DatspaceApi(env))` from `capnweb`. `DatspaceApi extends RpcTarget` with `stations()`, `work(slug)` returning a `WorkView`, `search(q, limit?)`, `graph()`, `profile()`, `ledger(limit?)`, and `transmitter()` returning a single-use `Transmitter`. `WorkView extends RpcTarget` with `story()`, `markdown()`, and `history()`, so `api.work(slug).story()` pipelines into one round trip.
- **`/llms.txt`**: generated at build from content: a one-paragraph summary, the MCP URL, how to run the CLI, the JSON endpoints, and one line per station linking to `/api/work/<slug>.md`.
- **`/admin/publish`** (POST, bearer `DEPLOY_TOKEN`, constant-time comparison): body `{ commit, clock, stations: WorkDoc[] }`. Registers and publishes each station, returns per-station results and actor ids, and appends one `deploy` event. **`/admin/messages`** (GET, same token) lists messages.
- **Logging**: wrap every tool call on every surface with `ctx.waitUntil(LEDGER.append({ type: "agent.call", data: { surface, tool } }))`. The CLI identifies itself with an `x-datspace-client: cli/<version>` header, logged as surface `cli`.
- **Everything else** goes to `env.WEB.fetch(request)`.

## datspace.io (`apps/web`)

| Route | Content | Rendering |
| --- | --- | --- |
| `/` | The tuner | Prerendered shell; Threlte runs client-side |
| `/index` | Plain list of stations; the accessible path | Prerendered |
| `/s/[slug]` | Station page: the four beats, links, facets | Prerendered |
| `/about` | Support engineer to frontier prototyper over eleven years at one company, with a parallel life in sound | Prerendered |
| `/colophon` | The stack, the actor lineage, the dedication | Prerendered |
| `/tape` | The visit's tape and the contact form (Turnstile, then `INBOX.transmit`) | Client |
| `/ai` (host datspace.ai) | Public live agent view and how to connect | Client WebSocket to the Ledger |

Colophon dedication, exact text: “datspace is an actor system, dedicated to Carl Hewitt (1944–2022), who proposed the actor model in 1973.”

### Tuner specification

These numbers match the interactive sketch from the concept discussion.

- **Dial**: 87.5 to 108.0, step 0.1. Drag, horizontal scroll, arrow keys (±0.1), PageUp and PageDown (±1), Home and End. `role="slider"` with `aria-valuetext` naming the locked station or "between stations".
- **Noise level**: `σ = clamp(d / 1.6, 0.03, 1)`, where `d` is the distance in MHz to the nearest live station. Lock when `σ < 0.12`. Readout `SNR = 20·log10((1 − σ) / σ)`, clamped to −20 to +30 dB.
- **Field**: a full-screen plane in Threlte whose fragment shader draws 1-bit pixels: on when `s·(1 − σ) + n·1.6·σ > 0`, with `s` in {−1, 1} from the station's glyph and `n` uniform in [−1, 1] from seeded noise. Refresh the noise at 24 fps.
- **Spacing**: live stations sit at least 3.2 MHz apart so the static fully returns between them.
- **Glyph**: a 1-bit pattern from the station's glyph seed. At launch that is the SHA-256 of the slug, from `packages/content/.generated/content.json`; after launch it becomes the Work actor's id, from the manifest the publish step writes.
- **Color**: a hue from the same seed, shown only while the station is locked.
- **Sound** (Tone.js, loaded after a click): white noise through a band-pass filter swept from 300 to 2,900 Hz across the dial, gain proportional to `σ`; plus a sine at the station's pitch, `110 · 2^(i·5/12)` Hz for station index `i`, gain proportional to `(1 − σ)²`.
- **Clock**: bars since 1973-01-01T00:00:00Z at the configured tempo, computed with `packages/clock` and shown in the readout. Prerender the clock config into the page.
- **Reduced motion**: a still frame; the noise re-rolls only when the dial moves. **No WebGL**: go to `/index`.
- **Tape**: the stations locked, in order, kept in `sessionStorage`; nothing is sent to a server.
- **Band selector**: io, ai, dev, fm, music, studio. Unlit bands are dimmed and link to datspace.io. Carry the dial position in the URL fragment, for example `#96.1`.

### Studies

- Mount each sketch with `<P5Canvas {sketch} />` from `svelte-p5`. It runs p5 in instance mode and calls `remove()` on unmount, so navigating between station pages doesn't leave draw loops running.
- Use `createP5Bridge` only when a sketch must share state with Svelte UI; most studies don't need it.
- Keep pixels 1-bit and crisp: `p.pixelDensity(1)` in setup, then scale the canvas with CSS `image-rendering: pixelated`.
- Lazy-load p5 on study pages only, and pause with `noLoop()` under `prefers-reduced-motion`.

## CLI (`apps/cli`)

- npm package `datspace`, bin `datspace`, Node 22 or later, ESM. Parse arguments with `node:util` `parseArgs`; no CLI framework.
- Transport behind one `Client` interface: JSON against `https://datspace.ai/api` first, Cap'n Web when it lands. `--api <url>` overrides the base URL for local development.
- Output: monochrome text by default; respect `NO_COLOR`; `--json` prints the contract types.

| Command | What it does |
| --- | --- |
| `datspace ls` | Lists every station: frequency, domain, summary |
| `datspace show <slug>` | Prints one work's story and links |
| `datspace search <query>` | Full-text search with snippets |
| `datspace graph` | Prints nodes and edges as JSON |
| `datspace transmit` | Sends Jared a message (prompts, or `--reply-to` and `--body`) |
| `datspace hewitt` | Prints the 1973 citation and the three rules |
| `datspace watch` | Cut line: streams the ledger |
| `datspace tune` | Cut line: a terminal tuner |

`datspace hewitt` prints:

```
Carl Hewitt, Peter Bishop, and Richard Steiger.
"A Universal Modular ACTOR Formalism for Artificial Intelligence." IJCAI, 1973.

When an actor receives a message, it can:
  1. send messages to actors it knows,
  2. create new actors,
  3. decide how it will handle the next message.
```

## Content model (`packages/content`)

One file per station at `stations/<slug>.md`:

```markdown
---
slug: datspace
title: datspace
frequency: 88.7
domain: datspace.io
status: live
summary: The network itself, a tuner for people and an actor network for agents.
question: What does a portfolio look like when agents are first-class visitors?
prototype: …
finding: …
future: …
links:
  - { label: Source, url: https://github.com/<you>/datspace }
facets: [io, ai]
---
Markdown body.
```

- Validate with zod at build. Reject duplicate slugs, duplicate frequencies, and live stations closer than 3.2 MHz.
- Content hash: SHA-256 hex of canonical JSON (sorted keys) of frontmatter plus body, via Web Crypto.
- `profile.json`: a JSON Resume subset plus contact preferences, served by `get_profile`.
- `clock.json`: `{ "bpm": 120, "beatsPerBar": 4 }` as defaults, sent to the Network on publish.

## CI and deploys

- `ci.yml` on pull requests: install, typecheck, test, build.
- `deploy.yml` on push to `main`: install, typecheck, test; deploy actors, then ai; run `pnpm publish:content`; build and deploy web (it reads the generated manifest); run the answerability suite against production. Any failure fails the run.
- `cli-release.yml` on tags matching `cli-v*`: build and `npm publish --access public`.
- GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DEPLOY_TOKEN`, `NPM_TOKEN`. Worker secrets: `DEPLOY_TOKEN` on ai, `TURNSTILE_SECRET` on web.

## Answerability suite (`tests/answerability.yaml`)

Questions a recruiter's agent would ask, each mapped to the tool that answers it and the facts its output must contain. The runner calls each tool over MCP (with `@modelcontextprotocol/client`) and over JSON, and checks every string. No model is in the loop.

```yaml
- question: What has Jared built on Cloudflare?
  tool: search
  input: { query: Cloudflare }
  mustContain: [datspace]
- question: How do I reach Jared?
  tool: get_profile
  input: {}
  mustContain: [email]
- question: How do I run the datspace CLI?
  tool: get_work
  input: { slug: agent-native-interface }
  mustContain: [npx datspace]
```

## Verify before use

| Topic | Where |
| --- | --- |
| Durable Object `exports` block and `getByName()` | https://developers.cloudflare.com/durable-objects/get-started/ |
| SQLite storage API, FTS5, cursor rules | https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/ |
| `createMcpHandler` options and MCP SDK v2 | https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/ |
| Cap'n Web API | https://github.com/cloudflare/capnweb |
| Workers RPC between Workers and Durable Objects | https://blog.cloudflare.com/javascript-native-rpc/ |
| Sending email from a Worker | Current Cloudflare docs |
| Workers rate limiting | Current Cloudflare docs |
| SvelteKit 3 `reroute` and adapter-cloudflare 8 | SvelteKit docs |
| Vitest integration for Workers and Durable Objects | Workers testing docs |
