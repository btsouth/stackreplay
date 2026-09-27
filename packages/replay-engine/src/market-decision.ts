import type { CatalogV1 } from "@stackreplay/catalog";
import type { DecisionMarket } from "@stackreplay/catalog/market";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import type { CompiledOptimizationInput } from "./compiled-optimizer.js";
import { bindExecutionScenario, executionContentHash } from "./execution-binding.js";
import { epochMsFromIso, parseInstant, subMillisecondNanoseconds } from "./time.js";

/** Two explicit counterfactuals over the same array; no event mutation or evidence per event. */
export function marketDecisionInputs(
  catalog: CatalogV1,
  market: DecisionMarket,
  events: readonly TextUsageEventV1[],
): CompiledOptimizationInput[] {
  if (catalog.catalogVersion !== market.catalogHash)
    throw new Error("Market snapshot/catalog mismatch");
  if (!events.length) return [];
  // Reuse TimedEvent's precise representation without allocating a timed event
  // array. Temporal is needed only for the two final half-open boundaries.
  let first = events[0]?.occurredAt ?? "",
    last = first;
  let firstMs = epochMsFromIso(first),
    lastMs = firstMs;
  let firstSub = subMillisecondNanoseconds(first),
    lastSub = firstSub;
  for (const event of events) {
    const at = event.occurredAt,
      ms = epochMsFromIso(at),
      sub = subMillisecondNanoseconds(at);
    if (ms < firstMs || (ms === firstMs && sub < firstSub)) {
      first = at;
      firstMs = ms;
      firstSub = sub;
    }
    if (ms > lastMs || (ms === lastMs && sub > lastSub)) {
      last = at;
      lastMs = ms;
      lastSub = sub;
    }
  }
  const period = {
    start: parseInstant(first).toString(),
    end: parseInstant(last).add({ nanoseconds: 1 }).toString(),
  };
  return market.scenarios.map((option) => ({
    contract: "compiled-v2",
    catalog,
    events,
    artifacts: option.artifacts,
    scenario: bindExecutionScenario(option.artifacts, {
      version: 2,
      rulesAt: market.rulesAt,
      period,
      resources: option.artifacts.map((p) => ({
        id: p.planId,
        artifactHash: p.artifactHash,
        windowAnchors: {},
        firstUse: {},
        sharedCapacityIds: [],
        facts: Object.fromEntries(
          [
            ...p.requirements,
            ...(p.computation.kind === "executable"
              ? p.computation.routes.flatMap((r) => r.requirements)
              : []),
          ].map((r) => [r.id, "true" as const]),
        ),
      })),
      initial: { unlisted: "unknown", observations: [], assumptionRef: option.id },
      observationEvidence: [
        { id: option.id, kind: "assumption", hash: executionContentHash(option.assumption) },
      ],
      chronology: "request",
      maxSubscriptions: 2,
      maxAssignmentStates: 10000,
    }),
  }));
}
