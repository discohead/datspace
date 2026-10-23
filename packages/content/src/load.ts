import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  ClockConfig,
  MIN_STATION_SPACING,
  Profile,
  StationFrontmatter,
  canonicalJson,
  sha256Hex,
  type BundledStation,
  type ContentBundle,
  type WorkDoc,
} from "@datspace/contract";
import { parse as parseYaml } from "yaml";
import type { z } from "zod";

/** Every problem found in the content, each naming the file and the field. */
export class ContentError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Content is invalid:\n${problems.map((p) => `  ${p}`).join("\n")}`);
    this.name = "ContentError";
    this.problems = problems;
  }
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

interface Loaded {
  file: string;
  doc: WorkDoc;
}

/** Loads, validates, and bundles everything under `root`: stations, profile, and clock. */
export async function loadContent(root: string): Promise<ContentBundle> {
  const problems: string[] = [];
  const stationsDir = join(root, "stations");
  const files = (await readdir(stationsDir)).filter((f) => f.endsWith(".md")).sort();

  const loaded: Loaded[] = [];
  for (const name of files) {
    const path = join(stationsDir, name);
    const file = relative(root, path);
    const doc = parseStation(file, await readFile(path, "utf8"), problems);
    if (doc) loaded.push({ file, doc });
  }
  checkStations(loaded, problems);

  const profile = await readJson(root, "profile.json", Profile, problems);
  const clock = await readJson(root, "clock.json", ClockConfig, problems);

  if (problems.length > 0 || !profile || !clock) throw new ContentError(problems);

  loaded.sort((a, b) => a.doc.frequency - b.doc.frequency);
  const stations: BundledStation[] = await Promise.all(
    loaded.map(async ({ doc }) => ({
      ...doc,
      hash: await contentHash(doc),
      glyphSeed: await sha256Hex(doc.slug),
    })),
  );
  return { stations, profile, clock };
}

/** SHA-256 of canonical JSON over frontmatter plus body: equal content, equal hash. */
export function contentHash(doc: WorkDoc): Promise<string> {
  return sha256Hex(canonicalJson(doc));
}

function parseStation(file: string, text: string, problems: string[]): WorkDoc | null {
  const match = FRONTMATTER.exec(text);
  if (!match) {
    problems.push(`${file}: frontmatter: the file must start with a --- fenced YAML block`);
    return null;
  }
  let data: unknown;
  try {
    data = parseYaml(match[1] ?? "");
  } catch (err) {
    problems.push(`${file}: frontmatter: ${(err as Error).message.split("\n")[0]}`);
    return null;
  }
  const parsed = StationFrontmatter.safeParse(data);
  if (!parsed.success) {
    problems.push(...describe(file, parsed.error.issues));
    return null;
  }
  const expected = `${parsed.data.slug}.md`;
  if (!file.endsWith(`/${expected}`)) {
    problems.push(`${file}: slug: "${parsed.data.slug}" must match the file name (${expected})`);
  }
  return { ...parsed.data, body: (match[2] ?? "").trim() };
}

function checkStations(loaded: Loaded[], problems: string[]): void {
  const slugs = new Map<string, string>();
  const frequencies = new Map<number, Loaded>();
  for (const entry of loaded) {
    const { file, doc } = entry;
    const slugOwner = slugs.get(doc.slug);
    if (slugOwner) problems.push(`${file}: slug: "${doc.slug}" is already used by ${slugOwner}`);
    else slugs.set(doc.slug, file);

    const freqOwner = frequencies.get(doc.frequency);
    if (freqOwner) {
      problems.push(`${file}: frequency: ${doc.frequency} is already used by ${freqOwner.file}`);
    } else {
      frequencies.set(doc.frequency, entry);
    }
  }

  const live = loaded
    .filter(({ doc }) => doc.status === "live")
    .sort((a, b) => a.doc.frequency - b.doc.frequency);
  for (let i = 1; i < live.length; i++) {
    const prev = live[i - 1]!;
    const next = live[i]!;
    const gap = Math.round((next.doc.frequency - prev.doc.frequency) * 10) / 10;
    if (gap > 0 && gap < MIN_STATION_SPACING) {
      problems.push(
        `${next.file}: frequency: ${next.doc.frequency} is ${gap.toFixed(1)} MHz from ` +
          `${prev.doc.slug} (${prev.doc.frequency}) in ${prev.file}; ` +
          `live stations must be at least ${MIN_STATION_SPACING} MHz apart`,
      );
    }
  }
}

async function readJson<T extends z.ZodType>(
  root: string,
  name: string,
  schema: T,
  problems: string[],
): Promise<z.output<T> | null> {
  let data: unknown;
  try {
    data = JSON.parse(await readFile(join(root, name), "utf8"));
  } catch (err) {
    problems.push(`${name}: ${(err as Error).message}`);
    return null;
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    problems.push(...describe(name, parsed.error.issues));
    return null;
  }
  return parsed.data;
}

function describe(file: string, issues: z.core.$ZodIssue[]): string[] {
  return issues.map((issue) => {
    const field = issue.path.length ? issue.path.join(".") : "frontmatter";
    return `${file}: ${field}: ${issue.message}`;
  });
}
