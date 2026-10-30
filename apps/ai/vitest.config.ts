import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      // Workers AI only runs on Cloudflare; tests inject a stand-in model instead.
      remoteBindings: false,
      miniflare: {
        bindings: { DEPLOY_TOKEN: "test-deploy-token", SENDER_SALT: "test-salt", INBOX_TO: "jared@example.com" },
        serviceBindings: {
          WEB(request: Request) {
            return new Response(`web ${new URL(request.url).pathname}`);
          },
        },
      },
    }),
  ],
});
