---
slug: colophon
title: Colophon
description: How datspace is built, the actor lineage behind it, and who it's dedicated to.
---
datspace is an actor system, dedicated to Carl Hewitt (1944–2022), who proposed the actor model in 1973.

## How it's built

The tuner is a single [Threlte](https://threlte.xyz) scene: one full-screen plane whose fragment shader decides, for every 3-pixel cell, whether it's on. Each cell compares the station's glyph against uniform noise, weighted by σ, your distance from the nearest station. At σ = 1 the screen is pure static; as σ falls the glyph emerges, the way a diffusion model denoises toward an image. Tuning is scrubbing that schedule by hand.

Each station's glyph grows from a hash of its name: a seeded random field, mirrored, then smoothed by a cellular automaton until it reads as a shape. Its color comes from the same hash and appears only while the station is locked.

The bar count in the corner is the number of bars since January 1, 1973, at the tempo the network publishes. Nothing ticks on a server; every page does the arithmetic.

Pages are prerendered by [SvelteKit](https://svelte.dev) from markdown in the repository and served from Cloudflare Workers. The agent interface on [datspace.ai](https://datspace.ai) runs on a second Worker, and the network's event log is a Durable Object: an append-only, hash-chained ledger that anyone can verify.

No runtime code calls a model. Agents bring their own.

## The lineage

- Carl Hewitt, Peter Bishop, and Richard Steiger, "A Universal Modular ACTOR Formalism for Artificial Intelligence," 1973: every stateful thing is an actor, and messages are the only way in.
- The E language and CapTP: an address you hold is permission to use it.
- Kenton Varda's Cap'n Proto: promise pipelining, a chain of calls in one round trip.
- Cloudflare Workers (2017) and Durable Objects (2020): one single-threaded object per logical thing, with private storage, reachable from anywhere.
- Workers RPC (2024) and Cap'n Web (2025): actors that call each other like local objects.

## Type and color

Set in Geist and Geist Mono. True black, true white, and one color per station, shown only on a lock.

## Source

The code is MIT licensed at [github.com/discohead/datspace](https://github.com/discohead/datspace).
