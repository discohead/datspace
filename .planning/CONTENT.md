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

## Facts the answerability suite checks

`tests/answerability.yaml` runs after every deploy, so these must survive any rewrite:

- `datspace` mentions **Cloudflare** somewhere in its text, and links **github.com/discohead/datspace**.
- `agent-native-interface` contains **npx datspace**.
- `profile.json` has **jared@datspace.io** as the contact email.

Add a case to the YAML whenever a station should answer a new question.

## Launch stations

Frequencies sit 3.6 MHz apart so the static fully returns between them. The dial opens at 87.5, so the first station a reviewer finds is `datspace`.

On October 29 Jared asked Claude to write everything in his voice, from his notes and the Littlebird record; the drafts are in place and his to edit.

| MHz | Slug | Domain | Notes |
| --- | --- | --- | --- |
| 88.7 | `datspace` | datspace.io | The tuner explains itself: σ, the subtraction, the lineage. The 1-bit studies play on this page now; `/s/1-bit-studies` redirects here. |
| 92.3 | `agent-native-interface` | datspace.ai | MCP, the CLI, and the answerability tests. Must contain `npx datspace`. |
| 95.9 | `mixpanel-headless` | datspace.io | The CLI-first to code-first story, from public facts only. |
| 99.5 | `aux` | datspace.io | Swift CLI and MCP server for Apple MusicKit. |
| 103.1 | `patter` | datspace.studio | The natural-language modular synth, in listener mode. |
| 106.7 | `datspace-fm` | datspace.fm | The generative station and its one decision model. |

Six slots is all the dial holds at this spacing. The essay *Actors all the way down* (Hewitt to Durable Objects, closing on Runway's WorldPrompt) is off the dial until a slot or a page opens up.

## Pages

- **About** (Oct 25): support engineer to frontier prototyper over eleven years at one company, with a parallel life in sound. 200 to 400 words, told straight.
- **Colophon** (Claude drafts, Jared edits): the stack, the actor lineage, and the dedication, exactly: "datspace is an actor system, dedicated to Carl Hewitt (1944–2022), who proposed the actor model in 1973."
- **`profile.json`** (Oct 26): a JSON Resume subset (`basics`, `work`, `projects`, `skills`) plus `contact` with `jared@datspace.io`, the address agents give out. `get_profile` serves it as is, so include only what you'd hand a recruiter.

## The application (Oct 29 to 30)

- The film, per the shot list in ROADMAP phase 06.
- Links: datspace.io, datspace.ai, github.com/discohead/datspace, and the film.
- A short note that names the idea in one line: everything I make is always playing; you tune in.
