import { bundledApiProviderModels, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import type { ModelTranslationPolicyV1 } from "@stackreplay/schema";
import type { ModelMapping, WorkloadModels } from "@/components/replay/translation-model";
import { marketRange } from "./decision-presentation";
import type { MarketDecision } from "./market-decision";
import type { ReplayOutcome } from "./worker-client";

/** Suggested decisions share the admitted baseline date, never the viewer clock.
 * Custom Replay independently defaults to today via defaultRulesDate().
 */
export const DECISION_RULES_DATE = DECISION_MARKET.rulesAt.slice(0, 10);

/** Product counterfactual policies, never catalog identity or model-quality claims.
 * Each pair is deliberately enumerated. Family membership does not generate rules.
 */
const ORIGINAL_TRANSLATION_PROFILES = [
  {
    id: "openai-frontier",
    version: "1",
    name: "OpenAI frontier translation",
    providerId: "openai",
    rules: {
      "claude-opus": "gpt-6-sol",
      "claude-opus-4-7": "gpt-6-sol",
      "claude-opus-4-8": "gpt-6-sol",
      "claude-opus-5": "gpt-6-sol",
      "claude-opus-5-5": "gpt-6-sol",
      "claude-sonnet": "gpt-5-6-terra",
      "claude-sonnet-4-6": "gpt-5-6-terra",
      "claude-sonnet-5": "gpt-5-6-terra",
      "claude-haiku": "gpt-6-luna",
      "claude-haiku-4-5": "gpt-6-luna",
      "claude-fable": "gpt-6-astra",
      "claude-fable-5": "gpt-6-astra",
      "claude-fable-5-1": "gpt-6-astra",
    },
  },
  {
    id: "anthropic-frontier",
    version: "1",
    name: "Anthropic frontier translation",
    providerId: "anthropic",
    // Explicit asymmetric reverse policy: an Astra request tests Fable 5.1.
    // No inferred inversion of many-to-one mappings.
    rules: { "gpt-6-astra": "claude-fable-5-1" },
  },
] as const;
/** v1 remains available for an explicitly pinned, reproducible policy. */
export const TRANSLATION_PROFILES = [
  {
    ...ORIGINAL_TRANSLATION_PROFILES[0],
    version: "2",
    // Current Opus-class counterfactual, including explicitly named older sources.
    // Sonnet/Terra, Haiku/Luna and Fable/Astra remain deliberate policy choices.
    rules: {
      ...ORIGINAL_TRANSLATION_PROFILES[0].rules,
      "claude-opus": "gpt-6-1-sol",
      "claude-opus-4-7": "gpt-6-1-sol",
      "claude-opus-4-8": "gpt-6-1-sol",
      "claude-opus-5": "gpt-6-1-sol",
      "claude-opus-5-5": "gpt-6-1-sol",
    },
  },
  ORIGINAL_TRANSLATION_PROFILES[1],
] as const;
export const TRANSLATION_PROFILE_HISTORY = [
  ORIGINAL_TRANSLATION_PROFILES[0],
  ...TRANSLATION_PROFILES,
] as const;
export type TranslationProfile = (typeof TRANSLATION_PROFILE_HISTORY)[number];
export function suggestedMapping(
  profile: TranslationProfile,
  workload: WorkloadModels,
  rulesAsOf: string = DECISION_RULES_DATE,
): Record<string, string> {
  const catalog = loadBundledCatalog();
  const available = new Set(
    bundledApiProviderModels(profile.providerId, rulesAsOf)
      .filter((m) => m.available && m.priced)
      .map((m) => m.id),
  );
  const pairs: Readonly<Record<string, string>> = profile.rules;
  return Object.fromEntries(
    workload.sources.flatMap((source) => {
      const target = pairs[source.modelId];
      return target && catalog.models[source.modelId] && available.has(target)
        ? [[source.modelId, target]]
        : [];
    }),
  );
}
export function approvedPolicy(
  profile: TranslationProfile,
  mapping: ModelMapping,
): ModelTranslationPolicyV1 {
  const original: Readonly<Record<string, string>> = profile.rules;
  const edited =
    Object.entries(mapping).some(([from, to]) => original[from] !== to) ||
    Object.keys(original).some((from) => Object.hasOwn(mapping, from) && !mapping[from]);
  return {
    id: edited ? `${profile.id}-edited` : profile.id,
    version: profile.version,
    name: edited ? `${profile.name} · edited locally` : profile.name,
    provenance: "user",
    transform: "token-preserving",
    rules: Object.entries(mapping)
      .filter(([from, to]) => to && from !== to)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sourceModelId, targetModelId]) => ({ sourceModelId, targetModelId })),
  };
}
export function mappingCoverage(
  workload: WorkloadModels,
  providerId: string,
  mapping: ModelMapping,
  rulesAsOf: string = DECISION_RULES_DATE,
) {
  const available = new Set(
    bundledApiProviderModels(providerId, rulesAsOf)
      .filter((m) => m.available && m.priced)
      .map((m) => m.id),
  );
  let mapped = 0,
    applicable = 0;
  for (const source of workload.sources) {
    const target = mapping[source.modelId] || source.modelId;
    if (available.has(target)) applicable += source.events;
    if (mapping[source.modelId] && mapping[source.modelId] !== source.modelId)
      mapped += source.events;
  }
  const recorded =
    workload.sources.reduce((n, s) => n + s.events, 0) +
    workload.unresolved.reduce((n, s) => n + s.events, 0);
  return { recorded, mapped, applicable };
}
export type CostRange = { low: string; high: string };
export function priceRangeText(range: CostRange | undefined): string {
  if (!range) return "Not computable";
  const money = (n: string) =>
    `${new Decimal(n).lt(0) ? "−" : ""}$${new Decimal(n)
      .abs()
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  return range.low === range.high ? money(range.low) : `${money(range.low)} – ${money(range.high)}`;
}
/** Only whole, identical recorded populations may be subtracted. */
export function replayDifference(
  baseline: CostRange | undefined,
  cost: CostRange | undefined,
  calls: number,
  priced: number,
): CostRange | undefined {
  if (!baseline || !cost || calls === 0 || calls !== priced) return undefined;
  return {
    low: new Decimal(cost.low).minus(baseline.high).toString(),
    high: new Decimal(cost.high).minus(baseline.low).toString(),
  };
}
export function baselineRange(decision: MarketDecision): CostRange | undefined {
  const range = marketRange(decision);
  return range && decision.coverage && decision.coverage.priced === decision.coverage.recorded
    ? { low: range.low, high: range.high }
    : undefined;
}
export function replayCost(outcome: ReplayOutcome) {
  const priced = outcome.receipt?.pricedEvents ?? 0;
  const total = outcome.result.economics?.targetCost?.amount ?? outcome.receipt?.total;
  return {
    priced,
    cost: total === undefined || priced === 0 ? undefined : { low: total, high: total },
  };
}

/** Read existing exact-model route receipts; no new rate selection. */
export function marketModelCosts(decision: MarketDecision) {
  const priced = marketRange(decision) ? decision : decision.pricedScope;
  const scenarios = priced?.scenarios.map((s) => {
    const totals = new Map<string, Decimal>();
    for (const receipt of s.summary.explanation?.receipts ?? [])
      for (const cash of receipt.cash) {
        const resource = s.summary.scenario.resources.find((r) => r.id === cash.resourceInstanceId);
        const artifact = DECISION_MARKET.scenarios
          .find((o) => o.id === s.id)
          ?.artifacts.find((a) => a.artifactHash === resource?.artifactHash);
        const route =
          artifact?.computation.kind === "executable"
            ? artifact.computation.routes.find((r) => r.id === cash.routeId)
            : undefined;
        const model = route?.models.length === 1 ? route.models[0] : undefined;
        if (model) totals.set(model, (totals.get(model) ?? new Decimal(0)).add(cash.usd));
      }
    return totals;
  });
  if (scenarios?.length !== 2) return [];
  return [...(scenarios[0]?.keys() ?? [])].flatMap((model) => {
    const a = scenarios[0]?.get(model),
      b = scenarios[1]?.get(model);
    return a && b
      ? [{ model, cost: { low: Decimal.min(a, b).toString(), high: Decimal.max(a, b).toString() } }]
      : [];
  });
}
