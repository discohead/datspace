# Roadmap: datspace launch

## Overview

Ship datspace.io, datspace.ai, and the `datspace` CLI by **October 30, 2026**, then apply to Runway Labs the same day. Six phases run in the order a reviewer meets the work: the tuner comes right after the foundation, and the agent interface follows the pages. Writing runs in parallel from day one, because content is the critical path, not code. Anything below the cut line moves to the week after launch rather than delaying it.

## Prerequisites (Jared, October 22)

- [x] Add all six domains as zones on Cloudflare (done October 22; pending until the nameservers change).
- [x] Switch all six domains' nameservers to Cloudflare (all six zones active October 22).
- [x] Email Routing on datspace.io: `jared@datspace.io` forwards to Jared's Gmail; no catch-all.
- [x] Claim `datspace` on npm (placeholder `0.0.0` published October 22, owner `jaredmixpanel`).
- [x] Create the public repo `discohead/datspace` and push `main` (done October 22).
- [x] Run `wrangler login`.
- [x] Add GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Phase 01 adds `DEPLOY_TOKEN`; phase 05 publishes the CLI with npm trusted publishing, so no `NPM_TOKEN`.

## Phases

- [x] **Phase 01: Foundation** - Monorepo, shared packages, both Workers and the Ledger on workers.dev, deploy on push
- [x] **Phase 02: The tuner** - The dial, the 1-bit field, glyphs, readouts, and every fallback
- [x] **Phase 03: datspace.io** - Index, station pages, about, colophon, tape, band selector, sound
- [x] **Phase 04: datspace.ai** - Stateless MCP, the JSON API, llms.txt, the live view, and the answerability suite
- [ ] **Phase 05: CLI** - `npx datspace` with `ls`, `show`, `search`, `graph`, and `hewitt`
- [ ] **Phase 06: Launch** - Real content, all domains, production checks, the film, and the application

## Calendar

| Date | Build | Writing (Jared) |
| --- | --- | --- |
| Oct 22 | Repo, plan, prerequisites | Prerequisites |
| Oct 23 | Phase 01 | `datspace` and `agent-native-interface` stations |
| Oct 24 to 25 | Phase 02 | `aux` and `mixpanel-headless` stations; about |
| Oct 26 | Phase 03 | `1-bit-studies` station; `profile.json` |
| Oct 27 | Phase 04 | Review every page on workers.dev |
| Oct 28 | Phase 05 | Content locked; essay if it's ready |
| Oct 29 | Phase 06 checks; **feature freeze** | Record and cut the film |
| Oct 30 | Fixes only | Apply |

See `CONTENT.md` for what each piece of writing needs.

## Phase Details

### Phase 01: Foundation
**Goal**: A push to `main` deploys both Workers, and the Ledger records the commit.
**Depends on**: Prerequisites (workers.dev only; DNS can't block this phase)
**Done when**: After a push, CI is green; the web Worker's `/index` lists the placeholder stations; the ai Worker's `/api/stations` returns them with `apiVersion`; `/api/ledger` shows a `deploy` event with the pushed SHA; and any other path on the ai Worker is served by the web Worker.

### Phase 02: The tuner
**Goal**: The first ten seconds: static that resolves into work as you tune, per the tuner specification in ARCHITECTURE.
**Depends on**: Phase 01
**Done when**: The dial works by drag, scroll, and keyboard with correct `aria-valuetext`; each station shows its own glyph and locks with its color; the σ and SNR readouts and the 1973 bar clock update; `prefers-reduced-motion` gets a still frame; no WebGL goes to `/index`; and the field holds 60 fps on a mid-range laptop.

### Phase 03: datspace.io
**Goal**: Everything behind the tuner: the index, station pages with the four beats, about, colophon, the tape, the band selector, and opt-in sound.
**Depends on**: Phase 02
**Done when**: Every station is reachable by keyboard, with `prefers-reduced-motion`, and without WebGL; axe-core reports no violations on `/`, `/index`, and one station page; locking a station from the tuner opens its page.

### Phase 04: datspace.ai
**Goal**: The agent-native interface: stateless MCP with six tools, the JSON API, llms.txt, and the public live view of agent calls.
**Depends on**: Phase 01 (and phase 03 for the human pages on datspace.ai)
**Done when**: The answerability suite passes in CI against MCP and JSON; every tool call appends an `agent.call` event with no arguments; Claude Code can add `https://<ai>/mcp` and answer "How do I reach Jared?" from it.

### Phase 05: CLI
**Goal**: `npx datspace` reads the network over JSON.
**Depends on**: Phase 04
**Done when**: `npx datspace ls` works on a clean machine with no setup, and `ls`, `show`, `search`, `graph`, and `hewitt` all support `--json`.

### Phase 06: Launch
**Goal**: Real content, every domain live, final checks on production, the film, and the application sent.
**Depends on**: Phases 03 to 05
**Done when**: The launch stations, the about page, and the colophon are published; every check above passes on datspace.io and datspace.ai; the four unlit domains redirect to datspace.io (done in phase 03); the film is uploaded; the application links datspace.io, datspace.ai, the repo, and the film.

**Film shot list** (60 to 90 seconds, screen recording, no voiceover required):
1. Static on datspace.io. The dial moves, the static thins, a station locks in color. (about 20 s)
2. The σ readout falling as the station resolves; one line on screen: tuning is denoising by hand. (about 10 s)
3. The station page, its four beats. (about 10 s)
4. A terminal: Claude Code with datspace.ai's MCP answers "What has Jared built for agents?"; the live view on datspace.ai shows the calls arrive. (about 30 s)
5. `npx datspace ls`, then the URLs. (about 10 s)

## Cut line

If the schedule slips, cut in this order: Tone.js sound, the `1-bit-studies` station, the essay *Actors all the way down*, the live view on datspace.ai, CLI `search` and `graph`, the tape.

Never cut: the tuner, the index, station pages, MCP, `npx datspace ls`, and the film.

## Week after launch

- Network and Work actors: publishing becomes a message from CI, revisions live in each Work actor, and actor ids seed the glyphs
- Inbox and `transmit`, on MCP, JSON, the CLI, and a contact form with Turnstile
- Cap'n Web RPC, the WebSocket live feed, `datspace watch` and `datspace tune`

## After that

- datspace.dev: the source, architecture notes, and the full ledger
- datspace.fm: the generative station on Tone.js, in time with the clock
- Live presence on stations, and R2 for media
- datspace.music and datspace.studio

## Progress

| Phase | Status | Completed |
| --- | --- | --- |
| 01. Foundation | Complete | 2026-10-22 |
| 02. The tuner | Complete | 2026-10-22 |
| 03. datspace.io | Complete | 2026-10-22 |
| 04. datspace.ai | Complete | 2026-10-22 |
| 05. CLI | Next | - |
| 06. Launch | Not started | - |
