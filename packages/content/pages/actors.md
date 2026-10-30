---
slug: actors
title: Actors all the way down
description: From Carl Hewitt's 1973 actor model to Durable Objects, coding agents, and worlds made of events. Why datspace is an actor system.
---
In 1973 Carl Hewitt, Peter Bishop, and Richard Steiger proposed that everything that computes is an actor. An actor has an address and some state of its own, and nobody else can touch that state. The only way in is a message. When a message arrives, an actor can do three things: send messages to actors it knows, create new actors, and decide how it will handle the next message.

That's the whole model. No shared memory, no global clock, no locks. Everything else is a consequence.

## The lineage

Two years later Gerald Sussman and Guy Steele built a small Lisp to understand Hewitt's actors, and found that in their interpreter an actor and a closure were the same thing. They called the language Scheme. The idea kept turning up in other people's work under other names. Erlang got to processes that share nothing and talk in messages from telephone switches, where a crash has to stay local. The E language and its protocol, CapTP, made holding an actor's address the permission to use it, and let a chain of calls to remote objects travel as one round trip. Cap'n Proto carried that promise pipelining into an RPC system anyone could use.

Then in 2020 Cloudflare shipped Durable Objects: one single-threaded object per logical thing, with private storage, addressed by name from anywhere on the network. That's an actor with a database. Workers RPC in 2024 and Cap'n Web in 2025 let them call each other like local objects. Half a century after the paper, you can put an actor on the internet in an afternoon.

## Why datspace is one

datspace has one rule about actors: an actor owns state or coordinates something, and otherwise it's a function or a file. Three things on the network pass that test. The Ledger owns an append-only, hash-chained log of every agent call. The Inbox owns messages to me and the limits on sending them. The Budget owns what the network may spend today. Each is a Durable Object; each answers one kind of message; none of them shares anything.

The works themselves aren't actors yet, and that's the rule working. The plan was to give every station its own actor, holding its revisions and announcing new ones. But at launch nothing publishes, nothing coordinates, and nothing changes between deploys, so an actor per work would have been a file with extra steps. When publishing becomes a message, they'll earn it.

The bar count on the tuner starts on January 1, 1973. That's the dedication.

## Agents are actors

Read Hewitt's three rules again with a coding agent in mind. It receives a message. It sends messages to things it knows about: tools, files, other agents. It creates new actors when it spawns a subagent. And it decides how to handle the next message, because everything it just did is now part of its context. The mailbox is the conversation, and the state is the context window plus whatever the agent wrote down.

This isn't just an analogy, because the failures match too. A system of agents fails the way a distributed system fails: a message arrives twice, a handler dies halfway through, two workers both think they own the same task, a result comes back after nobody's waiting for it. A coding agent can write a Durable Object in seconds. Making a system of them correct is the hard part, and the old answers still work: give every piece of state one owner, make handlers idempotent, append instead of overwrite, and keep a log you can check.

That's also why datspace's agent interface is boring on purpose. Every tool reads; one writes, and it's rate limited. Every call goes in the ledger. The facts are the same for every surface because they come from one contract. An agent visiting the site is a stranger's actor sending mine a message, and the protocol should be as plain as a postcard.

## Worlds are actors

Runway's research team recently described WorldPrompt, the input format for their world model. It splits a world into two kinds of state: what persists and what changes over time. The persistent part is a genesis prompt with the scene, its subjects, and its laws. The changing part is a stream of timestamped events, each addressed to a subject or to the scene, overlapping freely, where speech is an action like any other.

That's an actor's shape. Persistent state, and messages that arrive in time and are addressed to someone. A world model reading a WorldPrompt is working out what a system of actors does next, one event at a time.

I don't think that's a coincidence. When you try to describe something that changes, with parts that act on their own and only influence each other by what they do, you end up where Hewitt did. A portfolio, a fleet of agents, a world in a video model. It's actors all the way down, and the interesting interfaces of the next few years will be the ones that let people watch the messages and step in.
