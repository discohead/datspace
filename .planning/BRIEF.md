# datspace

**One-liner**: A portfolio network that is a tuner for people (datspace.io) and an actor network for agents (datspace.ai), on Cloudflare Workers and Durable Objects.

## Problem

Jared is applying for creative-technologist and prototype-researcher roles, starting with Runway Labs' Prototype Researcher. A conventional portfolio can describe interaction design and agentic systems but can't demonstrate them. datspace is the demonstration: an interface people tune and an interface agents query, both on one actor system.

## Who it's for

A reviewer with two minutes. In the first ten seconds they see static resolve into work as they tune; in the next minute they read one station's four beats; if they're curious they point an agent at datspace.ai or run `npx datspace ls`. Every build decision is judged by what that reviewer sees.

## Success Criteria

- [ ] datspace.io and datspace.ai are live on October 30, 2026.
- [ ] Every launch station is reachable by keyboard, with reduced motion, and without WebGL.
- [ ] The answerability suite passes in CI against MCP and JSON, with no model in the loop.
- [ ] `npx datspace ls` works on a clean machine with no setup.
- [ ] No runtime code calls a model, so cost scales with requests, not tokens.
- [ ] The repo is public and installs, typechecks, and tests from a clean clone.
- [ ] A 60 to 90 second film shows the tuner and an agent querying datspace.ai, linked from the application.

## Constraints

- Launch October 30, 2026; Jared applies the same day. Feature freeze October 29.
- Stack: SvelteKit 3 and Svelte 5, Threlte, p5.js, Tone.js; Cloudflare Workers, SQLite-backed Durable Objects, stateless MCP; TypeScript CLI; pnpm monorepo; GitHub Actions and Wrangler.
- No hardware and no model inference. No video on the site; the application film is a screen recording hosted elsewhere.
- Open source from day one under MIT, at github.com/discohead/datspace.
- 1-bit visual system: true black and white, color only on a locked station.

## Launch scope

Two Workers and two actors. Content is bundled at build. The Ledger owns the hash-chained log of agent calls behind the live view; the Inbox owns messages that agents and people transmit to Jared. Network and Work become actors after launch, when publishing becomes a message; until then they are files, per the actor rule in CLAUDE.md.

## Out of Scope

- datspace.dev, datspace.fm, datspace.music, and datspace.studio content. These domains redirect to datspace.io until their phase.
- Network and Work actors; publish as a message; a web contact form with Turnstile (the tape uses `mailto:`); Cap'n Web RPC. All are the week after launch.
- Live presence on stations, the generative radio station, and media on R2.
- Video tools (HyperFrames), effect libraries (Canvas UI, Svelte Bits), and Tailwind.
- LLM calls, embeddings, and vector search.
- Authentication beyond the deploy token, and analytics beyond the Ledger.
