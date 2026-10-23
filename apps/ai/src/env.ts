import { ContentBundle, createStaticSource, type Source, type Transmitter } from "@datspace/contract";
import raw from "@datspace/content/content.json" with { type: "json" };
import type { Inbox } from "./inbox.ts";
import type { Ledger } from "./ledger.ts";

/** Validated once per isolate, at module load. */
export const content: ContentBundle = ContentBundle.parse(raw);

export function ledger(env: Env): DurableObjectStub<Ledger> {
  return (env.LEDGER as DurableObjectNamespace<Ledger>).getByName("ledger");
}

export function inbox(env: Env): DurableObjectStub<Inbox> {
  return (env.INBOX as DurableObjectNamespace<Inbox>).getByName("inbox");
}

/** The tools' view of the network. `transmitter` binds `transmit` to the current request. */
export function source(env: Env, transmitter?: Transmitter): Source {
  const stub = ledger(env);
  return createStaticSource(content, { recent: (options) => stub.recent(options) }, transmitter);
}
