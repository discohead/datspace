import {
  GENESIS_HASH,
  LedgerInput,
  canonicalJson,
  ledgerHash,
  type LedgerEvent,
  type RecentOptions,
} from "@datspace/contract";
import { DurableObject } from "cloudflare:workers";
import { z } from "zod";

type Row = {
  seq: number;
  at: string;
  type: string;
  data: string;
  prev_hash: string;
  hash: string;
};

const MAX_RECENT = 100;

/**
 * The Ledger owns an append-only, hash-chained log of network events: deploys
 * and agent tool calls. It never stores arguments, IP addresses, user agents,
 * or message contents; `LedgerInput` admits none of them.
 *
 * One instance for the whole network: `env.LEDGER.getByName("ledger")`.
 */
export class Ledger extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS events (
        seq INTEGER PRIMARY KEY,
        at TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        prev_hash TEXT NOT NULL,
        hash TEXT NOT NULL
      )
    `);
  }

  async append(input: LedgerInput): Promise<LedgerEvent> {
    // A ZodError loses its details crossing RPC, so callers get a plain message.
    const parsed = LedgerInput.safeParse(input);
    if (!parsed.success) throw new Error(`Invalid ledger event: ${z.prettifyError(parsed.error)}`);
    const { type, data } = parsed.data;
    // Hashing awaits Web Crypto, which doesn't close the input gate, so two
    // appends could otherwise read the same tail and claim the same seq.
    return this.ctx.blockConcurrencyWhile(async () => {
      const tail = this.ctx.storage.sql
        .exec<Pick<Row, "seq" | "hash">>("SELECT seq, hash FROM events ORDER BY seq DESC LIMIT 1")
        .toArray()[0];
      const seq = (tail?.seq ?? 0) + 1;
      const prevHash = tail?.hash ?? GENESIS_HASH;
      const at = new Date().toISOString();
      const hash = await ledgerHash(prevHash, { seq, at, type, data });
      this.ctx.storage.sql.exec(
        "INSERT INTO events (seq, at, type, data, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?)",
        seq,
        at,
        type,
        canonicalJson(data),
        prevHash,
        hash,
      );
      return { seq, at, type, data, prevHash, hash };
    });
  }

  /** Newest first. `limit` is clamped to 1–100; `beforeSeq` pages backward; `type` filters. */
  async recent({ limit = 50, beforeSeq, type }: RecentOptions = {}): Promise<LedgerEvent[]> {
    const n = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_RECENT);
    const rows = this.ctx.storage.sql.exec<Row>(
      `SELECT * FROM events WHERE seq < ? AND (? IS NULL OR type = ?) ORDER BY seq DESC LIMIT ?`,
      beforeSeq ?? Number.MAX_SAFE_INTEGER,
      type ?? null,
      type ?? null,
      n,
    );
    return rows.toArray().map(toEvent);
  }

  /**
   * The commit this instance is running. Code reaches Durable Objects
   * eventually, so CI waits for this to match before recording a deploy.
   */
  async version(): Promise<string> {
    return this.env.COMMIT;
  }

  /** Recomputes every hash from `fromSeq` on and reports the first row that doesn't match. */
  async verify(fromSeq = 1): Promise<{ ok: boolean; brokenAt?: number }> {
    // Read everything before the first await: a cursor held across an await
    // has no snapshot isolation. Portfolio-sized logs fit in memory.
    const before = this.ctx.storage.sql
      .exec<Pick<Row, "hash">>("SELECT hash FROM events WHERE seq < ? ORDER BY seq DESC LIMIT 1", fromSeq)
      .toArray()[0];
    const rows = this.ctx.storage.sql
      .exec<Row>("SELECT * FROM events WHERE seq >= ? ORDER BY seq ASC", fromSeq)
      .toArray();

    let expectedPrev = before?.hash ?? GENESIS_HASH;
    for (const row of rows) {
      const hash = await ledgerHash(row.prev_hash, {
        seq: row.seq,
        at: row.at,
        type: row.type,
        data: JSON.parse(row.data),
      });
      if (row.prev_hash !== expectedPrev || row.hash !== hash) return { ok: false, brokenAt: row.seq };
      expectedPrev = row.hash;
    }
    return { ok: true };
  }
}

function toEvent(row: Row): LedgerEvent {
  return {
    seq: row.seq,
    at: row.at,
    type: row.type,
    data: JSON.parse(row.data),
    prevHash: row.prev_hash,
    hash: row.hash,
  };
}
