import type { CalendarWindowV1, LoadedPlanVersionV1 } from "@stackreplay/catalog";
import type {
  EvidenceDimensionV1,
  EvidenceFractionV1,
  ModelMixEntryV1,
  ModelResolutionKindV1,
  ReplayabilityClassV1,
  ReplayabilityReasonV1,
  ReplayabilityV1,
  ReplayDispositionsV1,
  ReplayEvidenceV1,
  ReplaySemanticsV1,
  ReplayTargetStackV1,
  ReplayTranslationV1,
  ResetAssumptionV1,
  TargetOverageModeV1,
  WorkloadScopeKindV1,
  WorkloadScopeV1,
} from "@stackreplay/schema";
import { dateRangeContains } from "./time.js";
import type { TranslationApplication, TranslationPlan } from "./translation.js";

/**
 * M4B result semantics: replay mode, target execution stack, aggregate outcome
 * dispositions, replayability and the independent evidence dimensions.
 *
 * Everything here is derived from facts the engine already established while
 * simulating; nothing is inferred from a provider's reputation, a benchmark
 * score or a model tier name. The dimensions stay separate on purpose, and
 * there is deliberately no universal confidence number: the evidence model is
 * the set of explicit dimensions, each with its own denominator.
 */

/** One historical event lands in exactly one disposition. */
export type ReplayDispositionKindV1 =
  | "included"
  | "overage"
  | "blocked"
  | "unavailable"
  | "unknown";

/**
 * Per-event facts the engine establishes while simulating. They are aggregated
 * immediately and never serialized, so a 100k-event workload still produces an
 * aggregate-only result.
 */
export interface EventSemanticsFacts {
  /** UTC calendar date of the event, for temporal coverage. */
  occurredOn: string;
  resolutionKind: ModelResolutionKindV1;
  /** Observed canonical model, present when the identity resolved. */
  sourceModelId?: string | undefined;
  /** Whether the target declares a model rule for the effective model. */
  ruleDeclared: boolean;
  /** Whether at least one numeric rule of the target applies to this event. */
  numericRuleApplies: boolean;
  tokensKnown: boolean;
  tokenCount?: number | undefined;
  /** An applicable credit-pool rule means this event's consumption is priced in money. */
  needsPrice: boolean;
  /** The event's monetary consumption was established, when it needed to be. */
  priced: boolean;
  missingPricingEntry: boolean;
  unpricedCategories: boolean;
  indeterminate: boolean;
  disposition: ReplayDispositionKindV1;
  /**
   * Direct API only: an API list-price record for this event's effective model
   * is in force at the replay's pinned instant, so the temporal contract covers
   * it. A subscription event's temporal coverage comes from the plan version's
   * own effective window, so this field stays unset there.
   */
  temporalCovered?: boolean | undefined;
  /**
   * Direct API only: the catalog does not establish whether the selected
   * provider offers this event's effective model. That is undecided demand
   * about this workload, which keeps the result out of `deterministic`.
   */
  applicabilityUnknown?: boolean | undefined;
}

/** A target that publishes no numeric limit cannot support a numeric fit claim. */
export function hasNumericLimits(planVersion: LoadedPlanVersionV1): boolean {
  return planVersion.limits.length > 0;
}

/**
 * True when the plan's own documented windows are not all of one kind. A target
 * that resets some allowances on rolling windows and others on calendar
 * boundaries has no single reset phase, so it must not be summarized as one.
 */
export function hasMixedWindowKinds(planVersion: LoadedPlanVersionV1): boolean {
  const calendar = planVersion.limits.filter((limit) => limit.window.type === "calendar").length;
  return calendar > 0 && calendar < planVersion.limits.length;
}

/**
 * Reset assumption of the target account. It is derived from the plan version's
 * own documented windows; a scenario may only declare that the phase is not
 * established, which is then carried as `fixed-unknown` rather than guessed. A
 * target that mixes rolling and calendar windows is also `fixed-unknown`: it is
 * not one known phase, and claiming the calendar part alone would silently drop
 * the rolling behaviour.
 */
export function deriveResetAssumption(
  planVersion: LoadedPlanVersionV1,
  declaredUnknown: boolean,
): ResetAssumptionV1 {
  if (declaredUnknown) return { kind: "fixed-unknown" };
  if (planVersion.limits.length === 0) return { kind: "not-applicable" };
  if (hasMixedWindowKinds(planVersion)) return { kind: "fixed-unknown" };
  const calendarWindows = planVersion.limits
    .map((limit) => limit.window)
    .filter((window): window is CalendarWindowV1 => window.type === "calendar");
  if (calendarWindows.length === 0) return { kind: "rolling" };
  const phases = [
    ...new Set(calendarWindows.map((window) => `calendar ${window.unit} (${window.timezone})`)),
  ].sort();
  return { kind: "fixed-known", phase: phases.join(", ") };
}

/**
 * What the target's rules do once included capacity is exceeded. A target whose
 * limits disagree (some bill overage, some reject or latch) has no single global
 * behaviour and reports `unknown`; the simulation itself stays per limit.
 */
export function deriveOverageMode(planVersion: LoadedPlanVersionV1): TargetOverageModeV1 {
  if (planVersion.limits.length === 0) return "unknown";
  const overage = planVersion.limits.filter((limit) => limit.exceed === "allow_overage").length;
  if (overage === 0) return "disabled";
  if (overage === planVersion.limits.length) return "enabled";
  return "unknown";
}

/**
 * Engine-authored workload-scope wording, so an imported subset can never be
 * serialized or displayed as whole-account coverage.
 */
export function workloadScopeStatement(kind: WorkloadScopeKindV1): string {
  switch (kind) {
    case "imported_workload":
      return "This replay covers the imported coding workload only: the events supplied to it, not the whole provider account. Usage outside this workload is not part of the result.";
    case "all_observed_local_adapters":
      return "This replay covers every usage source StackReplay observed on this machine. A provider account can still contain usage from other machines or surfaces that were never observed here.";
    case "provider_account_total":
      return "This replay was declared to cover the provider account's own total usage. StackReplay did not verify that the account has no other usage, so the declaration is the caller's claim.";
  }
}

interface MutableFraction {
  covered: number;
  total: number;
}

function fraction(value: MutableFraction): EvidenceFractionV1 {
  return { covered: value.covered, total: value.total };
}

function completeDimension(
  events: MutableFraction,
  tokens: MutableFraction | undefined,
): EvidenceDimensionV1 {
  return {
    status: "complete",
    events: fraction(events),
    ...(tokens !== undefined ? { tokens: fraction(tokens) } : {}),
  };
}

function partialDimension(
  events: MutableFraction,
  tokens: MutableFraction | undefined,
  reason: string,
): EvidenceDimensionV1 {
  return {
    status: "partial",
    events: fraction(events),
    ...(tokens !== undefined ? { tokens: fraction(tokens) } : {}),
    reason,
  };
}

/**
 * The target facts the M4B semantics block is derived from (M4C generalizes it).
 *
 * - `subscription`: the plan version whose rules were simulated, and the reset
 *   assumption derived from its own documented windows.
 * - `api`: the provider the demand was applied to. A Direct API target declares
 *   no allowance, so its reset assumption is `not-applicable` by construction
 *   and is carried rather than omitted: the evidence block states it.
 */
export type SemanticsTargetFactsV1 =
  | {
      kind: "subscription";
      planVersion: LoadedPlanVersionV1;
      /** Resolved reset assumption of the target account (derived, never guessed). */
      reset: ResetAssumptionV1;
    }
  | {
      kind: "api";
      providerId: string;
      /** A Direct API target establishes no allowance window at all. */
      reset: ResetAssumptionV1;
    };

export interface SemanticsInputs {
  target: SemanticsTargetFactsV1;
  catalogVersion: string;
  rulesAsOf: string;
  scopeKind: WorkloadScopeKindV1;
  translationPlan: TranslationPlan | undefined;
  /**
   * Live substitution counter. Substitution is recorded while events are
   * replayed, so the accumulator holds the application rather than a snapshot
   * taken before the clock ran.
   */
  translationApplication: TranslationApplication;
}

const CLASS_ORDER: readonly ReplayabilityClassV1[] = ["deterministic", "bounded", "qualitative"];

function weakest(a: ReplayabilityClassV1, b: ReplayabilityClassV1): ReplayabilityClassV1 {
  return CLASS_ORDER.indexOf(a) >= CLASS_ORDER.indexOf(b) ? a : b;
}

/**
 * Aggregates the M4B semantics during the simulation. Counting is incremental
 * so a large workload never materializes a per-event disposition record.
 */
export class SemanticsAccumulator {
  private readonly inputs: SemanticsInputs;
  private readonly dispositions: Record<ReplayDispositionKindV1, number> = {
    included: 0,
    overage: 0,
    blocked: 0,
    unavailable: 0,
    unknown: 0,
  };
  /** Model identity resolution, in events and in usage. */
  private readonly resolutionEvents: MutableFraction = { covered: 0, total: 0 };
  private readonly resolutionTokens: MutableFraction = { covered: 0, total: 0 };
  /** Canonical token accounting completeness. */
  private readonly accountingEvents: MutableFraction = { covered: 0, total: 0 };
  private readonly accountingTokens: MutableFraction = { covered: 0, total: 0 };
  /** Rule-set coverage of the workload, in events and in usage. */
  private readonly ruleEvents: MutableFraction = { covered: 0, total: 0 };
  private readonly ruleTokens: MutableFraction = { covered: 0, total: 0 };
  /** Temporal coverage inside the pinned rule set's effective window. */
  private readonly temporalEvents: MutableFraction = { covered: 0, total: 0 };
  private readonly temporalTokens: MutableFraction = { covered: 0, total: 0 };
  /** Demand that has to be priced in money. */
  private readonly priced: MutableFraction = { covered: 0, total: 0 };
  private readonly mix = new Map<
    string,
    Map<ModelResolutionKindV1, { entry: ModelMixEntryV1; tokensComplete: boolean }>
  >();
  private unknownConsumptionEvents = 0;
  private applicabilityUnknownEvents = 0;
  private unresolvedEventCount = 0;
  private eventsWithoutKnownTokens = 0;
  private numericRuleEvents = 0;
  private missingPricingEvents = 0;
  private unpricedCategoryEvents = 0;

  constructor(inputs: SemanticsInputs) {
    this.inputs = inputs;
  }

  /**
   * Counts one event. The caller may reuse the facts object between calls: every
   * value is copied into the aggregate here and no reference is retained, so a
   * 100k-event workload does not allocate one record per event.
   */
  observe(facts: EventSemanticsFacts): void {
    const target = this.inputs.target;
    const tokenCount = facts.tokensKnown ? (facts.tokenCount ?? 0) : undefined;
    const resolved = facts.resolutionKind !== "unresolved";

    this.dispositions[facts.disposition] += 1;

    this.resolutionEvents.total += 1;
    if (resolved) this.resolutionEvents.covered += 1;
    else this.unresolvedEventCount += 1;

    this.accountingEvents.total += 1;
    if (tokenCount === undefined) this.eventsWithoutKnownTokens += 1;
    else {
      this.accountingEvents.covered += 1;
      this.accountingTokens.covered += tokenCount;
      this.accountingTokens.total += tokenCount;
    }

    this.ruleEvents.total += 1;
    if (facts.ruleDeclared) this.ruleEvents.covered += 1;

    // A subscription event is covered when its date lies inside the plan
    // version's own effective window; a Direct API event is covered when an API
    // list-price record for its effective model is in force at the pinned
    // instant. Both answer the same question: does the pinned evidence validly
    // cover this event?
    const insideWindow =
      target.kind === "subscription"
        ? dateRangeContains(
            facts.occurredOn,
            target.planVersion.effectiveFrom,
            target.planVersion.effectiveTo,
          )
        : facts.temporalCovered === true;
    this.temporalEvents.total += 1;
    if (insideWindow) this.temporalEvents.covered += 1;

    if (tokenCount !== undefined) {
      this.resolutionTokens.total += tokenCount;
      this.ruleTokens.total += tokenCount;
      this.temporalTokens.total += tokenCount;
      if (resolved) this.resolutionTokens.covered += tokenCount;
      if (facts.ruleDeclared) this.ruleTokens.covered += tokenCount;
      if (insideWindow) this.temporalTokens.covered += tokenCount;
    }

    if (facts.needsPrice) {
      this.priced.total += 1;
      if (facts.priced) this.priced.covered += 1;
      if (facts.missingPricingEntry) this.missingPricingEvents += 1;
      if (facts.unpricedCategories) this.unpricedCategoryEvents += 1;
    }

    if (facts.indeterminate) this.unknownConsumptionEvents += 1;
    if (facts.applicabilityUnknown === true) this.applicabilityUnknownEvents += 1;
    if (facts.numericRuleApplies) this.numericRuleEvents += 1;

    const sourceModelId = facts.sourceModelId;
    if (sourceModelId !== undefined) {
      // Two map lookups instead of a per-event key string: at 100k events the
      // concatenation is measurable, and the resolution kind has few values.
      let byKind = this.mix.get(sourceModelId);
      if (byKind === undefined) {
        byKind = new Map();
        this.mix.set(sourceModelId, byKind);
      }
      const existing = byKind.get(facts.resolutionKind);
      if (existing === undefined) {
        byKind.set(facts.resolutionKind, {
          entry: {
            modelId: sourceModelId,
            resolutionKind: facts.resolutionKind,
            eventCount: 1,
            ...(tokenCount === undefined ? {} : { tokenCount }),
          },
          tokensComplete: tokenCount !== undefined,
        });
      } else {
        existing.entry.eventCount += 1;
        if (tokenCount !== undefined && existing.tokensComplete)
          existing.entry.tokenCount = (existing.entry.tokenCount ?? 0) + tokenCount;
        else {
          existing.tokensComplete = false;
          delete existing.entry.tokenCount;
        }
      }
    }
  }

  /** A token denominator exists only when every event reports a complete accounting. */
  private get tokensComplete(): boolean {
    return this.eventsWithoutKnownTokens === 0;
  }

  private evidence(): ReplayEvidenceV1 {
    const tokensComplete = this.tokensComplete;
    const usageTokens = tokensComplete ? this.accountingTokens : undefined;

    const modelResolution =
      this.resolutionEvents.covered === this.resolutionEvents.total && tokensComplete
        ? completeDimension(this.resolutionEvents, this.resolutionTokens)
        : partialDimension(
            this.resolutionEvents,
            tokensComplete ? this.resolutionTokens : undefined,
            [
              this.unresolvedEventCount > 0
                ? `${this.unresolvedEventCount} event(s) use identifiers no catalog source establishes`
                : undefined,
              !tokensComplete
                ? `${this.eventsWithoutKnownTokens} event(s) report no complete token accounting, so the usage-weighted fraction is limited to the remaining events`
                : undefined,
            ]
              .filter((part): part is string => part !== undefined)
              .join("; "),
          );

    const usageCategories = tokensComplete
      ? completeDimension(this.accountingEvents, usageTokens)
      : partialDimension(
          this.accountingEvents,
          undefined,
          `${this.eventsWithoutKnownTokens} event(s) do not report every canonical token category, so no non-overlapping token denominator exists for the whole workload`,
        );

    const pricing: EvidenceDimensionV1 =
      this.priced.total === 0
        ? {
            status: "not_applicable",
            reason:
              this.inputs.target.kind === "api"
                ? "no event's effective model is served by the selected provider, so there is no monetary denominator"
                : "the target's rules do not bill consumption above included capacity in currency, so there is no monetary denominator",
          }
        : this.priced.covered === this.priced.total
          ? completeDimension(this.priced, undefined)
          : partialDimension(this.priced, undefined, this.pricingPartialReason());

    const rules =
      this.inputs.target.kind === "api"
        ? {
            status: "not_applicable" as const,
            reason:
              "a Direct API target prices every event at its model's published API list price: there is no allowance or rule system for this dimension to cover",
          }
        : this.ruleEvents.covered === this.ruleEvents.total
          ? completeDimension(this.ruleEvents, tokensComplete ? this.ruleTokens : undefined)
          : partialDimension(
              this.ruleEvents,
              tokensComplete ? this.ruleTokens : undefined,
              `${this.ruleEvents.total - this.ruleEvents.covered} event(s) use models or identifiers the target's rules do not mention`,
            );

    const temporal =
      this.temporalEvents.covered === this.temporalEvents.total
        ? completeDimension(this.temporalEvents, tokensComplete ? this.temporalTokens : undefined)
        : partialDimension(
            this.temporalEvents,
            tokensComplete ? this.temporalTokens : undefined,
            this.temporalPartialReason(),
          );

    const reset = this.resetAssumption();
    const substituted = this.inputs.translationApplication.substitutedEvents;
    const translationPlan = this.inputs.translationPlan;
    // The transform is recorded only when it actually replayed demand: a policy
    // that matched no event is a supplied scenario, not an applied transform.
    const translationMethod: ReplayEvidenceV1["translationMethod"] =
      substituted > 0 && translationPlan !== undefined
        ? {
            method: "token-preserving",
            policyId: translationPlan.policy.id,
            policyVersion: translationPlan.policy.version,
          }
        : { method: "none" };
    return {
      modelResolution,
      usageCategories,
      pricing,
      rules,
      temporal,
      translationMethod,
      resetPhase: this.resetPhaseEvidence(reset),
    };
  }

  /**
   * How the reset phase reads for this target kind. A Direct API target has no
   * allowance window, so the dimension is not applicable by construction rather
   * than unknown by missing evidence.
   */
  private resetPhaseEvidence(reset: ResetAssumptionV1): ReplayEvidenceV1["resetPhase"] {
    const target = this.inputs.target;
    if (target.kind === "api")
      return {
        status: "not_applicable",
        reason:
          "a Direct API target has no subscription allowance window, so no reset phase can apply to it",
      };
    if (reset.kind === "fixed-unknown")
      return {
        status: "unknown",
        reason: hasMixedWindowKinds(target.planVersion)
          ? "the target's allowance windows mix rolling and calendar behaviour, so no single reset phase is established, and reset-phase sensitivity is not analysed in this milestone"
          : "the account's allowance reset phase was declared not established, and reset-phase sensitivity is not analysed in this milestone",
      };
    return reset.kind === "not-applicable"
      ? { status: "not_applicable" }
      : { status: "established" };
  }

  /**
   * Why the monetary side of the result is partial, worded for the target kind:
   * a subscription reason talks about model pricing entries and unestablished
   * categories, an API reason about the list-price records in force.
   */
  private pricingPartialReason(): string {
    const parts = [
      this.missingPricingEvents > 0
        ? this.inputs.target.kind === "api"
          ? `${this.missingPricingEvents} event(s) have no API list-price record in force for their effective model at the selected instant`
          : `${this.missingPricingEvents} event(s) use a model with no pricing entry`
        : undefined,
      this.unpricedCategoryEvents > 0
        ? `${this.unpricedCategoryEvents} event(s) consume a category the selected pricing record does not establish`
        : undefined,
    ].filter((part): part is string => part !== undefined);
    return (
      parts.join("; ") ||
      (this.inputs.target.kind === "api"
        ? "part of the applicable demand could not be converted to money with the pinned API list prices"
        : "part of the priced demand could not be converted to money")
    );
  }

  /** Why temporal coverage is partial, worded for the target kind. */
  private temporalPartialReason(): string {
    const target = this.inputs.target;
    const missing = this.temporalEvents.total - this.temporalEvents.covered;
    if (target.kind !== "subscription")
      return `${missing} event(s) use a model the selected provider offers but have no API list-price record in force for that model at the pinned instant, so the pinned pricing semantics do not cover them`;
    return `${missing} event(s) fall outside the pinned plan version's effective window (${target.planVersion.effectiveFrom} to ${target.planVersion.effectiveTo ?? "open"})`;
  }

  private resetAssumption(): ResetAssumptionV1 {
    return this.inputs.target.reset;
  }

  /**
   * The applied translation, read from the live application at the moment the
   * semantics block is built. An exact replay therefore carries no translation
   * block at all, which is what keeps a translated scenario from ever reading
   * back as exact (M4B).
   */
  private translation(): ReplayTranslationV1 | undefined {
    return this.inputs.translationApplication.finish(this.inputs.translationPlan);
  }

  /**
   * Replayability describes how deterministic the target's own mechanics and
   * the evidence behind them are. It is never a model-equivalence score, and a
   * translated scenario is not less deterministic here: translation is an
   * orthogonal assumption that keeps the public wording conditional instead.
   *
   * Demand the evidence leaves undecided also keeps the class out of
   * `deterministic`: an unresolved identifier or an unestablished quantity is
   * incomplete evidence for this workload, even though a model the target simply
   * does not serve is a determined outcome and stays compatible with a
   * deterministic reading of the target's rules.
   */
  private replayability(evidence: ReplayEvidenceV1): ReplayabilityV1 {
    const reasons: ReplayabilityReasonV1[] = [];
    let level: ReplayabilityClassV1 = "deterministic";
    const targetKind = this.inputs.target.kind;

    // A Direct API target's mechanics are its list prices, which are numeric by
    // construction, so the "no numeric rule applied" clause is a subscription
    // reading only.
    if (targetKind === "subscription" && this.numericRuleEvents === 0) {
      level = weakest(level, "qualitative");
      reasons.push({
        id: "no_numeric_rules",
        description:
          "The target states its limits qualitatively, or its numeric rules do not apply to this workload, so no numeric capacity rule could be simulated and a numerical fit would overstate the evidence.",
      });
    }
    if (this.unknownConsumptionEvents > 0) {
      level = weakest(level, "bounded");
      reasons.push({
        id: "unknown_consumption",
        description: `${this.unknownConsumptionEvents} event(s) do not establish the quantities their constraints require, so the result supports a bounded reading rather than a single exact number.`,
      });
    }
    if (this.unresolvedEventCount > 0) {
      level = weakest(level, "bounded");
      reasons.push({
        id: "unresolved_demand",
        description: `${this.unresolvedEventCount} event(s) use model identifiers no catalog source establishes, so part of the recorded demand could not be evaluated against the target's rules and the outcome is bounded rather than deterministic.`,
      });
    }
    if (this.applicabilityUnknownEvents > 0) {
      level = weakest(level, "bounded");
      reasons.push({
        id: "target_applicability_unknown",
        description: `${this.applicabilityUnknownEvents} event(s) use models whose availability on the selected provider the catalog does not establish, so whether the target serves that demand is undecided rather than determined.`,
      });
    }
    // Every undecided event keeps the class out of `deterministic`, whatever its
    // cause, so a future path to `unknown` cannot silently inherit the strongest
    // class by being left out of the two reasons above.
    const explainedUnknown =
      this.unresolvedEventCount + this.unknownConsumptionEvents + this.applicabilityUnknownEvents;
    const unexplainedUnknown = this.dispositions.unknown - explainedUnknown;
    if (this.dispositions.unknown > 0) {
      level = weakest(level, "bounded");
      if (unexplainedUnknown > 0)
        reasons.push({
          id: "unknown_demand",
          description: `${unexplainedUnknown} event(s) could not be decided from the evidence, so the outcome is bounded rather than deterministic.`,
        });
    }
    if (evidence.pricing.status === "partial") {
      level = weakest(level, "bounded");
      reasons.push({
        id: "pricing_coverage",
        description:
          "Part of the priced demand could not be converted to money, so the monetary side of the result is bounded rather than exact.",
      });
    }
    if (evidence.resetPhase.status === "unknown") {
      level = weakest(level, "bounded");
      reasons.push({
        id: "reset_phase_unknown",
        description:
          "The account's allowance reset phase is not established and reset-phase sensitivity is not analysed, so window outcomes are modelled rather than exact.",
      });
    }
    if (level === "deterministic") {
      reasons.push({
        id: "numeric_mechanics",
        description:
          targetKind === "api"
            ? "Every event's model identity, its availability on the selected provider and its recorded token quantities are established, and each event is priced from an API list-price record in force at the pinned instant."
            : "Every applicable rule is numeric, the workload's required quantities and the pricing used are established, and the reset timing follows the plan's own documented windows.",
      });
    }
    return { class: level, reasons };
  }

  private modelMix(): ReplaySemanticsV1["modelMix"] {
    const models: ModelMixEntryV1[] = [];
    for (const byKind of this.mix.values()) {
      for (const value of byKind.values()) models.push(value.entry);
    }
    models.sort((a, b) => {
      if (a.modelId !== b.modelId) return a.modelId < b.modelId ? -1 : 1;
      return a.resolutionKind < b.resolutionKind ? -1 : a.resolutionKind > b.resolutionKind ? 1 : 0;
    });
    return { models, unresolvedEventCount: this.unresolvedEventCount };
  }

  finish(): ReplaySemanticsV1 {
    const evidence = this.evidence();
    const dispositions: ReplayDispositionsV1 = {
      included: this.dispositions.included,
      overage: this.dispositions.overage,
      blocked: this.dispositions.blocked,
      unavailable: this.dispositions.unavailable,
      unknown: this.dispositions.unknown,
    };
    const translationPolicy = this.inputs.translationPlan?.policy;
    const target = this.inputs.target;
    const targetStack: ReplayTargetStackV1 =
      target.kind === "api"
        ? {
            type: "api",
            providerId: target.providerId,
            effectiveAt: this.inputs.rulesAsOf,
            catalogVersion: this.inputs.catalogVersion,
            ...(translationPolicy === undefined ? {} : { modelTranslation: translationPolicy }),
          }
        : {
            providerId: target.planVersion.providerId,
            planId: target.planVersion.planId,
            planVersionId: target.planVersion.versionId,
            effectiveAt: this.inputs.rulesAsOf,
            catalogVersion: this.inputs.catalogVersion,
            overageMode: deriveOverageMode(target.planVersion),
            reset: this.resetAssumption(),
            ...(translationPolicy === undefined ? {} : { modelTranslation: translationPolicy }),
          };
    const scope: WorkloadScopeV1 = {
      kind: this.inputs.scopeKind,
      statement: workloadScopeStatement(this.inputs.scopeKind),
    };
    const translation = this.translation();
    const substituted = translation?.substitutedEvents ?? 0;
    return {
      mode: substituted > 0 ? "translated" : "exact",
      targetStack,
      ...(translation === undefined ? {} : { translation }),
      dispositions,
      replayability: this.replayability(evidence),
      evidence,
      modelMix: this.modelMix(),
      workloadScope: scope,
    };
  }
}
