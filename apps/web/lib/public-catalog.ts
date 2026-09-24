import {
  type CatalogSourceV1,
  type CatalogV1,
  familyReleaseIds,
  type LimitWindowV1,
  type LoadedPlanVersionV1,
  type ModelAliasV1,
  type ModelKindV1,
  type ModelLifecycleV1,
  type ModelRuleV1,
  modelKindOf,
  type PlanLimitV1,
  type PlanPriceV1,
  type PromotionV1,
  planVersionId,
  type QualitativeLimitV1,
  selectPlanVersionAt,
} from "@stackreplay/catalog";
import {
  BUNDLED_CATALOG_VERSION,
  directApiProviderIdsFor,
  loadBundledCatalog,
} from "@stackreplay/catalog/bundled";

/**
 * Public catalog read model (M4).
 *
 * The catalog is version-controlled product data that also contains a clearly
 * synthetic development set (the `example-` namespace) used by demo workloads,
 * tests and fixtures. Public pages must never present synthetic development data
 * as a real-world claim, so the public read model is filtered to real entries
 * only. The synthetic namespace stays available to the application, where demo
 * data is explicitly labelled as demo data.
 *
 * Every public fact carries the provenance the schema requires: source URLs,
 * a verification state and the date the claim was last checked.
 */

/**
 * True for the synthetic development namespace (`example-*`).
 *
 * Defined once in `@stackreplay/schema` and re-exported here: the public read
 * model and the share boundary must apply the same rule. The import is separate
 * from the re-export because a re-export does not create a local binding, and
 * this module also calls the predicate.
 */
import { isSyntheticCatalogId } from "@stackreplay/schema";

export { isSyntheticCatalogId, SYNTHETIC_CATALOG_PREFIX } from "@stackreplay/schema";

let cachedCatalog: CatalogV1 | undefined;

/**
 * The full catalog (real and synthetic), read from the same generated snapshot
 * the browser application replays against. Using one source for both surfaces is
 * deliberate: a public page can never describe a plan differently from the plan a
 * replay would use, and the web build never touches the filesystem.
 */
export function loadCatalog(): CatalogV1 {
  cachedCatalog ??= loadBundledCatalog();
  return cachedCatalog;
}

/** Content hash of the snapshot the public pages are describing. */
export { BUNDLED_CATALOG_VERSION };

/**
 * Catalog versions are content hashes. A public page shows a short prefix so a
 * 71-character digest cannot blow out a narrow layout, and never hides that the
 * version is a hash.
 */
export function shortCatalogVersion(version: string): string {
  const [algorithm, digest] = version.split(":");
  if (digest === undefined) return version;
  return `${algorithm}:${digest.slice(0, 8)}`;
}

export interface PublicPlanSummary {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  versionId: string;
  effectiveFrom: string;
  price: PlanPriceV1;
  limits: readonly PlanLimitV1[];
  modelRules: readonly ModelRuleV1[];
  promotions: readonly PromotionV1[];
  /** Limits the provider states without a number; never rendered as an amount. */
  qualitativeLimits: readonly QualitativeLimitV1[];
  verificationStatus: LoadedPlanVersionV1["verificationStatus"];
  lastVerifiedAt: string;
  sources: readonly CatalogSourceV1[];
  billingMechanics: string | undefined;
  versionCount: number;
}

/**
 * One place a person can use a model: a Direct API a provider runs, or a
 * subscription plan whose rules include the model. Built from catalog offering
 * and plan facts only.
 */
export interface PublicModelPlace {
  kind: "api" | "plan";
  /** Human name, e.g. "Anthropic API" or "GitHub Copilot Pro". */
  label: string;
  providerId: string;
  providerName: string;
  /** Plans only. */
  planId?: string;
  price?: PlanPriceV1;
}

export interface PublicModelSummary {
  id: string;
  name: string;
  /** A concrete release, or a family identity record (launch taxonomy). */
  kind: ModelKindV1;
  /** Only what the record states; absent is never read as current. */
  lifecycle: ModelLifecycleV1 | undefined;
  developerId: string | undefined;
  developerName: string | undefined;
  /** For a release: the family identity record it belongs to. */
  familyId: string | undefined;
  familyName: string | undefined;
  /** For a family record: the releases that name it, current first. */
  releaseIds: readonly string[];
  /** Offering routes (providers), which are not the developer. */
  providerIds: readonly string[];
  providerNames: readonly string[];
  planIds: readonly string[];
  /** Where the model can be used, Direct API first, then plans. */
  places: readonly PublicModelPlace[];
  aliases: readonly ModelAliasV1[];
  verificationStatus: CatalogV1["models"][string]["verificationStatus"];
  lastVerifiedAt: string;
  sources: readonly CatalogSourceV1[];
}

/**
 * A plan's name as a person would say it. Catalog plan names are the
 * provider's own labels. Most already carry the product ("Claude Max 5x",
 * "Copilot Pro"); a bare tier name ("Pro", "Hobby") gets the provider in front
 * so it is not ambiguous out of context.
 */
export function planDisplayName(plan: { name: string; providerName: string }): string {
  const bareTier = !/\s/u.test(plan.name.trim());
  return bareTier && !plan.name.toLowerCase().startsWith(plan.providerName.toLowerCase())
    ? `${plan.providerName} ${plan.name}`
    : plan.name;
}

const LIFECYCLE_ORDER: Record<string, number> = { current: 0, unrecorded: 1, legacy: 2 };

/** Sort key that puts current releases first, then unrecorded, then legacy. */
export function lifecycleRank(lifecycle: ModelLifecycleV1 | undefined): number {
  return LIFECYCLE_ORDER[lifecycle ?? "unrecorded"] ?? 1;
}

export interface PublicProviderSummary {
  id: string;
  name: string;
  planIds: readonly string[];
  verificationStatus: CatalogV1["providers"][string]["verificationStatus"];
  lastVerifiedAt: string;
  sources: readonly CatalogSourceV1[];
}

/**
 * The version of a plan that is in force at `asOf`, by the catalog's own version
 * rule (decision: `effectiveTo` is inclusive, the latest `effectiveFrom` wins).
 *
 * This used to treat `effectiveTo` as exclusive and then fall back to the newest
 * known version when nothing applied, so a public page could describe a price or
 * a limit set from a version that was not in effect on the date it printed, and
 * could disagree with the engine on the date a version changed (benchmark finding
 * F001). The rule now lives in one place, shared with the engine, and a plan with
 * no version in force at `asOf` has no current version at all rather than a
 * borrowed future one.
 */
export function currentVersionOf(
  catalog: CatalogV1,
  planId: string,
  asOf: string,
): LoadedPlanVersionV1 | undefined {
  const plan = catalog.plans[planId];
  if (plan === undefined) return undefined;
  const selected = selectPlanVersionAt(plan.versions, asOf);
  return selected === undefined
    ? undefined
    : catalog.planVersions[planVersionId(planId, selected.effectiveFrom)];
}

function toPlanSummary(
  catalog: CatalogV1,
  planId: string,
  version: LoadedPlanVersionV1,
): PublicPlanSummary {
  const plan = catalog.plans[planId];
  const provider = plan === undefined ? undefined : catalog.providers[plan.providerId];
  return {
    id: planId,
    name: plan?.name ?? planId,
    providerId: plan?.providerId ?? "unknown",
    providerName: provider?.name ?? plan?.providerId ?? "Unknown provider",
    versionId: version.versionId,
    effectiveFrom: version.effectiveFrom,
    price: version.price,
    limits: version.limits,
    modelRules: version.modelRules,
    promotions: version.promotions ?? [],
    qualitativeLimits: version.qualitativeLimits ?? [],
    verificationStatus: version.verificationStatus,
    lastVerifiedAt: version.lastVerifiedAt,
    sources: version.sources,
    billingMechanics: version.billingMechanics,
    versionCount: plan?.versions.length ?? 1,
  };
}

export interface PublicCatalog {
  catalogVersion: string;
  asOf: string;
  providers: readonly PublicProviderSummary[];
  plans: readonly PublicPlanSummary[];
  models: readonly PublicModelSummary[];
  planById: (id: string) => PublicPlanSummary | undefined;
  modelById: (id: string) => PublicModelSummary | undefined;
  planVersions: (id: string) => readonly LoadedPlanVersionV1[];
}

/** Public read model over the real (non-synthetic) catalog entries. */
export function loadPublicCatalog(asOf?: string): PublicCatalog {
  const catalog = loadCatalog();
  const date = asOf ?? new Date().toISOString().slice(0, 10);

  const realPlanIds = Object.keys(catalog.plans)
    .filter((id) => !isSyntheticCatalogId(id))
    .sort();
  const realModelIds = Object.keys(catalog.models)
    .filter((id) => !isSyntheticCatalogId(id))
    .sort();

  const plans: PublicPlanSummary[] = [];
  for (const planId of realPlanIds) {
    const version = currentVersionOf(catalog, planId, date);
    if (version !== undefined) plans.push(toPlanSummary(catalog, planId, version));
  }

  const providerName = (id: string) => catalog.providers[id]?.name ?? id;
  const models: PublicModelSummary[] = realModelIds.map((modelId) => {
    const model = catalog.models[modelId];
    const providerIds = model?.providerIds ?? [];
    const developerId = model?.developerId;
    const planIds = plans
      .filter((plan) =>
        plan.modelRules.some((rule) => rule.model === modelId && rule.excluded !== true),
      )
      .map((plan) => plan.id);
    // Places: a Direct API route first (an offering fact, not authorship), then
    // plans, the developer's own plans first so the row leads with the obvious
    // place to use the model.
    const apiPlaces: PublicModelPlace[] = directApiProviderIdsFor(catalog, modelId).map((id) => ({
      kind: "api",
      label: `${providerName(id)} API`,
      providerId: id,
      providerName: providerName(id),
    }));
    const planPlaces: PublicModelPlace[] = plans
      .filter((plan) => planIds.includes(plan.id))
      .sort(
        (left, right) =>
          Number(right.providerId === developerId) - Number(left.providerId === developerId) ||
          left.providerName.localeCompare(right.providerName) ||
          Number(left.price.amount) - Number(right.price.amount),
      )
      .map((plan) => ({
        kind: "plan",
        label: planDisplayName(plan),
        providerId: plan.providerId,
        providerName: plan.providerName,
        planId: plan.id,
        price: plan.price,
      }));
    const familyId = model?.familyId;
    return {
      id: modelId,
      name: model?.name ?? modelId,
      kind: model === undefined ? "release" : modelKindOf(model),
      lifecycle: model?.lifecycle,
      developerId,
      developerName: developerId === undefined ? undefined : providerName(developerId),
      familyId,
      familyName: familyId === undefined ? undefined : catalog.models[familyId]?.name,
      releaseIds: familyReleaseIds(catalog, modelId)
        .filter((id) => !isSyntheticCatalogId(id))
        .sort(
          (left, right) =>
            lifecycleRank(catalog.models[left]?.lifecycle) -
              lifecycleRank(catalog.models[right]?.lifecycle) ||
            (catalog.models[left]?.name ?? left).localeCompare(
              catalog.models[right]?.name ?? right,
            ),
        ),
      providerIds,
      providerNames: providerIds.map(providerName),
      planIds,
      places: [...apiPlaces, ...planPlaces],
      aliases: model?.aliases ?? [],
      verificationStatus: model?.verificationStatus ?? "unknown",
      lastVerifiedAt: model?.lastVerifiedAt ?? date,
      sources: model?.sources ?? [],
    };
  });

  const providerIds = [...new Set(plans.map((plan) => plan.providerId))].sort();
  const providers: PublicProviderSummary[] = providerIds.map((providerId) => {
    const provider = catalog.providers[providerId];
    return {
      id: providerId,
      name: provider?.name ?? providerId,
      planIds: plans.filter((plan) => plan.providerId === providerId).map((plan) => plan.id),
      verificationStatus: provider?.verificationStatus ?? "unknown",
      lastVerifiedAt: provider?.lastVerifiedAt ?? date,
      sources: provider?.sources ?? [],
    };
  });

  return {
    catalogVersion: catalog.catalogVersion,
    asOf: date,
    providers,
    plans,
    models,
    planById: (id: string) => plans.find((plan) => plan.id === id),
    modelById: (id: string) => models.find((model) => model.id === id),
    planVersions: (id: string) =>
      (catalog.plans[id]?.versions ?? [])
        .map((version) => catalog.planVersions[planVersionId(id, version.effectiveFrom)])
        .filter((version): version is LoadedPlanVersionV1 => version !== undefined)
        .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom)),
  };
}

export interface CatalogChange {
  planId: string;
  planName: string;
  providerName: string;
  effectiveFrom: string;
  kind: "plan_added" | "price_changed" | "limit_changed" | "model_access_changed" | "rule_changed";
  summary: string;
  modelDetails?: string;
  verificationStatus: LoadedPlanVersionV1["verificationStatus"];
  lastVerifiedAt: string;
  sources: readonly CatalogSourceV1[];
}

function describeWindow(window: LimitWindowV1): string {
  return window.type === "rolling" ? `rolling ${window.duration}` : `calendar ${window.unit}`;
}

function describeLimits(limits: readonly PlanLimitV1[]): string {
  return limits
    .map(
      (limit) => `${limit.label} (${limit.amount} ${limit.type}, ${describeWindow(limit.window)})`,
    )
    .join("; ");
}

function describeModels(rules: readonly ModelRuleV1[], catalog: CatalogV1): string {
  const name = (id: string) => catalog.models[id]?.name ?? id;
  const included = rules.filter((rule) => rule.excluded !== true).map((rule) => name(rule.model));
  const credits = rules
    .filter((rule) => rule.excluded === true && rule.access === "usage_credits")
    .map((rule) => name(rule.model));
  const excluded = rules
    .filter((rule) => rule.excluded === true && rule.access === undefined)
    .map((rule) => name(rule.model));
  const parts = [`includes ${included.join(", ") || "nothing"}`];
  if (credits.length > 0) parts.push(`${credits.join(", ")} with usage credits only`);
  if (excluded.length > 0) parts.push(`excludes ${excluded.join(", ")}`);
  return parts.join("; ");
}

function modelCountSummary(rules: readonly ModelRuleV1[]): string {
  const included = rules.filter((rule) => rule.excluded !== true).length;
  const excluded = rules.length - included;
  return `${included} included ${included === 1 ? "name" : "names"}${excluded === 0 ? "" : `, ${excluded} excluded`}`;
}

/**
 * Public catalog changelog (M4). Derived deterministically from the version
 * history the catalog already keeps: a plan's first version is an addition, and
 * later versions are diffed against their predecessor. Nothing is inferred
 * beyond what the versions state, and every entry carries its sources and
 * verification state.
 */
export function deriveCatalogChanges(catalog: CatalogV1 = loadCatalog()): CatalogChange[] {
  const changes: CatalogChange[] = [];
  for (const planId of Object.keys(catalog.plans)
    .filter((id) => !isSyntheticCatalogId(id))
    .sort()) {
    const plan = catalog.plans[planId];
    if (plan === undefined) continue;
    const providerName = catalog.providers[plan.providerId]?.name ?? plan.providerId;
    const ordered = [...plan.versions].sort((left, right) =>
      left.effectiveFrom.localeCompare(right.effectiveFrom),
    );
    for (const [index, version] of ordered.entries()) {
      const previous = index === 0 ? undefined : ordered[index - 1];
      const base = {
        planId,
        planName: plan.name,
        providerName,
        effectiveFrom: version.effectiveFrom,
        verificationStatus: version.verificationStatus,
        lastVerifiedAt: version.lastVerifiedAt,
        sources: version.sources,
      };
      if (previous === undefined) {
        changes.push({
          ...base,
          kind: "plan_added",
          summary: `Plan added at $${version.price.amount} per ${version.price.interval}; ${modelCountSummary(version.modelRules)} in its model access list.`,
          modelDetails: describeModels(version.modelRules, catalog),
        });
        continue;
      }
      if (
        previous.price.amount !== version.price.amount ||
        previous.price.interval !== version.price.interval
      ) {
        changes.push({
          ...base,
          kind: "price_changed",
          summary: `Price changed from $${previous.price.amount} to $${version.price.amount} per ${version.price.interval}.`,
        });
      }
      if (describeLimits(previous.limits) !== describeLimits(version.limits)) {
        changes.push({
          ...base,
          kind: "limit_changed",
          summary: `Limits changed: ${describeLimits(version.limits)}.`,
        });
      }
      if (JSON.stringify(previous.modelRules) !== JSON.stringify(version.modelRules)) {
        changes.push({
          ...base,
          kind: "model_access_changed",
          summary: `Model access list updated: ${modelCountSummary(version.modelRules)}.`,
          modelDetails: describeModels(version.modelRules, catalog),
        });
      }
      if (
        previous.billingMechanics !== version.billingMechanics &&
        version.billingMechanics !== undefined
      ) {
        changes.push({
          ...base,
          kind: "rule_changed",
          summary: `Billing mechanics: ${version.billingMechanics}`,
        });
      }
    }
  }
  return changes.sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom));
}
