# Phase 05: CLI Summary

**`npx datspace ls` works on a clean machine: datspace 0.1.0 is on npm, built by GitHub Actions with signed provenance, staged through trusted publishing, and approved by Jared with 2FA.**

## Accomplishments

- **`apps/cli`**: `ls`, `show <slug>`, `search <query> [--limit n]`, `graph`, `hewitt`, `help`, `--version`; `--json` on every command; `--api` or `DATSPACE_API` to point elsewhere; bold only on a TTY without `NO_COLOR`. API errors print the message and the fix and exit 1; usage errors exit 2. 12 tests against a fake API.
- **One 8 KB file, no runtime dependencies.** esbuild bundles the CLI with the contract's `toolPath`, imported through a new `@datspace/contract/paths` subpath so zod stays out. 3.7 KB packed.
- **The Ledger records the surface.** Every request sends `x-datspace-client: cli/<version>`, so the Ledger and the live view show those calls as `cli`.
- **Release**: `cli-release.yml` on `cli-v*` tags checks that the tag matches `package.json`, typechecks, tests, builds, strips the workspace devDependencies, and runs `npm stage publish` over OIDC. No npm token exists anywhere. Jared approves on npmjs.com with a passkey.
- **Verified**: the packed tarball installed into an empty directory with an empty cache ran every command against production; after approval, `npx --yes datspace ls` with an empty cache and an empty `HOME` printed the dial. `datspace@0.1.0` carries an SLSA v1 provenance attestation.

## Decisions Made

- **Staged publishing, not direct.** Jared's trusted publisher allows `npm stage publish` and `npm dist-tag` only, so every release waits for a human with 2FA. That's slower by one click and safer.
- **`graph` prints JSON even without `--json`,** per ARCHITECTURE; a node-and-edge list has no better text form.
- **`DATSPACE_API`** joins `--api` so local development doesn't need the flag on every call.

## Issues Encountered

- Jared's local npm (11.5.2) predates staged publishing (11.15), so approval happened on npmjs.com. CI upgrades npm before staging.
- Packing locally with `npm pkg delete devDependencies` stripped them from the uncommitted `package.json`; restored before commit. CI does the same strip on its throwaway checkout only.

## Next Phase Readiness

Phase 06 (launch) is content, production checks, the film, and the application. Every engineering done-when check in the roadmap now passes on production. What remains is Jared's writing, the four cuttable stations, and the film.
