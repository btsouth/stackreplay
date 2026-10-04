import { subscriptionTargetV1Schema } from "@stackreplay/schema";
import { expect, it } from "vitest";
import { replay } from "./engine.js";
import { optimizeExactModels } from "./exact-optimizer.js";
import {
  fixtureContext,
  fixtureTarget,
  makeFixtureCatalog,
  rollingLimit,
} from "./fixtures/catalog.js";
import { quota, request, scenario } from "./fixtures/exact-optimizer.js";
import { type CapacityEvidenceV1, evaluateStackCandidate } from "./optimizer.js";
import { planWithQuantity } from "./plan-quantity.js";

const catalog = makeFixtureCatalog({
  limits: [rollingLimit({ id: "requests", type: "request_limit", amount: "2" })],
  priceAmount: "9.99",
});
const events = [request("a"), request("b"), request("c"), request("d"), request("e")];
const evidence: CapacityEvidenceV1 = {
  kind: "synthetic",
  sources: [
    {
      url: "https://example.invalid/quantity",
      title: "Synthetic quantity",
      checkedAt: "2026-09-01",
    },
  ],
  lastVerifiedAt: "2026-09-01",
  notes: "Synthetic request pool.",
};

it("defaults absent quantity to one and rejects out of range or fractional quantities", () => {
  expect(subscriptionTargetV1Schema.parse(fixtureTarget).quantity).toBeUndefined();
  for (const quantity of [0, -1, 11, 1.5])
    expect(subscriptionTargetV1Schema.safeParse({ ...fixtureTarget, quantity }).success).toBe(
      false,
    );
});

it("scales aggregate admission and price exactly without mutating the catalog or reset schedule", () => {
  const original = JSON.stringify(catalog);
  const single = replay({ catalog, events, context: fixtureContext, target: fixtureTarget });
  const double = replay({
    catalog,
    events,
    context: fixtureContext,
    target: { ...fixtureTarget, quantity: 2 },
  });
  expect(single.coverage.requests.covered).toBe(2);
  expect(double.coverage.requests.covered).toBe(4);
  expect(double.subscription?.price.amount).toBe("19.98");
  expect(double.assumptions.some((a) => a.id === "aggregate-account-capacity")).toBe(true);
  expect(JSON.stringify(catalog)).toBe(original);
  const version = Object.values(catalog.planVersions)[0];
  if (!version) throw new Error("Missing fixture version");
  expect(planWithQuantity(version, 2).limits[0]?.window).toEqual(version.limits[0]?.window);
  expect(planWithQuantity(version, 2).limits[0]?.amount).toBe("4");
});

it("charges every purchased account in priority candidates and doubles numeric capacity", () => {
  const result = evaluateStackCandidate({
    events,
    catalog,
    context: fixtureContext,
    target: {
      type: "hybrid",
      routes: [{ priority: 0, target: { ...fixtureTarget, quantity: 2 } }],
    },
    period: { start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" },
    capacityEvidence: { 0: evidence },
  });
  expect(result.costs.fixed).toBe("19.98");
  expect(result.coverage.covered).toBe(4);
  expect(result.coverage.unserved).toBe(1);
});

it("uses the same quantity cost and capacity in exact optimizer search", () => {
  const input = scenario(events.slice(0, 4), [
    { id: "double-plan", price: "9.99", limits: [quota(2)] },
  ]);
  for (const resource of input.resources)
    if (resource.target.type === "subscription") resource.target.quantity = 2;
  const result = optimizeExactModels(input);
  const candidate = result.candidates.find((c) => c.subscriptions.length === 1 && !c.apiAllowed);
  expect(candidate?.fixedCost).toBe("19.98");
  expect(candidate?.subscriptionRecords).toBe(4);
});
