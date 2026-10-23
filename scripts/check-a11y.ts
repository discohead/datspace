/**
 * Audits datspace.io's pages with axe-core (WCAG 2.1 A and AA) in the
 * installed Chrome. Exits non-zero on any violation.
 *
 *   WEB_URL=https://datspace.io pnpm check:a11y
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const base = (process.env.WEB_URL ?? "http://127.0.0.1:8788").replace(/\/$/, "");
const pages = ["/", "/index/", "/s/agent-native-interface", "/about", "/colophon", "/tape", "/ai", "/s/1-bit-studies"];

const axeSource = await readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

interface Violation {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[] }[];
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
let failures = 0;
try {
  for (const path of pages) {
    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion });
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.addScriptTag({ content: axeSource });
      const violations: Violation[] = await page.evaluate(async () => {
        // @ts-expect-error: axe is injected above.
        const result = await window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        });
        return result.violations;
      });
      const label = `${path} (${reducedMotion === "reduce" ? "reduced motion" : "motion"})`;
      if (violations.length === 0) {
        console.log(`ok    ${label}`);
      } else {
        failures += violations.length;
        console.log(`FAIL  ${label}`);
        for (const v of violations) {
          console.log(`      ${v.id} (${v.impact}): ${v.help}`);
          for (const node of v.nodes.slice(0, 3)) console.log(`        ${node.target.join(" ")}`);
        }
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}
process.exit(failures === 0 ? 0 : 1);
