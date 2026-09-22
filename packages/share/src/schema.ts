import {
  computedMoneyV1Schema,
  constraintExceedV1Schema,
  constraintKindV1Schema,
  constraintStatusV1Schema,
  coverageDimensionV1Schema,
  currencyV1Schema,
  decimalAmountV1Schema,
  isoDateV1Schema,
  isoUtcTimestampV1Schema,
  measurementUnitV1Schema,
  multiplierV1Schema,
  verificationStatusV1Schema,
} from "@stackreplay/schema";
import { z } from "zod";

/**
 * ShareReplaySnapshotV1 (M4, decision 32).
 *
 * The public shareable unit is an aggregate-only projection of a replay result.
 * It exists so a public link can render a result page and a share card without a
 * database, without an account, and without ever carrying workload detail.
 *
 * What it can contain: aggregate workload size, the selected date range, the
 * target plan and its catalog provenance, coverage dimensions, constraint
 * summaries, violation summaries at date granularity, economics, confidence, and
 * the engine/catalog/methodology versions.
 *
 * What it must never contain: individual usage events, event, session or project
 * hashes, repository names, local paths, source file names, prompts, responses,
 * source code, raw import contents, or timestamps finer than the selected
 * aggregate range. The schema is strict (unknown keys are rejected) and
 * `assertNoForbiddenFields` guards the boundary independently.
 */

export const SHARE_SNAPSHOT_VERSION = 1;

/** Keys that must never appear anywhere inside a share snapshot. */
export const FORBIDDEN_SHARE_KEYS = [
  "event",
  "events",
  "usageevent",
  "usageevents",
  "nativeeventhash",
  "nativeeventhashes",
  "nativesessionhash",
  "nativesessionhashes",
  "eventhash",
  "eventhashes",
  "sessionhash",
  "sessionhashes",
  "projecthash",
  "projecthashes",
  "projectid",
  "projectname",
  "projectpath",
  "repository",
  "repositoryname",
  "repo",
  "repopath",
  "path",
  "filepath",
  "filename",
  "sourcefile",
  "cwd",
  "hostname",
  "username",
  "prompt",
  "prompts",
  "response",
  "responses",
  "messages",
  "message",
  "content",
  "text",
  "code",
  "sourcecode",
  "diff",
  "patch",
  "rawexport",
  "rawexport",
  "importpayload",
  "filecontents",
  "tokens",
  "harness",
  "accounting",
] as const;

export type ForbiddenShareKey = (typeof FORBIDDEN_SHARE_KEYS)[number];

export class ShareSnapshotViolationError extends Error {
  readonly paths: string[];

  constructor(paths: string[]) {
    super(`Share snapshot contains forbidden field(s): ${paths.join(", ")}`);
    this.name = "ShareSnapshotViolationError";
    this.paths = paths;
  }
}

const forbidden = new Set<string>(FORBIDDEN_SHARE_KEYS.map((key) => key.toLowerCase()));

/**
 * Walks a candidate snapshot and reports every key that must never be shared.
 * Case- and separator-insensitive so `session_hash` cannot slip past as
 * `sessionHash`.
 */
export function findForbiddenFields(value: unknown, path = "$"): string[] {
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      found.push(...findForbiddenFields(entry, `${path}[${index}]`));
    });
    return found;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      const normalised = key.toLowerCase().replaceAll(/[^a-z0-9]/gu, "");
      const singular = normalised.endsWith("s") ? normalised.slice(0, -1) : normalised;
      if (forbidden.has(normalised) || forbidden.has(singular)) found.push(`${path}.${key}`);
      found.push(...findForbiddenFields(entry, `${path}.${key}`));
    }
  }
  return found;
}

/** Throws when a candidate snapshot contains a forbidden field. */
export function assertNoForbiddenFields(value: unknown): void {
  const paths = findForbiddenFields(value);
  if (paths.length > 0) throw new ShareSnapshotViolationError(paths);
}

const shareWorkloadV1Schema = z.strictObject({
  /** Total usage events the workload contained. */
  eventCount: z.number().int().nonnegative(),
  /** Distinct sessions, only when the sharer chooses to include it. */
  sessionCount: z.number().int().nonnegative().optional(),
  /** Distinct models the workload used. */
  modelCount: z.number().int().nonnegative(),
  /** Disjoint token totals; individual keys are absent when unknown. */
  tokenTotals: z.strictObject({
    inputTokens: z.number().int().nonnegative().optional(),
    cacheReadTokens: z.number().int().nonnegative().optional(),
    cacheWriteTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    reasoningTokens: z.number().int().nonnegative().optional(),
  }),
  /** True only when the sharer elected to publish the aggregate date range. */
  rangeIncluded: z.boolean(),
  from: isoUtcTimestampV1Schema.optional(),
  to: isoUtcTimestampV1Schema.optional(),
});

const shareTargetV1Schema = z.strictObject({
  type: z.literal("subscription"),
  planId: z.string().min(1),
  planVersionId: z.string().min(1),
  planName: z.string().min(1),
  providerId: z.string().min(1),
  providerName: z.string().min(1),
  price: z.strictObject({
    currency: currencyV1Schema,
    amount: decimalAmountV1Schema,
    interval: z.enum(["month", "year"]),
  }),
  verificationStatus: verificationStatusV1Schema,
  lastVerifiedAt: isoDateV1Schema,
  sources: z.array(z.strictObject({ url: z.string().min(1), title: z.string().min(1) })).max(8),
});

const shareConstraintV1Schema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: constraintKindV1Schema,
  unit: measurementUnitV1Schema,
  window: z.strictObject({
    kind: z.enum(["rolling", "calendar"]),
    description: z.string().min(1),
  }),
  exceed: constraintExceedV1Schema,
  status: constraintStatusV1Schema,
  limitUnits: decimalAmountV1Schema,
  consumedUnits: decimalAmountV1Schema,
  attemptedUnits: decimalAmountV1Schema,
  violationCount: z.number().int().nonnegative(),
  rejectedEvents: z.number().int().nonnegative(),
  overageUnits: decimalAmountV1Schema.optional(),
});

/**
 * Violations are summarised at date granularity: a public page can say which
 * windows were exceeded and when, without publishing intra-day burst timing.
 */
const shareViolationV1Schema = z.strictObject({
  constraintId: z.string().min(1),
  type: z.string().min(1),
  startedOn: isoDateV1Schema,
  endedOn: isoDateV1Schema,
  unit: measurementUnitV1Schema,
  requiredUnits: decimalAmountV1Schema,
  availableUnits: decimalAmountV1Schema,
  acceptedUnits: decimalAmountV1Schema,
  affectedEvents: z.number().int().nonnegative(),
  overageUnits: decimalAmountV1Schema.optional(),
});

const shareEconomicsV1Schema = z.strictObject({
  basePlanCost: computedMoneyV1Schema.optional(),
  overageCost: computedMoneyV1Schema.optional(),
  targetCost: computedMoneyV1Schema,
  costBasis: z.enum(["fixed_plan_price", "fixed_plan_price_plus_overage", "api_list_price"]),
  apiListPriceEquivalent: computedMoneyV1Schema.optional(),
  ratios: z
    .array(z.strictObject({ name: z.string().min(1), value: z.string().min(1) }))
    .max(8)
    .optional(),
});

const shareConfidenceV1Schema = z.strictObject({
  level: z.enum(["high", "medium", "low"]),
  factors: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        level: z.enum(["high", "medium", "low"]),
        description: z.string().min(1),
      }),
    )
    .max(12),
});

const shareAttributionV1Schema = z.strictObject({
  /** Aggregate per-source share of the workload; never per-event detail. */
  sources: z
    .array(
      z.strictObject({
        name: z.string().min(1),
        eventCount: z.number().int().nonnegative(),
        tokenShare: multiplierV1Schema.optional(),
      }),
    )
    .max(24),
});

export const shareReplaySnapshotV1Schema = z.strictObject({
  version: z.literal(SHARE_SNAPSHOT_VERSION),
  workload: shareWorkloadV1Schema,
  target: shareTargetV1Schema,
  feasibility: z.strictObject({
    status: z.enum(["full", "partial", "none", "unknown"]),
    coveragePercent: z.number().min(0).max(100).optional(),
    coverageDimension: z.literal("requests"),
    reason: z.string().min(1).optional(),
  }),
  coverage: z.strictObject({
    requests: coverageDimensionV1Schema,
    usage: coverageDimensionV1Schema,
    models: coverageDimensionV1Schema,
  }),
  constraints: z.array(shareConstraintV1Schema).max(24),
  violations: z.array(shareViolationV1Schema).max(64),
  economics: shareEconomicsV1Schema.optional(),
  confidence: shareConfidenceV1Schema,
  attribution: shareAttributionV1Schema.optional(),
  versions: z.strictObject({
    engine: z.string().min(1),
    schema: z.literal(1),
    catalog: z.string().min(1),
    methodology: z.string().min(1),
    rulesAsOf: isoDateV1Schema,
    targetReference: z.string().min(1),
  }),
});

export type ShareReplaySnapshotV1 = z.infer<typeof shareReplaySnapshotV1Schema>;
