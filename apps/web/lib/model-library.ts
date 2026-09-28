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
    left.name.localeCompare(right.name)
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
