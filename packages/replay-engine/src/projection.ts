/**
 * Replay projection: the display contract every StackReplay surface reads.
 *
 * M4D (production Replay experience) needs one place where a replay result is
 * turned into the facts an interface shows: the target that was replayed, the
 * observed workload, how identity resolved, what happened to each unit of
 * demand, which windows crossed, what could be priced, how much is established,
 * and the provenance that pins the whole thing.
 *
 * Keeping it here, in the pure engine package, is deliberate. The homepage
 * demonstration and `/app/replay` are two surfaces over the same result; a
 * projection built inside a React component would let them disagree about the
 * same replay. Nothing in this file renders, and nothing in it may invent a
 * fact the result does not carry: a missing dimension stays missing, an unknown
 * economics block stays unknown, and the wording follows the engine's own
 * readings rather than the other way around (decisions 38, 39, 40, 41, 44).
 */

import type {
  ApiReplayTargetStackV1,
  ConstraintResultV1,
  CoverageDimensionV1,
  ExecutionReplayResultV1,
  ExecutionTargetV1,
  ReplayabilityClassV1,
  ReplayDispositionsV1,
  ReplayEvidenceV1,
  ReplayModeV1,
  ReplayViolationV1,
  SubscriptionReplayDetailV1,
  SubscriptionReplayTargetStackV1,
} from "@stackreplay/schema";
import { isSyntheticCatalogId } from "@stackreplay/schema";
import { Temporal } from "./time.js";

export type { CoverageDimensionV1, ReplayabilityClassV1, ReplayDispositionsV1, ReplayModeV1 };

/** The keys of the engine's own disposition counters (decision 38). */
export type ReplayDispositionKindV1 = keyof ReplayDispositionsV1;

/** A dimension an interface shows, with the engine's own status vocabulary. */
export interface ProjectedDimensionV1 {
  id: "requests" | "usage" | "models";
  label: string;
  /** What the dimension counts, in one line. */
  note: string;
  status: "known" | "unknown";
  percent: number | undefined;
  covered: number | undefined;
  total: number | undefined;
  unknownCount: number | undefined;
  reason: string | undefined;
}

export interface ProjectedModelResolutionV1 {
  /**
   * The identifier the source reported, and only when the engine recorded one
   * verbatim. A resolved model's catalog id is a catalog fact, not a known
   * spelling of anything, so it is never reported here as an observed one
   * (decision 34).
   */
  observed: string | undefined;
  canonicalId: string | undefined;
  resolutionKind: "exact-id" | "documented-alias" | "documented-route" | "unresolved";
  /** True only for `unresolved`: no declared evidence establishes identity. */
  unresolved: boolean;
}

export interface ProjectedWorkloadV1 {
  eventCount: number;
  sessionCount: number | undefined;
  /**
   * Distinct model identities: canonical models the workload resolved to, plus
   * unresolved spellings. Not a count of models: see the two fields below.
   */
  modelCount: number;
  /**
   * Distinct canonical catalog models the workload resolved to. Absent when the
   * result carries no model mix. Unresolved identifiers are never counted here.
   */
  resolvedModelCount: number | undefined;
  /** Distinct raw identifiers no catalog source resolves. */
  unresolvedIdCount: number;
  from: string | undefined;
  to: string | undefined;
  /**
   * Calendar days from the first event to the last, inclusive: the viewer's
   * days when the projection was given a time zone (decision 57), otherwise
   * UTC days. Absent for an empty workload.
   */
  windowDays: number | undefined;
  /** Disjoint bucket totals. Absent quantities are unknown, never zero. */
  tokens: {
    uncachedInput: number | undefined;
    cacheRead: number | undefined;
    cacheWrite: number | undefined;
    output: number | undefined;
    reasoning: number | undefined;
  };
  /**
   * Sum of the buckets that are established. Absent when the engine established
   * no bucket at all: a workload whose token accounting never arrived has an
   * unknown total, and a total of zero is a different claim.
   */
  knownTokens: number | undefined;
  /**
   * True when every canonical bucket is established for every event. Absent
   * when the result carries no usage evidence at all: whether consumption is
   * complete is then not recorded, which is a different claim from "complete".
   */
  complete: boolean | undefined;
  modelShare: readonly { modelId: string; eventCount: number; tokenCount: number | undefined }[];
  /**
   * Events whose identifiers no catalog source establishes. Absent when the
   * result carries no model mix, so a missing count never reads as "none".
   */
  unresolvedEventCount: number | undefined;
  observedModels: readonly string[];
}

export interface ProjectedOutcomeV1 {
  key: ReplayDispositionKindV1;
  label: string;
  note: string;
  /** Absent when the result carries no dispositions; never a zero on its behalf. */
  count: number | undefined;
}

export interface ProjectedCrossingV1 {
  id: string;
  index: number;
  constraintId: string;
  constraintLabel: string;
  /**
   * The rule's declared behaviour once capacity is exceeded (decision 14), and
   * only when the result carries the rule it belongs to. A crossing without its
   * rule does not get a default behaviour.
   */
  exceed: ConstraintResultV1["exceed"] | undefined;
  unit: ConstraintResultV1["unit"];
  window: string;
  kind: ReplayViolationV1["type"];
  startedAt: string;
  endedAt: string;
  observedUnits: string;
  includedUnits: string;
  /**
   * Units the rule measured above included capacity, whenever it measured them.
   * A record-only rule measures them too without billing or refusing anything,
   * so this quantity is never by itself a statement about what happened.
   */
  excessUnits: string | undefined;
  affectedEvents: number;
  acceptedUnits: string;
  /**
   * When, inside the window, attempted demand first passed included capacity:
   * the engine's own instant, absent for results that did not record it.
   */
  exceededAt: string | undefined;
}

export interface ProjectedConstraintV1 {
  id: string;
  label: string;
  status: ConstraintResultV1["status"];
  exceed: ConstraintResultV1["exceed"];
  unit: ConstraintResultV1["unit"];
  window: string;
  limitUnits: string;
  consumedUnits: string;
  attemptedUnits: string;
  violationCount: number;
  rejectedEvents: number;
  indeterminateEvents: number;
  eligibleEvents: number;
  overageUnits: string | undefined;
  overageCost: string | undefined;
}

export interface ProjectedPricingCategoryV1 {
  key: "uncachedInput" | "cacheRead" | "cacheWrite" | "output" | "reasoning";
  label: string;
  tokens: number;
}

/**
 * What the engine established about pricing, kept separate from what it
 * established about service. A target can serve an event and not price it, and
 * an event can be priced for a model the target does not offer; the two
 * questions have different evidence and are never inferred from each other.
 *
 * No rate and no money appear here. The engine's own economics are the only
 * money this contract carries, because re-pricing the workload's aggregated
 * buckets from a catalog rate would reproduce the engine's money math in a
 * second place and could contradict it.
 */
export interface ProjectedPriceabilityV1 {
  /** Events the target's own rules admitted. A service outcome, not a price. */
  servedEvents: number | undefined;
  /** Events the engine found a price for, from its pricing evidence. */
  pricedEvents: number | undefined;
  /** Events it could not price. */
  unpricedEvents: number | undefined;
  /** The engine's own pricing-evidence status, quoted. */
  status: "complete" | "partial" | "not_applicable" | undefined;
  /** The engine's own reason for a pricing shortfall, quoted. */
  reason: string | undefined;
  /** Token quantities per category. Quantities only: no rate, no cost. */
  categories: readonly ProjectedPricingCategoryV1[];
}

export interface ProjectedEvidenceRowV1 {
  id: keyof ReplayEvidenceV1 | "translationMethod" | "resetPhase";
  label: string;
  /** The question this dimension answers, in one line. */
  note: string;
  status: "complete" | "partial" | "not_applicable";
  /** `N of M` for the dimension's own denominator, or a stated reading. */
  reading: string;
  reason: string | undefined;
}

export interface ProjectedProvenanceV1 {
  planVersion: string | undefined;
  apiProvider: string | undefined;
  rulesAsOf: string;
  catalogVersion: string;
  engineVersion: string;
  methodologyVersion: string;
  translationPolicy: { id: string; version: string } | undefined;
  /**
   * The usage-based reset phase, exactly as the target stack declares it. Never
   * a guessed phase (decision 41).
   */
  resetPhase: string;
  workloadScope: string;
  /** Absent when the result carries no workload scope, never a default scope. */
  workloadScopeKind: string | undefined;
  /** True when the target is the synthetic `example-` development namespace. */
  syntheticTarget: boolean;
}

export interface ProjectedTargetV1 {
  type: ExecutionTargetV1["type"];
  kind: "subscription" | "api";
  label: string;
  providerId: string;
  providerName: string;
  planId: string | undefined;
  planVersionId: string | undefined;
  priceAmount: string | undefined;
  priceInterval: SubscriptionReplayDetailV1["interval"] | undefined;
  /** A subscription's decidable overage behaviour; absent for an API target. */
  overageMode: "enabled" | "disabled" | "unknown" | undefined;
  /** What the target pins, in the target's own terms. */
  referenceLabel: string;
  reference: string;
}

export interface ProjectedEconomicsV1 {
  /** The plan's own fixed price, when the target is a subscription. */
  basePlanCost: string | undefined;
  /** Billed consumption above included capacity. */
  overageCost: string | undefined;
  targetCost: string | undefined;
  /**
   * True when the total is established for the workload. A fixed plan price is
   * established as soon as the engine reports it, because it does not depend on
   * consumption; a metered total is established only when every event could be
   * evaluated against the rules.
   */
  targetCostEstablished: boolean;
  /**
   * True when every event was evaluated, so any consumption-dependent part of
   * this cost is established too. Reported separately from the total, because a
   * subscription's fixed price is known even when consumption is not.
   */
  consumptionEstablished: boolean;
  /** How the total reads on screen. One wording, shared by every surface. */
  costReading: string;
  costBasis: "fixed_plan_price" | "fixed_plan_price_plus_overage" | "api_list_price";
  apiListPriceEquivalent: string | undefined;
  baselineCost: string | undefined;
  costDifference: string | undefined;
  /** Named ratios only. A ratio never appears without both of its numbers. */
  ratios: readonly { name: string; value: string }[];
  /**
   * Events that report no complete token accounting, so what they consumed is
   * not established. Read from the engine's own usage-categories evidence,
   * never from a constraint tally: constraint evidence and consumption evidence
   * answer different questions, and a Direct API target has no constraints at
   * all. Absent when the engine reports no such count, because an unknown count
   * is not a zero.
   */
  indeterminateConsumptionEvents: number | undefined;
  /** How the consumption side of this cost reads on screen. */
  consumptionReading: string;
  /**
   * Why no total is reported. Never a claim that a reported figure is a lower
   * bound: a bound is a piece of mathematics the engine either states or does
   * not, and the projection does not invent one.
   */
  reason: string | undefined;
}

export interface ProjectedHeadlineV1 {
  /** The dimension the headline figure comes from. */
  dimension: "requests" | "usage" | "models";
  percent: number | undefined;
  /** The sentence an interface shows above the dimensions. */
  statement: string;
  /**
   * The engine's own feasibility status, carried through so every surface labels
   * one replay the same way instead of each writing its own summary word.
   */
  status: "full" | "partial" | "none" | "unknown";
  /** How that status reads on screen. */
  statusLabel: string;
}

export interface ProjectedReplayV1 {
  target: ProjectedTargetV1;
  workload: ProjectedWorkloadV1;
  /**
   * The scenario's routing assumption, never a completeness claim (decision 38).
   * Absent when the result carries no semantics: a result that predates them
   * does not get a default of `exact`.
   */
  mode: ReplayModeV1 | undefined;
  modeNote: string;
  translation:
    | {
        policyId: string;
        policyVersion: string;
        method: string;
        substitutedEvents: number;
        applied: readonly {
          sourceModelId: string;
          targetModelId: string;
          eventCount: number;
        }[];
      }
    | undefined;
  replayability: {
    /** Absent when the result carries no replayability class. */
    class: ReplayabilityClassV1 | undefined;
    classNote: string;
    reasons: readonly { id: string; description: string }[];
  };
  headline: ProjectedHeadlineV1;
  dimensions: readonly ProjectedDimensionV1[];
  outcomes: readonly ProjectedOutcomeV1[];
  models: readonly ProjectedModelResolutionV1[];
  constraints: readonly ProjectedConstraintV1[];
  crossings: readonly ProjectedCrossingV1[];
  evidence: readonly ProjectedEvidenceRowV1[];
  /**
   * False when the result carries no semantics block, so nothing was recorded
   * dimension by dimension. An empty ledger means "not recorded", not "clean".
   */
  evidenceEstablished: boolean;
  economics: ProjectedEconomicsV1;
  pricing: ProjectedPriceabilityV1 | undefined;
  provenance: ProjectedProvenanceV1;
  warnings: readonly { code: string; message: string; count: number | undefined }[];
  assumptions: readonly string[];
}

/**
 * Catalog facts the projection needs, kept structural so any loaded shape
 * works. It is deliberately narrow: naming only. The projection does not read
 * rates, offering lists or alias spellings, because reading them is how a
 * display layer starts re-deriving pricing and model identity of its own
 * (decisions 34, 35, 44).
 */
export interface ProjectionCatalogV1 {
  providers: Record<string, { name?: string } | undefined>;
}

/** The engine's feasibility status in the words an interface uses for it. */
const FEASIBILITY_LABELS: Record<"full" | "partial" | "none" | "unknown", string> = {
  full: "Fully served",
  partial: "Partly served",
  none: "Not served",
  unknown: "Unknown",
};

const CATEGORY_LABELS: Record<ProjectedPricingCategoryV1["key"], string> = {
  uncachedInput: "Uncached input",
  cacheRead: "Cache read",
  cacheWrite: "Cache write",
  output: "Output",
  reasoning: "Reasoning",
};

const CATEGORY_ORDER: readonly ProjectedPricingCategoryV1["key"][] = [
  "uncachedInput",
  "cacheRead",
  "cacheWrite",
  "output",
  "reasoning",
];

const DIMENSION_NOTES: Record<ProjectedDimensionV1["id"], string> = {
  requests: "Events the target would have served",
  usage: "Token-weighted over disjoint, known quantities",
  models: "Distinct models the target supports",
};

const EVIDENCE_NOTES: Record<ProjectedEvidenceRowV1["id"], string> = {
  modelResolution: "How much of the workload's model identity is established",
  usageCategories: "How much of the workload establishes every canonical token category",
  pricing: "How much of the demanded price could be converted to money",
  rules: "How much of the workload the target's rule set describes at all",
  temporal: "How much of the workload lies inside the pinned rule set",
  translationMethod: "The token transform applied, if any",
  resetPhase: "Whether the account's allowance reset phase is established",
};

/** The evidence ledger's own labels, keyed by the engine's dimension ids. */
const EVIDENCE_LABELS: Record<ProjectedEvidenceRowV1["id"], string> = {
  modelResolution: "Model identity",
  usageCategories: "Usage categories",
  pricing: "Pricing records",
  rules: "Target rules",
  temporal: "Temporal coverage",
  translationMethod: "Translation method",
  resetPhase: "Reset phase",
};

/**
 * The replay mode states one thing: whether a cross-model substitution was
 * applied. It is never a completeness claim, and the copy says so (decision 38).
 */
export function replayModeNote(mode: ReplayModeV1 | undefined): string {
  if (mode === undefined)
    return "This result carries no replay semantics, so whether a cross-model substitution was applied, and how identity and usage resolved, are not established.";
  return mode === "translated"
    ? "Demand recorded against one model was replayed against a substitute under an explicit scenario assumption. That is a counterfactual, not a measurement, and it says nothing about equal capability or equal token consumption."
    : "No cross-model substitution was applied. Whether every named model is served, and how much demand stayed undecided, is reported under outcomes and evidence.";
}

/** Replayability classifies target mechanics, never model equivalence (decision 39). */
export function replayabilityNote(replayabilityClass: ReplayabilityClassV1 | undefined): string {
  switch (replayabilityClass) {
    case undefined:
      return "This result carries no replayability class, so how far the target's mechanics were simulated is not established.";
    case "deterministic":
      return "Numeric rules and complete workload quantities permit direct simulation, and no recorded demand was left undecided.";
    case "bounded":
      return "Simulation was possible, but at least one input supports a range or part of the demand could not be evaluated at all.";
    default:
      return "The target states its limits qualitatively, or its numeric rules do not apply to this workload, so no numeric fit was simulated.";
  }
}

/**
 * Outcome rows, in the target's own vocabulary. A Direct API target has no
 * allowance to exceed and no request to refuse, so its overage and blocked rows
 * say that rather than reusing a plan's wording beside a zero (decision 44).
 */
export const SUBSCRIPTION_OUTCOMES: readonly {
  key: ReplayDispositionKindV1;
  label: string;
  note: string;
}[] = [
  { key: "included", label: "Included", note: "within the target's allowance" },
  { key: "overage", label: "Overage", note: "served, billed above allowance" },
  { key: "blocked", label: "Blocked", note: "rejected or deferred by the rules" },
  {
    key: "unavailable",
    label: "Unavailable",
    note: "effective model not served by the target",
  },
  { key: "unknown", label: "Unknown", note: "evidence insufficient to decide" },
];

export const API_OUTCOMES: readonly {
  key: ReplayDispositionKindV1;
  label: string;
  note: string;
}[] = [
  {
    key: "included",
    label: "Served",
    note: "the provider serves the model this demand used",
  },
  {
    key: "overage",
    label: "Overage",
    note: "not applicable: a Direct API target has no allowance to exceed",
  },
  {
    key: "blocked",
    label: "Blocked",
    note: "not applicable: a Direct API target rejects nothing at the allowance level",
  },
  {
    key: "unavailable",
    label: "Unavailable",
    note: "the selected provider is not recorded as offering the model",
  },
  { key: "unknown", label: "Unknown", note: "evidence insufficient to decide" },
];

function sumDefined(values: readonly (number | undefined)[]): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

/**
 * The sum of the values that are established, or absent when none of them is.
 * `sumDefined` answers "what do the established buckets add up to"; this answers
 * "is there anything to add up", which is the difference between an unknown
 * total and a total of zero.
 */
function establishedSum(values: readonly (number | undefined)[]): number | undefined {
  return values.some((value) => value !== undefined) ? sumDefined(values) : undefined;
}

/**
 * Which target stack a result carries. The stacks are role-specific objects
 * rather than a tagged union, so the discriminator is the presence of the
 * subscription's own fields: a plan version, a pinned overage behaviour and a
 * reset assumption. An API stack pins none of them, by construction.
 */
function isApiTargetStack(stack: {
  providerId: string;
  planId?: string;
  planVersionId?: string;
}): stack is ApiReplayTargetStackV1 {
  return stack.planId === undefined && stack.planVersionId === undefined;
}

/** The calendar date of an instant: in `timeZone` when given, otherwise UTC. */
function calendarDate(instant: string, timeZone: string | undefined): string | undefined {
  if (timeZone === undefined) return instant.slice(0, 10);
  try {
    return Temporal.Instant.from(instant).toZonedDateTimeISO(timeZone).toPlainDate().toString();
  } catch {
    return undefined;
  }
}

function dayCount(
  from: string | undefined,
  to: string | undefined,
  timeZone: string | undefined,
): number | undefined {
  if (from === undefined || to === undefined) return undefined;
  const first = calendarDate(from, timeZone);
  const last = calendarDate(to, timeZone);
  if (first === undefined || last === undefined) return undefined;
  const start = Date.parse(`${first}T00:00:00.000Z`);
  const end = Date.parse(`${last}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function coverageDimension(
  id: ProjectedDimensionV1["id"],
  label: string,
  dimension: CoverageDimensionV1,
): ProjectedDimensionV1 {
  return {
    id,
    label,
    note: DIMENSION_NOTES[id],
    status: dimension.status,
    percent: dimension.percent,
    covered: dimension.covered,
    total: dimension.total,
    unknownCount: dimension.unknownCount,
    reason: dimension.reason,
  };
}

function headlineStatement(
  dimension: ProjectedDimensionV1 | undefined,
  outcomes: readonly ProjectedOutcomeV1[],
  crossings: number,
  modelMatchQualitative: boolean,
): string {
  const countOf = (key: ProjectedOutcomeV1["key"]): number | undefined =>
    outcomes.find((outcome) => outcome.key === key)?.count;
  const parts: string[] = [];
  if (dimension === undefined || dimension.status === "unknown") {
    const knownUnserved = (countOf("blocked") ?? 0) + (countOf("unavailable") ?? 0);
    parts.push(
      knownUnserved > 0
        ? "Full request coverage is ruled out by known unserved demand; the exact share remains unknown."
        : modelMatchQualitative
          ? "All observed models are supported. Request capacity remains unknown because the target publishes no numeric allowance to simulate."
          : "Request coverage is unknown: the replay could not decide every event.",
    );
  } else if (dimension.covered === undefined || dimension.total === undefined) {
    // A count the engine did not establish is not a zero: "0 of 0 fit" would be
    // a claim about the workload rather than a statement about what is known.
    parts.push(
      `Request coverage is ${dimension.status}: this result does not report how many modeled requests were served.`,
    );
  } else {
    const share = dimension.percent === undefined ? "" : ` (${formatPercent(dimension.percent)})`;
    parts.push(
      `${dimension.covered.toLocaleString("en-US")} of ${dimension.total.toLocaleString("en-US")} modeled requests were served${share}.`,
    );
  }
  const blocked = countOf("blocked");
  const overage = countOf("overage");
  const unavailable = countOf("unavailable");
  const unknown = countOf("unknown");
  // A count the result does not carry is left out of the sentence rather than
  // stated as a zero: "0 blocked" is a claim, and this result makes none.
  const segments: string[] = [];
  if (blocked !== undefined && blocked > 0)
    segments.push(`${blocked.toLocaleString("en-US")} blocked`);
  if (overage !== undefined && overage > 0)
    segments.push(`${overage.toLocaleString("en-US")} billed above allowance`);
  if (segments.length > 0) {
    parts.push(
      `${segments.join(" and ")}${crossings > 0 ? ` across ${crossings} crossing window${crossings === 1 ? "" : "s"}` : ""}.`,
    );
  }
  if (unavailable !== undefined && unavailable > 0)
    parts.push(`${unavailable.toLocaleString("en-US")} on models the target does not serve.`);
  if (unknown !== undefined && unknown > 0)
    parts.push(`${unknown.toLocaleString("en-US")} left undecided by the evidence.`);
  return parts.join(" ");
}

function formatPercent(percent: number | undefined): string {
  if (percent === undefined) return "unknown";
  if (percent === 100) return "100%";
  if (percent === 0) return "0%";
  return `${percent.toFixed(1)}%`;
}

function evidenceReading(dimension: {
  status: string;
  events?: { covered: number; total: number } | undefined;
  tokens?: { covered: number; total: number } | undefined;
  reason?: string | undefined;
}): string {
  if (dimension.status === "not_applicable") return dimension.reason ?? "Not applicable";
  const fractions: string[] = [];
  if (dimension.events !== undefined)
    fractions.push(
      `${dimension.events.covered.toLocaleString("en-US")} of ${dimension.events.total.toLocaleString("en-US")} events`,
    );
  if (dimension.tokens !== undefined)
    fractions.push(
      `${dimension.tokens.covered.toLocaleString("en-US")} of ${dimension.tokens.total.toLocaleString("en-US")} tokens`,
    );
  return fractions.length === 0 ? "No denominator" : fractions.join(" · ");
}

/**
 * What the engine established about consumption, read from its own
 * usage-categories evidence.
 *
 * Consumption completeness is a question about token accounting, and the
 * engine answers it dimension by dimension. Constraint indeterminacy is a
 * different question with a different denominator (and a Direct API target
 * declares no constraints at all), so it is never used as a proxy for this one.
 * The indeterminate count is the engine's own denominator arithmetic and is
 * absent when the engine reports no event counts, because a count nobody
 * established is not zero.
 */
function usageAccounting(evidence: ReplayEvidenceV1 | undefined): {
  status: "complete" | "partial" | "not_applicable" | undefined;
  indeterminateEvents: number | undefined;
  reason: string | undefined;
} {
  const usage = evidence?.usageCategories;
  if (usage === undefined) {
    return { status: undefined, indeterminateEvents: undefined, reason: undefined };
  }
  const counts = usage.events;
  return {
    status: usage.status,
    indeterminateEvents:
      usage.status === "complete"
        ? 0
        : counts === undefined
          ? undefined
          : Math.max(0, counts.total - counts.covered),
    reason: usage.reason,
  };
}

/** The consumption side of the cost, in the one sentence every surface prints. */
function consumptionReading(accounting: {
  status: "complete" | "partial" | "not_applicable" | undefined;
  indeterminateEvents: number | undefined;
}): string {
  if (accounting.status === "complete") {
    return "every event reports every canonical token category, so consumption is established for this workload";
  }
  if (accounting.status === undefined) {
    return "this result carries no usage evidence, so whether consumption is established is not recorded";
  }
  if (accounting.status === "not_applicable") {
    return "this result states that token accounting does not apply here, so consumption is not established for it";
  }
  const count = accounting.indeterminateEvents;
  return count === undefined
    ? "the engine did not report how many events lack complete token accounting, so any part of this cost that depends on consumption is not established"
    : `${count.toLocaleString("en-US")} event(s) report no complete token accounting, so any part of this cost that depends on consumption is not established`;
}

/**
 * Projects a replay result into the display contract.
 *
 * `catalog` supplies naming and nothing else: the projection cannot add a fact
 * the result does not have, and it cannot remove one either. Every numeric field
 * here comes from the result or from the engine's own semantics block, and where
 * the result carries no answer the field is absent rather than convenient.
 */
export interface ProjectReplayOptionsV1 {
  /**
   * The viewer's IANA time zone. A user-facing day is a calendar day there
   * (decision 57); without one, the projection counts UTC days.
   */
  timeZone?: string | undefined;
}

export function projectReplay(
  result: ExecutionReplayResultV1,
  catalog: ProjectionCatalogV1,
  options: ProjectReplayOptionsV1 = {},
): ProjectedReplayV1 {
  const semantics = result.semantics;
  const stack = semantics?.targetStack;
  const apiStack: ApiReplayTargetStackV1 | undefined =
    stack !== undefined && isApiTargetStack(stack) ? stack : undefined;
  const planStack: SubscriptionReplayTargetStackV1 | undefined =
    stack !== undefined && !isApiTargetStack(stack) ? stack : undefined;
  const subscription = result.subscription;
  const providerId =
    apiStack?.providerId ?? subscription?.providerId ?? planStack?.providerId ?? "unknown";

  const target: ProjectedTargetV1 = {
    type: result.target.type,
    kind: result.target.type === "api" ? "api" : "subscription",
    label:
      result.target.type === "api"
        ? `${catalog.providers[providerId]?.name ?? providerId} Direct API`
        : (subscription?.name ?? planStack?.planId ?? "Subscription"),
    providerId,
    providerName: catalog.providers[providerId]?.name ?? providerId,
    planId: subscription?.planId ?? planStack?.planId,
    planVersionId: subscription?.planVersionId ?? planStack?.planVersionId,
    priceAmount: subscription?.price.amount,
    priceInterval: subscription?.interval,
    overageMode: planStack?.overageMode,
    referenceLabel: result.target.type === "api" ? "Direct API provider" : "Plan version",
    reference: result.versions.targetReference,
  };

  const totals = result.workload.tokenTotals;
  const bucketValues = [
    totals.inputTokens,
    totals.cacheReadTokens,
    totals.cacheWriteTokens,
    totals.outputTokens,
    totals.reasoningTokens,
  ];
  // "Every canonical bucket is established" is the engine's own question, so the
  // answer is quoted from its usage-categories evidence rather than re-derived
  // from totals that may present an absent quantity as part of a sum. A result
  // with no semantics block carries no answer, and the flag is then absent.
  const accounting = usageAccounting(semantics?.evidence);
  // `not_applicable` is a statement the engine made, and it is not "complete":
  // the flag is false rather than absent, while a result that carries no usage
  // evidence at all leaves it absent.
  const complete = accounting.status === undefined ? undefined : accounting.status === "complete";
  const mix = semantics?.modelMix;
  const modelShare = (mix?.models ?? []).map((entry) => ({
    modelId: entry.modelId,
    eventCount: entry.eventCount,
    tokenCount: entry.tokenCount,
  }));

  const workload: ProjectedWorkloadV1 = {
    eventCount: result.workload.eventCount,
    sessionCount: result.workload.sessionCount,
    modelCount: result.workload.modelCount,
    resolvedModelCount: mix === undefined ? undefined : mix.models.length,
    unresolvedIdCount: result.unsupportedModels.filter((entry) => entry.reason === "unresolved")
      .length,
    from: result.workload.from,
    to: result.workload.to,
    windowDays: dayCount(result.workload.from, result.workload.to, options.timeZone),
    tokens: {
      uncachedInput: totals.inputTokens,
      cacheRead: totals.cacheReadTokens,
      cacheWrite: totals.cacheWriteTokens,
      output: totals.outputTokens,
      reasoning: totals.reasoningTokens,
    },
    knownTokens: establishedSum(bucketValues),
    complete,
    modelShare,
    // Absent when the result carries no model mix: a missing count is not zero,
    // and "no unresolved identifiers" is a claim this projection may not make
    // on a result that never counted them.
    unresolvedEventCount: mix?.unresolvedEventCount,
    observedModels: result.unsupportedModels.map((entry) => entry.rawName),
  };

  const outcomes = (result.target.type === "api" ? API_OUTCOMES : SUBSCRIPTION_OUTCOMES).map(
    (row) => ({
      key: row.key,
      label: row.label,
      note: row.note,
      count: semantics?.dispositions[row.key],
    }),
  );

  const constraintById = new Map(
    result.constraints.map((constraint) => [constraint.id, constraint]),
  );
  const crossings: ProjectedCrossingV1[] = result.violations.map((violation, index) => {
    const constraint = constraintById.get(violation.constraintId);
    return {
      id: `${violation.constraintId}-${violation.startedAt}`,
      index: index + 1,
      constraintId: violation.constraintId,
      constraintLabel: constraint?.label ?? violation.constraintId,
      exceed: constraint?.exceed,
      unit: violation.unit,
      window: constraint?.window.description ?? violation.type,
      kind: violation.type,
      startedAt: violation.startedAt,
      endedAt: violation.endedAt,
      observedUnits: violation.requiredUnits,
      includedUnits: violation.availableUnits,
      excessUnits: violation.overageUnits,
      affectedEvents: violation.affectedEvents,
      acceptedUnits: violation.acceptedUnits,
      exceededAt: violation.exceededAt,
    };
  });

  const constraints: ProjectedConstraintV1[] = result.constraints.map((constraint) => ({
    id: constraint.id,
    label: constraint.label,
    status: constraint.status,
    exceed: constraint.exceed,
    unit: constraint.unit,
    window: constraint.window.description,
    limitUnits: constraint.limitUnits,
    consumedUnits: constraint.consumedUnits,
    attemptedUnits: constraint.attemptedUnits,
    violationCount: constraint.violationCount,
    rejectedEvents: constraint.rejectedEvents,
    indeterminateEvents: constraint.indeterminateEvents,
    eligibleEvents: constraint.eligibleEvents,
    overageUnits: constraint.overageUnits,
    overageCost: constraint.overageCost?.amount,
  }));

  const evidence = semantics === undefined ? [] : evidenceRows(semantics.evidence);

  const dimensions = [
    coverageDimension("requests", "Request coverage", result.coverage.requests),
    coverageDimension("usage", "Usage coverage", result.coverage.usage),
    coverageDimension("models", "Model coverage", result.coverage.models),
  ] as const;
  const requests = dimensions[0];

  const pricing: ProjectedPriceabilityV1 | undefined =
    result.target.type === "api" ? projectPricing(result) : undefined;

  const money = result.economics;
  /**
   * Consumption is established from the engine's usage/accounting evidence, and
   * a metered total additionally needs the engine's pricing evidence to cover
   * the demand: a list-price total over priced events only is not a total for
   * the workload. Both are engine readings; neither is inferred from the other.
   */
  const consumptionEstablished = accounting.status === "complete";
  const pricingComplete = pricing === undefined || pricing.status === "complete";
  /**
   * What the engine's money depends on. A subscription's plan price is fixed, so
   * it is established as soon as the engine reports it, however much demand
   * stayed undecided. A metered total (overage above an allowance, or a Direct
   * API's list price across the workload) is established only when every event
   * could be evaluated and priced; otherwise the engine has established no total
   * for this workload, and saying so is the whole answer.
   */
  const targetCostEstablished =
    money !== undefined &&
    (money.costBasis === "fixed_plan_price" ? true : consumptionEstablished && pricingComplete);

  const economics: ProjectedEconomicsV1 = {
    basePlanCost: money?.basePlanCost?.amount,
    overageCost: money?.overageCost?.amount,
    // The engine's total is only reported as this workload's cost when it is
    // established for the workload. A figure covering part of the demand is not
    // published here under the workload's name.
    targetCost: targetCostEstablished ? money?.targetCost.amount : undefined,
    targetCostEstablished,
    consumptionEstablished,
    costReading: !targetCostEstablished
      ? "not determinable: the engine did not establish a total for this workload"
      : money?.costBasis === "fixed_plan_price"
        ? "the plan price is fixed, so it holds however much of the demand stayed undecided"
        : "established for this workload",
    // The basis follows the target, not a default: a metered target whose cost
    // is not established must never be labelled with a plan price, and a plan
    // without a reported cost must never be labelled as list pricing.
    costBasis:
      money?.costBasis ?? (result.target.type === "api" ? "api_list_price" : "fixed_plan_price"),
    apiListPriceEquivalent: money?.apiListPriceEquivalent?.amount,
    baselineCost: money?.baselineCost?.amount,
    costDifference: money?.costDifference?.amount,
    ratios: money?.ratios ?? [],
    indeterminateConsumptionEvents: accounting.indeterminateEvents,
    consumptionReading: consumptionReading(accounting),
    reason: targetCostEstablished
      ? undefined
      : money === undefined
        ? (result.warnings.find((warning) => warning.code === "API_COST_INCOMPLETE")?.message ??
          result.warnings.find((warning) => warning.code === "ECONOMICS_UNKNOWN")?.message ??
          "The engine did not report a cost for this target.")
        : (accounting.reason ??
          pricing?.reason ??
          "The engine reported a cost that does not cover this workload, so no total is established for it."),
  };

  const knownUnserved = outcomes.some(
    (outcome) =>
      (outcome.key === "blocked" || outcome.key === "unavailable") && (outcome.count ?? 0) > 0,
  );
  const modelMatchQualitative =
    result.feasibility.status === "unknown" &&
    !knownUnserved &&
    result.coverage.models.status === "known" &&
    result.coverage.models.percent === 100 &&
    semantics?.replayability.class === "qualitative";

  return {
    target,
    workload,
    mode: semantics?.mode,
    modeNote: replayModeNote(semantics?.mode),
    translation:
      semantics?.translation === undefined
        ? undefined
        : {
            policyId: semantics.targetStack.modelTranslation?.id ?? "unnamed-policy",
            policyVersion: semantics.targetStack.modelTranslation?.version ?? "unversioned",
            method: semantics.evidence.translationMethod.method,
            substitutedEvents: semantics.translation.substitutedEvents,
            applied: semantics.translation.applied,
          },
    replayability: {
      class: semantics?.replayability.class,
      classNote: replayabilityNote(semantics?.replayability.class),
      reasons: semantics?.replayability.reasons ?? [],
    },
    headline: {
      dimension: "requests",
      percent: requests.percent,
      statement: headlineStatement(requests, outcomes, crossings.length, modelMatchQualitative),
      status: result.feasibility.status,
      statusLabel:
        result.feasibility.status === "unknown" && knownUnserved
          ? "Not fully served"
          : modelMatchQualitative
            ? "Models supported; capacity unknown"
            : FEASIBILITY_LABELS[result.feasibility.status],
    },
    dimensions,
    outcomes,
    models: projectModelResolutions(result),
    constraints,
    crossings,
    evidence,
    evidenceEstablished: semantics !== undefined,
    economics,
    pricing,
    provenance: {
      planVersion: planStack?.planVersionId ?? subscription?.planVersionId,
      apiProvider: apiStack?.providerId,
      rulesAsOf: result.versions.rulesAsOf,
      catalogVersion: result.versions.catalog,
      engineVersion: result.versions.engine,
      methodologyVersion: result.versions.methodology,
      translationPolicy: result.versions.translationPolicy,
      resetPhase: resetReading(planStack, semantics?.evidence),
      workloadScope:
        semantics?.workloadScope.statement ?? "This result does not state its workload scope.",
      // No semantics, no scope: a result that never stated its scope is not
      // relabelled with the scope a demo import happens to use.
      workloadScopeKind: semantics?.workloadScope.kind,
      // A Direct API target has no plan id, so the provider id is what places it
      // in the synthetic namespace. The rule itself is the shared one, so a
      // direct target cannot be labelled differently from a plan on the same
      // synthetic provider.
      syntheticTarget:
        (target.planId !== undefined && isSyntheticCatalogId(target.planId)) ||
        isSyntheticCatalogId(providerId),
    },
    warnings: result.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      count: warning.eventCount,
    })),
    assumptions: result.assumptions.map((assumption) => assumption.description),
  };
}

function resetReading(
  planStack: SubscriptionReplayTargetStackV1 | undefined,
  evidence: ReplayEvidenceV1 | undefined,
): string {
  if (planStack === undefined) {
    return evidence?.resetPhase.status === "not_applicable"
      ? (evidence.resetPhase.reason ?? "Not applicable to this target")
      : "Not established";
  }
  const reset = planStack.reset;
  if (reset.kind === "rolling") return "Rolling windows, anchored at first use";
  if (reset.kind === "fixed-known") return `Fixed window, ${reset.phase}`;
  if (reset.kind === "fixed-unknown")
    return evidence?.resetPhase.reason === undefined
      ? "Not established: the reset behaviour is unknown"
      : `Not established: ${evidence.resetPhase.reason}`;
  return "No numeric allowance window";
}

function evidenceRows(evidence: ReplayEvidenceV1): ProjectedEvidenceRowV1[] {
  const rows: ProjectedEvidenceRowV1[] = [];
  for (const key of [
    "modelResolution",
    "usageCategories",
    "pricing",
    "rules",
    "temporal",
  ] as const) {
    const dimension = evidence[key];
    rows.push({
      id: key,
      label: EVIDENCE_LABELS[key],
      note: EVIDENCE_NOTES[key],
      status: dimension.status,
      reading: evidenceReading(dimension),
      reason: dimension.reason,
    });
  }
  rows.push({
    id: "translationMethod",
    label: "Translation method",
    note: EVIDENCE_NOTES.translationMethod,
    status: evidence.translationMethod.method === "none" ? "not_applicable" : "complete",
    reading:
      evidence.translationMethod.method === "none"
        ? "None applied"
        : `${evidence.translationMethod.method}${evidence.translationMethod.policyId === undefined ? "" : ` · ${evidence.translationMethod.policyId}`}`,
    reason: undefined,
  });
  rows.push({
    id: "resetPhase",
    label: "Reset phase",
    note: EVIDENCE_NOTES.resetPhase,
    status:
      evidence.resetPhase.status === "established"
        ? "complete"
        : evidence.resetPhase.status === "not_applicable"
          ? "not_applicable"
          : "partial",
    reading:
      evidence.resetPhase.status === "established"
        ? "Established"
        : evidence.resetPhase.status === "not_applicable"
          ? "Not applicable"
          : "Not established",
    reason: evidence.resetPhase.reason,
  });
  return rows;
}

function projectModelResolutions(result: ExecutionReplayResultV1): ProjectedModelResolutionV1[] {
  const rows: ProjectedModelResolutionV1[] = [];
  // The engine records a raw spelling only for the identities it could not
  // resolve. A resolved model is known by its catalog id, and the catalog's own
  // alias list is not a record of what the source wrote, so it is never
  // presented as one.
  for (const entry of result.semantics?.modelMix.models ?? []) {
    rows.push({
      observed: undefined,
      canonicalId: entry.modelId,
      resolutionKind: entry.resolutionKind,
      unresolved: false,
    });
  }
  for (const entry of result.unsupportedModels) {
    if (entry.reason !== "unresolved") continue;
    rows.push({
      observed: entry.rawName,
      canonicalId: entry.canonicalId,
      resolutionKind: "unresolved",
      unresolved: true,
    });
  }
  return rows;
}

/**
 * What the engine established about pricing a Direct API target, quoted rather
 * than recomputed. The projection deliberately does not resolve rates, apply
 * them to token buckets or derive a price gap: that would be a second pricing
 * engine beside the one that produced the result, and the two could disagree
 * about the same workload (decisions 35, 44).
 */
function projectPricing(result: ExecutionReplayResultV1): ProjectedPriceabilityV1 {
  const evidence = result.semantics?.evidence.pricing;
  const totals = result.workload.tokenTotals;
  const tokenFor: Record<ProjectedPricingCategoryV1["key"], number | undefined> = {
    uncachedInput: totals.inputTokens,
    cacheRead: totals.cacheReadTokens,
    cacheWrite: totals.cacheWriteTokens,
    output: totals.outputTokens,
    reasoning: totals.reasoningTokens,
  };

  const categories: ProjectedPricingCategoryV1[] = [];
  for (const key of CATEGORY_ORDER) {
    const tokens = tokenFor[key];
    if (tokens === undefined || tokens === 0) continue;
    categories.push({ key, label: CATEGORY_LABELS[key], tokens });
  }

  const priced = evidence?.events?.covered;
  const total = evidence?.events?.total;

  return {
    servedEvents: result.semantics?.dispositions.included,
    pricedEvents: priced,
    unpricedEvents: priced === undefined || total === undefined ? undefined : total - priced,
    status: evidence?.status,
    reason: evidence?.reason,
    categories,
  };
}

/** Number of crossing windows, for surfaces that only need the count. */
export function crossingCount(projection: ProjectedReplayV1): number {
  return projection.crossings.length;
}

/**
 * The disposition count for one key, never synthesised: absent when the result
 * carries no dispositions at all.
 */
export function dispositionCount(
  projection: ProjectedReplayV1,
  key: ReplayDispositionKindV1,
): number | undefined {
  return projection.outcomes.find((outcome) => outcome.key === key)?.count;
}
