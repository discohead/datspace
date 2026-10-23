import { sha256Hex, ToolError, type MessageInput, type Surface, type Transmitted } from "@datspace/contract";
import { inbox, ledger } from "./env.ts";

const FROM = { email: "transmit@datspace.io", name: "datspace" };

/**
 * Delivers one message: the Inbox stores it and enforces the limits, the
 * Ledger records that a message arrived (never what it says), and Jared gets
 * an email whose Reply-To is the sender.
 */
export async function deliver(
  env: Env,
  ctx: ExecutionContext,
  request: Request,
  surface: Surface,
  message: MessageInput,
): Promise<Transmitted> {
  const result = await inbox(env).transmit({ message, surface, senderKey: await senderKey(env, request) });
  if (!result.ok) {
    throw new ToolError(
      "rate_limited",
      result.reason === "sender_limit"
        ? "This sender has sent three messages in the last 24 hours."
        : "datspace has taken its messages for today.",
      "Try again tomorrow, or email jared@datspace.io.",
    );
  }

  ctx.waitUntil(
    ledger(env)
      .append({ type: "message.received", data: {} })
      .catch(() => {}),
  );
  ctx.waitUntil(notify(env, surface, message, result.id));
  return { id: result.id, at: result.at };
}

/** A salted, daily-rotating hash of the caller's address: enough to count, not enough to identify. */
async function senderKey(env: Env, request: Request): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const day = new Date().toISOString().slice(0, 10);
  return sha256Hex(`${env.SENDER_SALT ?? "dev"}:${day}:${ip}`);
}

async function notify(env: Env, surface: Surface, message: MessageInput, id: string): Promise<void> {
  if (!env.INBOX_TO) return;
  const from = message.name ? `${message.name} <${message.reply_to}>` : message.reply_to;
  try {
    await env.MAIL.send({
      from: FROM,
      to: env.INBOX_TO,
      replyTo: message.reply_to,
      subject: `datspace: a message from ${message.name ?? message.reply_to}`,
      text: `${message.body}\n\n---\nFrom ${from}, via ${surface}. Message ${id}.\nReply to this email to answer them.`,
    });
  } catch (err) {
    // The message is stored either way; /admin/messages lists it.
    console.error("transmit notification failed", (err as { code?: string }).code ?? (err as Error).message);
  }
}
