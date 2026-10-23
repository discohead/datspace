import { run } from "./main.ts";

declare const __DATSPACE_VERSION__: string;

const code = await run(
  process.argv.slice(2),
  {
    fetch: globalThis.fetch,
    out: (text) => process.stdout.write(`${text}\n`),
    err: (text) => process.stderr.write(`${text}\n`),
    env: process.env,
    isTTY: Boolean(process.stdout.isTTY),
    columns: process.stdout.columns,
  },
  __DATSPACE_VERSION__,
);
process.exitCode = code;
