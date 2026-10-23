import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContentError, contentHash, loadContent } from "../src/index.ts";

const real = fileURLToPath(new URL("..", import.meta.url));

function station(fields: Record<string, string | number>, body = "Body.") {
  const base: Record<string, string | number> = {
    title: "A station",
    domain: "datspace.io",
    status: "live",
    summary: "One line.",
    question: "Q?",
    prototype: "P.",
    finding: "F.",
    future: "Fu.",
    ...fields,
  };
  const yaml = Object.entries(base)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `---\n${yaml}\n---\n${body}\n`;
}

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "datspace-content-"));
  await cp(join(real, "profile.json"), join(root, "profile.json"));
  await cp(join(real, "clock.json"), join(root, "clock.json"));
  await cp(join(real, "stations"), join(root, "stations"), { recursive: true });
});

afterEach(() => rm(root, { recursive: true, force: true }));

async function problems(): Promise<string[]> {
  try {
    await loadContent(root);
  } catch (err) {
    if (err instanceof ContentError) return err.problems;
    throw err;
  }
  throw new Error("expected loadContent to fail");
}

describe("loadContent", () => {
  it("loads the real content, sorted by frequency, with hashes and glyph seeds", async () => {
    const content = await loadContent(real);
    const frequencies = content.stations.map((s) => s.frequency);
    expect(frequencies).toEqual([...frequencies].sort((a, b) => a - b));
    for (const s of content.stations) {
      expect(s.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(s.glyphSeed).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(content.stations.find((s) => s.slug === "agent-native-interface")?.body).toContain(
      "npx datspace",
    );
    expect(content.profile.contact.email).toBe("jared@datspace.io");
  });

  it("hashes equal content equally, whatever the key order", async () => {
    const content = await loadContent(real);
    const { hash, glyphSeed, ...doc } = content.stations[0]!;
    const reordered = Object.fromEntries(Object.entries(doc).reverse()) as typeof doc;
    expect(await contentHash(reordered)).toBe(hash);
    expect(await contentHash({ ...doc, body: `${doc.body}!` })).not.toBe(hash);
  });

  it("names the file and field when a field is missing", async () => {
    await writeFile(
      join(root, "stations", "no-summary.md"),
      station({ slug: "no-summary", frequency: 100.1, summary: "" }).replace("summary: \n", ""),
    );
    const found = await problems();
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/^stations\/no-summary\.md: summary: /);
  });

  it("rejects a duplicate slug", async () => {
    await writeFile(join(root, "stations", "copy.md"), station({ slug: "datspace", frequency: 100.1 }));
    const found = await problems();
    expect(found).toContainEqual(
      'stations/copy.md: slug: "datspace" must match the file name (datspace.md)',
    );
    expect(found).toContainEqual(
      'stations/datspace.md: slug: "datspace" is already used by stations/copy.md',
    );
  });

  it("rejects live stations 3.0 MHz apart", async () => {
    await writeFile(join(root, "stations", "close.md"), station({ slug: "close", frequency: 95.3 }));
    const near = await problems();
    expect(near).toEqual([
      "stations/close.md: frequency: 95.3 is 3.0 MHz from agent-native-interface (92.3) in " +
        "stations/agent-native-interface.md; live stations must be at least 3.2 MHz apart",
    ]);
  });

  it("allows an unlit station close to a live one", async () => {
    await writeFile(
      join(root, "stations", "later.md"),
      station({ slug: "later", frequency: 95.3, status: "unlit" }),
    );
    await expect(loadContent(root)).resolves.toBeTruthy();
  });

  it("rejects a duplicate frequency and a frequency off the dial", async () => {
    await writeFile(join(root, "stations", "same.md"), station({ slug: "same", frequency: 88.7, status: "unlit" }));
    await writeFile(join(root, "stations", "off.md"), station({ slug: "off", frequency: 120.0 }));
    const found = await problems();
    expect(found).toContainEqual("stations/same.md: frequency: 88.7 is already used by stations/datspace.md");
    expect(found.some((p) => p.startsWith("stations/off.md: frequency: "))).toBe(true);
  });

  it("reports YAML errors with the file name", async () => {
    await writeFile(join(root, "stations", "bad.md"), "---\nslug: [unclosed\n---\nBody\n");
    const found = await problems();
    expect(found[0]).toMatch(/^stations\/bad\.md: frontmatter: /);
  });
});
