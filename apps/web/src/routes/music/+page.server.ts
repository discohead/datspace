import { sha256Hex } from "@datspace/contract";
import { CATALOG } from "#lib/music/catalog.ts";

/** Each sleeve grows from the SHA-256 of its lowercased catalog number, as each station's glyph does from its slug. */
export async function load() {
  return {
    sleeves: await Promise.all(
      CATALOG.map(async (entry) => ({ ...entry, seed: await sha256Hex(entry.number.toLowerCase()) })),
    ),
  };
}
