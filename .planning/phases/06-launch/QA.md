# QA pass, October 22

Run against production (datspace.io, datspace.ai) with Playwright: the installed Chrome, WebKit 17.4, and Firefox 119. WebKit and Firefox are the builds cached on this Mac, from late 2023, so they're older than what reviewers will use: a stricter test, not a substitute for current Safari.

## Cross-browser: all pass, no console errors

| Check | Chrome | WebKit desktop | WebKit, iPhone size with touch | Firefox |
| --- | --- | --- | --- | --- |
| Tuner renders (WebGL2 field) | ✓ | ✓ | ✓ | ✓ |
| Arrow keys tune; `aria-valuetext` names the station | ✓ | ✓ | n/a | ✓ |
| Wheel tunes (300 px → 1.0 MHz) | ✓ | ✓ | n/a | ✓ |
| Drag tunes, 60 fps | ✓ | ✓ | ✓ | ✓ |
| `#92.3` loads locked | ✓ | ✓ | ✓ | ✓ |
| Enter (or tapping the title) opens the station | ✓ | ✓ | ✓ | ✓ |
| Sound toggles; Tone.js loads only on press | ✓ | ✓ | ✓ | ✓ |
| Tape records locks | ✓ | ✓ | ✓ | ✓ |
| datspace.ai live feed loads | ✓ | ✓ | ✓ | ✓ |
| Reduced motion holds a still frame | ✓ | ✓ | ✓ | ✓ |

Glyphs, lock colors, fonts, and the mobile layout render identically across engines.

## Slow hardware and networks (Chrome, throttled)

| Condition | HTML | Live field | Transferred | Frames while dragging |
| --- | --- | --- | --- | --- |
| This MacBook | 300 ms | 1.1 s | 336 KB | 16.6 ms avg, 17 ms worst |
| CPU 4× + slow 4G | 469 ms | 2.9 s | 336 KB | 16.6 ms avg, 17 ms worst |
| CPU 6× + slow 4G | 394 ms | 2.8 s | 336 KB | 16.9 ms avg, 33 ms worst |

- The shader is cheap; frames hold 60 fps even at 6× CPU.
- **Fixed**: on slow 4G the field was black for about two seconds while three.js loaded. A 2 KB 1-bit noise image now paints first (loaded at 645 ms on slow 4G), and the live field replaces it.

## Found after the pass

- **The studies drew into a quarter of their frames on Retina displays** (reported by Jared). p5 2 resets pixel density inside `createCanvas`, so `pixelDensity(1)` called before it was ignored; at 2× the canvas backing was twice the size of the 1:1 frame. Every automated check ran at 1×. Fixed by calling it after `createCanvas`; `pnpm check:render` now checks 1×, 2×, and 3× after every deploy.

## Fixed in this pass

- Static on first paint (above).
- Link previews: canonical URLs, Open Graph and Twitter tags on every page, and `og.png` (a glyph half-resolved out of the static, 1200×630, 43 KB).
- The `datspace` station's title read "datspace · datspace".

## Verified

- Every link and asset referenced by production pages returns 200, except `GET /mcp` (405, correct: MCP is POST).
- Hashed assets are served `public, immutable, max-age=31536000` with Brotli; pages revalidate.
- axe-core: no violations on 7 pages in both motion modes (runs in CI after every deploy).

## Still needs a real device (Jared)

- [ ] **Current Safari on the Mac**: tune, lock, Sound.
- [ ] **iPhone Safari**: drag to tune, tap a title to open, Sound. iOS mutes Web Audio when the ring/silent switch is on silent; that's expected, not a bug.
- [ ] **An Android phone** in Chrome, if one is handy.
- [ ] **The oldest laptop available**: does the static feel smooth while dragging?
- [ ] **Paste https://datspace.io into Slack or iMessage** and check the preview card.
