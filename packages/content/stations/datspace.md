---
slug: datspace
title: datspace
frequency: 88.7
domain: datspace.io
status: live
summary: "The network itself: a tuner for people and an actor network for agents."
question: What does a portfolio look like when agents are first-class visitors?
prototype: A dial of one-bit static that resolves into work as you tune, and an agent interface over the same content, with MCP, a JSON API, a CLI, and a hash-chained ledger of every call. Two Cloudflare Workers and three Durable Objects, with pages prerendered by SvelteKit, and nothing an agent touches calls a model.
finding: Distance from a station is σ, a noise level, so tuning is scrubbing a diffusion schedule by hand, and static turned out to carry more than images would have. Making agents first-class was mostly subtraction, one set of tool definitions and nothing else. The plan to make every work an actor at launch didn't survive; with nothing to coordinate yet, they'd have been files with extra steps, so they're files.
future: Interfaces will ship in pairs, one for people to feel their way through and one for agents to query, both reading the same source.
links:
  - { label: Source, url: "https://github.com/discohead/datspace" }
  - { label: "The ledger, verified in your browser", url: "https://datspace.dev" }
  - { label: The agent interface, url: "https://datspace.ai" }
facets: [io, ai, dev]
---
Tuning is denoising by hand.

Every station on the dial is a 24-by-24 glyph grown from a hash of its name. Every pixel on the screen asks one question, 24 times a second: is s·(1 − σ) + n·1.6·σ greater than zero? s is the glyph, plus or minus one. n is fresh noise. σ is your distance from the nearest station in megahertz, divided by 1.6. Far from a station σ is 1 and the screen is static. As you tune in, σ falls and the glyph comes through, the way an image comes out of a diffusion model's noise schedule. Below 0.12 the station locks, and only then does it get a color.

That's the whole visual system: true black, true white, one typeface and its mono, and color only on a lock. Gray comes from noise, never from a gray. I got there by taking things away: no photographs, no video, no thumbnails, no gradients. What's left has to carry the work, and static carries a lot. The lineage is easy to hear. Ryoji Ikeda and Alva Noto use data as material. Mark Fell makes a composition out of a small change, repeated. Curtis Roads treats a sound as a cloud of smaller sounds, which is what static is.

## The other half

The same works are typed tools on [datspace.ai](https://datspace.ai). Agents get seven of them over MCP and a JSON API, and terminals get `npx datspace`. Nothing an agent touches calls a model; agents bring their own. Every call lands in a hash-chained ledger, the live view shows them arrive, and [datspace.dev](https://datspace.dev) checks the whole chain in your browser.

It runs on Cloudflare: two Workers, three Durable Objects (the Ledger, the Inbox, and a Budget), and pages prerendered by SvelteKit from markdown in the repository. The bar count in the corner is the number of bars since January 1, 1973, at 120 BPM: that's the year Carl Hewitt proposed the actor model. Nothing ticks on a server. Every page does the arithmetic.

## The bands

The buttons along the top switch domains. datspace.io is the dial. datspace.ai is for agents. datspace.dev is the source and the ledger. [datspace.fm](https://datspace.fm) is a station that plays in your browser. datspace.music is a catalog with nothing pressed yet. [datspace.studio](https://datspace.studio) is patter, my synthesizer you talk to, with the door open.

## The studies

The studies on this page take the tuner apart: the denoising rule with a σ slider, a glyph growing from its seed, and a gray ramp pushed through one bit. Each one draws into a small pixel buffer and scales it up with hard edges, so every pixel on the screen is exactly black or white.

Everything I make is always playing. You tune in.

The source is MIT licensed at [github.com/discohead/datspace](https://github.com/discohead/datspace).
