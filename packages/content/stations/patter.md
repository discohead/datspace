---
slug: patter
title: patter
frequency: 103.1
domain: datspace.studio
status: live
summary: A modular synthesizer you patch by talking, on SuperCollider in the browser.
question: What is the Claude Code of generative music?
prototype: A browser instrument where you describe a patch the way you'd explain it to another modular person, and an agent builds it in SuperCollider, running in the page as WebAssembly. It writes real SynthDefs through a compiler tested against sclang, edits the patch with 22 tools, and listens to what it made.
finding: The agent is a good translator once it has ears; with a tool that measures what a module actually outputs, it fixes its own gain staging. It isn't a producer, so patter assumes you know what you want to build. SuperSonic's clock sat about a third of a second off the beat grid, varying between boots, so patter measures the offset every fifteen seconds and subtracts it.
future: Instruments will take descriptions as well as gestures, and the good ones will still hand you the knob.
links:
  - { label: "Listen in at datspace.studio", url: "https://datspace.studio" }
  - { label: Source, url: "https://github.com/discohead/patter" }
  - { label: SuperSonic, url: "https://github.com/samaaron/supersonic" }
facets: [studio, fm, ai]
---
"What is the Claude Code of generative music?" I asked that in a voice note in February, and patter is my answer so far.

You describe a synthesis system the way you'd explain a patch to another modular person: two detuned saws into a resonant low-pass, a slow sine on the cutoff, an envelope on a VCA, clocked by a sixteenth-note sequencer in C minor. An agent builds it in SuperCollider, running in the page as WebAssembly, and you keep talking to it while it plays. Swap a module, reroute a modulation, ask for a darkness macro.

## Going with the grain

SuperCollider is already a modular system, so patter adds as little as it can. A module is a SynthDef running as a node. A patch cable is a bus. A knob is a control, a macro is a control bus, and hot-swapping a module is a crossfade on the same bus. The agent writes real SynthDefs, with real UGens and argument orders, in JavaScript with sclang's signal semantics: an AST rewrite turns `a * b` into a BinaryOp UGen when a signal is involved. The compiler is golden-tested against sclang itself, 33 graphs written once in each language and compared. All 377 of the engine's UGen classes are available, from a catalog extracted from sclang 3.14.1 by probing every constructor.

## An agent that can hear

The agent's 22 tools edit a patch document, and the page turns each edit into OSC. The most important one is `listen`. It records a module's output and reports peak and RMS, clipping, spectral centroid, partials, pitch, and an envelope. In testing, from a one-sentence description, the agent built an oscillator into a filter, patched an LFO to the cutoff, listened, rebalanced the gain, listened again, and exposed five labeled controls, in about 36 seconds.

It's a translator, not a producer. patter assumes you know what you want to build. It isn't a make-me-a-dark-techno-track button, and I don't want one.

## Listening in

patter runs at [datspace.studio](https://datspace.studio). The agent costs money per token, so prompting is mine: it sits behind Cloudflare Access, and the Worker checks the token again on every request. Everyone else can listen in. When I'm working, you get the patch as I build it, with the graph, the code, the mixer, and every knob, running in your own browser. The knobs you turn change only your copy.

The source is at [github.com/discohead/patter](https://github.com/discohead/patter), under the AGPL, like the SuperSonic engine it runs on.
