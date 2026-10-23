// Secrets aren't in wrangler.jsonc, so `wrangler types` can't see them.
interface Env {
  /** Bearer token for /admin/*. Set with `wrangler secret put DEPLOY_TOKEN`. */
  DEPLOY_TOKEN?: string;
}
