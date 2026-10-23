/**
 * Validates the content and writes `.generated/content.json`, which both
 * Workers import. Run with `pnpm --filter @datspace/content build`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ContentError, loadContent } from "./load.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".generated", "content.json");

try {
  const content = await loadContent(root);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(content, null, 2)}\n`);
  for (const s of content.stations) {
    console.log(`${s.frequency.toFixed(1).padStart(5)}  ${s.slug.padEnd(28)} ${s.hash.slice(0, 12)}`);
  }
  console.log(`wrote ${content.stations.length} stations to .generated/content.json`);
} catch (err) {
  console.error(err instanceof ContentError ? err.message : err);
  process.exit(1);
}
