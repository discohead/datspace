# datspace

datspace is a portfolio network: a tuner for people at [datspace.io](https://datspace.io) and an actor network for agents at [datspace.ai](https://datspace.ai). Visitors move a dial through 1-bit static until a piece of work resolves; agents query the same work through MCP, a JSON API, or `npx datspace`. It runs on Cloudflare Workers and Durable Objects, and nothing an agent touches calls a model.

The band buttons switch domains:

| Band | What's there |
| --- | --- |
| [datspace.io](https://datspace.io) | The dial, the stations, and the 1-bit studies |
| [datspace.ai](https://datspace.ai) | MCP, the JSON API, llms.txt, and a live view of agent calls |
| [datspace.dev](https://datspace.dev) | The source: the contract, the ledger verified in your browser, and how it was built |
| [datspace.fm](https://datspace.fm) | A generative station on SuperSonic; a decision model picks what it plays from three questions |
| [datspace.music](https://datspace.music) | A catalog with nothing pressed yet, whose sleeves play their own artwork |
| [datspace.studio](https://datspace.studio) | [patter](https://github.com/discohead/patter), a synthesizer you patch by talking, in listener mode |

The plan, architecture, and phase notes live in [`.planning/`](.planning/).

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

MIT licensed. datspace.fm includes [SuperSonic](https://github.com/samaaron/supersonic), which is AGPL-3.0-or-later, so the page it ships in (`apps/web/src/routes/fm` and what it imports) is offered under the AGPL as well.
