import { ContentBundle, createStaticSource, type Source } from "@datspace/contract";
import raw from "@datspace/content/content.json" with { type: "json" };
import type { Ledger } from "./ledger.ts";

/** Validated once per isolate, at module load. */
export const content: ContentBundle = ContentBundle.parse(raw);

export function ledger(env: Env): DurableObjectStub<Ledger> {
  return (env.LEDGER as DurableObjectNamespace<Ledger>).getByName("ledger");
}

export function source(env: Env): Source {
  const stub = ledger(env);
  return createStaticSource(content, { recent: (options) => stub.recent(options) });
}
