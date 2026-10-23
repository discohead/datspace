# Phase 02: The Tuner Summary

**datspace.io's front door works: 1-bit static that resolves into each station's glyph as you tune, and locks in the station's color.**

## Accomplishments

- `#lib/tuner/model.ts`: tuning and quantizing, nearest live station, σ, lock, SNR, `aria-valuetext`, the `#96.1` fragment, and `stationPitch` for phase 03's sound. 8 tests.
- `#lib/tuner/glyph.ts`: a 24×24 glyph per station from its seed (sfc32, mirrored, two cellular-automaton passes, density held to 30–60% by regrowing, not patching), and a hue per station. 4 tests.
- `Field.svelte` and `field.glsl.ts`: a GLSL3 `ShaderMaterial` on a clip-space plane. 3-CSS-px cells, pcg3d noise, `on = s·(1 − σ) + n·1.6·σ > 0`. Threlte renders on demand: a task advances the noise at 24 fps, and dial moves invalidate.
- `Tuner.svelte`: drag anywhere, wheel and trackpad, click or drag on the scale, a `role="slider"` with arrows, PageUp/PageDown, Home and End, arrow keys anywhere when nothing has focus, Enter to open a locked station, the fragment kept with `replaceState`, the bar clock, separate hints for touch and fine pointers, and a `<noscript>` link to the index.
- `/s/<slug>` stubs prerendered for every station; index rows link to them.

## Verified (headless Chrome, locally and on workers.dev)

- Keyboard from page load: 12 × → reaches 88.7 and reads "88.7 MHz, datspace"; End, Home, and PageUp work on the slider.
- `/#92.3` reloads locked on the agent-native interface; Enter opens `/s/datspace`.
- `requestAnimationFrame` holds 60 fps idle and while dragging.
- Reduced motion: the field is identical across 600 ms and re-rolls when the dial moves. Normal motion: the noise animates.
- No WebGL (`--disable-3d-apis`) goes to `/index/`. No JavaScript shows the index link and keeps the slider markup.
- No console errors or warnings.

## Files Created/Modified

- `apps/web/src/lib/tuner/{model.ts,glyph.ts,field.glsl.ts,Field.svelte,Tuner.svelte}`
- `apps/web/src/routes/{+page.svelte,+page.server.ts}`, `apps/web/src/routes/s/[slug]/*`, `apps/web/src/routes/index/+page.svelte`
- `apps/web/{vite.config.ts,vitest.config.ts,package.json}`, `apps/web/test/*`

## Decisions Made

- **The receiver panel is solid black.** Text over 1-bit noise is illegible, so the instruments sit on a black panel, and the glyph is centered in the space above it.
- **The frequency is quantized to 0.1 everywhere.** That's what the shader, the lock, and the readout all use. It steps like a digital tuner; continuous σ while dragging wasn't worth two sources of truth.
- **Dragging the full screen width moves half the dial**, and 30 wheel pixels make one step.
- **The fragment is `#96.1` and isn't an element id.** The prerender's missing-id check now ignores frequency-shaped ids; any other missing id still fails the build.
- **three r186 doesn't alias `gl_FragColor` for GLSL3,** so the shader declares `out vec4 fragColor`.
- **The `datspace` glyph locks in acid green.** That's the hue its seed produces. It's on the cliché list, but it's deterministic from the address; other stations land elsewhere on the wheel.

## Issues Encountered

- The Claude in Chrome extension wasn't connected, so checks ran through `playwright-core` driving the installed Chrome headless (a scratch install, outside the repo).
- The first reduced-motion check compared whole screenshots, and the bar clock ticked between them; it now compares the field only.
- 60 fps was measured on this MacBook, not a mid-range laptop. The shader is one hash and one texture read per pixel, so the risk is low, but check on slower hardware before launch.

## Next Phase Readiness

Phase 03 builds the station page layout (replacing the stub), renders the markdown body, the about and colophon pages, the tape, the band selector, Tone.js sound (`stationPitch` is ready), and axe-core checks. The tuner exposes nothing phase 03 needs to change, except that sound needs `σ` and the station index, both already derived in `Tuner.svelte`.
