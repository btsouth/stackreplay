// biome-ignore-all lint/style/noNonNullAssertion: synthetic fixture shapes are constructed in this file.

import { compiledExecutionPlanSchema } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { ns, replayCompiledResource, resourceReadiness } from "./compiled-capacity.js";
import { migrateLegacyObservation, migrateLegacyWindow } from "./compiled-legacy.js";
import { optimizeCompiledExactModels } from "./compiled-optimizer.js";
import {
  compiledScenario,
  end,
  models,
  multiConstraintPlan,
  namedPoolsPlan,
  start,
  syntheticApi,
  syntheticPlan,
} from "./fixtures/compiled-execution.js";
import { request } from "./fixtures/exact-optimizer.js";
import { sliceFirstUseAnchoredWindows, sliceRollingWindows, toTimedEvents } from "./windows.js";

const optimize = optimizeCompiledExactModels;
function replay(input: ReturnType<typeof compiledScenario>) {
  return replayCompiledResource(
    { artifact: input.artifacts[0]!, binding: input.scenario.resources[0]! },
    input.scenario,
    input.events.map((event) => ({
      event,
      at: ns(event.occurredAt),
      modelId: event.model.canonicalId!,
      routeId:
        input.artifacts[0]!.computation.kind === "executable"
          ? input.artifacts[0]!.computation.routes.find((r) =>
              r.models.includes(event.model.canonicalId!),
            )!.id
          : "included-route",
    })),
  );
}
function seed(
  input: ReturnType<typeof compiledScenario>,
  constraintId = "cap",
  consumedUnits = "1",
  windowId = `monthly:${start}`,
  windowStart = start,
  windowEnd = end,
  poolId = "included",
) {
  input.scenario.initial.observations.push({
    resourceInstanceId: input.scenario.resources[0]!.id,
    artifactHash: input.artifacts[0]!.artifactHash,
    poolId,
    constraintId,
    window: { id: windowId, start: windowStart, end: windowEnd },
    asOf: input.scenario.period.start,
    consumedUnits,
    latched: false,
    observationRef: "fresh",
  });
}
describe("compiled execution contract", () => {
  it("F1 opaque capacity is not computable; known fixed fee can certify a cheaper API witness", () => {
    const p = {
      ...syntheticPlan("opaque", "0", "100"),
      computation: {
        kind: "not_computable" as const,
        reasons: [{ code: "opaque_capacity" as const, subject: "allowance", claimRefs: ["claim"] }],
      },
    };
    const input = compiledScenario(2, [p, syntheticApi("api", "6")]);
    const result = optimize(input);
    expect(result.winnerId).toBe("api");
    expect(result.search.familyComplete).toBe(false);
    expect(result.candidates.find((c) => c.id === "opaque")?.status).toBe("not_computable");
    if (p.purchase.kind === "subscription") p.purchase.fixedUsd = null;
    expect(optimize(input).winnerId).toBeUndefined();
  });
  it("F2 independent overlapping initial counters and atomic rejection", () => {
    const p = multiConstraintPlan(),
      input = compiledScenario(0, [p]);
    input.scenario.period.start = "2026-09-12T00:00:00Z";
    input.scenario.resources[0]!.firstUse.session = {
      id: "active",
      start: "2026-09-11T23:00:00Z",
      end: "2026-09-12T04:00:00Z",
    };
    seed(input, "cap", "50");
    seed(input, "model-cap", "19");
    seed(
      input,
      "weekly-cap",
      "25",
      "weekly:2026-09-07T00:00:00Z",
      "2026-09-07T00:00:00Z",
      "2026-09-14T00:00:00Z",
    );
    seed(input, "session-cap", "10", "active", "2026-09-11T23:00:00Z", "2026-09-12T04:00:00Z");
    input.events = [
      request("a", 2000000, models[0], input.scenario.period.start),
      request("b", 4000000, models[1], "2026-09-12T00:01:00Z"),
    ];
    const result = replay(input);
    expect(result.accepted).toBe(1);
    expect(result.variableUsd).toBe("0");
    expect(result.debits[0]?.units).toBe("4");
    expect(
      result.capacity.map((c) => [c.constraintId, c.initial, c.accepted, c.crossings]),
    ).toEqual([
      ["cap", "50", "4", 0],
      ["weekly-cap", "25", "4", 0],
      ["session-cap", "10", "4", 0],
      ["model-cap", "19", "0", 1],
    ]);
    input.events = [...input.events, request("reset", 1000000, models[1], "2026-09-12T04:00:00Z")];
    expect(replay(input).accepted).toBe(2);
  });
  it("F3 four-week non-carrying slices and synthetic multiplier", () => {
    const p = syntheticPlan("slices", "10");
    p.computation.meters = [{ id: "requests", kind: "usd_usage_value" }];
    p.purchase = { kind: "subscription", term: "28_days", fixedUsd: "20", claimRefs: ["claim"] };
    const cycleEnd = "2026-09-29T00:00:00Z";
    p.computation.windows = [
      {
        id: "slice",
        kind: "fixed_partition",
        parentCycleId: "cycle",
        intervals: Array.from({ length: 4 }, (_, i) => ({
          id: `s${i}`,
          start: new Date(Date.parse(start) + i * 7 * 86400000).toISOString(),
          end: new Date(Date.parse(start) + (i + 1) * 7 * 86400000).toISOString(),
        })),
      },
    ];
    p.computation.constraints[0]!.windowId = "slice";
    p.computation.debits[0]!.operation = { kind: "rate", rateId: "rate", factor: "0.5" };
    const input = compiledScenario(0, [p]);
    input.scenario.period.end = cycleEnd;
    input.scenario.resources[0]!.cycle!.end = cycleEnd;
    input.events = [
      request("s1", 12000000),
      request("s2", 12000000, models[0], "2026-09-08T00:00:00Z"),
      request("s3", 12000000, models[0], "2026-09-08T00:01:00Z"),
    ];
    const result = replay(input);
    expect(result.accepted).toBe(2);
    expect(result.capacity.map((c) => c.accepted)).toEqual(["6", "6"]);
    input.scenario.period.end = end;
    expect(optimize(input).candidates[0]?.reasons[0]?.code).toBe("unsupported_purchase");
  });
  it("F4 named pools cannot borrow", () => {
    const p = namedPoolsPlan();
    p.computation.debits[0]!.operation = { kind: "constant", amount: "3" };
    p.computation.debits[1]!.operation = { kind: "constant", amount: "5" };
    const input = compiledScenario(2, [p]);
    seed(input, "cap", "8");
    const result = replay(input);
    expect(result.accepted).toBe(1);
    expect(result.capacity.map((c) => [c.poolId, c.initial, c.accepted])).toEqual([
      ["included", "8", "0"],
      ["other", "0", "5"],
    ]);
  });
  it("F5 scoped credits and unknown cohort are not USD or eligible by default", () => {
    const p = syntheticPlan();
    p.computation.meters = [
      { id: "requests", kind: "provider_credit", unitId: "issuer-a:credit-v1" },
    ];
    p.computation.debits[0]!.operation = { kind: "constant", amount: "2" };
    const input = compiledScenario(40, [p]);
    seed(input, "cap", "20");
    expect(replay(input).debits[0]?.units).toBe("80");
    expect(replay(input).variableUsd).toBe("0");
    p.requirements = [{ id: "cohort", claimRefs: ["claim"] }];
    expect(optimize(input).candidates[0]?.status).toBe("not_computable");
    input.scenario.resources[0]!.facts.cohort = "false";
    expect(optimize(input).candidates[0]?.status).toBe("unavailable");
    const other = { ...p.computation.meters[0]!, unitId: "issuer-b:credit-v1" };
    expect(other).not.toEqual(p.computation.meters[0]);
  });
  it("F6 debit multipliers and money remain independent", () => {
    const p = syntheticPlan("allowance", "60", "5");
    p.computation.debits[0]!.operation = { kind: "constant", amount: "6" };
    const input = compiledScenario(2, [p, syntheticApi()]);
    seed(input, "cap", "50");
    const result = optimize(input);
    const hybrid = result.candidates.find((c) => c.id === "allowance+api");
    expect(hybrid?.variableUsd).toBe("1");
    expect(hybrid?.fixedUsd).toBe("5");
    p.computation.debits[0]!.operation = { kind: "constant", amount: "3" };
    expect(optimize(input).candidates.find((c) => c.id === "allowance+api")?.variableUsd).toBe("0");
    p.computation.routes[0]!.cash = { rateId: "rate", factor: "2" };
    const receipt = replay(input);
    expect(receipt.debits[0]?.units).toBe("6");
    expect(receipt.variableUsd).toBe("4");
  });
  it.each([
    "unsupported_trailing_window",
    "measurement_missing",
    "unknown_debit",
    "unsupported_continuation",
  ] as const)("truthfully rejects %s", (code) => {
    const p = {
      ...syntheticPlan(),
      computation: {
        kind: "not_computable" as const,
        reasons: [{ code, subject: "unsupported", claimRefs: ["claim"] }],
      },
    };
    expect(optimize(compiledScenario(2, [p])).candidates[0]?.status).toBe("not_computable");
  });
  it.each(["0", "1", "2"])("initial use %s is deterministic and not charged", (consumed) => {
    const input = compiledScenario(2, [syntheticPlan("p", "2")]);
    seed(input, "cap", consumed);
    const a = replay(input);
    expect(a.accepted).toBe(2 - Number(consumed));
    expect(a.variableUsd).toBe("0");
    expect(replay(input)).toEqual(a);
  });
  it.each(["wrong-artifact", "excess", "stale", "wrong-window", "conflict"])(
    "rejects invalid initial state: %s",
    (kind) => {
      const input = compiledScenario(1, [syntheticPlan("p", "2")]);
      seed(input);
      const o = input.scenario.initial.observations[0]!;
      if (kind === "wrong-artifact") o.artifactHash = "wrong";
      if (kind === "excess") o.consumedUnits = "3";
      if (kind === "stale") o.asOf = "2026-08-31T00:00:00Z";
      if (kind === "wrong-window") o.window.id = "wrong";
      if (kind === "conflict")
        input.scenario.initial.observations.push({ ...o, consumedUnits: "2" });
      expect(replay(input).status).toBe("not_computable");
    },
  );
  it("unknown initial state and unknown first-use anchor are not fresh", () => {
    const input = compiledScenario(1, [syntheticPlan()]);
    input.scenario.period.start = "2026-09-12T00:00:00Z";
    input.events = [request("e", 1, models[0], input.scenario.period.start)];
    input.scenario.initial.unlisted = "unknown";
    expect(replay(input).reasons[0]?.code).toBe("initial_state_unknown");
    const p = multiConstraintPlan();
    const first = compiledScenario(1, [p]);
    expect(replay(first).reasons[0]?.code).toBe("reset_unknown");
  });
  it("shared first-use activation survives later model arrival and half-open reset", () => {
    const p = multiConstraintPlan();
    p.computation.constraints = p.computation.constraints.filter((c) => c.id === "session-cap");
    p.computation.constraints.push({
      ...p.computation.constraints[0]!,
      id: "subset",
      models: [models[0]!],
      amount: "1",
    });
    p.computation.windows = p.computation.windows.filter((w) => w.id === "session");
    const input = compiledScenario(0, [p]);
    input.scenario.resources[0]!.firstUse.session = "inactive";
    input.events = [
      request("b", 1, models[1]),
      request("a", 2000000, models[0], "2026-09-01T01:00:00Z"),
      request("reset", 1000000, models[0], "2026-09-01T05:00:00Z"),
    ];
    const result = replay(input);
    expect(result.accepted).toBe(2);
    expect(result.capacity.find((c) => c.constraintId === "subset")?.window.start).toBe(start);
    expect(result.capacity.filter((c) => c.constraintId === "subset")).toHaveLength(2);
  });
  it("aggregate logs retain API arithmetic without subscription feasibility", () => {
    const input = compiledScenario();
    input.scenario.chronology = "aggregate";
    const r = optimize(input);
    expect(r.candidates.find((c) => c.id === "api")?.totalUsd).toBe("2");
    expect(r.candidates.find((c) => c.id === "plan")?.status).toBe("not_computable");
  });
  it("full-cycle fees with cycle preceding workload; no prorating", () => {
    const input = compiledScenario(1, [syntheticPlan()]);
    input.scenario.period.start = "2026-09-12T00:00:00Z";
    input.scenario.period.end = "2026-09-13T00:00:00Z";
    input.events = [request("e", 1, models[0], input.scenario.period.start)];
    expect(optimize(input).candidates[0]?.totalUsd).toBe("20");
  });
  it("scope, unknowns, recognized unpriced work and exact models", () => {
    const input = compiledScenario(0, [syntheticPlan(), syntheticApi()]);
    input.events = [
      request("unknown", 1, "unknown"),
      request("known", 1000000),
      request("missing", 1, "fixture-medium"),
    ];
    for (const p of input.artifacts)
      if (p.computation.kind === "executable")
        for (const route of p.computation.routes) route.models = ["fixture-small"];
    const r = optimize(input);
    expect(r.scope.excluded).toBe(1);
    expect(
      r.candidates.every((c) => c.required === 2 && c.excluded === 1 && c.status === "infeasible"),
    ).toBe(true);
  });
  it("missing rates are not infeasible and cannot disappear", () => {
    const p = syntheticApi();
    p.computation.rates = [];
    const r = optimize(compiledScenario(1, [p]));
    expect(r.candidates[0]?.status).toBe("not_computable");
    expect(r.scope.required).toBe(1);
  });
  it("route-specific cash rates beat provider-only identity", () => {
    const a = syntheticApi("route-a", "5"),
      b = syntheticApi("route-b", "2");
    const r = optimize(compiledScenario(2, [a, b]));
    expect(r.candidates[0]?.totalUsd).toBe("4");
    expect(r.explanation?.assignments.every((a) => a.resourceInstanceId === "route-b")).toBe(true);
  });
  it("weighted matching preserves scarce capacity regardless of plan order", () => {
    const a = syntheticPlan("a", "1", "1"),
      b = syntheticPlan("b", "1", "1");
    b.computation.routes[0]!.models = [models[0]!];
    const input = compiledScenario(2, [a, b]);
    const r = optimize(input);
    expect(r.winnerId).toBe("a+b");
    input.artifacts = [...input.artifacts].reverse();
    input.scenario.resources.reverse();
    expect(optimize(input).explanation).toEqual(r.explanation);
  });
  it("43 candidate bound and deterministic ties", () => {
    const input = compiledScenario(1, [
      ...Array.from({ length: 6 }, (_, i) => syntheticPlan(`p${i}`, "2", "1")),
      syntheticApi(),
    ]);
    const r = optimize(input);
    expect(r.candidates).toHaveLength(43);
    expect(r.winnerId).toBe("p0");
    expect(optimize(input)).toEqual(r);
  });
  it("rich branching is not evaluated at 100k, while deterministic multi-constraint replay remains supported", () => {
    const p = multiConstraintPlan();
    for (const c of p.computation.constraints) c.amount = "1000000";
    const input = compiledScenario(100000, [p, syntheticApi()]);
    input.scenario.resources[0]!.firstUse.session = "inactive";
    const r = optimize(input);
    expect(r.candidates.find((c) => c.id === "multi+api")?.status).toBe("not_evaluated");
    expect(r.candidates.find((c) => c.id === "multi")?.status).toBe("feasible");
  }, 30000);
  it("legacy rolling migration preserves first-use semantics without accepting trailing", () => {
    expect(
      migrateLegacyWindow(
        "catalog-v1",
        "w",
        { type: "rolling", duration: "PT5H", anchor: "first_use" },
        models,
      ).kind,
    ).toBe("first_use_anchored");
    const events = toTimedEvents([
      request("a"),
      request("b", 1, models[0], "2026-09-01T05:00:00Z"),
    ]);
    expect(sliceFirstUseAnchoredWindows(events, 18000000)).toEqual(
      sliceRollingWindows(events, 18000000),
    );
    const p = syntheticPlan();
    (p.computation.windows[0] as unknown as { kind: string }).kind = "rolling";
    expect(compiledExecutionPlanSchema.safeParse(p).success).toBe(false);
  });
  it("legacy initial migration requires explicit compiled target and separate local provenance", () => {
    const o = migrateLegacyObservation(
      { limitId: "old", windowStart: start, windowEnd: end, consumedUnits: "3", evidence: "user" },
      {
        resourceInstanceId: "r",
        artifactHash: "a",
        poolId: "p",
        constraintId: "c",
        asOf: start,
        observationRef: "local-legacy",
        windowInstanceId: "w",
      },
    );
    expect(o.consumedUnits).toBe("3");
    expect(o.observationRef).toBe("local-legacy");
  });
  it("invalid meter references and duplicated pools cannot silently convert units", () => {
    const p = syntheticPlan();
    p.computation.debits[0]!.meterId = "other-credit";
    const i = compiledScenario(1, [p]);
    expect(
      resourceReadiness({ artifact: p, binding: i.scenario.resources[0]! }, i.scenario).status,
    ).toBe("not_computable");
  });
});

describe("compiled boundary adversaries", () => {
  it("API access false is unavailable; unknown access is not computable", () => {
    const p = syntheticApi();
    p.requirements = [{ id: "access", claimRefs: ["claim"] }];
    const input = compiledScenario(1, [p]);
    expect(optimize(input).candidates[0]?.status).toBe("not_computable");
    input.scenario.resources[0]!.facts.access = "false";
    expect(optimize(input).candidates[0]?.status).toBe("unavailable");
  });
  it("cash receipt category totals reproduce the monetary amount with cached and reasoning tokens", () => {
    const input = compiledScenario(1, [syntheticApi()]);
    input.events = [
      {
        ...input.events[0]!,
        usage: {
          ...input.events[0]!.usage,
          inputTokens: 1000,
          cacheReadTokens: 500,
          cacheWriteTokens: 100,
          outputTokens: 200,
          reasoningTokens: 100,
        },
      },
    ];
    const r = optimize(input);
    const receipt = r.explanation?.receipts[0];
    expect(receipt?.variableUsd).toBe("0.001775");
    expect(receipt?.cash.map((l) => l.category)).toContain("cacheRead");
  });
  it("different credit systems remain separate in a two-resource receipt", () => {
    const a = syntheticPlan("a", "1", "1"),
      b = syntheticPlan("b", "1", "1");
    a.computation.routes[0]!.models = [models[0]!];
    b.computation.routes[0]!.models = [models[1]!];
    a.computation.meters = [{ id: "requests", kind: "provider_credit", unitId: "a:credit:v1" }];
    b.computation.meters = [{ id: "requests", kind: "provider_credit", unitId: "b:credit:v1" }];
    const r = optimize(compiledScenario(2, [a, b]));
    expect(r.winnerId).toBe("a+b");
    expect(r.explanation?.receipts.map((x) => x.debits[0]?.resourceInstanceId)).toEqual(["a", "b"]);
  });
  it("unpriced recognized tokens cannot vanish from required scope", () => {
    const p = syntheticApi();
    delete p.computation.rates[0]!.rates.cacheRead;
    const input = compiledScenario(1, [p]);
    input.events = [
      { ...input.events[0]!, usage: { ...input.events[0]!.usage, cacheReadTokens: 7 } },
    ];
    const r = optimize(input);
    expect(r.scope.required).toBe(1);
    expect(r.candidates[0]?.status).toBe("not_computable");
    expect(r.candidates[0]?.reasons[0]?.code).toBe("price_unknown");
  });
  it("ambiguous conditional rates do not make array order a pricing rule", () => {
    const p = syntheticApi();
    p.computation.rates[0]!.tiers = [1, 2].map((i) => ({
      id: `tier-${i}`,
      label: "Synthetic tier",
      when: { inputTokensAbove: 1 },
      rates: { input: String(i), output: "1", cacheRead: "1", cacheWrite: "1", reasoning: "1" },
    }));
    expect(optimize(compiledScenario(2, [p])).candidates[0]?.status).toBe("not_computable");
  });
  it("sub-nanosecond-boundary ordering is not rounded to milliseconds", () => {
    const p = syntheticPlan("p", "1");
    p.computation.windows = [
      {
        id: "w",
        kind: "first_use_anchored",
        durationMs: 1000,
        activationModels: models,
        trigger: "first_eligible_offer",
      },
    ];
    p.computation.constraints[0]!.windowId = "w";
    const input = compiledScenario(0, [p]);
    input.scenario.resources[0]!.firstUse.w = "inactive";
    input.events = [
      request("a", 1, models[0], "2026-09-01T00:00:00.000000001Z"),
      request("b", 1, models[0], "2026-09-01T00:00:01Z"),
      request("c", 1, models[0], "2026-09-01T00:00:01.000000001Z"),
    ];
    expect(replay(input).accepted).toBe(2);
  });
  it("initial observations are deduplicated but never summed across overlapping counters", () => {
    const input = compiledScenario(2, [syntheticPlan("p", "3")]);
    seed(input);
    input.scenario.initial.observations.push({ ...input.scenario.initial.observations[0]! });
    expect(replay(input).accepted).toBe(2);
  });
  it("purchased-resource sharing cannot duplicate an account pool", () => {
    const input = compiledScenario(2, [syntheticPlan("a", "1"), syntheticPlan("b", "1")]);
    for (const r of input.scenario.resources) r.sharedCapacityIds = ["same-account"];
    expect(optimize(input).candidates.find((c) => c.id === "a+b")?.status).toBe("not_computable");
  });
  it("pinned rule validity ends at its exclusive boundary", () => {
    const input = compiledScenario(1);
    input.scenario.rulesAt = end;
    expect(optimize(input).candidates.every((c) => c.status === "not_computable")).toBe(true);
  });
});

it("annual purchase is explicitly non-computable, not silently a monthly fee", () => {
  const p = syntheticPlan();
  if (p.purchase.kind === "subscription") p.purchase.term = "annual";
  expect(optimize(compiledScenario(1, [p])).candidates[0]?.reasons[0]?.code).toBe(
    "unsupported_purchase",
  );
});
it("token coefficients debit only the declared meter, independently of cash", () => {
  const p = syntheticPlan("tokens", "2000000");
  p.computation.meters = [{ id: "requests", kind: "token" }];
  p.computation.debits[0]!.operation = {
    kind: "tokens",
    coefficients: [{ category: "uncachedInputTokens", coefficient: "2" }],
  };
  const result = replay(compiledScenario(2, [p]));
  expect(result.accepted).toBe(1);
  expect(result.debits[0]?.units).toBe("2000000");
  expect(result.variableUsd).toBe("0");
});
it("richer overlapping weighted credits use exact allocation, not plan-order greedy", () => {
  const a = syntheticPlan("a", "1.5", "1"),
    b = syntheticPlan("b", "1.5", "1");
  for (const p of [a, b]) {
    p.computation.meters = [
      { id: "requests", kind: "provider_credit", unitId: `${p.planId}:credit` },
    ];
    p.computation.debits[0]!.operation = { kind: "constant", amount: "1.5" };
  }
  b.computation.routes[0]!.models = [models[0]!];
  const input = compiledScenario(2, [a, b]);
  const r = optimize(input);
  expect(r.winnerId).toBe("a+b");
  expect(r.candidates[0]?.allocation).toBe("exhaustive-replay");
  input.scenario.resources.reverse();
  expect(optimize(input).explanation).toEqual(r.explanation);
});
it("aggregate cash and debit receipts preserve integer quantities beyond Number.MAX_SAFE_INTEGER", () => {
  const p = syntheticApi();
  const input = compiledScenario(2, [p]);
  input.events = [request("a", 9007199254740991), request("b", 9007199254740991)];
  expect(() => optimize(input)).toThrow("Aggregate token counts exceed");
  expect(replay(input).cash.find((c) => c.category === "input")?.tokens).toBe("18014398509481982");
  const sub = syntheticPlan("p", "99999999999999999");
  sub.computation.debits[0]!.operation = {
    kind: "tokens",
    coefficients: [{ category: "uncachedInputTokens", coefficient: "1" }],
  };
  const other = compiledScenario(0, [sub]);
  other.events = input.events;
  const run = replay(other);
  expect(run.debits[0]?.components[0]?.quantity).toBe("18014398509481982");
  expect(run.debits[0]?.units).toBe("18014398509481982");
});
it("credit-denominated token rates cannot be charged as USD or debit another credit system implicitly", () => {
  const p = syntheticPlan("credits", "100");
  p.computation.meters = [
    { id: "requests", kind: "provider_credit", unitId: "a:credit" },
    { id: "foreign", kind: "provider_credit", unitId: "b:credit" },
  ];
  p.computation.rates[0]!.denomination = { meterId: "foreign" };
  p.computation.debits[0]!.operation = { kind: "rate", rateId: "rate", factor: "1" };
  const input = compiledScenario(1, [p]);
  expect(replay(input).reasons[0]?.subject).toBe("implicit_unit_conversion");
  p.computation.debits[0]!.operation.conversion = true;
  expect(replay(input).debits[0]?.units).toBe("1");
  p.computation.routes[0]!.cash = { rateId: "rate", factor: "1" };
  expect(replay(input).status).toBe("not_computable");
});
it("resource IDs containing separators cannot collide with combination or API candidate IDs", () => {
  const input = compiledScenario(1, [
    syntheticPlan("a+b"),
    syntheticPlan("a"),
    syntheticPlan("b"),
    syntheticPlan("api"),
    syntheticApi("paid"),
  ]);
  const r = optimize(input);
  expect(new Set(r.candidates.map((c) => c.id)).size).toBe(r.candidates.length);
});
