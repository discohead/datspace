// Secrets aren't in wrangler.jsonc, so `wrangler types` can't see them.
interface Env {
  /** Bearer token for /admin/*. Set with `wrangler secret put DEPLOY_TOKEN`. */
  DEPLOY_TOKEN?: string;
  /** Salt for hashing senders' addresses before the Inbox counts them. */
  SENDER_SALT?: string;
  /** Where transmitted messages are emailed: a verified Email Routing destination. */
  INBOX_TO?: string;
}
