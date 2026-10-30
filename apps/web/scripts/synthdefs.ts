/**
 * Compiles datspace.fm's SynthDefs (src/lib/fm/synthdefs.scd) with
 * SuperCollider's sclang into static/fm/synthdefs/. With --check it also
 * renders each voice offline through the master, with the hand at the centre
 * of the scope's pad and at each corner its macros reach, and fails on
 * silence, clipping, or anything that isn't a number.
 *
 *   pnpm --filter @datspace/web synthdefs [--check]
 *
 * Needs SuperCollider.app (or SCLANG pointing at sclang). The output is
 * committed, so ordinary builds don't run this.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "src/lib/fm/synthdefs.scd");
const out = join(root, "static/fm/synthdefs");
const sclang = process.env.SCLANG ?? "/Applications/SuperCollider.app/Contents/MacOS/sclang";
const check = process.argv.includes("--check");

// An empty HOME keeps sclang from running the user's startup file.
const home = mkdtempSync(join(tmpdir(), "datspace-sclang-"));
const nrt = join(home, "nrt");
mkdirSync(nrt);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const log = execFileSync(sclang, [source], {
  env: { ...process.env, HOME: home, DATSPACE_SYNTHDEF_DIR: out, ...(check ? { DATSPACE_NRT_DIR: nrt } : {}) },
  encoding: "utf8",
  timeout: 180_000,
});
// sclang reports parse and runtime errors as "ERROR:". A /n_set to a voice that has already freed
// itself is a FAILURE IN SERVER in the offline renders, and harmless.
if (/ERROR:/.test(log) || !log.includes("wrote ")) {
  console.error(log);
  process.exit(1);
}
console.log(readdirSync(out).sort().join("\n"));

if (check) {
  let failed = false;
  for (const file of readdirSync(nrt).filter((f) => f.endsWith(".wav")).sort()) {
    const { peak, rms, finite } = measure(readFileSync(join(nrt, file)));
    // Peak, not RMS, decides silence: two clicks in four seconds have almost no RMS.
    const problem = !finite ? "not a number" : peak > 0.95 ? "clips" : peak < 0.005 ? "silent" : "";
    failed ||= problem !== "";
    console.log(`${problem ? "FAIL" : "ok  "}  ${file.padEnd(16)} peak ${peak.toFixed(3)}  rms ${rms.toFixed(4)}  ${problem}`);
  }
  rmSync(home, { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
}
rmSync(home, { recursive: true, force: true });

/** Peak and RMS of a 32-bit float WAV, all channels together. */
function measure(wav: Buffer): { peak: number; rms: number; finite: boolean } {
  let offset = 12;
  while (offset + 8 <= wav.length && wav.toString("ascii", offset, offset + 4) !== "data") {
    offset += 8 + wav.readUInt32LE(offset + 4);
  }
  const start = offset + 8;
  const end = Math.min(wav.length, start + wav.readUInt32LE(offset + 4));
  let peak = 0;
  let sum = 0;
  let n = 0;
  let finite = true;
  for (let i = start; i + 4 <= end; i += 4) {
    const v = wav.readFloatLE(i);
    if (!Number.isFinite(v)) finite = false;
    peak = Math.max(peak, Math.abs(v));
    sum += v * v;
    n++;
  }
  return { peak, rms: Math.sqrt(sum / Math.max(1, n)), finite };
}
