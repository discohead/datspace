---
phase: 05-cli
type: execute
---

<objective>
`npx datspace`: the fastest demo in the portfolio. A thin client over datspace.ai's JSON API: every command maps to one tool, human-readable by default, `--json` for agents.

Purpose: A reviewer can run `npx datspace ls` in ten seconds; a terminal agent can read only what it asks for, with no MCP setup.
Output: The npm package `datspace` (bin `datspace`), released by a tag through npm trusted publishing and staged publishing.
</objective>

<context>
@CLAUDE.md
@.planning/ARCHITECTURE.md (CLI)
@.planning/phases/04-datspace-ai/SUMMARY.md
</context>

<decisions>
- **No runtime dependencies.** `node:util` `parseArgs` and global `fetch`; esbuild bundles the CLI with the contract's `toolPath` into one ESM file. The contract's zod schemas stay out (the CLI imports `@datspace/contract/paths` and types only), so `npx` downloads a few kilobytes.
- **Transport:** JSON over `https://datspace.ai`, `--api <url>` to override, `x-datspace-client: cli/<version>` so the Ledger records the surface as `cli`.
- **Output:** plain text; bold titles only on a TTY without `NO_COLOR`. `--json` prints the API response unchanged. `graph` always prints JSON.
- **Release:** pushing a tag `cli-v<version>` runs `cli-release.yml`. It checks that the tag matches `package.json`, builds, tests, and runs `npm stage publish` over OIDC (npm ≥ 11.15). Jared approves the staged version on npmjs.com with 2FA. The trusted publisher must be validated by a publish before October 25, 03:57 UTC.
</decisions>

<tasks>

### Task 1: The CLI

**Files**: `apps/cli/{package.json,tsconfig.json,build.ts}`, `apps/cli/src/{main,client,format,commands}.ts`, `apps/cli/test/*.test.ts`
**Action**: Commands `ls`, `show <slug>`, `search <query> [--limit n]`, `graph`, `hewitt`, `help`, `--version`. API errors print the message and the fix to stderr and exit 1; network failures say which URL failed.
**Done**: Unit tests cover argument parsing, each command's output against a fake fetch, `--json`, errors, and `NO_COLOR`.

### Task 2: Prove it on a clean machine

**Action**: `npm pack`, install the tarball into an empty directory with an empty npm cache, and run every command against production.
**Done**: `ls`, `show`, `search`, `graph`, and `hewitt` work, with and without `--json`, and the Ledger shows `cli` calls.

### Task 3: Release

**Files**: `.github/workflows/cli-release.yml`, `apps/cli/README.md`
**Action**: The workflow above. Tag `cli-v0.1.0`; Jared approves on npmjs.com; then run `npx datspace ls` from a clean directory.
**Done**: `npx datspace ls` works on a clean machine with no setup.

</tasks>

<output>
`.planning/phases/05-cli/SUMMARY.md`
</output>
