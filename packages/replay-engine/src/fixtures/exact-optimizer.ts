import type { CatalogV1, PlanLimitV1 } from "@stackreplay/catalog";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import type { CapacityEvidenceV1 } from "../optimizer.js";
import type { ExactExecutionResource, ExactOptimizationInput } from "../optimizer-types.js";
import { fixtureContext, fixtureModels, makeFixtureCatalog } from "./catalog.js";
import { completeUsage, makeEvent } from "./events.js";

export const syntheticCapacity: CapacityEvidenceV1 = {
  kind: "synthetic",
  sources: [
    {
      url: "https://example.invalid/optimizer-capacity",
      title: "Synthetic optimizer fixture",
      checkedAt: "2026-09-01",
    },
  ],
  lastVerifiedAt: "2026-09-01",
  notes: "Deterministic fixture, not a provider allowance.",
};
export function quota(amount: number, unit: "day" | "week" | "month" = "day"): PlanLimitV1 {
  return {
    id: `requests-${unit}`,
    label: `Synthetic ${unit} requests`,
    type: "request_limit",
    amount: String(amount),
    window: { type: "calendar", unit, timezone: "UTC" },
    exceed: "reject_request",
  };
}
export function request(
  id: string,
  tokens = 1_000_000,
  model = "fixture-small",
  occurredAt = "2026-09-01T00:00:00Z",
): TextUsageEventV1 {
  return makeEvent({
    id,
    occurredAt,
    model: { rawName: model, canonicalId: model },
    usage: completeUsage({ uncachedInputTokens: tokens }),
  });
}
export function supply(
  plans: { id: string; price: string; limits: PlanLimitV1[]; models?: string[] }[],
): { catalog: CatalogV1; resources: ExactExecutionResource[] } {
  const base = makeFixtureCatalog({
    limits: [quota(1)],
    models: Object.fromEntries(
      Object.entries(fixtureModels).map(([id, model]) => [
        id,
        { ...model, providerIds: ["fixture-provider"] },
      ]),
    ),
  });
  const catalog: CatalogV1 = JSON.parse(JSON.stringify(base));
  catalog.plans = {};
  catalog.planVersions = {};
  const resources: ExactExecutionResource[] = [
    { target: { type: "api", providerId: "fixture-provider" } },
  ];
  for (const plan of plans) {
    const entry = makeFixtureCatalog({
      planId: plan.id,
      priceAmount: plan.price,
      limits: plan.limits,
      models: catalog.models,
      modelRules: (plan.models ?? ["fixture-small", "fixture-medium"]).map((model) => ({
        model,
        pricingRef: `${model}-pricing`,
      })),
    });
    Object.assign(catalog.plans, entry.plans);
    Object.assign(catalog.planVersions, entry.planVersions);
    resources.push({
      target: { type: "subscription", planId: plan.id },
      capacityEvidence: syntheticCapacity,
    });
  }
  return { catalog, resources };
}
export function scenario(
  events: TextUsageEventV1[],
  plans: Parameters<typeof supply>[0] = [{ id: "plan-a", price: "20", limits: [quota(2)] }],
): ExactOptimizationInput {
  return {
    events,
    ...supply(plans),
    context: fixtureContext,
    period: { start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" },
    initialAllowance: { kind: "fresh" },
    chronology: { default: "request", evidence: "Synthetic per-request timestamps." },
  };
}
export function acceptanceScenario(count = 10_000): ExactOptimizationInput {
  const events = Array.from({ length: count }, (_, i) =>
    request(
      String(i).padStart(6, "0"),
      i % 2 === 0 ? 14_000 : 7_000,
      i % 2 === 0 ? "fixture-small" : "fixture-medium",
      new Date(Date.UTC(2026, 8, 1 + Math.floor(i / (count / 5)) * 7)).toISOString(),
    ),
  );
  const input = scenario(events, [
    { id: "plan-a", price: "20", limits: [quota(count / 10)] },
    { id: "plan-b", price: "100", limits: [quota(count / 5)] },
  ]);
  const first = input.catalog.providers["fixture-provider"];
  const model = input.catalog.models["fixture-medium"];
  if (first === undefined || model === undefined) throw new Error("Missing fixture provider/model");
  input.catalog.providers["fixture-second"] = { ...first, id: "fixture-second" };
  model.providerIds = ["fixture-second"];
  input.resources = [...input.resources, { target: { type: "api", providerId: "fixture-second" } }];
  return input;
}
