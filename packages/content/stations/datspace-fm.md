---
slug: datspace-fm
title: datspace.fm
frequency: 106.7
domain: datspace.fm
status: live
summary: A generative station that a decision model tunes from three cryptic questions.
question: What can a model that only chooses, and never writes, do inside a creative tool?
prototype: A station that plays in the browser on SuperSonic, SuperCollider compiled to WebAssembly, in time with a bar clock that started in 1973. Three questions from a bank of 154 go to Clef Flash, a decision model on Workers AI, which picks a system, a scale, and five settings; ten SynthDefs play the result, and a one-bit XY scope draws it.
finding: A decision model suits a public page, because it writes no text, costs about $0.00005 a decision, and answers the same question the same way, so every decision caches and every station travels as a link. Its doubt became part of the sound, with near ties playing both systems under static. Clef's own confidence score ran too low across six options to use, so σ is the runner-up's probability over the winner's instead.
future: Models that choose will sit inside interfaces as quietly as random number generators do now, cheap enough to call on every gesture and deterministic enough to test.
links:
  - { label: "Tune in at datspace.fm", url: "https://datspace.fm" }
  - { label: Source, url: "https://github.com/discohead/datspace/tree/main/apps/web/src/lib/fm" }
  - { label: Curves for Processing, url: "https://github.com/discohead/curves-for-processing" }
  - { label: Clef Flash, url: "https://developers.cloudflare.com/workers-ai/models/clef-flash/" }
facets: [fm, music]
---
datspace.fm plays in your browser, in time with a clock that started in 1973. Three cryptic questions decide what it plays: a door in a snowbank, a stranger's cassette, the dance floor at 6 a.m. There are no right answers. A decision model reads them as a mood.

## A model that only chooses

The station is the one exception to a rule on this network: nothing here calls a model. Agents bring their own to datspace.ai, and a public page that ran inference would cost money for every visitor. Clef Flash is a different kind of model. Given a state and a set of typed questions, it returns a probability for every option and writes no text. It costs $0.038 per million input tokens, about five thousandths of a cent a decision, and the same request always gets the same answer.

So the answers leave the page as ids. The Worker looks up their text in a bank of 154 and asks seven questions: which of six systems, which of seven scales, and five ratings from tempo to motion. Every option it can choose is written in the repository. Decisions are cached by a hash of the answers, so asking again is free, and the answers in a station's link play the same station for anyone who opens it. Each address can ask twenty times a minute and the network asks at most 20,000 times a day. Past either, a seeded draw decides, and the page says so.

## Doubt you can hear

The probabilities are the interesting part. The station plays the winner, and when the runner-up has more than half the winner's probability, both play. σ is the runner-up's probability over the winner's, on the same scale as the tuner: under 0.12 the station locks and takes a color, and above it you hear static in proportion. The model's uncertainty is part of the broadcast.

## What plays

SuperCollider's synthesis server, compiled to WebAssembly by Sam Aaron's SuperSonic, running in an AudioWorklet. Ten SynthDefs written in SuperCollider play six systems, each named for what it borrows from: Ryoji Ikeda's test tones, Mark Fell's patterns that shift one step at a time, Curtis Roads' grains, La Monte Young's just-intonation drones, hypnotic techno, and the one-bit music of early home computers. The patterns come from Curves, my library of composable curves, which I've now written in six languages, and from the Numeric Repetitor's rhythms as Curves implements them. Every event is a function of the answers, the bar, and the step, so the same station plays the same bar for every listener.

The scope is a one-bit XY oscilloscope. The left channel moves the beam across and the right moves it up, so the figure on the screen is the sound before the room. Before you press play, it draws the station's curves as a turning Lissajous knot, the shape my first finished audiovisual piece was built on.
