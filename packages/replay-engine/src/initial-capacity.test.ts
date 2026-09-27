// biome-ignore-all lint/style/noNonNullAssertion: These assertions address deterministic fixture members.
import { describe, expect, it } from "vitest";
import { explainExactCandidate, optimizeExactModels } from "./exact-optimizer.js";
import { quota, request, scenario } from "./fixtures/exact-optimizer.js";
import type { ExactOptimizationInput, InitialAllowanceState } from "./optimizer-types.js";

function setup(consumed = "1", unit: "day" | "week" | "month" = "month") {
  const input = scenario(
    [request("a", 100000000), request("b", 100000000)],
    [{ id: "a", price: "1", limits: [quota(2, unit)] }],
  );
  input.initialAllowance = {
    kind: "provided",
    unlistedPools: "fresh",
    entries: [
      {
        resourceId: "subscription:a@2026-01-01",
        limitId: `requests-${unit}`,
        windowStart: "2026-09-01T00:00:00Z",
        windowEnd: "2026-10-01T00:00:00Z",
        consumedUnits: consumed,
        evidence: "Synthetic prior workload; no historical calls added.",
      },
    ],
  };
  const id = Object.keys(input.catalog.planVersions)[0];
  input.initialAllowance.entries[0]!.resourceId = `subscription:${id}`;
  return input;
}
function best(input: ExactOptimizationInput) {
  const result = optimizeExactModels(input);
  return { result, winner: result.candidates.find((c) => c.id === result.winnerId)! };
}
describe("explicit initial allowance", () => {
  it.each(["0", "1", "2"])("uses %s consumed requests without billing them again", (consumed) => {
    const input = setup(consumed);
    const { result, winner } = best(input);
    expect(winner.totalCost).toBe(consumed === "2" ? "200" : String(1 + Number(consumed) * 100));
    const sub = result.candidates.find((c) => c.subscriptions.length === 1 && c.apiAllowed)!;
    expect(sub.subscriptionRecords).toBe(2 - Number(consumed));
    expect(sub.variableCost).toBe(String(Number(consumed) * 100));
    expect(result.search.initialAllowance).toEqual(input.initialAllowance);
  });
  it("distinguishes workload start, existing quota start and purchase charge", () => {
    const input = setup();
    input.period = { start: "2026-09-12T00:00:00Z", end: "2026-10-12T00:00:00Z" };
    input.events = input.events.map((e) => ({ ...e, occurredAt: "2026-09-12T12:00:00Z" }));
    expect(best(input).winner).toMatchObject({ fixedCost: "1", variableCost: "100" });
  });
  it("resets initial consumption exactly at the end of its window", () => {
    const input = setup("2");
    input.period = { start: "2026-09-12T00:00:00Z", end: "2026-10-12T00:00:00Z" };
    input.events = [
      request("a", 100000000, "fixture-small", "2026-09-30T23:59:59.999999999Z"),
      request("b", 100000000, "fixture-small", "2026-10-01T00:00:00Z"),
    ];
    expect(best(input).winner).toMatchObject({
      subscriptionRecords: 1,
      apiRecords: 1,
      totalCost: "101",
    });
  });
  it("independently seeds multiple limits using the authoritative replay oracle", () => {
    const input = setup("1");
    const version = Object.values(input.catalog.planVersions)[0]!;
    version.limits.push(quota(2, "day"));
    const state = input.initialAllowance as Extract<InitialAllowanceState, { kind: "provided" }>;
    input.initialAllowance = {
      ...state,
      entries: [
        ...state.entries,
        {
          ...state.entries[0]!,
          limitId: "requests-day",
          windowEnd: "2026-09-02T00:00:00Z",
          consumedUnits: "2",
        },
      ],
    };
    const result = best(input).result;
    expect(
      result.candidates.find((c) => c.subscriptions.length === 1 && c.apiAllowed),
    ).toMatchObject({ apiRecords: 2, allocation: "exhaustive-replay" });
  });
  it("anchors first-use windows before the import and then opens new first-use windows", () => {
    const input = setup("1");
    const version = Object.values(input.catalog.planVersions)[0]!;
    version.limits[0]!.window = { type: "rolling", duration: "PT5H", anchor: "first_use" };
    input.period = { start: "2026-09-01T02:00:00Z", end: "2026-09-02T00:00:00Z" };
    const state = input.initialAllowance as Extract<InitialAllowanceState, { kind: "provided" }>;
    input.initialAllowance = {
      ...state,
      entries: [{ ...state.entries[0]!, windowEnd: "2026-09-01T05:00:00Z" }],
    };
    input.events = [
      request("a", 100000000, "fixture-small", "2026-09-01T04:00:00Z"),
      request("b", 100000000, "fixture-small", "2026-09-01T05:00:00Z"),
    ];
    expect(best(input).winner).toMatchObject({ totalCost: "1", subscriptionRecords: 2 });
  });
  it("supports token starting consumption and preserves prior latch state", () => {
    const input = setup("1");
    const version = Object.values(input.catalog.planVersions)[0]!;
    version.limits[0]!.type = "token_limit";
    version.limits[0]!.amount = "200000000";
    let state = input.initialAllowance as Extract<InitialAllowanceState, { kind: "provided" }>;
    input.initialAllowance = {
      ...state,
      entries: [{ ...state.entries[0]!, consumedUnits: "100000000" }],
    };
    expect(best(input).winner.totalCost).toBe("101");
    version.limits[0]!.exceed = "latch_until_reset";
    state = input.initialAllowance as Extract<InitialAllowanceState, { kind: "provided" }>;
    input.initialAllowance = { ...state, entries: [{ ...state.entries[0]!, latched: true }] };
    expect(
      best(input).result.candidates.find((c) => c.subscriptions.length && c.apiAllowed)?.apiRecords,
    ).toBe(2);
  });
  it("seeds credit units without charging prior usage and retains evidence in receipts' context", () => {
    const input = setup("1");
    Object.values(input.catalog.planVersions)[0]!.limits[0]!.type = "credit_pool";
    input.events = [request("a"), request("b")];
    const { result, winner } = best(input);
    expect(winner).toMatchObject({ subscriptionRecords: 1, apiRecords: 1, totalCost: "2" });
    const resource = result.explanation!.resources.find((r) => r.initialCapacity !== undefined)!;
    expect(resource.initialCapacity!.entries[0]!.evidence).toContain("Synthetic prior workload");
    expect(resource.result.constraints[0]!.consumedUnits).toBe("1");
  });
  it("explains a prior latch without fabricating a historical crossing", () => {
    const input = setup("0");
    Object.values(input.catalog.planVersions)[0]!.limits[0]!.exceed = "latch_until_reset";
    const state = input.initialAllowance as Extract<InitialAllowanceState, { kind: "provided" }>;
    input.initialAllowance = { ...state, entries: [{ ...state.entries[0]!, latched: true }] };
    const result = optimizeExactModels(input);
    const candidate = result.candidates.find((c) => c.subscriptions.length === 1 && c.apiAllowed)!;
    const explanation = explainExactCandidate(input, candidate.id);
    expect(explanation.pools[0]!.initialLatched).toBe(true);
    expect(explanation.pools[0]!.capacity).toBe(0);
    expect(
      explanation.resources.find((r) => r.initialCapacity !== undefined)!.initialCapacity!
        .entries[0]!.latched,
    ).toBe(true);
  });
  it.each(["3", "-1", "0.5"])("rejects invalid request consumption %s", (consumed) =>
    expect(() => best(setup(consumed))).toThrow(),
  );
  it("rejects misaligned, duplicate, future and unknown state; requires explicit unlisted-pool assumption", () => {
    for (const patch of [
      { windowStart: "2026-09-02T00:00:00Z" },
      { windowEnd: "2026-10-02T00:00:00Z" },
      { limitId: "absent" },
      { latched: true },
    ]) {
      const input = setup();
      const state = input.initialAllowance as Extract<InitialAllowanceState, { kind: "provided" }>;
      input.initialAllowance = { ...state, entries: [{ ...state.entries[0]!, ...patch }] };
      expect(() => best(input)).toThrow();
    }
    const input = setup();
    const state = input.initialAllowance as Extract<InitialAllowanceState, { kind: "provided" }>;
    input.initialAllowance = { ...state, entries: [...state.entries, ...state.entries] };
    expect(() => best(input)).toThrow(/duplicate/);
    input.initialAllowance = {
      ...state,
      unlistedPools: undefined,
    } as unknown as InitialAllowanceState;
    expect(() => best(input)).toThrow();
  });
  it("zero supplied use agrees with fresh allowance and repeated runs do not consume shared state", () => {
    const input = setup("0");
    const before = JSON.parse(JSON.stringify(input));
    const first = best(input);
    expect(best(input)).toEqual(first);
    expect(input).toEqual(before);
    expect(best({ ...input, initialAllowance: { kind: "fresh" } }).winner).toEqual(first.winner);
  });
});

it("retains unknown-only exclusions even when a supplied subscription becomes irrelevant", () => {
  const input = setup();
  input.events = [{ ...request("unknown"), model: { rawName: "unresolved-name" } }];
  const result = optimizeExactModels(input);
  expect(result.status).toBe("empty");
  expect(result.scope.exclusions).toHaveLength(1);
});
