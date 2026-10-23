# datspace

datspace is a portfolio network: a tuner for people at [datspace.io](https://datspace.io) and an actor network for agents at [datspace.ai](https://datspace.ai). Visitors move a dial through 1-bit static until a piece of work resolves; agents query the same work through MCP, a JSON API, or `npx datspace`. It runs on Cloudflare Workers and Durable Objects, and no runtime code calls a model.

The plan, architecture, and phase notes live in [`.planning/`](.planning/).

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

MIT licensed.
