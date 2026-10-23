---
phase: 02-tuner
type: execute
---

<objective>
Build the tuner: the first ten seconds of datspace.io. Static that resolves into a station's glyph as you tune, with the dial, the readouts, the 1973 clock, and every fallback.

Purpose: This is the one bold thing in the portfolio and the piece the film opens on. Tuning toward a work is scrubbing a denoising schedule by hand.
Output: `/` renders the tuner from `content.json`; locking a station links to a minimal `/s/<slug>` page (phase 03 designs it); `/index/` links every station.
</objective>

<context>
@CLAUDE.md
@.planning/ARCHITECTURE.md (Tuner specification)
@.planning/phases/01-foundation/SUMMARY.md
</context>

<design>
- **Layout**: the field fills the screen. A solid black receiver panel along the bottom carries the instruments: the frequency set very large in Geist Mono, σ and SNR beside it, the locked station's title and summary, then the scale with a needle and station ticks. A small wordmark top left; the bar clock top right. Left-aligned, no cards, no rules except the scale.
- **Color**: `#000` and `#fff` only, until a lock: then the glyph's lit pixels take the station's hue. Text stays white.
- **Motion**: the noise itself, at 24 fps. Nothing else moves on its own.
- **Copy**: one hint until the first move ("Drag, scroll, or use the arrow keys to tune."), then only readouts. When locked: the station title as a link, its summary, and "Press Enter to open."
</design>

<tasks>

### Task 1: Tuner model (pure)

**Files**: `apps/web/src/lib/tuner/model.ts`, `apps/web/test/model.test.ts`, `apps/web/vitest.config.ts`
**Action**: Dial constants from `@datspace/contract`; `clampFrequency` and quantize to 0.1; `nearestLive(stations, f)`; `sigma(d) = clamp(d / 1.6, 0.03, 1)`; `isLocked(σ) = σ < 0.12`; `snrDb(σ)` clamped to −20…+30; `valueText`; `parseFragment` / `formatFragment` for `#96.1`; `stationPitch(i) = 110 · 2^(i·5/12)` for phase 03's sound.
**Verify**: `pnpm --filter @datspace/web test`
**Done**: Tests cover clamping and quantizing, nearest station, σ at 0, 0.1, 1.6 and beyond, lock threshold, SNR clamps, and fragment round trips including junk input.

### Task 2: Glyphs and hues (pure)

**Files**: `apps/web/src/lib/tuner/glyph.ts`, `apps/web/test/glyph.test.ts`
**Action**: `glyphBits(seedHex, n = 24)`: a seeded PRNG fills the left half, mirrors it, then two cellular-automaton smoothing passes; density kept between 30% and 60%. `stationHue(seedHex)`: an RGB triple at fixed saturation and lightness, legible on black.
**Done**: Same seed, same bits; different seeds differ; every glyph is mirror-symmetric and within the density range; hues are valid.

### Task 3: The field (Threlte)

**Files**: `apps/web/src/lib/tuner/Field.svelte`, `apps/web/src/lib/tuner/field.glsl.ts`
**Action**: A full-screen plane with a GLSL3 `ShaderMaterial` (no tone mapping, no color-space chunks, so `#fff` stays `#fff`). Per cell of 3 CSS px: `on = s·(1 − σ) + n·1.6·σ > 0`, with `n` from an integer hash of cell and frame, and `s` from the nearest station's glyph (a `DataTexture`, nearest filtering) inside a centered square above the panel, −1 outside. `renderMode="on-demand"`; a task advances the frame at 24 fps and invalidates. Under reduced motion the frame is derived from the frequency, so the noise only re-rolls when the dial moves.
**Done**: Static at 87.5, a clean glyph at a station, and a smooth falloff between.

### Task 4: The dial and readouts

**Files**: `apps/web/src/lib/tuner/Tuner.svelte`, `apps/web/src/routes/+page.svelte`, `apps/web/src/routes/+page.server.ts`
**Action**: Drag anywhere on the field, wheel or trackpad (non-passive, accumulated), and a `role="slider"` scale with arrow keys (±0.1), PageUp/PageDown (±1), Home and End, plus arrow keys anywhere when nothing else has focus. `aria-valuetext` names the locked station or "between stations". Enter opens a locked station. The fragment carries the position (`replaceState`). The bar clock uses `@datspace/clock` with the prerendered clock config. Without WebGL2, `location.replace("/index/")`; without JavaScript, a `<noscript>` link to the index.
**Done**: Every input works; the fragment survives a reload.

### Task 5: Station stub pages and index links

**Files**: `apps/web/src/routes/s/[slug]/+page.server.ts`, `apps/web/src/routes/s/[slug]/+page.svelte`, `apps/web/src/routes/index/+page.svelte`
**Action**: Prerender `/s/<slug>` for every station (`entries`) with the title, frequency, the four beats, and links. Index rows link to them. Phase 03 replaces the layout and renders the markdown body.
**Done**: Build prerenders every station page; no prerender errors.

### Task 6: Verify in a browser and deploy

**Action**: Build, run `wrangler dev`, and check in Chrome: static, lock with color, keyboard tuning and `aria-valuetext`, fragment reload, Enter to open, frame rate over five seconds of dragging. Push; CI deploys.
**Done**: Every check in ROADMAP phase 02 passes on workers.dev.

</tasks>

<verification>
- [ ] `pnpm build && pnpm typecheck && pnpm test` pass
- [ ] Keyboard only: tune to every station and open one
- [ ] Reduced motion: still frame that changes only with the dial
- [ ] No WebGL2: `/` goes to `/index/`
- [ ] Frame rate holds 60 fps while dragging
</verification>

<output>
`.planning/phases/02-tuner/SUMMARY.md` in the phase 01 format.
</output>
