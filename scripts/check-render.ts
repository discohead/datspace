/**
 * Rendering checks that depend on the display, which the accessibility audit
 * doesn't see. Each 1-bit study writes its frame 1:1 into the canvas, so the
 * canvas's backing size must not grow with the device pixel ratio.
 *
 *   WEB_URL=https://datspace.io pnpm check:render
 */
import { chromium } from "playwright-core";

const base = (process.env.WEB_URL ?? "http://127.0.0.1:8788").replace(/\/$/, "");
const expected = ["120x120", "232x72", "192x48"];

const browser = await chromium.launch({ channel: "chrome", headless: true });
let failures = 0;
try {
  for (const deviceScaleFactor of [1, 2, 3]) {
    const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor });
    await page.goto(`${base}/s/1-bit-studies`, { waitUntil: "networkidle" });
    await page.waitForFunction((n) => document.querySelectorAll(".study canvas").length === n, expected.length);
    const sizes = await page.$$eval(".study canvas", (cs) => cs.map((c) => `${(c as HTMLCanvasElement).width}x${(c as HTMLCanvasElement).height}`));
    const ok = JSON.stringify(sizes) === JSON.stringify(expected);
    if (!ok) failures++;
    console.log(`${ok ? "ok  " : "FAIL"}  studies at ${deviceScaleFactor}x: ${sizes.join(", ")}${ok ? "" : ` (expected ${expected.join(", ")})`}`);
    await page.close();
  }
} finally {
  await browser.close();
}
process.exit(failures === 0 ? 0 : 1);
