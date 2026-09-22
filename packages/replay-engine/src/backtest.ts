import type { CatalogV1, ModelIdentityResolutionV1 } from "@stackreplay/catalog";
import { getPricing, modelResolutionKindOf } from "@stackreplay/catalog";
import type {
  ExecutionReplayResultV1,
  ModelResolutionKindV1,
  ReplayDispositionsV1,
  ReplayEvidenceV1,
  ReplayModeV1,
  TextUsageV1,
} from "@stackreplay/schema";
import { Decimal, parseAmount, toUnitString } from "./money.js";
import { moneyUnitsForUsage, type PricingCategory, tokenAccountingOf } from "./units.js";
import { ENGINE_VERSION, REPLAY_METHODOLOGY_VERSION } from "./version.js";

/**
 * Backtesting / self-replay foundation (M4B plan section 13).
 *
 * This module reconstructs outcomes the repository already knows by hand —
 * a synthetic list-price total, a documented subscription rule's crossings,
 * a resolved identity, a replay mode, a set of dispositions — and compares the
 * reconstruction with the expectation in one explicit result shape.
 *
 * It is pure and deterministic: no clock, no network, no provider connection.
 * It never reports a calibrated target: calibration would require observed
 * provider meter or invoice evidence, and no such evidence exists in this
 * repository. An observation, when one is later available, is recorded next to
 * the reconstruction with its delta — never merged into it, and never with a
 * fabricated baseline for cases that do not compare money.
 */

/** A money amount as the catalog and results carry it: decimal string plus currency. */
export interface BacktestAmountV1 {
  amount: string;
  currency: string;
}

/**
 * An observed provider meter or invoice total. Nothing in this repository
 * produces one yet; the field exists so a later, genuinely observed total can
 * be recorded beside a reconstruction instead of being inferred.
 */
export interface MeterObservationV1 extends BacktestAmountV1 {
  /** Where the observation came from: a meter export, an invoice, a console. */
  source: string;
  observedAt: string;
}

/** What a fixture states independently of the code under test. */
export type BacktestExpectationV1 =
  | { kind: "list-price"; amount: string; currency: string }
  | { kind: "limit-crossings"; crossings: number }
  | { kind: "replay-mode"; mode: ReplayModeV1 }
  | {
      kind: "model-resolution";
      resolutionKind: ModelResolutionKindV1;
      canonicalModelId?: string | undefined;
    }
  | ({ kind: "dispositions" } & ReplayDispositionsV1);

/** Comparison of one reconstruction against the fixture's stated expectation. */
export interface BacktestComparisonV1 {
  caseId: string;
  description: string;
  expected: BacktestExpectationV1;
  reconstructed: BacktestExpectationV1;
  matched: boolean;
  /** Human-readable differences; empty exactly when `matched` is true. */
  differences: string[];
  /** Coverage dimensions of the replay the reconstruction came from, if any. */
  evidence?: ReplayEvidenceV1;
  versions: {
    engine: string;
    methodology: string;
    catalog: string;
    rulesAsOf?: string;
    pricingReferences?: readonly string[];
  };
  /**
   * Always `uncalibrated` in M4B. Calibration would require observed meter or
   * invoice evidence, and this repository has none, so the field is a literal
   * rather than a state a caller could set.
   */
  calibration: "uncalibrated";
  /** Present only when a genuinely observed total was supplied. */
  observation?: MeterObservationV1;
  /**
   * Exact decimal difference `observation - reconstructed`. Present only when the
   * case compares money: a delta against a reconstruction that is not a money
   * total (crossings, modes, dispositions) would be arithmetic on unrelated
   * units, so it is omitted rather than fabricated.
   */
  delta?: { absolute: string; relative: string };
  /** Why an observation carries no delta, present exactly when it does not. */
  observationNote?: string;
}

export interface ListPriceReconstructionV1 {
  status: "known" | "unknown";
  amount?: string;
  currency?: string;
  /** Explicit resource vector: the categories that carried consumption. */
  categories: ReadonlyArray<{ category: PricingCategory; tokens: number }>;
  /** Pricing records used, deduplicated and sorted. */
  pricingReferences: string[];
  reason?: string;
}

export interface ListPriceEventV1 {
  /** Pricing record the scenario pins for this event's model. */
  pricingId: string;
  usage: TextUsageV1;
  /** Event instant in epoch milliseconds, for effective-dated rate selection. */
  atMs: number;
}

const CATEGORY_ORDER: readonly PricingCategory[] = [
  "input",
  "cacheRead",
  "cacheWrite",
  "output",
  "reasoning",
];

/**
 * Reconstructs an API-style list price from a synthetic workload and a pinned
 * price table using the same pure primitives the replay engine prices with
 * (`selectRateSet` inside `moneyUnitsForUsage`). This does not implement the
 * `api` execution target: it is a fixture-validated calculation over explicit
 * resource categories, never `totalTokens * one rate`.
 *
 * A workload with missing usage categories or an unestablished rate is reported
 * as `unknown` with a reason rather than priced approximately.
 */
export function reconstructListPrice(
  catalog: CatalogV1,
  events: readonly ListPriceEventV1[],
): ListPriceReconstructionV1 {
  const references = new Set<string>();
  const categories = new Map<PricingCategory, number>();
  let total = new Decimal(0);
  let currency: string | undefined;

  for (const event of events) {
    const pricing = getPricing(catalog, event.pricingId);
    if (pricing === undefined)
      return {
        status: "unknown",
        categories: [],
        pricingReferences: [],
        reason: `pricing record "${event.pricingId}" is not in this catalog`,
      };
    if (currency === undefined) currency = pricing.currency;
    else if (currency !== pricing.currency)
      return {
        status: "unknown",
        categories: [],
        pricingReferences: [],
        reason: "the scenario mixes pricing records in different currencies",
      };
    references.add(pricing.id);

    const outcome = moneyUnitsForUsage(event.usage, pricing, { atMs: event.atMs });
    if (!outcome.known)
      return {
        status: "unknown",
        categories: [],
        pricingReferences: [...references].sort(),
        reason:
          outcome.missingPricing || outcome.unpricedCategories.length > 0
            ? "a consumed category is not established by the pinned pricing record"
            : "an event does not report every canonical token category, so its consumption is unknown",
      };
    total = total.plus(outcome.units);

    const buckets = tokenAccountingOf(event.usage);
    if (buckets.known) {
      for (const [category, tokens] of CATEGORY_ORDER.map(
        (category) => [category, bucketOf(buckets.buckets, category)] as const,
      )) {
        if (tokens <= 0) continue;
        categories.set(category, (categories.get(category) ?? 0) + tokens);
      }
    }
  }

  return {
    status: "known",
    amount: toUnitString(total),
    currency: currency ?? "USD",
    categories: CATEGORY_ORDER.filter((category) => (categories.get(category) ?? 0) > 0).map(
      (category) => ({ category, tokens: categories.get(category) ?? 0 }),
    ),
    pricingReferences: [...references].sort(),
  };
}

function bucketOf(
  buckets: {
    uncachedInputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
    reasoningTokens: number;
  },
  category: PricingCategory,
): number {
  switch (category) {
    case "input":
      return buckets.uncachedInputTokens;
    case "cacheRead":
      return buckets.cacheReadTokens;
    case "cacheWrite":
      return buckets.cacheWriteTokens;
    case "output":
      return buckets.outputTokens;
    case "reasoning":
      return buckets.reasoningTokens;
  }
}

/** The replay's routing assumption, as a comparable expectation. */
export function modeExpectation(result: ExecutionReplayResultV1): BacktestExpectationV1 {
  return { kind: "replay-mode", mode: modeOf(result) };
}

export function modeOf(result: ExecutionReplayResultV1): ReplayModeV1 {
  return result.semantics?.mode ?? "exact";
}

/** The replay's aggregate dispositions, as a comparable expectation. */
export function dispositionsExpectation(result: ExecutionReplayResultV1): BacktestExpectationV1 {
  return { kind: "dispositions", ...dispositionsOf(result) };
}

export function dispositionsOf(result: ExecutionReplayResultV1): ReplayDispositionsV1 {
  return (
    result.semantics?.dispositions ?? {
      included: 0,
      overage: 0,
      blocked: 0,
      unavailable: 0,
      unknown: result.workload.eventCount,
    }
  );
}

/**
 * Total limit crossings the replay recorded, counted once per violating event
 * per constraint — the same quantity the constraint summary reports.
 */
export function crossingsOf(result: ExecutionReplayResultV1): number {
  return result.constraints.reduce((total, constraint) => total + constraint.violationCount, 0);
}

export function crossingsExpectation(result: ExecutionReplayResultV1): BacktestExpectationV1 {
  return { kind: "limit-crossings", crossings: crossingsOf(result) };
}

/**
 * One model resolution as a comparable expectation, so a fixture's hand-written
 * identity can be compared with what the catalog index actually resolved. The
 * fixture's side of the comparison is never built with this helper (or with
 * `modelResolutionKindOf`): a helper compared against itself proves nothing.
 */
export function resolutionExpectation(outcome: ModelIdentityResolutionV1): BacktestExpectationV1 {
  return {
    kind: "model-resolution",
    resolutionKind: modelResolutionKindOf(outcome),
    ...(outcome.canonicalId === undefined ? {} : { canonicalModelId: outcome.canonicalId }),
  };
}

/** Compares a reconstruction against the fixture's stated expectation. */
export function compareToExpectation(
  expected: BacktestExpectationV1,
  reconstructed: BacktestExpectationV1,
): { matched: boolean; differences: string[] } {
  if (expected.kind !== reconstructed.kind)
    return {
      matched: false,
      differences: [
        `the expectation is a ${expected.kind} but the reconstruction is a ${reconstructed.kind}`,
      ],
    };

  const differences: string[] = [];
  if (expected.kind === "list-price" && reconstructed.kind === "list-price") {
    if (expected.amount !== reconstructed.amount)
      differences.push(`expected ${expected.amount}, reconstructed ${reconstructed.amount}`);
    if (expected.currency !== reconstructed.currency)
      differences.push(`expected ${expected.currency}, reconstructed ${reconstructed.currency}`);
    return { matched: differences.length === 0, differences };
  }
  if (expected.kind === "limit-crossings" && reconstructed.kind === "limit-crossings") {
    if (expected.crossings !== reconstructed.crossings)
      differences.push(`expected ${expected.crossings}, reconstructed ${reconstructed.crossings}`);
    return { matched: differences.length === 0, differences };
  }
  if (expected.kind === "replay-mode" && reconstructed.kind === "replay-mode") {
    if (expected.mode !== reconstructed.mode)
      differences.push(`expected ${expected.mode}, reconstructed ${reconstructed.mode}`);
    return { matched: differences.length === 0, differences };
  }
  if (expected.kind === "model-resolution" && reconstructed.kind === "model-resolution") {
    if (expected.resolutionKind !== reconstructed.resolutionKind)
      differences.push(
        `expected ${expected.resolutionKind}, reconstructed ${reconstructed.resolutionKind}`,
      );
    if (expected.canonicalModelId !== reconstructed.canonicalModelId)
      differences.push(
        `expected model ${expected.canonicalModelId ?? "none"}, reconstructed ${reconstructed.canonicalModelId ?? "none"}`,
      );
    return { matched: differences.length === 0, differences };
  }
  if (expected.kind === "dispositions" && reconstructed.kind === "dispositions") {
    const keys: ReadonlyArray<keyof ReplayDispositionsV1> = [
      "included",
      "overage",
      "blocked",
      "unavailable",
      "unknown",
    ];
    for (const key of keys) {
      if (expected[key] !== reconstructed[key])
        differences.push(`${key}: expected ${expected[key]}, reconstructed ${reconstructed[key]}`);
    }
    return { matched: differences.length === 0, differences };
  }
  return { matched: false, differences: ["the expectation and reconstruction are not comparable"] };
}

/**
 * Compares a reconstruction with a genuinely observed total. The relative delta
 * is a presentation ratio over the reconstruction, never money.
 */
export function observationDelta(
  reconstructed: BacktestAmountV1,
  observation: BacktestAmountV1,
): { absolute: string; relative: string } {
  const difference = parseAmount(observation.amount).minus(parseAmount(reconstructed.amount));
  const absolute = toUnitString(difference);
  const base = parseAmount(reconstructed.amount);
  const relative = base.isZero() ? "0.000000" : difference.div(base).toFixed(6);
  return { absolute, relative };
}

export interface BacktestCaseInputV1 {
  caseId: string;
  description: string;
  expected: BacktestExpectationV1;
  reconstructed: BacktestExpectationV1;
  result?: ExecutionReplayResultV1;
  catalogVersion: string;
  observation?: MeterObservationV1;
}

/**
 * Builds the comparison record for one case. Provider observations stay
 * separate from the reconstruction: this function never blends them, and it
 * never labels a case calibrated.
 */
export function evaluateBacktestCase(input: BacktestCaseInputV1): BacktestComparisonV1 {
  const comparison = compareToExpectation(input.expected, input.reconstructed);
  const result = input.result;
  const observed = input.observation;
  const observationRecord =
    observed === undefined
      ? {}
      : input.expected.kind === "list-price" && input.reconstructed.kind === "list-price"
        ? {
            observation: observed,
            delta: observationDelta(
              { amount: input.reconstructed.amount, currency: input.reconstructed.currency },
              observed,
            ),
          }
        : {
            observation: observed,
            observationNote: `this case compares ${input.reconstructed.kind}, not a money total, so the observation is recorded without a delta rather than measured against a zero baseline`,
          };
  return {
    caseId: input.caseId,
    description: input.description,
    expected: input.expected,
    reconstructed: input.reconstructed,
    matched: comparison.matched,
    differences: comparison.differences,
    ...(result?.semantics === undefined ? {} : { evidence: result.semantics.evidence }),
    versions: {
      engine: ENGINE_VERSION,
      methodology: REPLAY_METHODOLOGY_VERSION,
      catalog: result?.versions.catalog ?? input.catalogVersion,
      ...(result === undefined
        ? {}
        : {
            rulesAsOf: result.versions.rulesAsOf,
            ...(result.versions.pricingReferences === undefined
              ? {}
              : { pricingReferences: result.versions.pricingReferences }),
          }),
    },
    calibration: "uncalibrated",
    ...observationRecord,
  };
}
