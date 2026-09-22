import type { CatalogV1 } from "@stackreplay/catalog";
import type {
  AppliedTranslationRuleV1,
  ModelTranslationPolicyV1,
  ReplayTranslationV1,
} from "@stackreplay/schema";
import { ReplayEngineError } from "./errors.js";

/**
 * Cross-model translation (M4B).
 *
 * Translation is deliberately separate from model identity resolution. Identity
 * says "these two identifiers name the same underlying model" and is factual,
 * declared by the catalog. Translation says "for this scenario, treat demand
 * recorded against model A as demand on model B" and is always an assumption
 * about a counterfactual, never a claim of equivalence, equal quality or equal
 * token consumption.
 *
 * A policy is scenario input (a user scenario or a synthetic fixture), not
 * catalog data: M4B adds no real cross-family mapping to the catalog. It is
 * validated against the catalog so a rule can only name models that exist.
 *
 * The transform is token-preserving: the recorded token quantities are replayed
 * unchanged against the substitute model. That is an assumption, labeled as one
 * in the result, and no empirical conversion ratio is invented or applied.
 */

export interface TranslationPlan {
  readonly policy: ModelTranslationPolicyV1;
  /** source canonical model id -> substitute canonical model id. */
  readonly bySource: ReadonlyMap<string, string>;
}

/**
 * Validates a scenario translation policy against the catalog and prepares the
 * substitution lookup. Invalid input is rejected, never repaired: an
 * unimplementable policy is an input error, not something to interpret loosely.
 */
export function prepareTranslation(
  policy: ModelTranslationPolicyV1 | undefined,
  catalog: CatalogV1,
): TranslationPlan | undefined {
  if (policy === undefined) return undefined;
  const bySource = new Map<string, string>();
  for (const rule of policy.rules) {
    if (catalog.models[rule.sourceModelId] === undefined)
      throw new ReplayEngineError(
        "IMPORT_SCHEMA_INVALID",
        "The translation policy names a source model that is not in this catalog.",
        [`policy=${policy.id}`, `sourceModelId=${rule.sourceModelId}`],
      );
    if (catalog.models[rule.targetModelId] === undefined)
      throw new ReplayEngineError(
        "IMPORT_SCHEMA_INVALID",
        "The translation policy names a substitute model that is not in this catalog.",
        [`policy=${policy.id}`, `targetModelId=${rule.targetModelId}`],
      );
    bySource.set(rule.sourceModelId, rule.targetModelId);
  }
  return { policy, bySource };
}

/** The substitute model for an observed canonical model, when the policy says so. */
export function substituteFor(
  plan: TranslationPlan | undefined,
  sourceCanonicalModelId: string | undefined,
): string | undefined {
  if (plan === undefined || sourceCanonicalModelId === undefined) return undefined;
  return plan.bySource.get(sourceCanonicalModelId);
}

/**
 * Counts which rules actually substituted historical demand. The counts are
 * aggregates: a result never carries one translation record per event.
 */
export class TranslationApplication {
  private readonly counts = new Map<string, number>();
  private substituted = 0;

  record(sourceModelId: string): void {
    this.counts.set(sourceModelId, (this.counts.get(sourceModelId) ?? 0) + 1);
    this.substituted += 1;
  }

  get substitutedEvents(): number {
    return this.substituted;
  }

  /**
   * The applied mapping, or undefined when the policy substituted nothing. An
   * exact replay therefore carries no translation block at all, which is what
   * keeps a translated scenario from ever reading back as exact.
   */
  finish(plan: TranslationPlan | undefined): ReplayTranslationV1 | undefined {
    if (plan === undefined) return undefined;
    const applied: AppliedTranslationRuleV1[] = [];
    for (const rule of plan.policy.rules) {
      const eventCount = this.counts.get(rule.sourceModelId);
      if (eventCount === undefined || eventCount === 0) continue;
      applied.push({
        sourceModelId: rule.sourceModelId,
        targetModelId: rule.targetModelId,
        eventCount,
      });
    }
    applied.sort((a, b) =>
      a.sourceModelId < b.sourceModelId ? -1 : a.sourceModelId > b.sourceModelId ? 1 : 0,
    );
    return { applied, substitutedEvents: this.substituted };
  }
}
