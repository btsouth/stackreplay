import type {
  CoverageDimensionsV1,
  CoverageDimensionV1,
  FeasibilityV1,
  ReplayWarningV1,
  TokenTotalsV1,
  UnsupportedModelV1,
  WorkloadSummaryV1,
} from "@stackreplay/schema";
import { type Decimal, toUnitString } from "./money.js";
import { isoFromEpochMs } from "./time.js";
import type { TokenAccounting } from "./units.js";
import type { TimedEvent } from "./windows.js";

/**
 * Result-reporting primitives shared by every execution target path (M4C).
 *
 * The rules for how a dimension is shaped, how a unit is counted inside it and
 * how coverage becomes feasibility are properties of the *result contract*, not
 * of one target kind, so they live here once. What stays with each path is the
 * part that is genuinely target-specific: which counters feed a dimension, and
 * the wording that explains them to a reader.
 *
 * The one rule this module exists to keep is benchmark finding F033: every count
 * inside a dimension is in that dimension's own unit, and a count that does not
 * exist is reported as absent rather than as zero.
 */

/**
 * Collects warnings and assumptions while a path runs. Warnings are counted by
 * code (one entry per code, with an event count) and assumptions are de-duped by
 * id, because both end up as small sorted lists in the result.
 */
export class Tracker {
  readonly warnings = new Map<string, { message: string; count: number }>();
  readonly assumptions = new Map<string, string>();

  warn(code: string, message: string): void {
    const existing = this.warnings.get(code);
    if (existing === undefined) {
      this.warnings.set(code, { message, count: 1 });
    } else {
      existing.count += 1;
    }
  }

  assume(id: string, description: string): void {
    if (!this.assumptions.has(id)) this.assumptions.set(id, description);
  }
}

export function buildWarnings(tracker: Tracker): ReplayWarningV1[] {
  return [...tracker.warnings.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([code, entry]) => ({ code, message: entry.message, eventCount: entry.count }));
}

export function money(amount: Decimal, currency: "USD"): { amount: string; currency: "USD" } {
  return { amount: toUnitString(amount), currency };
}

export function roundPercent(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function knownDimension(covered: number, total: number): CoverageDimensionV1 {
  return {
    status: "known",
    percent: roundPercent(total === 0 ? 100 : (covered / total) * 100),
    covered,
    total,
  };
}

export function unknownDimension(
  reason: string,
  counts: { covered?: number; total?: number; unknownCount?: number },
): CoverageDimensionV1 {
  return {
    status: "unknown",
    reason,
    ...(counts.covered !== undefined ? { covered: counts.covered } : {}),
    ...(counts.total !== undefined ? { total: counts.total } : {}),
    ...(counts.unknownCount !== undefined ? { unknownCount: counts.unknownCount } : {}),
  };
}

/** Feasibility is a reading of request coverage and constraint status. */
export function feasibilityOf(
  coverage: CoverageDimensionsV1,
  constraints: readonly { status: string }[],
): FeasibilityV1 {
  const unknownConstraint = constraints.some((constraint) => constraint.status === "unknown");
  const requestUnknown = coverage.requests.status === "unknown";
  if (unknownConstraint || requestUnknown) {
    const reason =
      requestUnknown && coverage.requests.reason !== undefined
        ? coverage.requests.reason
        : "One or more constraints could not be evaluated from the workload data.";
    return {
      status: "unknown",
      coverageDimension: "requests",
      ...(coverage.requests.percent !== undefined
        ? { coveragePercent: coverage.requests.percent }
        : {}),
      reason,
    };
  }

  const percent = coverage.requests.percent as number;
  const status: FeasibilityV1["status"] =
    percent >= 100 ? "full" : percent === 0 ? "none" : "partial";
  return { status, coveragePercent: percent, coverageDimension: "requests" };
}

/** Per-event facts the coverage dimensions are built from. */
export interface CoverageObservation {
  /** The target serves this event's demand. */
  served: boolean;
  /** The event's admission could not be decided from the evidence. */
  undecided: boolean;
  /** Exact integer token total, present only when accounting is complete. */
  tokenCount: number | undefined;
  /** Identity the target's own rules are evaluated against. */
  modelKey: string;
  /** Whether the target supports that model at all. */
  modelSupported: boolean;
  /** How well the observation's identity was established. */
  modelQuality: "exact" | "mapped" | "unknown";
}

/**
 * Builds the three coverage dimensions in one pass over a workload.
 *
 * `numericMechanics` is false only when the target publishes no numeric rule to
 * simulate: a qualitative target cannot support a numeric fit percentage, so
 * reporting 100% would manufacture precision the evidence does not contain (M4B,
 * and the spirit of decision 16). The qualitative warning itself belongs to the
 * caller, which knows whether the workload or the target caused it.
 */
export class CoverageBuilder {
  private events = 0;
  private served = 0;
  private undecided = 0;
  private knownTokens = 0;
  private servedKnownTokens = 0;
  private unknownTokenEvents = 0;
  private readonly usedModels = new Map<string, boolean>();
  /** Models with at least one event whose resolution quality is unknown. */
  private readonly unresolvedModelKeys = new Set<string>();
  private unresolvedModelEvents = 0;

  observe(observation: CoverageObservation): void {
    const { served, undecided, tokenCount, modelKey, modelSupported, modelQuality } = observation;
    this.events += 1;
    if (served) this.served += 1;
    if (undecided) this.undecided += 1;

    if (tokenCount !== undefined) {
      this.knownTokens += tokenCount;
      if (served) this.servedKnownTokens += tokenCount;
    } else {
      this.unknownTokenEvents += 1;
    }

    // This dimension counts the models the target itself would run, so a
    // translated event is counted under its substitute: the source mix stays
    // visible separately in the result's model mix.
    this.usedModels.set(modelKey, modelSupported);
    if (modelQuality === "unknown") {
      this.unresolvedModelKeys.add(modelKey);
      this.unresolvedModelEvents += 1;
    }
  }

  build(input: {
    numericMechanics: boolean;
    qualitativeReason: string;
    /** Reason for undecided events, when any exist. */
    undecidedReason: (count: number) => string;
  }): CoverageDimensionsV1 {
    const requests = !input.numericMechanics
      ? unknownDimension(input.qualitativeReason, { covered: this.served, total: this.events })
      : this.undecided > 0
        ? unknownDimension(input.undecidedReason(this.undecided), {
            covered: this.served,
            total: this.events,
            unknownCount: this.undecided,
          })
        : knownDimension(this.served, this.events);

    /**
     * Every count inside a dimension is in that dimension's own unit (benchmark
     * finding F033). For usage that unit is tokens, and the tokens of an event
     * that reports no total cannot be counted at all, so this dimension states
     * the event-level detail in its reason and emits no count in the wrong unit.
     */
    const usage =
      this.unknownTokenEvents > 0
        ? unknownDimension(
            `${this.unknownTokenEvents} event(s) do not report every canonical token category, so no non-overlapping token denominator exists`,
            { covered: this.servedKnownTokens, total: this.knownTokens },
          )
        : knownDimension(this.servedKnownTokens, this.knownTokens);

    const coveredModels = [...this.usedModels.values()].filter(Boolean).length;
    // `covered`/`total` are models here, so the unknown count is models too; the
    // event-level detail belongs in the reason, not in a field that reads as a
    // model count (benchmark finding F033).
    const models =
      this.unresolvedModelEvents > 0
        ? unknownDimension(
            `${this.unresolvedModelEvents} event(s) use ${this.unresolvedModelKeys.size} model(s) that could not be resolved against the catalog`,
            {
              covered: coveredModels,
              total: this.usedModels.size,
              unknownCount: this.unresolvedModelKeys.size,
            },
          )
        : knownDimension(coveredModels, this.usedModels.size);

    return { requests, usage, models };
  }
}

/** Builds the unsupported-model list, sorted by the observed name. */
export class UnsupportedModelBuilder {
  private readonly byKey = new Map<
    string,
    { rawName: string; canonicalId?: string; count: number; reason: UnsupportedModelV1["reason"] }
  >();

  observe(entry: {
    /** The key the list groups by: observed identity, or the raw name. */
    modelKey: string;
    rawName: string;
    canonicalId?: string | undefined;
    reason: UnsupportedModelV1["reason"];
  }): void {
    const existing = this.byKey.get(entry.modelKey);
    if (existing !== undefined) {
      existing.count += 1;
      return;
    }
    this.byKey.set(entry.modelKey, {
      rawName: entry.rawName,
      ...(entry.canonicalId !== undefined ? { canonicalId: entry.canonicalId } : {}),
      count: 1,
      reason: entry.reason,
    });
  }

  build(): UnsupportedModelV1[] {
    return [...this.byKey.values()]
      .sort((a, b) => (a.rawName < b.rawName ? -1 : a.rawName > b.rawName ? 1 : 0))
      .map((entry) => ({
        rawName: entry.rawName,
        ...(entry.canonicalId !== undefined ? { canonicalId: entry.canonicalId } : {}),
        eventCount: entry.count,
        reason: entry.reason,
      }));
  }
}

/**
 * Builds the workload summary over a chronologically sorted workload.
 *
 * Totals are complete disjoint totals, never an unlabeled known subtotal: one
 * event with incomplete accounting clears every token total rather than
 * reporting a silently partial sum.
 */
export class WorkloadSummaryBuilder {
  private uncachedInput = 0;
  private cacheRead = 0;
  private cacheWrite = 0;
  private output = 0;
  private reasoning = 0;
  private hasInput = false;
  private hasOutput = false;
  private hasCacheRead = false;
  private hasCacheWrite = false;
  private hasReasoning = false;
  private anyIncompleteAccounting = false;
  private eventCount = 0;
  private first: TimedEvent | undefined;
  private last: TimedEvent | undefined;
  private readonly sessions = new Set<string>();
  private readonly models = new Set<string>();

  observe(
    timedEvent: TimedEvent,
    input: { tokens: TokenAccounting; sourceModelKey: string },
  ): void {
    const tokens = input.tokens;
    const { event } = timedEvent;
    this.eventCount += 1;
    if (this.first === undefined) this.first = timedEvent;
    this.last = timedEvent;

    if (tokens.known) {
      this.uncachedInput += tokens.buckets.uncachedInputTokens;
      this.output += tokens.buckets.outputTokens;
      this.cacheRead += tokens.buckets.cacheReadTokens;
      this.cacheWrite += tokens.buckets.cacheWriteTokens;
      this.reasoning += tokens.buckets.reasoningTokens;
      this.hasInput =
        this.hasOutput =
        this.hasCacheRead =
        this.hasCacheWrite =
        this.hasReasoning =
          true;
    } else {
      this.anyIncompleteAccounting = true;
    }

    const session = event.source.nativeSessionHash;
    if (session !== undefined) this.sessions.add(session);
    // The workload summary describes the workload as it was observed, so it
    // counts source models even when a translation substituted others (M4B).
    this.models.add(input.sourceModelKey);
  }

  build(): WorkloadSummaryV1 {
    if (this.anyIncompleteAccounting) {
      this.hasInput =
        this.hasOutput =
        this.hasCacheRead =
        this.hasCacheWrite =
        this.hasReasoning =
          false;
    }
    const tokenTotals: TokenTotalsV1 = {};
    if (this.hasCacheRead) tokenTotals.cacheReadTokens = this.cacheRead;
    if (this.hasCacheWrite) tokenTotals.cacheWriteTokens = this.cacheWrite;
    if (this.hasInput) tokenTotals.inputTokens = this.uncachedInput;
    if (this.hasOutput) tokenTotals.outputTokens = this.output;
    if (this.hasReasoning) tokenTotals.reasoningTokens = this.reasoning;

    const first = this.first;
    const last = this.last;
    return {
      eventCount: this.eventCount,
      ...(first !== undefined ? { from: isoFromEpochMs(first.atMs, first.subMs) } : {}),
      ...(last !== undefined ? { to: isoFromEpochMs(last.atMs, last.subMs) } : {}),
      modelCount: this.models.size,
      ...(this.sessions.size > 0 ? { sessionCount: this.sessions.size } : {}),
      tokenTotals,
    };
  }
}
