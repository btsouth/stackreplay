import {
  bundledApiProviderModels,
  bundledPlanModelsAt,
  bundledPlansAt,
  bundledPublicApiProviders,
} from "@stackreplay/catalog/bundled";
import { isSyntheticCatalogId } from "@stackreplay/share";
import type { SourceDemand } from "./workload-profile";

/**
 * Workload-aware routes: which targets can answer for this workload, and which
 * of them a person is pointed at first.
 *
 * A suggestion used to be fixed ("a plan with a published allowance" was always
 * Copilot Pro), so on most real workloads the first Replay a person ran served
 * almost none of their calls. Every suggestion here is chosen from how much of
 * the person's own recorded work the target runs, measured with the rule the
 * engine applies: a subscription runs the models its rules name and do not
 * exclude, and a Direct API provider runs the models it is recorded as
 * offering. `routes.test.ts` holds these counts to the engine's own replay.
 *
 * Unresolved calls are never assigned to a target: they are counted apart, and
 * a coverage share has them in its denominator only.
 */

export type TargetKey = `plan:${string}` | `api:${string}`;

/** A named part of the workload a replay can be scoped to. */
export interface WorkloadSlice {
  /** Recording tools in the slice; empty for the whole workload. */
  sources: readonly string[];
  /** "Claude Code", or "Full workload". */
  label: string;
  events: number;
  /** Calls per resolved canonical model. */
  models: ReadonlyMap<string, number>;
  unresolvedEvents: number;
}

export interface TargetCoverage {
  key: TargetKey;
  kind: "subscription" | "api";
  id: string;
  /** "Copilot Pro+", or "Anthropic API". */
  name: string;
  providerId: string;
  /** Numeric published limits, limits stated only qualitatively, or no allowance at all. */
  capacity: "numeric" | "unpublished" | "not-applicable";
  price?: { amount: string; interval: string } | undefined;
  /** Calls in the slice on models the target runs. */
  runnable: number;
  /** Calls in the slice. */
  events: number;
  /** Calls in the slice whose model identity is unresolved. */
  unresolved: number;
  /** Direct API: every runnable model has a list price in force. */
  priced?: boolean | undefined;
}

/** A tool's name as the workload summary records it, by adapter id. */
export type SourceNames = ReadonlyMap<string, string>;

export function workloadSlice(
  sources: readonly SourceDemand[],
  names: SourceNames,
  only?: readonly string[],
): WorkloadSlice {
  const chosen =
    only === undefined || only.length === 0
      ? sources
      : sources.filter((source) => only.includes(source.id));
  const models = new Map<string, number>();
  let events = 0;
  let unresolvedEvents = 0;
  for (const source of chosen) {
    events += source.events;
    unresolvedEvents += source.unresolvedEvents;
    for (const model of source.models)
      models.set(model.modelId, (models.get(model.modelId) ?? 0) + model.events);
  }
  const whole = only === undefined || only.length === 0 || chosen.length === sources.length;
  return {
    sources: whole ? [] : chosen.map((source) => source.id),
    label: whole
      ? "Full workload"
      : chosen.map((source) => names.get(source.id) ?? source.id).join(" + "),
    events,
    models,
    unresolvedEvents,
  };
}

/** The whole workload, then each recording tool on its own when there is more than one. */
export function workloadSlices(
  sources: readonly SourceDemand[],
  names: SourceNames,
): WorkloadSlice[] {
  const whole = workloadSlice(sources, names);
  if (sources.length < 2) return [whole];
  return [whole, ...sources.map((source) => workloadSlice(sources, names, [source.id]))];
}

function runnableIn(slice: WorkloadSlice, runs: ReadonlySet<string>): number {
  let runnable = 0;
  for (const [modelId, events] of slice.models) if (runs.has(modelId)) runnable += events;
  return runnable;
}

/**
 * Every target a person can replay this slice against, ordered by how much of
 * it the target runs. Synthetic `example-` targets appear only for a synthetic
 * workload.
 */
export function targetCoverages(
  slice: WorkloadSlice,
  rulesAsOf: string,
  options: { synthetic: boolean },
): TargetCoverage[] {
  const keep = (id: string) => isSyntheticCatalogId(id) === options.synthetic;
  const coverages: TargetCoverage[] = [];
  for (const plan of bundledPlansAt(rulesAsOf)) {
    if (!keep(plan.id)) continue;
    const models = bundledPlanModelsAt(plan.id, rulesAsOf)?.models ?? [];
    const runs = new Set(models.filter((model) => model.available).map((model) => model.id));
    coverages.push({
      key: `plan:${plan.id}`,
      kind: "subscription",
      id: plan.id,
      name: plan.name,
      providerId: plan.providerId,
      capacity: plan.limitCount > 0 ? "numeric" : "unpublished",
      price: plan.price,
      runnable: runnableIn(slice, runs),
      events: slice.events,
      unresolved: slice.unresolvedEvents,
    });
  }
  for (const provider of bundledPublicApiProviders(rulesAsOf)) {
    if (!keep(provider.id)) continue;
    const models = bundledApiProviderModels(provider.id, rulesAsOf);
    const runs = new Set(models.filter((model) => model.available).map((model) => model.id));
    const unpriced = new Set(models.filter((model) => model.priced !== true).map((m) => m.id));
    const runnable = runnableIn(slice, runs);
    coverages.push({
      key: `api:${provider.id}`,
      kind: "api",
      id: provider.id,
      name: `${provider.name} API`,
      providerId: provider.id,
      capacity: "not-applicable",
      runnable,
      events: slice.events,
      unresolved: slice.unresolvedEvents,
      priced: runnable > 0 && runnableIn(slice, unpriced) === 0,
    });
  }
  return coverages.sort(
    (a, b) =>
      b.runnable - a.runnable ||
      Number(isOrganizationPlan(a)) - Number(isOrganizationPlan(b)) ||
      capacityRank(a) - capacityRank(b) ||
      cheapestFirst(a, b),
  );
}

/**
 * Plans sold per seat to an organization. They stay in every picker, but a
 * suggestion is about the person's own stack, so it never names one, and on a
 * tie they sort after the plans a person buys for themselves. The catalog
 * states this only in billing prose, so they are named here.
 */
const ORGANIZATION_PLANS: ReadonlySet<string> = new Set([
  "github-copilot-business",
  "github-copilot-enterprise",
  "openai-chatgpt-business",
]);

export function isOrganizationPlan(coverage: Pick<TargetCoverage, "id" | "kind">): boolean {
  return coverage.kind === "subscription" && ORGANIZATION_PLANS.has(coverage.id);
}

function capacityRank(coverage: TargetCoverage): number {
  return coverage.capacity === "numeric" ? 0 : coverage.capacity === "not-applicable" ? 1 : 2;
}

/** Share of the slice's calls on models the target runs. */
export function coverageShare(coverage: TargetCoverage): number {
  return coverage.events === 0 ? 0 : coverage.runnable / coverage.events;
}

/** Every resolved call in the slice is on a model the target runs. */
export function runsAllResolved(coverage: TargetCoverage): boolean {
  return coverage.runnable > 0 && coverage.runnable === coverage.events - coverage.unresolved;
}

export interface SuggestedRoute {
  id: "api-value" | "numeric-limits" | "switch-provider";
  target: TargetCoverage;
  slice: WorkloadSlice;
  /** The replay needs model substitutions the person chooses. */
  translated: boolean;
  /** What the replay can lead with. */
  answer: "dollars" | "date" | "share";
}

/** The subscription a person moving to one provider would most likely weigh. */
const FLAGSHIPS: Readonly<Record<string, string>> = {
  anthropic: "anthropic-claude-max-20x",
  openai: "openai-chatgpt-pro",
};

function cheapestFirst(a: TargetCoverage, b: TargetCoverage): number {
  const price = (coverage: TargetCoverage) => Number(coverage.price?.amount ?? Infinity);
  return price(a) - price(b) || (a.name < b.name ? -1 : 1);
}

/**
 * Up to three routes, each able to answer for the work it is scoped to:
 *
 * - `api-value`: a Direct API provider that runs and prices every resolved call
 *   of the whole workload, or else of the largest tool slice one provider
 *   covers in full. The replay leads with a dollar figure.
 * - `numeric-limits`: the plan with published numeric limits that runs the
 *   most of the workload, at least half of it (a tool slice when no plan runs
 *   half of the whole). The replay leads with a date or a within-limits count.
 * - `switch-provider`: a translated scenario on another provider's flagship
 *   plan, framed as one: the person chooses the substitutions.
 */
export function suggestRoutes(
  slices: readonly WorkloadSlice[],
  rulesAsOf: string,
  options: { synthetic: boolean },
): SuggestedRoute[] {
  const routes: SuggestedRoute[] = [];
  const bySlice = slices.map((slice) => ({
    slice,
    coverages: targetCoverages(slice, rulesAsOf, options),
  }));
  const whole = bySlice[0];
  if (whole === undefined || whole.slice.events === 0) return routes;

  for (const { slice, coverages } of bySlice) {
    const api = coverages.find(
      (coverage) =>
        coverage.kind === "api" && coverage.priced === true && runsAllResolved(coverage),
    );
    if (api === undefined) continue;
    routes.push({ id: "api-value", target: api, slice, translated: false, answer: "dollars" });
    break;
  }

  const numeric = bySlice
    .flatMap(({ slice, coverages }) =>
      coverages
        .filter(
          (coverage) =>
            coverage.capacity === "numeric" &&
            !isOrganizationPlan(coverage) &&
            coverageShare(coverage) >= 0.5,
        )
        .map((coverage) => ({ slice, coverage })),
    )
    .sort(
      (a, b) =>
        // The whole workload before a slice, then the most calls run, then
        // the cheaper plan (the likelier to show where it runs out).
        (a.slice.sources.length === 0 ? 0 : 1) - (b.slice.sources.length === 0 ? 0 : 1) ||
        b.coverage.runnable - a.coverage.runnable ||
        cheapestFirst(a.coverage, b.coverage),
    )[0];
  if (numeric !== undefined)
    routes.push({
      id: "numeric-limits",
      target: numeric.coverage,
      slice: numeric.slice,
      translated: false,
      answer: "date",
    });

  // The provider whose flagship already runs the most of the workload.
  const flagships = whole.coverages.filter(
    (coverage) =>
      coverage.kind === "subscription" && FLAGSHIPS[coverage.providerId] === coverage.id,
  );
  const leading = flagships[0];
  if (leading !== undefined) {
    // A mixed workload consolidates onto the flagship that runs most of it; a
    // single-provider workload moves to the other provider's flagship.
    const target = runsAllResolved(leading)
      ? flagships.find((coverage) => coverage.id !== leading.id)
      : leading;
    if (target !== undefined)
      routes.push({
        id: "switch-provider",
        target,
        slice: whole.slice,
        translated: !runsAllResolved(target),
        answer: "share",
      });
  }
  return routes;
}

/** A comparison column: a target over the whole workload, or over the tool slice it carries. */
export interface CompareColumn {
  key: TargetKey;
  /** Recording tools in scope; empty for the whole workload. */
  sources: readonly string[];
  /** Part of the stack the person uses today. */
  current: boolean;
}

export function columnId(column: Pick<CompareColumn, "key" | "sources">): string {
  return `${column.key}|${column.sources.join(",")}`;
}

/** Coverage of every target over the whole workload and over each tool on its own. */
export function coverageBySlice(
  slices: readonly WorkloadSlice[],
  rulesAsOf: string,
  options: { synthetic: boolean },
): { slice: WorkloadSlice; coverages: TargetCoverage[] }[] {
  return slices.map((slice) => ({ slice, coverages: targetCoverages(slice, rulesAsOf, options) }));
}

/** The flagship plan that runs every resolved call of a slice, if one does. */
export function flagshipFor(coverages: readonly TargetCoverage[]): TargetCoverage | undefined {
  return coverages.find(
    (coverage) =>
      coverage.kind === "subscription" &&
      FLAGSHIPS[coverage.providerId] === coverage.id &&
      runsAllResolved(coverage),
  );
}

export interface StackMember {
  key: TargetKey;
  name: string;
  /** The tools whose calls this target runs at least half of; empty when it carries all of them. */
  sources: string[];
  /** Tool names, joined, for the tools it carries. */
  label: string | undefined;
  /** Whether it carries every tool's work, some of it, or none on its own. */
  carries: "all" | "some" | "none";
}

export interface StackCoverage {
  members: StackMember[];
  /** Tools no target in the stack carries. */
  uncovered: { id: string; label: string; events: number }[];
}

/**
 * What a stack of current targets carries: each target takes the tools whose
 * calls it runs at least half of, so a Claude Max 20x + ChatGPT Pro user sees
 * each plan replayed on the work it actually does.
 */
export function stackCoverage(
  current: readonly TargetKey[],
  bySlice: readonly { slice: WorkloadSlice; coverages: TargetCoverage[] }[],
): StackCoverage {
  const tools = bySlice.filter(({ slice }) => slice.sources.length === 1);
  const whole = bySlice[0];
  const members: StackMember[] = [];
  const carried = new Set<string>();
  for (const key of current) {
    const name = whole?.coverages.find((coverage) => coverage.key === key)?.name ?? key;
    const takes = tools
      .filter(({ coverages }) => {
        const coverage = coverages.find((entry) => entry.key === key);
        return coverage !== undefined && coverageShare(coverage) >= 0.5;
      })
      .map(({ slice }) => slice);
    for (const slice of takes) for (const id of slice.sources) carried.add(id);
    const carries =
      tools.length === 0 || takes.length === tools.length
        ? "all"
        : takes.length === 0
          ? "none"
          : "some";
    members.push({
      key,
      name,
      sources: carries === "some" ? takes.flatMap((slice) => slice.sources) : [],
      label: carries === "some" ? takes.map((slice) => slice.label).join(" + ") : undefined,
      carries,
    });
  }
  const uncovered =
    current.length === 0
      ? []
      : tools
          .filter(({ slice }) => !slice.sources.some((id) => carried.has(id)))
          .map(({ slice }) => ({
            id: slice.sources[0] ?? "",
            label: slice.label,
            events: slice.events,
          }));
  return { members, uncovered };
}

/**
 * The columns Compare starts with: the person's current stack, each on the
 * work it carries, then targets that can answer for this workload: the
 * suggested API and numeric routes, the flagship plan that runs each tool's
 * work as it is, and the provider switch. A starting set, never a ranking.
 */
export function defaultColumns(
  current: readonly TargetKey[],
  slices: readonly WorkloadSlice[],
  rulesAsOf: string,
  options: { synthetic: boolean; max: number },
): CompareColumn[] {
  const bySlice = coverageBySlice(slices, rulesAsOf, options);
  const columns: CompareColumn[] = [];
  const add = (column: CompareColumn) => {
    if (columns.length >= options.max) return;
    if (columns.some((entry) => entry.key === column.key)) return;
    columns.push(column);
  };
  for (const member of stackCoverage(current, bySlice).members)
    add({ key: member.key, sources: member.sources, current: true });
  const routes = suggestRoutes(slices, rulesAsOf, options);
  for (const id of ["api-value", "numeric-limits"] as const) {
    const route = routes.find((entry) => entry.id === id);
    if (route !== undefined)
      add({ key: route.target.key, sources: route.slice.sources, current: false });
  }
  const tools = bySlice.length > 1 ? bySlice.slice(1) : bySlice;
  for (const { slice, coverages } of tools) {
    const flagship = flagshipFor(coverages);
    if (flagship !== undefined) add({ key: flagship.key, sources: slice.sources, current: false });
  }
  const switchRoute = routes.find((entry) => entry.id === "switch-provider");
  if (switchRoute !== undefined)
    add({ key: switchRoute.target.key, sources: switchRoute.slice.sources, current: false });
  return columns;
}
