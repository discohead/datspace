/**
 * Checks the public Ledger's hash chain from outside: fetches the latest
 * events from /api/ledger and recomputes every hash. No token needed.
 *
 *   AI_URL=https://datspace.ai pnpm verify:ledger
 */
import { GENESIS_HASH, LedgerEvent, ledgerHash } from "@datspace/contract";
import { z } from "zod";

const base = process.env.AI_URL ?? "https://datspace.ai";
const res = await fetch(`${base}/api/ledger?limit=100`);
if (!res.ok) {
  console.error(`GET ${base}/api/ledger returned ${res.status}`);
  process.exit(1);
}
const { events } = z.object({ events: z.array(LedgerEvent) }).parse(await res.json());
const ascending = [...events].sort((a, b) => a.seq - b.seq);

let ok = true;
for (const [i, event] of ascending.entries()) {
  const prev = ascending[i - 1];
  const expectedPrev = prev ? prev.hash : event.seq === 1 ? GENESIS_HASH : event.prevHash;
  const hash = await ledgerHash(event.prevHash, event);
  const linked = event.prevHash === expectedPrev && (!prev || prev.seq === event.seq - 1);
  if (!linked || hash !== event.hash) {
    console.error(`broken at seq ${event.seq}`);
    ok = false;
    break;
  }
}

const first = ascending[0]?.seq ?? 0;
const last = ascending.at(-1)?.seq ?? 0;
console.log(ok ? `ok: seq ${first} to ${last} (${ascending.length} events)` : "ledger chain is broken");
process.exit(ok ? 0 : 1);
