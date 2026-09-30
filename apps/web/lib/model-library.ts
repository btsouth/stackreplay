import type { ModelPrices } from "./market-discovery";
import { basePrice } from "./market-prices";
import { modelContext, modelSpecifications } from "./model-specifications";
import { lifecycleRank, type PublicModelSummary } from "./public-catalog";

/**
 * The public model library (launch taxonomy).
 *
 * The default view lists model releases a person can pick, current ones
 * first. Legacy releases have their own view, and family identity records
 * (names like "Opus" that point at whichever release is current) live in an
 * identity view instead of sitting beside releases as if they were models.
 * Search always covers every record and every exact alias, so a family name or
 * a provider's dated id still finds something useful.
 *
 * Everything here reads the explicit taxonomy fields; nothing looks at ids or
 * names to decide what a record is.
 */

export type ModelLibraryView = "models" | "legacy" | "identity";

/** Developer filter value for records whose developer the catalog does not state. */
export const UNRECORDED_DEVELOPER = "unrecorded";

/** Editorial browsing pairs, not equivalence claims or replay translation rules. */
export const FEATURED_MODEL_PAIRS = [
  ["claude-fable-5-1", "gpt-6-astra"],
  ["claude-opus-5-5", "gpt-6-sol"],
  ["claude-sonnet-5-5", "gpt-5-6-terra"],
  ["claude-haiku-4-5", "gpt-6-luna"],
] as const;
export const FEATURED_ALTERNATIVE_MODELS = [
  "glm-5-3",
  "deepseek-v4-1-flash",
  "grok-4-7",
  "gemini-3-8-flash",
  "glm-5-3-flash",
  "kimi-k3",
] as const;

// A deliberate coding shortlist, not a measured popularity ranking. Every other
// catalog entry remains accessible through search, filters and the full list.
const DISCOVERY_ORDER: readonly string[] = [
  "claude-opus-5-5",
  "gpt-6-sol",
  "claude-sonnet-5-5",
  "gpt-5-6-terra",
  "claude-haiku-4-5",
  "gpt-6-luna",
  ...FEATURED_ALTERNATIVE_MODELS,
  "claude-fable-5-1",
  "gpt-6-astra",
  "glm-5-3-flash",
  "kimi-k3",
  "gpt-5-3-codex",
  "grok-4-7",
];
export function byDiscoveryOrder(left: PublicModelSummary, right: PublicModelSummary): number {
  const rank = (id: string) => {
    const index = DISCOVERY_ORDER.indexOf(id);
    return index < 0 ? DISCOVERY_ORDER.length : index;
  };
  return rank(left.id) - rank(right.id) || byLibraryOrder(left, right);
}

function byLibraryOrder(left: PublicModelSummary, right: PublicModelSummary): number {
  return (
    lifecycleRank(left.lifecycle) - lifecycleRank(right.lifecycle) ||
    Number(left.developerName === undefined) - Number(right.developerName === undefined) ||
    (left.developerName ?? "").localeCompare(right.developerName ?? "") ||
    // Within a developer, higher version numbers first ("Gemini 3.8 Flash" before "Gemini 3 Flash").
    right.name.localeCompare(left.name, "en", { numeric: true })
  );
}

export function isInView(model: PublicModelSummary, view: ModelLibraryView): boolean {
  if (view === "identity") return model.kind === "family";
  if (model.kind === "family") return false;
  return view === "legacy" ? model.lifecycle === "legacy" : model.lifecycle !== "legacy";
}

export function modelsInView(
  models: readonly PublicModelSummary[],
  view: ModelLibraryView,
): PublicModelSummary[] {
  return models.filter((model) => isInView(model, view)).sort(byLibraryOrder);
}

export function matchesDeveloper(model: PublicModelSummary, developer: string): boolean {
  if (developer === "all") return true;
  if (developer === UNRECORDED_DEVELOPER) return model.developerId === undefined;
  return model.developerId === developer;
}

/** Every spelling a record answers to: its name, its catalog id and each alias. */
function spellings(model: PublicModelSummary): string[] {
  return [model.name, model.id, ...model.aliases.map((alias) => alias.alias)].map((value) =>
    value.toLowerCase(),
  );
}

/**
 * Search across releases, legacy releases and identity records. Exact matches
 * on a name, id or alias come first, then releases before identity records.
 */
export function searchModels(
  models: readonly PublicModelSummary[],
  query: string,
): PublicModelSummary[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];
  const kindRank = (model: PublicModelSummary) => (model.kind === "family" ? 1 : 0);
  return models
    .map((model) => ({ model, values: spellings(model) }))
    .filter(({ values }) => values.some((value) => value.includes(needle)))
    .sort(
      (left, right) =>
        Number(!left.values.includes(needle)) - Number(!right.values.includes(needle)) ||
        kindRank(left.model) - kindRank(right.model) ||
        byLibraryOrder(left.model, right.model),
    )
    .map(({ model }) => model);
}

export interface DeveloperOption {
  id: string;
  name: string;
}

/** Developers named by at least one record, then "not recorded" when needed. */
export function developerOptions(models: readonly PublicModelSummary[]): DeveloperOption[] {
  const named = new Map<string, string>();
  let unrecorded = false;
  for (const model of models) {
    if (model.developerId === undefined) unrecorded = true;
    else named.set(model.developerId, model.developerName ?? model.developerId);
  }
  const options = [...named.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (unrecorded) options.push({ id: UNRECORDED_DEVELOPER, name: "Developer not recorded" });
  return options;
}

/** The first few places a model can be used, and how many more there are. */
export function placesSummary(
  model: PublicModelSummary,
  shown = 2,
): { labels: string[]; more: number } {
  return {
    labels: model.places.slice(0, shown).map((place) => place.label),
    more: Math.max(0, model.places.length - shown),
  };
}

export type ModelSortKey =
  | "featured"
  | "releaseDate"
  | "name"
  | "input"
  | "output"
  | "cacheRead"
  | "context"
  | "maxOutput"
  | "plans";
export type SortDirection = "ascending" | "descending";

/** The direction a sort starts in: cheapest prices first, largest limits and counts first. */
export function defaultSortDirection(key: ModelSortKey): SortDirection {
  return key === "releaseDate" || key === "context" || key === "maxOutput" || key === "plans"
    ? "descending"
    : "ascending";
}

/** Plain labels for each direction of a sort, or undefined when the order is fixed. */
export function sortDirectionLabels(key: ModelSortKey): Record<SortDirection, string> | undefined {
  if (key === "featured") return undefined;
  if (key === "releaseDate") return { ascending: "Oldest first", descending: "Newest first" };
  return key === "name"
    ? { ascending: "A to Z", descending: "Z to A" }
    : { ascending: "Low to high", descending: "High to low" };
}

/**
 * Catalogued plans that include a model: the plan list on its model page.
 * Cards, the table and the page's key figures all count this one list.
 */
export function modelPlanCount(model: PublicModelSummary): number {
  return model.places.filter((place) => place.kind === "plan").length;
}

export function modelPlanCounts(models: readonly PublicModelSummary[]): Record<string, number> {
  return Object.fromEntries(
    models.flatMap((model) => {
      const count = modelPlanCount(model);
      return count > 0 ? [[model.id, count]] : [];
    }),
  );
}

export interface ModelFacts {
  prices: Record<string, readonly ModelPrices[]>;
  planCounts: Record<string, number>;
}

/** A published numeric value for a sortable column, or undefined when it is not published. */
export function modelSortValue(
  model: PublicModelSummary,
  key: ModelSortKey,
  facts: ModelFacts,
): number | undefined {
  if (key === "input" || key === "output" || key === "cacheRead") {
    const rate = basePrice(facts.prices[model.id] ?? [])?.rates[key];
    return rate === undefined ? undefined : Number(rate);
  }
  if (key === "releaseDate")
    return model.releaseDate === undefined
      ? undefined
      : Date.parse(`${model.releaseDate.date}T00:00:00Z`);
  if (key === "context") return modelContext(model).value;
  if (key === "maxOutput") return modelSpecifications(model)?.maxOutputTokens;
  if (key === "plans") return facts.planCounts[model.id] ?? 0;
  return undefined;
}

/**
 * Sort by a published value. Records without that value always sort last, in
 * either direction, and keep library order among themselves.
 */
export function sortModels(
  models: readonly PublicModelSummary[],
  key: ModelSortKey,
  direction: SortDirection,
  facts: ModelFacts,
): PublicModelSummary[] {
  if (key === "featured") return [...models].sort(byDiscoveryOrder);
  const sign = direction === "ascending" ? 1 : -1;
  if (key === "name")
    return [...models].sort((left, right) => sign * left.name.localeCompare(right.name));
  return [...models].sort((left, right) => {
    const a = modelSortValue(left, key, facts);
    const b = modelSortValue(right, key, facts);
    if (a === undefined || b === undefined)
      return Number(a === undefined) - Number(b === undefined) || byLibraryOrder(left, right);
    return sign * (a - b) || byLibraryOrder(left, right);
  });
}

/** A base API list price with at least an input or output rate is published. */
export function hasPublishedApiPrice(model: PublicModelSummary, facts: ModelFacts): boolean {
  const rates = basePrice(facts.prices[model.id] ?? [])?.rates;
  return rates?.input !== undefined || rates?.output !== undefined;
}

export function isIncludedInSubscription(model: PublicModelSummary, facts: ModelFacts): boolean {
  return (facts.planCounts[model.id] ?? 0) > 0;
}
