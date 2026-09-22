import { z } from "zod";
import { isoDateV1Schema } from "./scalars.js";

/**
 * M4B replay semantics: model identity versus model translation, exact versus
 * translated replay, target execution stacks, outcome dispositions,
 * replayability, evidence dimensions and workload scope.
 *
 * These types exist so a serialized Replay result cannot confuse:
 *
 * - canonical model identity (factual, declared by the catalog) with
 *   cross-model translation (an explicit counterfactual scenario assumption);
 * - the same underlying model reached through a documented alias or provider
 *   route with a *different* model substituted for a historical one;
 * - a replay whose target-rule mechanics are deterministic with a replay that
 *   may make a strong public claim (translation keeps the claim conditional);
 * - a declared evidence dimension with a synthesized universal confidence score
 *   (there is deliberately no such score here).
 *
 * Everything in this module is additive to the M1-M4A contracts: no existing
 * field changes meaning, and no persisted event format is extended.
 */

/**
 * How a raw observed model identifier was established as a canonical model.
 *
 * - `exact-id`: the identifier is the canonical id or canonical name.
 * - `documented-alias`: a declared catalog alias (the model's own provider
 *   spelling, or a harness spelling the catalog sources).
 * - `documented-route`: another provider's or router's documented route that
 *   invokes the same underlying model.
 * - `unresolved`: no declared evidence establishes the identity.
 *
 * The first three all mean "the same underlying model"; `documented-route` is
 * not a capability-equivalent substitute and never implies equivalence.
 */
export const modelResolutionKindV1Schema = z.enum([
  "exact-id",
  "documented-alias",
  "documented-route",
  "unresolved",
]);
export type ModelResolutionKindV1 = z.infer<typeof modelResolutionKindV1Schema>;

/**
 * How token quantities are carried across a translation (M4B).
 *
 * Only `token-preserving` exists: the recorded token quantities are replayed
 * against the substitute model unchanged. That is an assumption, not a
 * measurement, and results label it as one. Empirical tokenizer/output/cache
 * conversion ratios are deliberately not implemented, and no ratio may be
 * invented.
 */
export const tokenTransformV1Schema = z.literal("token-preserving");
export type TokenTransformV1 = z.infer<typeof tokenTransformV1Schema>;

/**
 * Where a translation policy came from.
 *
 * - `user`: the person running the replay supplied it.
 * - `builtin-scenario`: a bundled example/test scenario (synthetic namespaces).
 * - `evidence-backed`: reserved for a future policy whose mappings carry
 *   accepted repository provenance. Nothing in M4B sets this without evidence.
 *
 * No provenance value makes a cross-model mapping a factual equivalence.
 */
export const modelTranslationProvenanceV1Schema = z.enum([
  "user",
  "builtin-scenario",
  "evidence-backed",
]);
export type ModelTranslationProvenanceV1 = z.infer<typeof modelTranslationProvenanceV1Schema>;

/**
 * One explicit cross-model substitution: "for the purpose of this scenario,
 * treat consumption recorded against `sourceModelId` as consumption of
 * `targetModelId`". Both are canonical catalog model ids.
 */
export const modelTranslationRuleV1Schema = z
  .strictObject({
    sourceModelId: z.string().min(1),
    targetModelId: z.string().min(1),
  })
  .refine((rule) => rule.sourceModelId !== rule.targetModelId, {
    message:
      "a translation rule must substitute a different model; a same-model rule is identity, not translation",
  });
export type ModelTranslationRuleV1 = z.infer<typeof modelTranslationRuleV1Schema>;

/**
 * A translation policy is scenario data, never catalog data: it is supplied
 * with a replay (a user scenario or a synthetic fixture) and is validated
 * against the catalog rather than stored in it. No real cross-family mapping is
 * built into the catalog by M4B.
 */
export const modelTranslationPolicyV1Schema = z
  .strictObject({
    id: z.string().min(1),
    version: z.string().min(1),
    name: z.string().min(1),
    provenance: modelTranslationProvenanceV1Schema,
    transform: tokenTransformV1Schema,
    rules: z.array(modelTranslationRuleV1Schema).min(1),
  })
  .superRefine((policy, ctx) => {
    const sources = new Set<string>();
    for (const rule of policy.rules) {
      if (sources.has(rule.sourceModelId)) {
        ctx.addIssue({
          code: "custom",
          path: ["rules"],
          message: `source model "${rule.sourceModelId}" has more than one translation rule`,
        });
      }
      sources.add(rule.sourceModelId);
    }
  });
export type ModelTranslationPolicyV1 = z.infer<typeof modelTranslationPolicyV1Schema>;

/**
 * Replay mode classifies the scenario's routing assumption, never completeness:
 * `translated` means at least one explicit cross-model substitution was applied
 * to the replayed demand, `exact` means none was. Unresolved, unavailable,
 * unsupported and unknown portions stay separate dispositions and reduce claim
 * strength instead of changing the mode.
 */
export const replayModeV1Schema = z.enum(["exact", "translated"]);
export type ReplayModeV1 = z.infer<typeof replayModeV1Schema>;

/**
 * Explicit reset assumption of the target account's allowance windows.
 *
 * The engine derives `rolling` or `fixed-known` from the plan version's own
 * documented windows; a scenario may declare `fixed-unknown` when the account's
 * phase is genuinely not established, and the replay then keeps it unknown and
 * weakens its numeracy rather than guessing a phase. `not-applicable` means the
 * target establishes no numeric allowance window at all.
 */
export const resetAssumptionV1Schema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("rolling") }),
  z.strictObject({ kind: z.literal("fixed-known"), phase: z.string().min(1) }),
  z.strictObject({ kind: z.literal("fixed-unknown") }),
  z.strictObject({ kind: z.literal("not-applicable") }),
]);
export type ResetAssumptionV1 = z.infer<typeof resetAssumptionV1Schema>;

/** What a scenario may declare about reset timing. Only weakening is allowed. */
export const resetAssumptionDeclarationV1Schema = z.strictObject({
  kind: z.literal("fixed-unknown"),
});
export type ResetAssumptionDeclarationV1 = z.infer<typeof resetAssumptionDeclarationV1Schema>;

/**
 * Workload scope: what the replayed event stream actually covers.
 *
 * An imported subset is never whole-account coverage. `imported_workload` (the
 * default, and the only honest default) covers the events that were loaded;
 * `all_observed_local_adapters` means every source StackReplay observed on the
 * machine was included; `provider_account_total` requires that the stream is
 * genuinely the provider's own account total and is never inferred.
 */
export const workloadScopeKindV1Schema = z.enum([
  "imported_workload",
  "all_observed_local_adapters",
  "provider_account_total",
]);
export type WorkloadScopeKindV1 = z.infer<typeof workloadScopeKindV1Schema>;

export const workloadScopeDeclarationV1Schema = z.strictObject({
  kind: workloadScopeKindV1Schema,
});
export type WorkloadScopeDeclarationV1 = z.infer<typeof workloadScopeDeclarationV1Schema>;

export const workloadScopeV1Schema = z.strictObject({
  kind: workloadScopeKindV1Schema,
  /** Engine-authored wording, so a subset can never be described as a total. */
  statement: z.string().min(1),
});
export type WorkloadScopeV1 = z.infer<typeof workloadScopeV1Schema>;

/**
 * Aggregate outcome dispositions (decision: outcomes are not a binary
 * fit/fail). Each historical event lands in exactly one state:
 *
 * - `included`: served within the target's included allowance/pricing path.
 * - `overage`: served, but at least part of its consumption was billed as paid
 *   overage/credits under an `allow_overage` rule. Never collapsed into
 *   `blocked`.
 * - `blocked`: rejected or deferred by target rules (reject_request, latch).
 * - `unavailable`: the effective model is not served by the target. The effective
 *   model is the substitute when a translation rule applied, so this state never
 *   implies that no translation happened.
 * - `unknown`: evidence is insufficient to determine a disposition (identifiers
 *   no catalog source establishes, or quantities the target's rules cannot
 *   evaluate).
 *
 * Bounded by construction: counts are aggregates, never one record per event.
 */
export const replayDispositionsV1Schema = z.strictObject({
  included: z.number().int().nonnegative(),
  overage: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  unavailable: z.number().int().nonnegative(),
  unknown: z.number().int().nonnegative(),
});
export type ReplayDispositionsV1 = z.infer<typeof replayDispositionsV1Schema>;

/**
 * Target-rule replayability. This describes how deterministic the target's own
 * mechanics and the evidence behind them are; it is orthogonal to Replay mode,
 * and it is never a disguised model-equivalence score:
 *
 * - `deterministic`: numeric rules, complete workload quantities and complete
 *   pricing permit direct simulation of a single result, and no recorded demand
 *   was left undecided.
 * - `bounded`: simulation is possible, but at least one input supports a range
 *   rather than a single number (undecided demand, unknown consumption, an
 *   unestablished or mixed reset behaviour, incomplete pricing).
 * - `qualitative`: the target states its limits qualitatively, so a numeric fit
 *   percentage would overstate the evidence.
 *
 * Calibration against a provider's own meter or invoice is deliberately not a
 * class here: M4B has no such evidence, so a class no result could legitimately
 * carry would be a public claim waiting to be misread. A future milestone adds
 * calibration as an explicit schema and methodology change together with the
 * evidence that justifies it.
 *
 * A sourced or verified catalog entry does not by itself imply `deterministic`.
 */
export const replayabilityClassV1Schema = z.enum(["deterministic", "bounded", "qualitative"]);
export type ReplayabilityClassV1 = z.infer<typeof replayabilityClassV1Schema>;

export const replayabilityReasonV1Schema = z.strictObject({
  id: z.string().min(1),
  description: z.string().min(1),
});
export type ReplayabilityReasonV1 = z.infer<typeof replayabilityReasonV1Schema>;

export const replayabilityV1Schema = z.strictObject({
  class: replayabilityClassV1Schema,
  reasons: z.array(replayabilityReasonV1Schema),
});
export type ReplayabilityV1 = z.infer<typeof replayabilityV1Schema>;

/**
 * One coverage dimension of the M4B evidence model. Denominators are explicit
 * and are carried in the dimension's own unit; event-count coverage and
 * usage-weighted coverage are separate fractions and never interchangeable.
 *
 * - `complete`: every counted quantity is established and covered.
 * - `partial`: some quantity could not be covered, or a denominator had to
 *   exclude events whose quantities are unknown. `reason` names which.
 * - `not_applicable`: the dimension does not apply to this replay.
 */
export const evidenceFractionV1Schema = z
  .strictObject({
    covered: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  })
  .refine((fraction) => fraction.covered <= fraction.total, {
    message: "a covered quantity cannot exceed its denominator",
  });
export type EvidenceFractionV1 = z.infer<typeof evidenceFractionV1Schema>;

export const evidenceDimensionV1Schema = z
  .strictObject({
    status: z.enum(["complete", "partial", "not_applicable"]),
    /** Event-count coverage for this dimension. */
    events: evidenceFractionV1Schema.optional(),
    /** Usage-weighted coverage for this dimension, when a token denominator exists. */
    tokens: evidenceFractionV1Schema.optional(),
    reason: z.string().min(1).optional(),
  })
  .superRefine((dimension, ctx) => {
    const fractions = [dimension.events, dimension.tokens].filter(
      (fraction) => fraction !== undefined,
    );
    if (dimension.status === "not_applicable") {
      if (fractions.length > 0)
        ctx.addIssue({
          code: "custom",
          message: "a not-applicable evidence dimension carries no fractions",
        });
      if (dimension.reason === undefined)
        ctx.addIssue({
          code: "custom",
          path: ["reason"],
          message: "a not-applicable evidence dimension states why it does not apply",
        });
      return;
    }
    if (fractions.length === 0)
      ctx.addIssue({
        code: "custom",
        message: "an applicable evidence dimension carries at least one fraction",
      });
    if (dimension.status === "complete") {
      for (const fraction of fractions) {
        if (fraction !== undefined && fraction.covered !== fraction.total)
          ctx.addIssue({
            code: "custom",
            message: "a complete evidence dimension has no uncovered quantity",
          });
      }
      return;
    }
    const allFull = fractions.every((fraction) => fraction?.covered === fraction?.total);
    if (allFull && dimension.reason === undefined)
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "a partial evidence dimension explains the quantity its fractions exclude",
      });
  });
export type EvidenceDimensionV1 = z.infer<typeof evidenceDimensionV1Schema>;

/**
 * The evidence dimensions stay independent on purpose. There is deliberately no
 * single generic confidence percentage here: legacy `confidence` fields remain
 * for backward compatibility and are not the M4B evidence model.
 */
export const replayEvidenceV1Schema = z.strictObject({
  /** How much of the workload's model identity is established. */
  modelResolution: evidenceDimensionV1Schema,
  /** How much of the workload establishes every canonical token category. */
  usageCategories: evidenceDimensionV1Schema,
  /** How much of the priced demand could actually be converted to money. */
  pricing: evidenceDimensionV1Schema,
  /** How much of the workload the target's rule set describes at all. */
  rules: evidenceDimensionV1Schema,
  /** How much of the workload lies inside the pinned rule set's effective window. */
  temporal: evidenceDimensionV1Schema,
  /** The token transform applied, if any. Presence here does not make it factual. */
  translationMethod: z.strictObject({
    method: z.enum(["none", "token-preserving"]),
    policyId: z.string().min(1).optional(),
    policyVersion: z.string().min(1).optional(),
  }),
  /** Whether the account's allowance reset phase is established. */
  resetPhase: z.strictObject({
    status: z.enum(["established", "unknown", "not_applicable"]),
    reason: z.string().min(1).optional(),
  }),
});
export type ReplayEvidenceV1 = z.infer<typeof replayEvidenceV1Schema>;

/**
 * Observed model mix: aggregate per canonical model, with the resolution kind
 * that established the identity. Unresolved identifiers are counted, never
 * named here (their raw spellings stay in `unsupportedModels` at the local
 * result level and never enter a share).
 */
export const modelMixEntryV1Schema = z.strictObject({
  modelId: z.string().min(1),
  resolutionKind: modelResolutionKindV1Schema,
  eventCount: z.number().int().positive(),
  /** Disjoint token total for these events; absent when any of them is incomplete. */
  tokenCount: z.number().int().nonnegative().optional(),
});
export type ModelMixEntryV1 = z.infer<typeof modelMixEntryV1Schema>;

export const modelMixV1Schema = z.strictObject({
  models: z.array(modelMixEntryV1Schema),
  unresolvedEventCount: z.number().int().nonnegative(),
});
export type ModelMixV1 = z.infer<typeof modelMixV1Schema>;

/**
 * A target is a configured execution stack, not just a plan SKU. Only
 * dimensions this repository can actually establish appear here: the plan and
 * its provider, the pinned rule instant and catalog version, the target's
 * declared overage behavior, the reset assumption, and an optional scenario
 * translation policy. Surface ids, region taxonomies and execution-route
 * catalogs are deliberately absent.
 */
/**
 * What the target's rules do once included capacity is exceeded. `unknown` is
 * also the honest state for a target whose own limits disagree: when some rules
 * bill overage and others reject or latch, no single global behaviour exists, so
 * the aggregate state stays unknown while the simulation remains per rule.
 */
export const targetOverageModeV1Schema = z.enum(["enabled", "disabled", "unknown"]);
export type TargetOverageModeV1 = z.infer<typeof targetOverageModeV1Schema>;

export const replayTargetStackV1Schema = z.strictObject({
  providerId: z.string().min(1),
  planId: z.string().min(1),
  planVersionId: z.string().min(1),
  /** The pinned rule instant this stack's rules were resolved at. */
  effectiveAt: isoDateV1Schema,
  catalogVersion: z.string().min(1),
  /** What the target's rules do past included capacity. */
  overageMode: targetOverageModeV1Schema,
  reset: resetAssumptionV1Schema,
  /** Scenario translation policy in force for this replay, when one was supplied. */
  modelTranslation: modelTranslationPolicyV1Schema.optional(),
});
export type ReplayTargetStackV1 = z.infer<typeof replayTargetStackV1Schema>;

/** A translation rule that actually substituted at least one historical event. */
export const appliedTranslationRuleV1Schema = z.strictObject({
  sourceModelId: z.string().min(1),
  targetModelId: z.string().min(1),
  eventCount: z.number().int().positive(),
});
export type AppliedTranslationRuleV1 = z.infer<typeof appliedTranslationRuleV1Schema>;

export const replayTranslationV1Schema = z.strictObject({
  applied: z.array(appliedTranslationRuleV1Schema),
  /** Historical events whose effective target model differs from their own. */
  substitutedEvents: z.number().int().nonnegative(),
});
export type ReplayTranslationV1 = z.infer<typeof replayTranslationV1Schema>;

export const replaySemanticsV1Schema = z
  .strictObject({
    mode: replayModeV1Schema,
    targetStack: replayTargetStackV1Schema,
    /** Present exactly when the stack carries a translation policy. */
    translation: replayTranslationV1Schema.optional(),
    dispositions: replayDispositionsV1Schema,
    replayability: replayabilityV1Schema,
    evidence: replayEvidenceV1Schema,
    modelMix: modelMixV1Schema,
    workloadScope: workloadScopeV1Schema,
  })
  .superRefine((semantics, ctx) => {
    const policy = semantics.targetStack.modelTranslation;
    const translation = semantics.translation;
    if ((policy === undefined) !== (translation === undefined))
      ctx.addIssue({
        code: "custom",
        path: ["translation"],
        message: "the applied translation block matches the stack's translation policy",
      });

    if (translation !== undefined) {
      const appliedEvents = translation.applied.reduce((sum, rule) => sum + rule.eventCount, 0);
      if (translation.substitutedEvents > 0 && translation.applied.length === 0)
        ctx.addIssue({
          code: "custom",
          path: ["translation", "applied"],
          message: "a translated replay names the rule that replayed the demand",
        });
      if (translation.substitutedEvents === 0 && translation.applied.length > 0)
        ctx.addIssue({
          code: "custom",
          path: ["translation", "substitutedEvents"],
          message: "an applied rule means at least one event was replayed against the substitute",
        });
      if (appliedEvents !== translation.substitutedEvents)
        ctx.addIssue({
          code: "custom",
          path: ["translation", "substitutedEvents"],
          message: "the applied rules account for every substituted event",
        });
    }

    if (semantics.targetStack.overageMode === "disabled" && semantics.dispositions.overage > 0)
      ctx.addIssue({
        code: "custom",
        path: ["dispositions", "overage"],
        message: "a target whose rules do not allow overage cannot have billed overage",
      });

    if (semantics.mode === "translated") {
      if (translation === undefined || translation.substitutedEvents === 0)
        ctx.addIssue({
          code: "custom",
          path: ["mode"],
          message: "a translated replay substitutes at least one historical event",
        });
      if (semantics.evidence.translationMethod.method !== "token-preserving")
        ctx.addIssue({
          code: "custom",
          path: ["evidence", "translationMethod"],
          message: "a translated replay states the token transform it applied",
        });
      return;
    }

    if (translation !== undefined && translation.substitutedEvents !== 0)
      ctx.addIssue({
        code: "custom",
        path: ["mode"],
        message: "an exact replay applies no cross-model substitution",
      });
    if (semantics.evidence.translationMethod.method !== "none")
      ctx.addIssue({
        code: "custom",
        path: ["evidence", "translationMethod"],
        message: "an exact replay applies no token transform",
      });
  });
export type ReplaySemanticsV1 = z.infer<typeof replaySemanticsV1Schema>;
