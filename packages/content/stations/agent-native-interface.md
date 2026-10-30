---
slug: agent-native-interface
title: The agent-native interface
frequency: 92.3
domain: datspace.ai
status: live
summary: MCP, a JSON API, and a CLI, held to one contract by tests written as questions.
question: What does an interface built for agents, not adapted from one built for people, look like?
prototype: Seven tools defined once in a TypeScript contract and served as stateless MCP, a JSON API, llms.txt, and `npx datspace`, so the surfaces can't drift apart. An answerability suite asks the questions a recruiter's agent would ask and checks the answers over MCP and JSON after every deploy, with no model in the loop.
finding: Agents need fewer words than people, and the right ones, with one factual sentence per tool, errors that say how to fix the call, and facts instead of conclusions. Tests written as questions caught gaps a schema wouldn't. At first the MCP SDK answered bad calls with its own validation errors, so MCP and JSON disagreed; now each schema is advertised and every call goes through the contract.
future: Every product will grow a surface like this one, and the good ones will be tested the way they're used, by asking.
links:
  - { label: MCP, url: "https://datspace.ai/mcp" }
  - { label: datspace.ai, url: "https://datspace.ai" }
  - { label: The CLI on npm, url: "https://www.npmjs.com/package/datspace" }
  - { label: llms.txt, url: "https://datspace.ai/llms.txt" }
facets: [ai, dev]
---
Point an agent at `https://datspace.ai/mcp`, or run `npx datspace ls` in a terminal. Both read the same seven tools.

Each tool is defined once, in `packages/contract`: a name, one sentence of description, a zod schema for its input, and a function that reads the network. MCP, the JSON API, llms.txt, and the CLI are thin wrappers around that list, so they can't drift apart. Change a tool and every surface changes with it.

| Tool | Returns |
| --- | --- |
| `list_stations` | every station on the dial |
| `get_work` | one work's four beats, links, and markdown |
| `search` | matches across every work, with snippets |
| `get_graph` | works and domains, as nodes and edges |
| `get_profile` | my CV and how to reach me |
| `get_ledger` | recent network events, never their arguments |
| `transmit` | sends me a message; three per sender a day |

## Written for the reader

Agents read differently from people. They don't need persuading and they're easy to steer, so every description is one sentence of fact, and every result is facts and links, never a conclusion. Errors say how to fix the call. Nothing on this side calls a model.

This is the idea behind Workbus, a project of mine from earlier this year, turned outward: instead of putting agents behind tools built for people, give them their own. I'd already seen it at work. Building [Mixpanel Headless](/s/mixpanel-headless), I preferred a CLI to MCP, and then watched the agent prefer code to both.

## Answerability

A schema can tell you a call is well formed. It can't tell you an agent will find what it needs. So the tests are questions a recruiter's agent would ask: How do I reach Jared? What has he built on Cloudflare? How do I run the datspace CLI? Each one names the tool that should answer it and the facts the answer must contain. After every deploy, CI asks all of them over MCP and over JSON. No model is in the loop. If a fact goes missing, the deploy fails.

## The CLI

`npx datspace` needs no setup and no account: `ls`, `show <slug>`, `search <query>`, `graph`, `transmit`, and `hewitt`, which prints the 1973 paper and the three things an actor can do when a message arrives. Every command takes `--json`.

## The ledger

Every tool call appends an event to a hash-chained ledger: the time, the surface, and the tool, never the arguments, the caller's address, or a message's contents. Each event's hash covers the one before it, so changing any row breaks every hash after it. Watch calls arrive on [datspace.ai](https://datspace.ai), and check the whole chain on [datspace.dev](https://datspace.dev).
