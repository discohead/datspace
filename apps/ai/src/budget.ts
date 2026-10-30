import { DurableObject } from "cloudflare:workers";

/**
 * The Budget owns daily spending counters: one row per budget per UTC day.
 * Anything the network pays for per call gets a hard ceiling here, enforced
 * in one place for every location. Today that's datspace.fm's Clef Flash
 * decisions; per-address rate limits sit in front of it, in the Worker.
 *
 * One instance for the whole network: `env.BUDGET.getByName("budget")`.
 */
export class Budget extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS spend (
        name TEXT NOT NULL,
        day TEXT NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (name, day)
      )
    `);
  }

  /**
   * Takes one unit from today's `name` budget if fewer than `limit` are spent.
   * Synchronous storage, no awaits: two calls can't both take the last unit.
   */
  async spend(name: string, limit: number): Promise<{ ok: boolean; used: number }> {
    const day = new Date().toISOString().slice(0, 10);
    const used =
      this.ctx.storage.sql
        .exec<{ count: number }>("SELECT count FROM spend WHERE name = ? AND day = ?", name, day)
        .toArray()[0]?.count ?? 0;
    if (used >= limit) return { ok: false, used };
    this.ctx.storage.sql.exec(
      "INSERT INTO spend (name, day, count) VALUES (?, ?, 1) ON CONFLICT (name, day) DO UPDATE SET count = count + 1",
      name,
      day,
    );
    // Yesterday's rows are history, not state; keep a week of them.
    this.ctx.storage.sql.exec("DELETE FROM spend WHERE day < ?", new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10));
    return { ok: true, used: used + 1 };
  }
}
