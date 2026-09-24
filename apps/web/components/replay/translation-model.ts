import {
  type BundledTargetModel,
  bundledApiProviderModels,
  bundledPlanModelsAt,
  loadBundledCatalog,
} from "@stackreplay/catalog/bundled";
import type { ModelTranslationPolicyV1 } from "@stackreplay/schema";
import type { ModelSummary } from "../../lib/worker-protocol";

/**
 * Translation scenario model: the pure part of Translated Replay, kept apart
 * from the editor so it can be tested without a DOM. See `translation.tsx`.
 */

export interface SourceModel {
  /** Canonical catalog model id: aliases of one model are one row. */
  modelId: string;
  name: string;
  events: number;
  observedNames: string[];
}

export interface WorkloadModels {
  sources: SourceModel[];
  unresolved: { rawName: string; events: number }[];
}

/** Groups observed identifiers by the canonical model they resolved to. */
export function workloadModels(models: readonly ModelSummary[]): WorkloadModels {
  const catalog = loadBundledCatalog();
  const sources = new Map<string, SourceModel>();
  const unresolved: WorkloadModels["unresolved"] = [];
  for (const model of models) {
    if (model.canonicalId === undefined) {
      unresolved.push({ rawName: model.rawName, events: model.events });
      continue;
    }
    const entry = sources.get(model.canonicalId) ?? {
      modelId: model.canonicalId,
      name: catalog.models[model.canonicalId]?.name ?? model.canonicalId,
      events: 0,
      observedNames: [],
    };
    entry.events += model.events;
    entry.observedNames.push(model.rawName);
    sources.set(model.canonicalId, entry);
  }
  return {
    sources: [...sources.values()].sort((a, b) => b.events - a.events),
    unresolved: unresolved.sort((a, b) => b.events - a.events),
  };
}

export type TargetSelection =
  | { kind: "subscription"; planId: string }
  | { kind: "api"; providerId: string };

/** The models a target can run at the rules date, from the same catalog facts the engine reads. */
export function targetModels(target: TargetSelection, rulesAsOf: string): BundledTargetModel[] {
  return target.kind === "subscription"
    ? (bundledPlanModelsAt(target.planId, rulesAsOf)?.models ?? [])
    : bundledApiProviderModels(target.providerId, rulesAsOf);
}

/** Which observed models the target serves as they are. */
export function compatibility(
  workload: WorkloadModels,
  available: readonly BundledTargetModel[],
): { served: SourceModel[]; unserved: SourceModel[]; unservedEvents: number } {
  const serves = new Set(available.filter((model) => model.available).map((model) => model.id));
  const served = workload.sources.filter((source) => serves.has(source.modelId));
  const unserved = workload.sources.filter((source) => !serves.has(source.modelId));
  return {
    served,
    unserved,
    unservedEvents: unserved.reduce((sum, source) => sum + source.events, 0),
  };
}

/** source model id -> substitute model id. An absent key means "no substitution". */
export type ModelMapping = Readonly<Record<string, string>>;

/**
 * The policy the engine replays. Provenance is `user` and the transform is
 * token-preserving, the only transform the engine implements; both are
 * restated in the result. Same-model rows are identity, not translation, and
 * are left out.
 */
export function translationPolicy(mapping: ModelMapping): ModelTranslationPolicyV1 | undefined {
  const rules = Object.entries(mapping)
    .filter(([source, target]) => target.length > 0 && target !== source)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([sourceModelId, targetModelId]) => ({ sourceModelId, targetModelId }));
  if (rules.length === 0) return undefined;
  return {
    id: "user-model-substitution",
    version: "1",
    name: "Model substitution chosen in this browser",
    provenance: "user",
    transform: "token-preserving",
    rules,
  };
}
