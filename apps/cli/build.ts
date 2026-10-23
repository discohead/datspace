/**
 * Bundles the CLI and the contract's route table into one dependency-free
 * ESM file, with the version from package.json baked in.
 */
import { readFile } from "node:fs/promises";
import { build } from "esbuild";

const { version } = JSON.parse(await readFile(new URL("package.json", import.meta.url), "utf8")) as {
  version: string;
};

await build({
  entryPoints: [new URL("src/bin.ts", import.meta.url).pathname],
  outfile: new URL("dist/datspace.js", import.meta.url).pathname,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  minify: false,
  banner: { js: "#!/usr/bin/env node" },
  define: { __DATSPACE_VERSION__: JSON.stringify(version) },
  legalComments: "none",
});
console.log(`built dist/datspace.js (datspace ${version})`);
