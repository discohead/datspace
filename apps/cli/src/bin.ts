import { createInterface } from "node:readline/promises";
import { run } from "./main.ts";

declare const __DATSPACE_VERSION__: string;

const code = await run(
  process.argv.slice(2),
  {
    fetch: globalThis.fetch,
    async readStdin() {
      if (process.stdin.isTTY) return null;
      let text = "";
      for await (const chunk of process.stdin) text += chunk;
      return text;
    },
    async prompt(question) {
      if (!process.stdin.isTTY) return null;
      const rl = createInterface({ input: process.stdin, output: process.stderr });
      try {
        return await rl.question(question);
      } finally {
        rl.close();
      }
    },
    out: (text) => process.stdout.write(`${text}\n`),
    err: (text) => process.stderr.write(`${text}\n`),
    env: process.env,
    isTTY: Boolean(process.stdout.isTTY),
    columns: process.stdout.columns,
  },
  __DATSPACE_VERSION__,
);
process.exitCode = code;
