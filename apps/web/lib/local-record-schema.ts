import type { WarningCode } from "@stackreplay/adapters";
import { stackReplayExportV1Schema } from "@stackreplay/schema";
import { z } from "zod";
import type { ImportRecord } from "./worker-protocol";

const count = z.number().int().nonnegative().finite();
const instant = z.iso.datetime({ offset: true });
const source = z.strictObject({
  adapterId: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["usage", "attribution", "import"]),
  events: count,
  sessions: count.optional(),
  note: z.string().optional(),
});
const model = z.strictObject({
  rawName: z.string().min(1),
  canonicalId: z.string().optional(),
  events: count,
  mapped: z.boolean(),
  basis: z.enum(["canonical_id", "canonical_name", "alias"]).optional(),
  aliasId: z.string().optional(),
});
const summary = z.strictObject({
  eventCount: count,
  sessionCount: count,
  projectCount: count,
  firstEventAt: instant.optional(),
  lastEventAt: instant.optional(),
  tokens: z.strictObject({
    known: count,
    lowerBound: count,
    unknownEvents: count,
    buckets: z.strictObject({
      uncachedInputTokens: count,
      cacheReadTokens: count,
      cacheWriteTokens: count,
      outputTokens: count,
      reasoningTokens: count,
    }),
  }),
  models: z.array(model),
  usageSources: z.array(source),
  orchestration: z.array(
    z.strictObject({
      harnessId: z.string().min(1),
      name: z.string().min(1),
      sessions: count,
      events: count,
      precise: z.boolean(),
    }),
  ),
  otherSources: z.array(source),
  redaction: z.strictObject({
    promptsIncluded: z.literal(false),
    responsesIncluded: z.literal(false),
    sourceCodeIncluded: z.literal(false),
    filePathsIncluded: z.literal(false),
    repositoryNamesIncluded: z.literal(false),
  }),
  catalogVersion: z.string().min(1),
});
const safeName = z
  .string()
  .min(1)
  .max(160)
  .refine((value) =>
    Array.from(value).every((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127 && character !== "/" && character !== "\\";
    }),
  );
const safeExplanation = z
  .string()
  .max(240)
  .refine((value) => !value.includes("/") && !value.includes("\\"));
/**
 * Every warning code an adapter can raise. The type assertion below fails the
 * build when the adapters gain a code this list does not carry: a missing code
 * made every Claude scan with repeated response rows (RECORD_DUPLICATE)
 * impossible to save, reported as storage being full.
 */
const WARNING_CODES = [
  "SOURCE_UNREADABLE",
  "SOURCE_LAYOUT_UNSUPPORTED",
  "RECORD_MALFORMED",
  "RECORD_DUPLICATE",
  "RECORD_UNSUPPORTED",
  "RECORD_INCOMPLETE",
  "SESSION_PARTIAL",
  "SESSION_ID_MISSING",
  "TIMESTAMP_INVALID",
  "MODEL_UNKNOWN",
  "MODEL_UNMAPPED",
  "USAGE_MISSING",
  "ACCOUNTING_UNESTABLISHED",
  "SCHEMA_VERSION_UNKNOWN",
  "PROJECT_UNKNOWN",
  "SOURCE_TRUNCATED",
  "ACCOUNTING_UNRECONCILED",
  "AGGREGATE_NO_SESSION",
  "DOUBLE_COUNT_RISK",
] as const satisfies readonly WarningCode[];
type Exhaustive<T extends true> = T;
export type WarningCodesCovered = Exhaustive<
  WarningCode extends (typeof WARNING_CODES)[number] ? true : false
>;
const warningCode = z.enum(WARNING_CODES);
const outcome = z.strictObject({
  path: safeName,
  status: z.enum([
    "imported",
    "unrecognized",
    "malformed",
    "unsupported",
    "duplicate",
    "unreadable",
  ]),
  source: safeName.optional(),
  reason: safeExplanation,
  events: count,
});
export const importRecordSchema = z.strictObject({
  id: z.string().regex(/^[0-9a-f]{32}$/u),
  label: safeName,
  createdAt: instant,
  eventCount: count,
  summary,
  intake: z
    .strictObject({
      outcomes: z.array(outcome),
      exactDuplicates: count,
      overlaps: count,
      warnings: z.array(z.strictObject({ code: warningCode, message: safeExplanation })),
    })
    .optional(),
  savedLocally: z.boolean().optional(),
  localProjects: z
    .array(z.strictObject({ hash: z.string().regex(/^ph_[0-9a-f]{32}$/u), label: safeName }))
    .optional(),
});

/** Both stores are one contract. Reject malformed metadata and event envelopes. */
export function validateStoredPair(record: unknown, payload: unknown): ImportRecord | undefined {
  const checkedRecord = importRecordSchema.safeParse(record);
  if (!checkedRecord.success) return undefined;
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as { id?: unknown }).id !== checkedRecord.data.id
  )
    return undefined;
  const checkedExport = stackReplayExportV1Schema.safeParse(
    (payload as { exported?: unknown }).exported,
  );
  if (
    !checkedExport.success ||
    checkedExport.data.events.length !== checkedRecord.data.eventCount ||
    checkedRecord.data.summary.eventCount !== checkedRecord.data.eventCount
  )
    return undefined;
  return checkedRecord.data as ImportRecord;
}
