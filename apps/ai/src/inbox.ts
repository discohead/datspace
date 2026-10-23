import type { MessageInput, Surface } from "@datspace/contract";
import { DurableObject } from "cloudflare:workers";

type MessageRow = {
  id: string;
  at: string;
  name: string | null;
  reply_to: string;
  body: string;
  surface: string;
};

export type TransmitResult =
  | { ok: true; id: string; at: string }
  | { ok: false; reason: "sender_limit" | "daily_limit" };

/** Per sender, per 24 hours. */
const SENDER_LIMIT = 3;
/** Across all senders, per UTC day, so a flood can't fill Jared's inbox. */
const DAILY_LIMIT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The Inbox owns messages to Jared and the limits on sending them. It sees a
 * salted hash of each sender, never an address. One instance:
 * `env.INBOX.getByName("inbox")`.
 */
export class Inbox extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        at TEXT NOT NULL,
        name TEXT,
        reply_to TEXT NOT NULL,
        body TEXT NOT NULL,
        surface TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS limits (
        sender_key TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL
      );
    `);
  }

  /** Stores a message unless its sender or the day is over the limit. Returns a result, never throws for limits. */
  async transmit(options: { message: MessageInput; surface: Surface; senderKey: string }): Promise<TransmitResult> {
    const { message, surface, senderKey } = options;
    const now = Date.now();
    const sql = this.ctx.storage.sql;

    const dayStart = new Date(now).toISOString().slice(0, 10);
    const today = sql
      .exec<{ n: number }>("SELECT COUNT(*) AS n FROM messages WHERE at >= ?", dayStart)
      .toArray()[0]!.n;
    if (today >= DAILY_LIMIT) return { ok: false, reason: "daily_limit" };

    const limit = sql
      .exec<{ window_start: number; count: number }>(
        "SELECT window_start, count FROM limits WHERE sender_key = ?",
        senderKey,
      )
      .toArray()[0];
    const fresh = !limit || now - limit.window_start >= DAY_MS;
    if (!fresh && limit.count >= SENDER_LIMIT) return { ok: false, reason: "sender_limit" };

    if (fresh) {
      sql.exec("INSERT OR REPLACE INTO limits (sender_key, window_start, count) VALUES (?, ?, 1)", senderKey, now);
    } else {
      sql.exec("UPDATE limits SET count = count + 1 WHERE sender_key = ?", senderKey);
    }

    const id = crypto.randomUUID();
    const at = new Date(now).toISOString();
    sql.exec(
      "INSERT INTO messages (id, at, name, reply_to, body, surface) VALUES (?, ?, ?, ?, ?, ?)",
      id,
      at,
      message.name ?? null,
      message.reply_to,
      message.body,
      surface,
    );
    return { ok: true, id, at };
  }

  /** Newest first, for /admin/messages. */
  async list(limit = 50): Promise<MessageRow[]> {
    return this.ctx.storage.sql
      .exec<MessageRow>("SELECT * FROM messages ORDER BY at DESC LIMIT ?", Math.min(Math.max(limit, 1), 200))
      .toArray();
  }
}
