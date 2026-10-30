---
slug: mixpanel-headless
title: Mixpanel Headless
frequency: 95.9
domain: datspace.io
status: live
summary: Mixpanel's Python SDK and CLI for agents, from side project to public launch.
question: What happens to analytics when the analyst is an agent that writes code?
prototype: A Python SDK and the `mp` CLI for Mixpanel, started on my own time in December 2025 as mixpanel_data, with a Claude Code plugin that writes Python instead of calling tools. It became Mixpanel Headless, open source, and launched in public beta at MXP London on May 21, 2026.
finding: I built it CLI-first, and within a few weeks the agent showed me the shape was wrong; it kept dropping into the SDK and writing code. Rebuilt around code, the agent stopped calling Mixpanel and started building with it, and its answers became scripts you can rerun and check instead of numbers a model predicted.
future: Analytics becomes infrastructure that developers and agents build on, not only a place people visit, and its runtime has to be deterministic, because predicting digits isn't arithmetic.
links:
  - { label: Source, url: "https://github.com/mixpanel/mixpanel-headless" }
  - { label: Documentation, url: "https://mixpanel.github.io/mixpanel-headless/" }
  - { label: PyPI, url: "https://pypi.org/project/mixpanel-headless/" }
facets: [ai, dev]
---
Mixpanel Headless started as something I wanted for my own work. I live in Claude Code, and in 2025 I noticed that CLIs were more powerful and more efficient than MCP servers for coding agents. So I decided Mixpanel needed a CLI. I'm an SDK engineer, so step one was an SDK, and since this is data analysis, Python and pandas were the obvious choice. I called it mixpanel_data and started in December.

The CLI worked, and still does. But a few weeks in, I noticed the agent kept dropping down into the SDK and writing Python to answer my questions. So I rewrote the plugin around code, took out every reference to the CLI, and let the agent work the way it wanted to. Instead of calling Mixpanel, it was building with Mixpanel: composing queries with the rest of the PyData stack, running real post hoc statistics, and leaving behind scripts that outlived the conversation. The plugin still describes itself as CodeMode-first, after Cloudflare's code mode.

The other reason is arithmetic. Agentic analysis needs a deterministic runtime, because a model predicting digits isn't doing math. When the numbers come from code that ran, you can see how an answer was produced, question its assumptions, and run it again.

## Launch

It became Mixpanel Headless, MIT licensed, and launched in public beta at MXP London on May 21, 2026. It has five typed query engines (insights, funnels, retention, flows, and user profiles) that share one vocabulary of filters and cohorts and return DataFrames, a CLI over the same operations, plugins for Claude Code and OpenAI's Codex, and auth for service accounts, browser OAuth, and CI tokens. One customer, Acid Labs, described work that used to take a few hours taking ten minutes.

The principle I kept coming back to: if a person can do it in Mixpanel, an agent should be able to do it with one call.

## What I'd do differently

Start from the agent's preferred way of working instead of mine. I guessed CLI; the agent showed me code within weeks. I'd have saved time by watching it work before deciding what to build, which is a lesson I've had to learn more than once.

Mixpanel Headless belongs to Mixpanel. This is my account of building it.
