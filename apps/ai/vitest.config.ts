import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: { DEPLOY_TOKEN: "test-deploy-token" },
        serviceBindings: {
          WEB(request: Request) {
            return new Response(`web ${new URL(request.url).pathname}`);
          },
        },
      },
    }),
  ],
});
