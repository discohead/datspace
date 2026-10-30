/**
 * Copies SuperSonic's run-time files into static/fm/, where the browser
 * fetches them by URL: the OSC workers, the AudioWorklet, and scsynth's
 * WebAssembly. Vite bundles SuperSonic's JavaScript itself. Runs before
 * `dev` and `build`; the copies are gitignored.
 *
 * SuperSonic is AGPL-3.0-or-later. datspace.fm links its source.
 */
import { cpSync, existsSync, mkdirSync, realpathSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Neither package exports its package.json, so find them where pnpm links direct dependencies.
const pkg = (name: string) => realpathSync(join(root, "node_modules", name));

const copies: [string, string][] = [
  [join(pkg("supersonic-scsynth"), "dist/workers"), "static/fm/supersonic/workers"],
  [join(pkg("supersonic-scsynth-core"), "workers"), "static/fm/supersonic-core/workers"],
  // MIDI and gamepad support stay off, so only scsynth's own wasm is needed.
  [join(pkg("supersonic-scsynth-core"), "wasm/scsynth-nrt.wasm"), "static/fm/supersonic-core/wasm/scsynth-nrt.wasm"],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) throw new Error(`SuperSonic file missing: ${from}`);
  const dest = join(root, to);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(from, dest, { recursive: true });
}
console.log(`copied SuperSonic into static/fm/ (${copies.length} paths)`);
