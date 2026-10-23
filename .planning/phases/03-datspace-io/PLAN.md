---
phase: 03-datspace-io
type: execute
---

<objective>
Everything behind the tuner on datspace.io: station pages with the four beats and the rendered body, about, colophon, the tape, the band selector, opt-in sound, and the real domains.

Purpose: The reviewer's second minute. The tuner earns attention; the station page has to hold it, and every page has to pass an accessibility audit.
Output: Designed `/s/<slug>`, `/about`, `/colophon`, `/tape`; a shared header with the band selector; Tone.js sound behind a click; datspace.io, datspace.ai, and the four unlit domains attached; `pnpm check:a11y` running axe-core in CI after each deploy.
</objective>

<context>
@CLAUDE.md
@.planning/ARCHITECTURE.md (datspace.io routes, tuner sound)
@.planning/phases/02-tuner/SUMMARY.md
</context>

<design>
Inner pages are quiet: white on black, Geist at a comfortable measure (about 66 characters), left-aligned. The station page opens with the glyph at small size in the station's color (it's "locked" on its own page) beside the frequency; then the four beats as a short definition list, then the body. Headings are sentence case; no eyebrows, no all caps, no cards. The header is one line: wordmark, band selector, and Index, About, Colophon, Tape.
</design>

<tasks>

### Task 1: Pages in content

**Files**: `packages/contract/src/schemas.ts`, `packages/content/src/load.ts`, `packages/content/pages/{about,colophon}.md`, tests
**Action**: A `Page` schema (`slug`, `title`, `description`, `body`) and `pages` in `ContentBundle`. The loader reads `pages/*.md` with the same file-and-field errors. Claude drafts the colophon (stack, actor lineage, the exact dedication); about is a placeholder for Jared.
**Done**: Content tests cover a page with a missing title.

### Task 2: Markdown at build

**Files**: `apps/web/src/lib/server/markdown.ts`
**Action**: `marked` renders station bodies and pages during prerender, so it never ships to the client. External links get `rel="noopener"`. Content is first-party, from git.
**Done**: A station body with a heading, a list, code, and a link renders.

### Task 3: Shared header, band selector, and inner layout

**Files**: `apps/web/src/lib/site/{Header,BandSelector,Glyph}.svelte`, `apps/web/src/lib/site/bands.ts`, inner-page routes
**Action**: Bands io, ai, dev, fm, music, studio. Live bands link to their domain and carry the dial position in the fragment; unlit bands are dimmed and labeled "not yet". `Glyph.svelte` draws a station's glyph as crisp SVG.
**Done**: The header appears on every inner page and on the tuner.

### Task 4: Station page, about, colophon

**Files**: `apps/web/src/routes/s/[slug]/*`, `apps/web/src/routes/about/*`, `apps/web/src/routes/colophon/*`
**Action**: The station page: glyph, frequency and domain, title, summary, the four beats, the body, links, and the facet link to the station's record on datspace.ai (`/api/work/<slug>`, phase 04). About and colophon render their markdown.
**Done**: All prerender; the station page reads well at 390 px and 1440 px.

### Task 5: The tape

**Files**: `apps/web/src/lib/tuner/tape.ts`, `Tuner.svelte`, `apps/web/src/routes/tape/*`
**Action**: Each new lock is appended to `sessionStorage` (slug, title, frequency, time), deduplicated against the previous entry. `/tape` lists the visit in order, offers "Email Jared" (`mailto:jared@datspace.io`) and "Clear the tape". Nothing is sent anywhere.
**Done**: Locking two stations and opening `/tape` shows both in order.

### Task 6: Sound

**Files**: `apps/web/src/lib/tuner/sound.ts`, `Tuner.svelte`
**Action**: A "Sound on/off" button; Tone.js loads on the first click only. White noise through a band-pass swept 300 to 2,900 Hz across the dial, gain ∝ σ; a sine at `stationPitch(i)` with gain ∝ (1 − σ)². Off by default, ramped to avoid clicks, stopped when the page hides.
**Done**: Tone.js is absent from the network until the click.

### Task 7: Domains

**Files**: `apps/web/wrangler.jsonc`, `apps/ai/wrangler.jsonc`, `apps/ai/src/index.ts`
**Action**: Attach datspace.io to `datspace-web`; datspace.ai and the four unlit domains to `datspace-ai`, which redirects unlit hosts to `https://datspace.io/#<band>` (302). Unlit domains go to the ai Worker because static assets on the web Worker are served before any code runs. Update `AI_URL` and `WEB_URL`.
**Done**: All six domains answer over HTTPS.

### Task 8: Accessibility in CI

**Files**: `scripts/check-a11y.ts`, root `package.json`, `.github/workflows/deploy.yml`
**Action**: `playwright-core` drives the runner's Chrome; `axe-core` audits `/`, `/index/`, one station page, `/about`, `/colophon`, and `/tape`. Runs after each deploy against `WEB_URL`.
**Done**: Zero violations.

</tasks>

<verification>
- [ ] `pnpm build && pnpm typecheck && pnpm test` pass
- [ ] `pnpm check:a11y` reports no violations against production
- [ ] Locking a station from the tuner opens its page, and the tape records it
- [ ] Every domain answers; unlit ones redirect to datspace.io
</verification>

<output>
`.planning/phases/03-datspace-io/SUMMARY.md`
</output>
