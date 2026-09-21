import { z } from "zod";
import { isoUtcTimestampV1Schema } from "./scalars.js";
import { usageEventV1Schema } from "./usage-event.js";

/**
 * CLI export format (spec point 10). The redaction report is part of the
 * format so that a user can see exactly what was and was not collected.
 *
 * The declared range must be ordered (decision 20): `from` after `to` is
 * rejected, and `from == to` is a valid empty range.
 */

export const detectedSourceV1Schema = z.strictObject({
  adapterId: z.string().min(1),
  name: z.string().min(1),
  detected: z.boolean(),
  supported: z.boolean(),
  sessionCount: z.number().int().nonnegative().optional(),
  note: z.string().min(1).optional(),
});
export type DetectedSourceV1 = z.infer<typeof detectedSourceV1Schema>;

export const redactionReportV1Schema = z.strictObject({
  promptsIncluded: z.literal(false),
  responsesIncluded: z.literal(false),
  sourceCodeIncluded: z.literal(false),
  filePathsIncluded: z.literal(false),
  repositoryNamesIncluded: z.literal(false),
});
export type RedactionReportV1 = z.infer<typeof redactionReportV1Schema>;

/**
 * Orders two ISO-8601 UTC timestamps exactly, including sub-millisecond
 * precision: whole seconds are compared first, then the padded fraction.
 */
export function compareUtcTimestamps(a: string, b: string): number {
  const secondsA = a.slice(0, 19);
  const secondsB = b.slice(0, 19);
  if (secondsA !== secondsB) return secondsA < secondsB ? -1 : 1;
  const fractionA = (a.slice(20, -1) || "").padEnd(9, "0");
  const fractionB = (b.slice(20, -1) || "").padEnd(9, "0");
  if (fractionA === fractionB) return 0;
  return fractionA < fractionB ? -1 : 1;
}

export const stackReplayExportV1Schema = z
  .strictObject({
    format: z.literal("stackreplay"),
    version: z.literal(1),
    generatedAt: isoUtcTimestampV1Schema,
    collectorVersion: z.string().min(1),
    range: z.strictObject({
      from: isoUtcTimestampV1Schema,
      to: isoUtcTimestampV1Schema,
    }),
    detectedSources: z.array(detectedSourceV1Schema),
    events: z.array(usageEventV1Schema),
    redactionReport: redactionReportV1Schema,
  })
  .superRefine((value, ctx) => {
    if (compareUtcTimestamps(value.range.from, value.range.to) > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["range", "from"],
        message: "range.from must not be after range.to (from == to is a valid empty range)",
      });
    }
  });
export type StackReplayExportV1 = z.infer<typeof stackReplayExportV1Schema>;
