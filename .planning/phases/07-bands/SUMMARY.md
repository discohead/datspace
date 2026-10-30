# Phase 07 summary: Bands

October 29 to 30. Every domain on the band selector now serves something real, and every station is written.

## What shipped

| Band | What's there |
| --- | --- |
| datspace.io | Six stations, written in full: datspace (with the 1-bit studies on its page), the agent-native interface, Mixpanel Headless, aux, patter, and datspace.fm. About, the colophon, `profile.json`, and an essay, *Actors all the way down*, at `/actors`. |
| datspace.ai | Unchanged surfaces; llms.txt lists the bands. |
| datspace.dev | The shape, the contract (all seven tools with their schemas and calls on every surface), the ledger verified in the browser (454 events, seq 1 to 454, on October 30), answerability runnable against production, and the build log. |
| datspace.fm | A generative station on SuperSonic. Three questions from a bank of 153 go to Clef Flash through `POST /decide`; ten SynthDefs play one of six systems, in time with the 1973 clock; a one-bit XY scope draws the voices. |
| datspace.music | DSM001 to DSM012, unpressed; each sleeve plays its glyph like a player-piano roll, in Tone.js after a press. |
| datspace.studio | patter in listener mode (github.com/discohead/patter, AGPL-3.0): anyone can listen and turn knobs on their own copy; `/agents`, `/api`, and `/login` sit behind Access. |

## Numbers

- 178 tests across the monorepo; patter has 163 of its own.
- A Clef Flash decision reads about 1,390 input tokens: about $0.000053, 500 to 1,000 ms; cached repeats return in under 20 ms.
- Calibration: dance-floor answers chose fold, a lake at 4 a.m. chose drone, punch cards chose bits, and "rain, a sound, the ocean" chose grain at 84%, a lock (σ 0.06).
- SuperSonic's runtime is 2.1 MB, self-hosted; the SynthDefs are 13 KB.

## What didn't work at first

- Clef's own `confidence` ran 0.05 to 0.2 across six options, too low to use; σ became the runner-up's probability over the winner's.
- The first scale criteria chose "harmonic" five times out of six. Rewording each option as a mood plus a familiar use spread the choices.
- The scope drew the final mix, and stereo reverb turned every figure into a cloud. ds_master now writes the voices before the room to outputs 2 and 3, and the scope reads those.
- The decision cache keyed on datspace.fm's host while requests arrived on other zones' hosts, so nothing cached; keys use the request's origin now.
- Six dial slots for eight candidate works: the 1-bit studies (first on the cut list) moved onto the datspace station's page, and the essay became a page.

## Changes outside this repository

- patter's route moved from `datspace.fm/*` to `datspace.studio/*`, and its Access application now covers only `datspace.studio/agents`, `/api`, and `/login` (same AUD, Jared's email only, cookie path attribute off). Jared approved each step.
- patter's listener rate limiter uses namespace 1003; datspace-ai uses 1001 and 1002.

## Open

- patter's host side hasn't been exercised through real Access yet: Jared signs in at datspace.studio/login and goes on air.
- Takes patter recorded on datspace.fm live in that origin's IndexedDB in Jared's browser; datspace.studio can't see them.
- The answerability case shape and `check()` exist twice, in `tests/answerability.ts` and `apps/web/src/lib/dev/answerability.ts`.
- `pnpm verify:ledger` checks the newest 100 events through a logged tool call; it could page `/ledger.json` like datspace.dev does.
