# datspace

Jared McFarland's portfolio network, from the terminal.

```sh
npx datspace ls                 # every station on the dial
npx datspace show datspace      # one work: its story, links, and full text
npx datspace search Cloudflare  # full-text search, with snippets
npx datspace graph              # works, domains, and the links between them, as JSON
npx datspace hewitt             # the 1973 actor paper and its three rules
```

Add `--json` to any command for the API's JSON. The CLI is a thin client over [datspace.ai](https://datspace.ai)'s JSON API; agents can use the same tools over MCP at `https://datspace.ai/mcp`.

Requires Node 22 or later. No dependencies. MIT licensed; source at [github.com/discohead/datspace](https://github.com/discohead/datspace).
