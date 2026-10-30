---
slug: aux
title: aux
frequency: 99.5
domain: datspace.io
status: live
summary: "Apple Music for coding agents: a Swift CLI and MCP server with 100 commands."
question: Can an agent find its way around a music library as well as the person who built it?
prototype: A macOS app and CLI in Swift that expose Apple Music as JSON over stdio, plus an MCP server, with 100 commands for search, the catalog, the library, playback, history, and ratings. It bridges three Apple APIs, MusicKit, the Apple Music REST API, and Music.app's AppleScript, behind one framework.
finding: Most of the work was finding where each API ends. MusicKit can't add to the library on macOS, and playback, artwork, and play counts exist only in Music.app. Once the seams sat behind one JSON envelope, with an exit code for each kind of failure, they stopped mattering, and an agent could curate.
future: Personal libraries of music, photos, and notes become things agents can read and tend, the way they already read code.
links:
  - { label: Source, url: "https://github.com/discohead/aux" }
facets: [ai, music]
---
aux is Apple Music for coding agents: a macOS app and CLI, written in Swift, that answers in JSON on stdout. Point an agent at it and it can search the catalog, read and edit the library, build playlists, control playback, and read listening history.

```
aux search songs "Autechre" --limit 5 --pretty
aux playback now-playing
aux library songs --artist "Arca" --limit 10
```

## Three APIs, one envelope

No single Apple API covers Apple Music, so aux bridges three. MusicKit handles search, catalog lookups, library reads, and recommendations. The Apple Music REST API handles library writes, because MusicKit can't add to the library on macOS. Music.app's AppleScript dictionary handles everything that exists only in the app: playback, AirPlay, EQ, artwork, file import, and play counts. One framework, AuxKit, hides the seams, so the CLI and the app behave the same.

Every command returns the same envelope, `{ data, meta }` or `{ error }`, and every failure has an exit code an agent can branch on: usage, not authorized, not found, network, service, subscription required, unavailable. That's most of what makes a tool native to agents: predictable shapes, and errors that say what happened.

## 100 commands

Twelve groups: `auth`, `search`, `catalog`, `library`, `playback`, `history`, `recently-played`, `favorites`, `recommendations`, `summaries`, `ratings`, and `api`, for raw requests to anything the others don't cover. It's also an MCP server, for clients that prefer one.

## A listening test

To see what an agent could do with it, I gave one a critic's persona and asked it to study my library through aux and write about what it found. It noticed the music-blog-era filenames, like `00-dvs1--klockworks_05-(kw05)-web-2009-siberia`, before it noticed a single artist. Anyone from that scene would have done the same.
