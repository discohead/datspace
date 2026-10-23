import { z } from "zod";

/** The dial's range and resolution, in MHz. */
export const DIAL_MIN = 87.5;
export const DIAL_MAX = 108.0;

/** Live stations sit at least this far apart so the static fully returns between them. */
export const MIN_STATION_SPACING = 3.2;

export const Band = z.enum(["io", "ai", "dev", "fm", "music", "studio"]);

export const Domain = z.enum([
  "datspace.io",
  "datspace.ai",
  "datspace.dev",
  "datspace.fm",
  "datspace.music",
  "datspace.studio",
]);

export const StationStatus = z.enum(["live", "unlit"]);

export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase letters, digits, and single hyphens");

export const Frequency = z
  .number()
  .min(DIAL_MIN)
  .max(DIAL_MAX)
  .refine((f) => Math.abs(f * 10 - Math.round(f * 10)) < 1e-9, "use one decimal place, like 88.7");

export const Link = z.strictObject({
  label: z.string().min(1),
  url: z.url(),
});

export const StoryFields = z.strictObject({
  question: z.string().min(1),
  prototype: z.string().min(1),
  finding: z.string().min(1),
  future: z.string().min(1),
});

/** The frontmatter of `packages/content/stations/<slug>.md`. */
export const StationFrontmatter = z.strictObject({
  slug: Slug,
  title: z.string().min(1),
  frequency: Frequency,
  domain: Domain,
  status: StationStatus,
  summary: z.string().min(1).max(90),
  ...StoryFields.shape,
  links: z.array(Link).default([]),
  facets: z.array(Band).default([]),
});

/** One work as authored: frontmatter plus the markdown body. */
export const WorkDoc = z.strictObject({
  ...StationFrontmatter.shape,
  body: z.string(),
});

/** A station as listed on the dial and by `list_stations`. */
export const Station = StationFrontmatter.pick({
  slug: true,
  title: true,
  frequency: true,
  domain: true,
  status: true,
  summary: true,
});

/** One work as returned by `get_work`. */
export const Work = z.strictObject({
  ...Station.shape,
  story: StoryFields,
  links: z.array(Link),
  facets: z.array(Band),
  markdown: z.string(),
  hash: z.string(),
});

export const SearchHit = z.strictObject({
  slug: Slug,
  title: z.string(),
  snippet: z.string(),
});

export const GraphNode = z.strictObject({
  id: z.string(),
  kind: z.enum(["work", "domain"]),
  label: z.string(),
});

export const GraphEdge = z.strictObject({
  from: z.string(),
  to: z.string(),
  kind: z.enum(["lives-on", "facet"]),
});

export const Graph = z.strictObject({
  nodes: z.array(GraphNode),
  edges: z.array(GraphEdge),
});

/** A JSON Resume subset plus how to reach Jared. */
export const Profile = z.strictObject({
  basics: z.strictObject({
    name: z.string(),
    label: z.string(),
    summary: z.string(),
    url: z.url().optional(),
    location: z.string().optional(),
    profiles: z
      .array(z.strictObject({ network: z.string(), username: z.string(), url: z.url() }))
      .default([]),
  }),
  work: z
    .array(
      z.strictObject({
        name: z.string(),
        position: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
        summary: z.string().optional(),
        highlights: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.strictObject({
        name: z.string(),
        description: z.string(),
        url: z.url().optional(),
      }),
    )
    .default([]),
  skills: z
    .array(z.strictObject({ name: z.string(), keywords: z.array(z.string()).default([]) }))
    .default([]),
  contact: z.strictObject({
    email: z.email(),
    preferences: z.string().optional(),
  }),
});

export const ClockConfig = z.strictObject({
  genesis: z.literal("1973-01-01T00:00:00Z"),
  bpm: z.number().positive(),
  beatsPerBar: z.int().positive(),
});

export const Surface = z.enum(["mcp", "json", "rpc", "cli"]);

/** A message to Jared. Its contents go to the Inbox and to Jared, never to the Ledger. */
export const MessageInput = z.strictObject({
  name: z.string().trim().min(1).max(100).optional(),
  reply_to: z.email(),
  body: z.string().trim().min(1).max(2000),
});

export const Transmitted = z.strictObject({
  id: z.string(),
  at: z.iso.datetime(),
});

/**
 * Ledger events record facts about the network, never arguments, IP addresses,
 * user agents, or message contents.
 */
export const LedgerInput = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("deploy"), data: z.strictObject({ commit: z.string().min(7) }) }),
  z.strictObject({
    type: z.literal("publish"),
    data: z.strictObject({ slug: Slug, revision: z.int().positive(), commit: z.string() }),
  }),
  z.strictObject({
    type: z.literal("agent.call"),
    data: z.strictObject({ surface: Surface, tool: z.string() }),
  }),
  z.strictObject({ type: z.literal("message.received"), data: z.strictObject({}) }),
]);

export const LedgerEventType = z.enum(["deploy", "publish", "agent.call", "message.received"]);

export const LedgerEvent = z.object({
  seq: z.int().positive(),
  at: z.iso.datetime(),
  type: z.string(),
  // Event data is flat by design: a few named facts, never nested payloads.
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  prevHash: z.string().length(64),
  hash: z.string().length(64),
});

/** A station as bundled at build: the authored doc plus derived values. */
export const BundledStation = z.strictObject({
  ...WorkDoc.shape,
  hash: z.string().length(64),
  glyphSeed: z.string().length(64),
});

/** The frontmatter of `packages/content/pages/<slug>.md`: human pages such as about and colophon. */
export const PageFrontmatter = z.strictObject({
  slug: Slug,
  title: z.string().min(1),
  description: z.string().min(1).max(160),
});

export const Page = z.strictObject({
  ...PageFrontmatter.shape,
  body: z.string(),
});

/** `packages/content/.generated/content.json`, read by both Workers. */
export const ContentBundle = z.strictObject({
  stations: z.array(BundledStation),
  pages: z.array(Page),
  profile: Profile,
  clock: ClockConfig,
});

// Each schema doubles as its inferred type, so `Station` is both.
export type Band = z.infer<typeof Band>;
export type Domain = z.infer<typeof Domain>;
export type StationStatus = z.infer<typeof StationStatus>;
export type Link = z.infer<typeof Link>;
export type StoryFields = z.infer<typeof StoryFields>;
export type StationFrontmatter = z.infer<typeof StationFrontmatter>;
export type WorkDoc = z.infer<typeof WorkDoc>;
export type Station = z.infer<typeof Station>;
export type Work = z.infer<typeof Work>;
export type SearchHit = z.infer<typeof SearchHit>;
export type GraphNode = z.infer<typeof GraphNode>;
export type GraphEdge = z.infer<typeof GraphEdge>;
export type Graph = z.infer<typeof Graph>;
export type Profile = z.infer<typeof Profile>;
export type ClockConfig = z.infer<typeof ClockConfig>;
export type Surface = z.infer<typeof Surface>;
export type LedgerInput = z.infer<typeof LedgerInput>;
export type MessageInput = z.infer<typeof MessageInput>;
export type Transmitted = z.infer<typeof Transmitted>;
export type LedgerEvent = z.infer<typeof LedgerEvent>;
export type LedgerEventType = z.infer<typeof LedgerEventType>;
export type BundledStation = z.infer<typeof BundledStation>;
export type ContentBundle = z.infer<typeof ContentBundle>;
export type PageFrontmatter = z.infer<typeof PageFrontmatter>;
export type Page = z.infer<typeof Page>;
