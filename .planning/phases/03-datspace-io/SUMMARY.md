# Phase 03: datspace.io Summary

**datspace.io is live on its own domain with station pages, about, colophon, the tape, the band selector, and opt-in sound, and every deploy now passes an axe-core audit.**

## Accomplishments

- **Content**: a `Page` schema and `packages/content/pages/{about,colophon}.md`, validated like stations. The colophon is drafted, including the exact dedication; about is a placeholder for Jared.
- **Markdown**: `marked` renders station bodies and pages during prerender only; external links get `rel="noopener"`.
- **Station page**: the glyph as crisp SVG in the station's color, frequency and domain, title, summary, the four beats as a definition list, the body, links, a link to the work's record on datspace.ai (`/api/work/<slug>`, built in phase 04), and a link back to its position on the tuner.
- **Header and band selector** on every page and the tuner: io and ai are live, and dev, fm, music, and studio are dimmed and dotted, with "not yet" for screen readers. The current band is inverted like a pressed receiver button. On the tuner the dial position rides along in the fragment.
- **The tape**: each new lock goes to `sessionStorage`; `/tape` lists the visit in order, with "Email Jared" (a `mailto:` prefilled with the tape) and "Clear the tape". Nothing is sent anywhere.
- **Sound**: a Sound toggle; Tone.js (341 KB) is imported only on the first press. Band-passed white noise swept 300 to 2,900 Hz across the dial with gain ∝ σ, a sine at `stationPitch(i)` with gain ∝ (1 − σ)², ramped, and muted while the tab is hidden.
- **Domains**: datspace.io → `datspace-web`; datspace.ai, .dev, .fm, .music, .studio → `datspace-ai`, which 302s the unlit four to `https://datspace.io/#<band>`. `WEB_URL` and `AI_URL` now point at the real domains. This was phase 06 work, done early to take DNS off the launch-day path.
- **Accessibility**: `pnpm check:a11y` runs axe-core (WCAG 2.1 A and AA) in Chrome on `/`, `/index/`, a station, `/about`, `/colophon`, and `/tape`, with and without reduced motion: 12 of 12 clean, locally, in CI, and on production. CI runs it after every deploy.

## Verified on datspace.io

Keyboard tuning, fragment reload, Enter to open, 60 fps while dragging, reduced-motion still frame, tape recording two locks in order with the mailto carrying them, Tone.js absent until the Sound press, no console errors, the Ledger chain intact (5 deploys), and all six domains answering over HTTPS.

## Decisions Made

- **Unlit domains attach to `datspace-ai`, not `datspace-web`** (a change from ARCHITECTURE). datspace-web serves static assets before any Worker code runs, so it can't redirect `/` by host.
- **Drag starts only on the field.** Capturing the pointer on the whole tuner swallowed clicks on the overlay's links and buttons, including Sound.
- **The bar clock moved into the panel** as a third instrument beside σ and SNR, which freed the header for the bands and the site links.
- **The field keeps the glyph clear of the header as well as the panel**, so it doesn't collide on phones.
- **The tuner page is 197 KB gzipped,** almost all three.js. Inner pages load a few KB and none of it.

## Issues Encountered

- `sd` silently ignores multi-line patterns; perl or the Edit tool are used for those.
- Mobile: the band selector overflowed and the bar count clipped; fixed with wrapping and a more specific mobile rule (the first attempt lost the cascade).

## Next Phase Readiness

Phase 04 (datspace.ai) adds MCP, the remaining JSON routes (`/api/work/:slug`, `.md`, search, graph, profile), `llms.txt`, `agent.call` events, the `/ai` live view for the datspace.ai host, and the answerability suite. The station pages already link to `/api/work/<slug>`.
