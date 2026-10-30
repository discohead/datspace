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

Pages are prerendered by [SvelteKit](https://svelte.dev) from markdown in the repository and served from Cloudflare Workers. The agent interface on [datspace.ai](https://datspace.ai) runs on a second Worker, which also answers for datspace.dev, datspace.fm, and datspace.music and hands their pages to the first. Three Durable Objects keep the network's state: the Ledger, an append-only, hash-chained log that anyone can verify; the Inbox, which holds messages to me; and the Budget, which caps what the network spends each day. [datspace.studio](https://datspace.studio) is [patter](https://github.com/discohead/patter), a separate Worker with Durable Objects of its own.

Nothing an agent touches calls a model; agents bring their own. The one model call a visitor can cause is on [datspace.fm](https://datspace.fm): Clef Flash, a decision model on Workers AI, picks the station's system from your answers. It chooses among options written in the repository, writes no text, and is capped at about a dollar a day. patter calls a model of its own, for my prompts only.

## Sound

The tuner's static and the catalog's sleeves play through [Tone.js](https://tonejs.github.io), loaded only after you ask for sound. datspace.fm runs SuperCollider's scsynth in the page, compiled to WebAssembly by Sam Aaron's [SuperSonic](https://github.com/samaaron/supersonic), with SynthDefs written in SuperCollider. The studies and the scope are drawn with [p5.js](https://p5js.org), one bit per pixel.

## The lineage

- Carl Hewitt, Peter Bishop, and Richard Steiger, "A Universal Modular ACTOR Formalism for Artificial Intelligence," 1973: every stateful thing is an actor, and messages are the only way in.
- The E language and CapTP: an address you hold is permission to use it.
- Kenton Varda's Cap'n Proto: promise pipelining, a chain of calls in one round trip.
- Cloudflare Workers (2017) and Durable Objects (2020): one single-threaded object per logical thing, with private storage, reachable from anywhere.
- Workers RPC (2024) and Cap'n Web (2025): actors that call each other like local objects.

The longer version is an essay, [Actors all the way down](/actors).

## Type and color

Set in Geist and Geist Mono. True black, true white, and one color per station, shown only on a lock.

## Source

The code is MIT licensed at [github.com/discohead/datspace](https://github.com/discohead/datspace). datspace.fm includes SuperSonic, which is AGPL-3.0-or-later, so that page's source is offered under the AGPL as well; all of it is in the same repository.
