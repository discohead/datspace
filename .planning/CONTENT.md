# Content: what Jared writes

Content is the critical path. The build can't make a station good; only the writing can. Each piece lands in `packages/content/` as a pull request, or as plain text handed to Claude to format.

## Every station: four beats

The posting asks each project to say "what it explores, why it matters, and what it suggests about the future." The four beats are that, in frontmatter, plus a body.

| Field | Length | It answers |
| --- | --- | --- |
| `summary` | One line, at most 90 characters | What is it? (shown on the dial and in `datspace ls`) |
| `question` | One sentence | What were you trying to find out? |
| `prototype` | Two or three sentences | What did you build, and with what? |
| `finding` | Two or three sentences | What did you learn? Name what didn't work. |
| `future` | One or two sentences | What does it suggest about where interfaces are going? |
| body | 300 to 700 words of markdown | The story, with links, code, or a sketch |

In frontmatter, wrap any value that contains `: ` in double quotes, or YAML reads it as a nested field; `pnpm build` names the file and line if you forget.

Write facts, not pitch. Agents read the same text through MCP, and the rule there is facts and links only.

## Launch stations

Frequencies sit 3.6 MHz apart so the static fully returns between them. The dial opens at 87.5, so the first station a reviewer finds is `datspace`.

| MHz | Slug | Domain | Due | Notes |
| --- | --- | --- | --- | --- |
| 88.7 | `datspace` | datspace.io | Oct 23 | The tuner explains itself. Lead with the Runway-facing idea: the distance from a station is the noise level σ, so tuning is scrubbing a denoising schedule by hand. Then the subtraction principle and the Ikeda, Alva Noto, Fell, Roads lineage. |
| 92.3 | `agent-native-interface` | datspace.ai | Oct 23 | MCP, the CLI, and the answerability tests as one piece. Must contain `npx datspace` (the answerability suite checks it). The Workbus thesis turned outward: agents get native tools, not tools built for humans. |
| 95.9 | `actors-all-the-way-down` | datspace.io | Oct 28, cuttable | The essay. Hewitt to Durable Objects, Scheme, agents as actors, closing on WorldPrompt. If it isn't ready, it stays an unlit marker. |
| 99.5 | `aux` | datspace.io | Oct 25 | Swift CLI and MCP server for Apple MusicKit. Source: github.com/discohead/aux. |
| 103.1 | `mixpanel-headless` | datspace.io | Oct 25 | `mixpanel_data` and the `mp` CLI. Proof of execution, not the headline; check what you can say publicly. |
| 106.7 | `1-bit-studies` | datspace.io | Oct 26, cuttable | The p5.js and Threlte sketches behind the tuner. Claude extracts two or three studies from the tuner work in phase 02; you write the notes. |

## Pages

- **About** (Oct 25): support engineer to frontier prototyper over eleven years at one company, with a parallel life in sound. 200 to 400 words, told straight.
- **Colophon** (Claude drafts, Jared edits): the stack, the actor lineage, and the dedication, exactly: "datspace is an actor system, dedicated to Carl Hewitt (1944–2022), who proposed the actor model in 1973."
- **`profile.json`** (Oct 26): a JSON Resume subset (`basics`, `work`, `projects`, `skills`) plus `contact` with `jared@datspace.io`, the address agents give out. `get_profile` serves it as is, so include only what you'd hand a recruiter.

## The application (Oct 29 to 30)

- The film, per the shot list in ROADMAP phase 06.
- Links: datspace.io, datspace.ai, github.com/discohead/datspace, and the film.
- A short note that names the idea in one line: everything I make is always playing; you tune in.
