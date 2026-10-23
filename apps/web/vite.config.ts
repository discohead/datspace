import adapter from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
      prerender: {
        entries: ["*"],
        // `/#96.1` is a dial position, not an element id. Every other missing id fails the build.
        handleMissingId: ({ id, message }) => {
          if (/^\d{2,3}(\.\d)?$/.test(id)) return;
          throw new Error(message);
        },
      },
    }),
  ],
});
