import raw from "@datspace/content/content.json" with { type: "json" };
import { ContentBundle } from "@datspace/contract";

/** The content bundle, validated once at build. Server-only, so zod stays out of the client. */
export const content: ContentBundle = ContentBundle.parse(raw);
