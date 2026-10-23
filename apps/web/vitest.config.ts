import { defineConfig } from "vitest/config";

// Pure modules only; components are checked in the browser.
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
