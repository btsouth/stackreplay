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
  /**
   * What kind of source this is (decision 28). Optional so that every export
   * written before this field existed stays valid and importable.
   *
   * - `usage`: emits canonical usage events, so it is a source of consumption.
   * - `attribution`: orchestration/control surface; it contributes harness
   *   attribution and never usage of its own.
   * - `import`: a third-party export read on request.
   */
  role: z.enum(["usage", "attribution", "import"]).optional(),
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
 * A collection warning, carried inside the export (benchmark finding F020).
 *
 * A truncated history, a partially decoded record or an aggregate that cannot be
 * deduplicated used to leave no trace in the artifact: the file was written, the
 * counts looked plausible, and the damage was invisible. Every warning the
 * collector raised now travels with the export.
 *
 * The local `path` a warning was raised for is deliberately NOT included: an
 * export never carries a raw file path, and `message` is redacted the same way
 * the redaction report claims.
 */
export const collectionWarningV1Schema = z.strictObject({
  code: z.string().min(1),
  message: z.string().min(1),
});
export type CollectionWarningV1 = z.infer<typeof collectionWarningV1Schema>;

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
    /**
     * Warnings raised while collecting, so a damaged or truncated history is
     * visible in the artifact instead of only on the terminal that wrote it.
     * Optional so that every export written before this field existed stays
     * valid and importable.
     */
    collectionWarnings: z.array(collectionWarningV1Schema).optional(),
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
