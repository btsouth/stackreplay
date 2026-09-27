import { createModelIdentityIndex } from "@stackreplay/catalog";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import { quoteRoute, resourceReadiness, routeEligibility } from "./compiled-capacity.js";
import type { CompiledOptimizationInput } from "./compiled-optimizer.js";
import { tokenAccountingOf } from "./units.js";

export interface MarketCoverage {
  recorded: number;
  recognized: number;
  priced: number;
  knownTokens: number;
  pricedKnownTokens: number;
  unknownTokenCalls: number;
  models: {
    model: string;
    calls: number;
    priced: number;
    knownTokens: number;
    reasons: string[];
  }[];
}
/** Worker-side admission diagnostic, reusing the evaluator's exact quote and eligibility rules.
 * Returns references for an explicitly separate priced scope. Never changes optimizer demand.
 */
export function analyzeMarketCoverage(inputs: readonly CompiledOptimizationInput[]): {
  coverage: MarketCoverage;
  pricedEvents: readonly TextUsageEventV1[];
} {
  const first = inputs[0];
  const coverage: MarketCoverage = {
    recorded: first?.events.length ?? 0,
    recognized: 0,
    priced: 0,
    knownTokens: 0,
    pricedKnownTokens: 0,
    unknownTokenCalls: 0,
    models: [],
  };
  if (!first) return { coverage, pricedEvents: [] };
  const identity = createModelIdentityIndex(first.catalog);
  const cache = new Map<string, string | undefined>();
  const rows = new Map<string, MarketCoverage["models"][number]>();
  const scenarios = inputs.map((input) => ({
    input,
    resources: input.artifacts
      .filter((artifact) => artifact.purchase.kind === "api")
      .flatMap((artifact) => {
        const binding = input.scenario.resources.find(
          (r) => r.artifactHash === artifact.artifactHash,
        );
        if (!binding) return [];
        const readiness = resourceReadiness({ artifact, binding }, input.scenario);
        return [{ artifact, binding, readiness }];
      }),
  }));
  const pricedEvents: TextUsageEventV1[] = [];
  for (const event of first.events) {
    const key = JSON.stringify([event.model, event.harness?.id]);
    if (!cache.has(key))
      cache.set(
        key,
        event.model.canonicalId && first.catalog.models[event.model.canonicalId]
          ? event.model.canonicalId
          : identity.resolve(
              event.model.rawName,
              event.harness ? { harness: event.harness.id } : undefined,
            ).canonicalId,
      );
    const model = cache.get(key);
    if (model) coverage.recognized++;
    const accounting = tokenAccountingOf(event.usage);
    if (accounting.known) coverage.knownTokens += accounting.total;
    else coverage.unknownTokenCalls++;
    const label = model ?? "Unresolved model";
    let row = rows.get(label);
    if (!row) {
      row = { model: label, calls: 0, priced: 0, knownTokens: 0, reasons: [] };
      rows.set(label, row);
    }
    row.calls++;
    if (accounting.known) row.knownTokens += accounting.total;
    const reasons = new Set<string>();
    let priceable = !!model;
    if (!model) reasons.add("unresolved_model");
    for (const { input, resources } of scenarios) {
      let found = false,
        known = false;
      const unknown = new Set<string>();
      for (const { artifact, binding, readiness } of resources) {
        const rules = artifact.computation;
        if (rules.kind !== "executable") continue;
        for (const route of rules.routes) {
          if (!model || !route.models.includes(model)) continue;
          found = true;
          if (readiness.status !== "feasible") {
            readiness.reasons.forEach((r) => {
              unknown.add(r.code);
            });
            continue;
          }
          const eligibility = routeEligibility(route, binding);
          if (eligibility) {
            unknown.add(eligibility.code);
            continue;
          }
          const quote = quoteRoute(
            rules,
            route,
            event,
            event.source.adapterId === "ccusage" ? "aggregate" : input.scenario.chronology,
          );
          if (quote.reason) unknown.add(quote.reason.code);
          else known = true;
        }
      }
      // An unknown competing route cannot silently certify a cheapest known route.
      if (!known || unknown.size) {
        priceable = false;
        unknown.forEach((r) => {
          reasons.add(r);
        });
        if (!found && model) reasons.add("unsupported_model");
      }
    }
    if (priceable) {
      pricedEvents.push(event);
      coverage.priced++;
      row.priced++;
      if (accounting.known) coverage.pricedKnownTokens += accounting.total;
    }
    row.reasons = [...new Set([...row.reasons, ...reasons])].sort();
  }
  coverage.models = [...rows.values()].sort(
    (a, b) => b.calls - a.calls || a.model.localeCompare(b.model),
  );
  return {
    coverage,
    pricedEvents: coverage.priced === first.events.length ? first.events : pricedEvents,
  };
}
