# Phase 07: Bands

October 29. Jared applied to Anthropic Labs ("Software Engineer, Labs") with datspace.io linked, and asked for every domain to go live, the writing filled in, in his voice, and the Runway Labs application kept in mind.

## Decisions (Jared's)

- **datspace.fm** is a public generative station: SuperSonic plus p5.js visuals drawn from Curves, with a vibe check of cryptic questions whose answers go to Clef Flash, a Workers AI decision model. It's the one exception to "no inference": rate limited, capped daily, cached, with a local fallback.
- **datspace.studio** is patter in listener mode: anyone can watch and turn knobs; only Jared prompts. patter moves off datspace.fm, and goes public as discohead/patter under AGPL-3.0, because SuperSonic is AGPL.
- The rest is in scope as ordinary work: datspace.dev (the source, the contract, the ledger verified in the browser, the build log, answerability) and datspace.music (a catalog standing in for records to come).

## Tasks

1. `packages/fm`: the question bank, the decision contract, request validation. Tests.
2. `apps/ai`: `POST /decide` (cache, `FM_LIMIT`, the `Budget` actor, Clef Flash, local fallback); band domains rewrite `/` to their pages; `/ledger.json`. Tests with a stand-in model.
3. `apps/web`: the `reroute` hook; `/fm` (SynthDefs in SuperCollider, the SuperSonic engine, the scheduler on the 1973 clock, the one-bit XY scope); `/dev`; `/music`.
4. Content: six stations, about, colophon, profile, in Jared's voice from his notes and the Littlebird record, public facts only.
5. patter: listener mode (an `OnAir` actor and hibernating WebSockets), a route on datspace.studio, Access narrowed to the paths that cost money.
6. Checks: unit tests, offline level checks for the SynthDefs, headless-Chrome smoke tests of /fm, check:a11y and check:render on the new pages, answerability cases for the new work.

## Done when

See ROADMAP, phase 07.
