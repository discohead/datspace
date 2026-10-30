import { z } from "zod";
import { BANK_VERSION, question } from "./bank.ts";
import type { ClefAnswers } from "./decision.ts";

/**
 * Validation for the Worker. Kept out of the package's main entry so the page
 * that draws the questions doesn't ship zod.
 */

/** At most seven answers: enough to sharpen a signal, not enough to write an essay to the model. */
export const MAX_ANSWERS = 7;

/** `POST /decide`: question and answer ids only. The Worker looks up the text, so nothing else reaches the model. */
export const VibeRequest = z
  .strictObject({
    v: z.literal(BANK_VERSION),
    answers: z
      .array(z.strictObject({ q: z.string().regex(/^q\d{3}$/), a: z.enum(["a", "b", "c", "d"]) }))
      .min(1)
      .max(MAX_ANSWERS),
  })
  .superRefine(({ answers }, ctx) => {
    const seen = new Set<string>();
    answers.forEach(({ q, a }, i) => {
      const found = question(q);
      if (!found) ctx.addIssue({ code: "custom", path: ["answers", i, "q"], message: `no question ${q}` });
      else if ("abcd".indexOf(a) >= found.answers.length) {
        ctx.addIssue({ code: "custom", path: ["answers", i, "a"], message: `${q} has no answer ${a}` });
      }
      if (seen.has(q)) ctx.addIssue({ code: "custom", path: ["answers", i, "q"], message: `${q} is answered twice` });
      seen.add(q);
    });
  });

export type VibeRequest = z.infer<typeof VibeRequest>;

const Choice = z.object({ choice: z.string(), probabilities: z.record(z.string(), z.number().min(0).max(1)) });
const Score = z.object({ score: z.number().finite() });

/** The parts of Clef's response the station reads. */
export const ClefResponse = z.object({
  answers: z.object({
    system: Choice,
    scale: Choice,
    tempo: Score,
    density: Score,
    brightness: Score,
    space: Score,
    motion: Score,
  }) satisfies z.ZodType<ClefAnswers>,
  usage: z.object({ input_tokens: z.number().int().nonnegative() }).optional(),
});
