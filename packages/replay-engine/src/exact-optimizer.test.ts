import { describe, expect, it } from "vitest";
import { replayObservingQuotes, replayWithReceipt } from "./engine.js";
import {
  compareExactCandidates,
  explainExactCandidate,
  optimizeExactModels,
} from "./exact-optimizer.js";
import { overlappingUsage } from "./fixtures/events.js";
import {
  acceptanceScenario,
  quota,
  request,
  scenario,
  syntheticCapacity,
} from "./fixtures/exact-optimizer.js";
import { parseAmount, ZERO } from "./money.js";
import type { ExactOptimizationInput, ExactOptimizationResult } from "./optimizer-types.js";

function candidate(result: ExactOptimizationResult, plans: string[], api: boolean) {
  const selected = result.candidates.find(
    (entry) =>
      entry.apiAllowed === api &&
      entry.subscriptions.length === plans.length &&
      plans.every((id) => entry.subscriptions.some((ref) => ref.startsWith(`subscription:${id}@`))),
  );
  if (selected === undefined) throw new Error("Missing fixture candidate");
  return selected;
}
function winner(result: ExactOptimizationResult) {
  const selected = result.candidates.find((entry) => entry.id === result.winnerId);
  if (selected === undefined) throw new Error("No certified winner");
  return selected;
}

describe("bounded exact-model optimizer", () => {
  it("derives the two-model, two-provider 10k acceptance result", () => {
    const input = acceptanceScenario();
    const result = optimizeExactModels(input);
    expect(result.status).toBe("optimal");
    expect(result.search).toMatchObject({ candidateCount: 7, retainedAssignmentSets: 1 });
    expect(candidate(result, ["plan-a"], false).status).toBe("infeasible");
    expect(candidate(result, ["plan-b"], false).totalCost).toBe("100");
    expect(candidate(result, [], true).totalCost).toBe("140");
    expect(winner(result)).toMatchObject({
      subscriptions: ["subscription:plan-a@2026-08-01"],
      fixedCost: "20",
      variableCost: "70",
      totalCost: "90",
      subscriptionRecords: 5000,
      apiRecords: 5000,
      exactModelPreservation: 1,
    });
    expect(result.explanation?.assignments).toHaveLength(10_000);
    expect(
      result.explanation?.resources
        .filter((entry) => entry.id.startsWith("api:"))
        .reduce((sum, entry) => sum + Number(entry.receipt?.total), 0),
    ).toBe(70);
    expect(
      result.explanation?.assignments.filter((entry) => entry.reason === "capacity-reserved"),
    ).toHaveLength(5000);
    expect(
      result.explanation?.pools
        .filter((entry) => entry.resourceId.includes("plan-a"))
        .every((entry) => entry.used === entry.capacity),
    ).toBe(true);
    expect(
      result.candidates.every(
        (entry) =>
          entry.scopeId === result.scope.id &&
          entry.recordsRequired === 10_000 &&
          entry.recordsExcluded === 0,
      ),
    ).toBe(true);
  });

  it("reconstructs a nonwinner on demand without retaining all assignments", () => {
    const input = scenario([request("a")]);
    const result = optimizeExactModels(input);
    const id = candidate(result, ["plan-a"], false).id;
    expect(explainExactCandidate(input, id)).toMatchObject({
      candidateId: id,
      assignments: [{ eventId: "a", resourceId: "subscription:plan-a@2026-08-01" }],
    });
    expect(result.candidates.every((entry) => !("assignments" in entry))).toBe(true);
    expect(() => explainExactCandidate(input, "missing")).toThrow(/Candidate ID/);
  });

  it("supports API-only input and no-API subscription input", () => {
    const input = scenario([request("a")]);
    expect(
      winner(
        optimizeExactModels({
          ...input,
          resources: input.resources.filter((entry) => entry.target.type === "api"),
        }),
      ).totalCost,
    ).toBe("1");
    expect(
      winner(
        optimizeExactModels({
          ...input,
          resources: input.resources.filter((entry) => entry.target.type === "subscription"),
        }),
      ).totalCost,
    ).toBe("20");
  });

  it("charges the full purchase cycle for a one-hour import", () => {
    const input = scenario([request("a", 100_000_000)]);
    input.period.end = "2026-09-01T01:00:00Z";
    expect(winner(optimizeExactModels(input)).totalCost).toBe("20");
  });

  it("does not stretch a February monthly purchase into a second cycle", () => {
    const input = scenario([request("a", 1_000_000, "fixture-small", "2026-02-01T00:00:00Z")]);
    input.period = { start: "2026-02-01T00:00:00Z", end: "2026-03-04T00:00:00Z" };
    expect(() => optimizeExactModels(input)).toThrow(/multi-cycle billing/);
    input.period.end = "2026-03-01T00:00:00Z";
    expect(optimizeExactModels(input).status).toBe("optimal");
  });

  it("a higher fixed price wins when it saves more overflow", () => {
    const result = optimizeExactModels(
      scenario(
        [request("a", 30_000_000), request("b", 30_000_000), request("c", 30_000_000)],
        [
          { id: "cheap", price: "5", limits: [quota(1)] },
          { id: "larger", price: "40", limits: [quota(3)] },
        ],
      ),
    );
    expect(candidate(result, ["cheap"], true).totalCost).toBe("65");
    expect(winner(result).subscriptions).toEqual(["subscription:larger@2026-08-01"]);
    expect(winner(result).totalCost).toBe("40");
  });

  it("exact cost ties prefer lower variable spend, then stable plan IDs", () => {
    const input = scenario(
      [request("a", 20_000_000)],
      [
        { id: "z-plan", price: "20", limits: [quota(1)] },
        { id: "a-plan", price: "20", limits: [quota(1)] },
      ],
    );
    const result = optimizeExactModels(input);
    expect(winner(result).variableCost).toBe("0");
    expect(winner(result).subscriptions).toEqual(["subscription:a-plan@2026-08-01"]);
    expect(optimizeExactModels({ ...input, resources: [...input.resources].reverse() })).toEqual(
      result,
    );
    expect([...result.candidates].reverse().sort(compareExactCandidates)).toEqual(
      result.candidates,
    );
  });

  it("equal-cost ties prefer fewer purchased subscriptions", () => {
    const result = optimizeExactModels(
      scenario(
        [request("a", 50_000_000)],
        [
          { id: "a", price: "0", limits: [quota(1)] },
          { id: "b", price: "0", limits: [quota(1)] },
        ],
      ),
    );
    expect(winner(result).subscriptions).toHaveLength(1);
  });

  it("deduplicates plans, omits irrelevant models and bounds pairs", () => {
    const input = scenario(
      [request("a")],
      [
        { id: "a", price: "1", limits: [quota(1)] },
        { id: "b", price: "2", limits: [quota(1)] },
        { id: "irrelevant", price: "0", limits: [quota(1)], models: ["fixture-medium"] },
      ],
    );
    input.resources = [...input.resources, ...input.resources.slice(0, 2)];
    const result = optimizeExactModels(input);
    expect(result.search.candidateCount).toBe(7);
    expect(result.skippedResources.map((entry) => entry.reason).sort()).toEqual([
      "duplicate-resource",
      "duplicate-resource",
      "supports-no-required-model",
    ]);
    expect(
      optimizeExactModels({ ...input, limits: { maxSubscriptions: 1 } }).search.candidateCount,
    ).toBe(5);
  });

  it("never buys two versions of the same subscription", () => {
    const input = scenario([request("a")]);
    const old = input.catalog.planVersions["plan-a@2026-08-01"];
    const plan = input.catalog.plans["plan-a"];
    if (old === undefined || plan === undefined) throw new Error("Fixture missing");
    old.effectiveTo = "2026-08-31";
    const raw = plan.versions[0];
    if (raw === undefined) throw new Error("Fixture missing");
    raw.effectiveTo = old.effectiveTo;
    const next = { ...old, effectiveFrom: "2026-09-01", versionId: "plan-a@2026-09-01" };
    delete next.effectiveTo;
    input.catalog.planVersions[next.versionId] = next;
    const rawNext = { ...raw, effectiveFrom: next.effectiveFrom };
    delete rawNext.effectiveTo;
    plan.versions.push(rawNext);
    input.resources = [
      ...input.resources,
      {
        target: { type: "subscription", planVersionId: old.versionId },
        capacityEvidence: syntheticCapacity,
      },
    ];
    const result = optimizeExactModels(input);
    expect(result.candidates.every((entry) => entry.subscriptions.length <= 1)).toBe(true);
  });

  it("unknown identities are excluded once, identically for every candidate", () => {
    const result = optimizeExactModels(
      scenario([request("known"), request("unknown", 10, "undeclared")]),
    );
    expect(result.scope).toMatchObject({
      recorded: 2,
      required: 1,
      exclusions: [{ eventId: "unknown", reason: "unresolved-model" }],
      excludedCostImpact: "unbounded",
    });
    expect(
      result.candidates.every(
        (entry) => entry.recordsRequired === 1 && entry.recordsExcluded === 1,
      ),
    ).toBe(true);
    expect(result.explanation?.assignments.map((entry) => entry.eventId)).toEqual(["known"]);
  });

  it("unpriced recognized calls remain required and cannot make API look cheap", () => {
    const input = scenario([request("a"), request("b")]);
    const pricing = input.catalog.pricing["fixture-small-pricing"];
    if (pricing === undefined) throw new Error("Fixture missing");
    pricing.effectiveTo = "2026-08-31";
    const result = optimizeExactModels(input);
    expect(result.scope).toMatchObject({ required: 2, apiPriceable: 0, exclusions: [] });
    expect(candidate(result, [], true)).toMatchObject({ status: "infeasible", recordsRequired: 2 });
    expect(candidate(result, [], true).totalCost).toBeUndefined();
    expect(winner(result).totalCost).toBe("20");
    expect(winner(result).recordsModeled).toBe(2);
  });

  it("an unsupported exact model makes subscription-only infeasible", () => {
    const result = optimizeExactModels(
      scenario(
        [request("a", 1_000_000, "fixture-medium")],
        [{ id: "small-only", price: "0", limits: [quota(1)], models: ["fixture-small"] }],
      ),
    );
    expect(result.skippedResources).toContainEqual({
      id: "subscription:small-only@2026-08-01",
      reason: "supports-no-required-model",
    });
    expect(winner(result).apiRecords).toBe(1);
    const mixed = optimizeExactModels(
      scenario(
        [request("a"), request("b", 1_000_000, "fixture-medium")],
        [{ id: "small-only", price: "0", limits: [quota(2)], models: ["fixture-small"] }],
      ),
    );
    expect(candidate(mixed, ["small-only"], false).status).toBe("infeasible");
    expect(winner(mixed).exactModelPreservation).toBe(1);
  });

  it("refuses model translation explicitly", () => {
    const input = scenario([request("a")]);
    const resource = input.resources[0];
    if (resource === undefined) throw new Error("Fixture missing");
    resource.target.modelTranslation = {
      id: "policy",
      name: "Different model",
      version: "1",
      provenance: "builtin-scenario",
      transform: "token-preserving",
      rules: [{ sourceModelId: "fixture-small", targetModelId: "fixture-medium" }],
    };
    expect(() => optimizeExactModels(input)).toThrow(/exact models/);
  });

  it("moves an earlier flexible call to preserve a scarce subscription", () => {
    const input = scenario(
      [request("a-flexible"), request("b-scarce", 1_000_000, "fixture-medium")],
      [
        { id: "a-flex", price: "0", limits: [quota(1)] },
        { id: "z-small", price: "0", limits: [quota(1)], models: ["fixture-small"] },
      ],
    );
    input.resources = input.resources.filter((entry) => entry.target.type === "subscription");
    const result = optimizeExactModels(input);
    expect(winner(result).subscriptions).toHaveLength(2);
    expect(result.explanation?.assignments.map((entry) => entry.resourceId)).toEqual([
      "subscription:z-small@2026-08-01",
      "subscription:a-flex@2026-08-01",
    ]);
    expect(
      optimizeExactModels({
        ...input,
        resources: [...input.resources].reverse(),
        events: [...input.events].reverse(),
      }),
    ).toEqual(result);
  });

  it("reserves quota for expensive later calls instead of arrival-order greedy", () => {
    const result = optimizeExactModels(
      scenario(
        [request("a-cheap", 1_000_000), request("b-expensive", 50_000_000)],
        [{ id: "a", price: "5", limits: [quota(1)] }],
      ),
    );
    expect(winner(result).totalCost).toBe("6");
    expect(result.explanation?.assignments.map((entry) => [entry.eventId, entry.reason])).toEqual([
      ["a-cheap", "capacity-reserved"],
      ["b-expensive", "subscription"],
    ]);
  });

  it("mandatory unpriced calls take precedence over expensive priceable calls", () => {
    const input = scenario(
      [request("a-priceable", 100_000_000), request("b-unpriced", 1_000_000, "fixture-medium")],
      [{ id: "a", price: "5", limits: [quota(1)] }],
    );
    const pricing = input.catalog.pricing["fixture-medium-pricing"];
    if (pricing === undefined) throw new Error("Fixture missing");
    pricing.effectiveTo = "2026-08-31";
    const result = optimizeExactModels(input);
    expect(winner(result)).toMatchObject({
      totalCost: "105",
      subscriptionRecords: 1,
      apiRecords: 1,
    });
    expect(result.explanation?.assignments[1]?.reason).toBe("subscription");
  });

  it.each(["day", "week", "month"] as const)(
    "uses existing %s calendar reset semantics",
    (unit) => {
      const second =
        unit === "week"
          ? "2026-09-07T00:00:00Z"
          : unit === "month"
            ? "2026-09-02T00:00:00Z"
            : "2026-09-02T00:00:00Z";
      const result = optimizeExactModels(
        scenario(
          [request("a", 50_000_000), request("b", 50_000_000, "fixture-small", second)],
          [{ id: "a", price: "1", limits: [quota(1, unit)] }],
        ),
      );
      expect(winner(result).apiRecords).toBe(unit === "month" ? 1 : 0);
    },
  );

  it("supports overlapping pools with different timezone boundaries", () => {
    const shifted = quota(1);
    shifted.window = { type: "calendar", unit: "day", timezone: "America/New_York" };
    const input = scenario(
      [
        request("a", 5_000_000, "fixture-small", "2026-09-01T23:00:00Z"),
        request("b", 5_000_000, "fixture-small", "2026-09-02T01:00:00Z"),
        request("c", 5_000_000, "fixture-small", "2026-09-02T05:00:00Z"),
      ],
      [
        { id: "a", price: "0", limits: [quota(1)] },
        { id: "b", price: "0", limits: [shifted] },
      ],
    );
    expect(winner(optimizeExactModels(input)).totalCost).toBe("0");
  });

  it("uses exhaustive replay for weighted token and combined window constraints", () => {
    const tokens = { ...quota(5), type: "token_limit" as const };
    const rolling = {
      ...quota(1),
      id: "session",
      window: { type: "rolling" as const, duration: "PT5H", anchor: "first_use" as const },
    };
    const result = optimizeExactModels(
      scenario(
        [request("a", 5), request("b", 5, "fixture-medium")],
        [{ id: "a", price: "0", limits: [tokens, rolling] }],
      ),
    );
    expect(winner(result)).toMatchObject({
      allocation: "exhaustive-replay",
      totalCost: "0.000005",
    });
    expect(result.explanation?.assignments.map((entry) => entry.reason)).toEqual([
      "capacity-reserved",
      "subscription",
    ]);
    expect(result.explanation?.capacityChecks[0]?.violations.length).toBeGreaterThan(0);
  });

  it("does not freeze first-use anchors from the original demand before assignment", () => {
    const rolling = {
      ...quota(1),
      window: { type: "rolling" as const, duration: "PT5H", anchor: "first_use" as const },
    };
    const result = optimizeExactModels(
      scenario(
        [
          request("a", 1_000_000),
          request("b", 50_000_000, "fixture-small", "2026-09-01T04:00:00Z"),
          request("c", 50_000_000, "fixture-small", "2026-09-01T06:00:00Z"),
        ],
        [{ id: "a", price: "1", limits: [rolling] }],
      ),
    );
    // Assigning b and c together would illegally reuse a window anchored at a.
    expect(winner(result).totalCost).toBe("51");
    expect(
      result.explanation?.assignments
        .filter((entry) => entry.reason === "subscription")
        .map((entry) => entry.eventId),
    ).toEqual(["a", "c"]);
  });

  it("withholds a winner when a competitive candidate exceeds exact search bounds", () => {
    const rolling = {
      ...quota(1),
      window: { type: "rolling" as const, duration: "PT5H", anchor: "first_use" as const },
    };
    const input = scenario(
      [request("a"), request("b"), request("c")],
      [{ id: "a", price: "0", limits: [rolling] }],
    );
    input.limits = { maxAssignmentStates: 1 };
    const result = optimizeExactModels(input);
    expect(result.status).toBe("incomplete");
    expect(result.winnerId).toBeUndefined();
    expect(result.bestKnownId).toBe("api-only");
    expect(candidate(result, ["a"], true).status).toBe("unavailable");
  });

  it("can certify a winner if unevaluated configurations already cost more to buy", () => {
    const rolling = {
      ...quota(1),
      window: { type: "rolling" as const, duration: "PT5H", anchor: "first_use" as const },
    };
    const input = scenario(
      [request("a"), request("b")],
      [{ id: "a", price: "100", limits: [rolling] }],
    );
    input.limits = { maxAssignmentStates: 1 };
    expect(winner(optimizeExactModels(input)).id).toBe("api-only");
  });

  it("requires explicit starting allowance and rejects invalid supplied consumption", () => {
    const input = scenario([request("a")]);
    expect(optimizeExactModels(input).search.initialAllowance).toEqual({ kind: "fresh" });
    expect(() =>
      optimizeExactModels({
        ...input,
        initialAllowance: {
          kind: "provided",
          unlistedPools: "fresh",
          entries: [
            {
              resourceId: "a",
              limitId: "daily",
              consumedUnits: "1",
              windowStart: input.period.start,
              windowEnd: input.period.end,
              evidence: "meter",
            },
          ],
        },
      }),
    ).toThrow(/unavailable/);
    expect(() =>
      optimizeExactModels({
        ...input,
        initialAllowance: undefined,
      } as unknown as ExactOptimizationInput),
    ).toThrow(/Initial allowance/);
  });

  it("aggregate logs retain flat API cost but cannot claim subscription survival", () => {
    const input = scenario([request("daily", 100_000_000)]);
    input.chronology.default = "aggregate";
    const result = optimizeExactModels(input);
    expect(result.scope).toMatchObject({ required: 1, apiPriceable: 1, capacityEligible: 0 });
    expect(candidate(result, [], true)).toMatchObject({
      status: "feasible",
      totalCost: "100",
      capacityEvaluation: "not-applicable",
    });
    expect(candidate(result, ["plan-a"], false)).toMatchObject({
      status: "unavailable",
      capacityEvaluation: "unavailable",
    });
    expect(result.status).toBe("incomplete");
    expect(result.winnerId).toBeUndefined();
  });

  it("ccusage cannot be mislabeled as chronological; mixed overrides remain explicit", () => {
    const input = scenario([request("aggregate"), request("native")]);
    const aggregate = input.events[0];
    if (aggregate === undefined) throw new Error("Fixture missing");
    aggregate.source.adapterId = "ccusage";
    const result = optimizeExactModels(input);
    expect(result.scope.events.map((entry) => entry.granularity)).toEqual(["aggregate", "request"]);
    expect(result.scope.capacityEligible).toBe(1);
  });

  it("does not apply request-size price tiers to aggregate token totals", () => {
    const input = scenario([request("aggregate")], []);
    input.chronology.default = "aggregate";
    const pricing = input.catalog.pricing["fixture-small-pricing"];
    if (pricing === undefined) throw new Error("Fixture missing");
    pricing.tiers = [
      {
        id: "large",
        label: "Large request",
        when: { inputTokensAbove: 100 },
        rates: { ...pricing.rates, input: "3", output: "5" },
      },
    ];
    const result = optimizeExactModels(input);
    expect(result.scope.apiPriceable).toBe(0);
    expect(result.scope.apiEligibility).toContainEqual({
      resourceId: "api:fixture-provider",
      reason: "aggregate-needs-request-level-pricing",
      records: 1,
    });
    expect(result.status).toBe("infeasible");
  });

  it("retains evidence and marks only safe observed-scope dominance", () => {
    const result = optimizeExactModels(scenario([request("a", 100_000_000)]));
    expect(winner(result).capacityConfidence).toBe("estimated");
    expect(result.resources.some((entry) => entry.capacityEvidence?.kind === "synthetic")).toBe(
      true,
    );
    for (const entry of result.candidates.filter((entry) => entry.dominatedBy !== undefined)) {
      const dominator = result.candidates.find((other) => other.id === entry.dominatedBy);
      expect(dominator?.subscriptions).toEqual(entry.subscriptions);
      expect(dominator?.recordsRequired).toBe(entry.recordsRequired);
    }
  });

  it("empty/unknown-only workloads do not recommend a purchase", () => {
    for (const events of [[], [request("unknown", 1, "unknown")]]) {
      const result = optimizeExactModels(scenario(events));
      expect(result.status).toBe("empty");
      expect(result.winnerId).toBeUndefined();
      expect(result.explanation).toBeUndefined();
    }
  });

  it("does not mutate input and handles zero-priced API demand", () => {
    const input = scenario([request("zero", 0)]);
    const before = JSON.stringify(input);
    expect(winner(optimizeExactModels(input)).totalCost).toBe("0");
    expect(JSON.stringify(input)).toBe(before);
  });

  it("uses disjoint cache/reasoning prices to reserve capacity for the dearer call", () => {
    const cached = request("cached");
    cached.usage = overlappingUsage({
      inputTokens: 3_000_000,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
      outputTokens: 2_000_000,
      reasoningTokens: 1_000_000,
    });
    const result = optimizeExactModels(
      scenario(
        [cached, request("expensive", 8_000_000)],
        [{ id: "free", price: "0", limits: [quota(1)] }],
      ),
    );
    expect(winner(result).totalCost).toBe("7.1");
    expect(
      result.explanation?.resources.find((entry) => entry.id.startsWith("api:"))?.receipt?.lines,
    ).toHaveLength(5);
  });

  it("uses fewer API records as the tie after price and purchase count", () => {
    const result = optimizeExactModels(scenario([request("a")]));
    const base = candidate(result, [], true);
    expect(
      compareExactCandidates(
        { ...base, id: "z", apiRecords: 0 },
        { ...base, id: "a", apiRecords: 1 },
      ),
    ).toBeLessThan(0);
  });

  it("keeps one assignment set for a 100k-event, seven-candidate optimization", () => {
    const result = optimizeExactModels(acceptanceScenario(100_000));
    expect(result.status).toBe("optimal");
    expect(result.search).toMatchObject({ candidateCount: 7, retainedAssignmentSets: 1 });
    expect(winner(result)).toMatchObject({
      totalCost: "100",
      subscriptionRecords: 100_000,
      apiRecords: 0,
      recordsRequired: 100_000,
    });
    expect(result.explanation?.assignments).toHaveLength(100_000);
    expect(
      result.candidates.every((entry) => !("assignments" in entry) && !("events" in entry)),
    ).toBe(true);
  }, 30_000);

  it("streams API quotes from the same arithmetic as replay receipts", () => {
    const input = scenario([request("a", 123456), request("b", 789012, "fixture-medium")]);
    const replayInput = {
      events: input.events,
      catalog: input.catalog,
      context: input.context,
      target: { type: "api" as const, providerId: "fixture-provider" },
    };
    let total = ZERO;
    let quotes = 0;
    const result = replayObservingQuotes(replayInput, (_event, outcome, quote) => {
      expect(outcome).toBe("priced");
      expect(quote.pricingId).toBeDefined();
      total = total.plus(quote.amount ?? "0");
      quotes++;
    });
    const receiptRun = replayWithReceipt(replayInput);
    expect(result).toEqual(receiptRun.result);
    expect(total.eq(parseAmount(receiptRun.receipt?.total ?? "0"))).toBe(true);
    expect(quotes).toBe(2);
    expect(() =>
      replayObservingQuotes(
        { ...replayInput, target: { type: "subscription", planId: "plan-a" } },
        () => {},
      ),
    ).toThrow(/Direct API/);
  });

  it("never sorts a malformed feasible candidate as zero-cost", () => {
    const result = optimizeExactModels(scenario([request("a")]));
    const valid = winner(result);
    const malformed = { ...valid };
    delete malformed.totalCost;
    expect(() => compareExactCandidates(valid, malformed)).toThrow(/complete monetary costs/);
  });

  it("rejects invalid scope/configuration before comparing", () => {
    const input = scenario([request("a")]);
    expect(() =>
      optimizeExactModels({ ...input, events: [...input.events, ...input.events] }),
    ).toThrow(/Duplicate/);
    expect(() =>
      optimizeExactModels({ ...input, period: { ...input.period, end: "2026-11-01T00:00:00Z" } }),
    ).toThrow(/31 days/);
    expect(() =>
      optimizeExactModels({
        ...input,
        chronology: { default: "request", evidence: "test", byEventId: { absent: "aggregate" } },
      }),
    ).toThrow(/absent event/);
  });
});
