import type { CatalogV1, PlanLimitV1 } from "@stackreplay/catalog";
import type { HybridTargetV1, TextUsageEventV1 } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { replay, replayWithReceipt } from "./engine.js";
import {
  calendarLimit,
  fixtureContext,
  fixtureModels,
  fixtureTarget,
  makeFixtureCatalog,
  rollingLimit,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent, overlappingUsage } from "./fixtures/events.js";
import {
  type CapacityEvidenceV1,
  evaluateStackCandidate,
  type StackCandidateInput,
} from "./optimizer.js";

const evidence: CapacityEvidenceV1 = {
  kind: "synthetic",
  sources: [
    {
      url: "https://example.invalid/capacity",
      title: "Synthetic capacity",
      checkedAt: "2026-09-01",
    },
  ],
  lastVerifiedAt: "2026-09-01",
  notes: "Deterministic test quota, not a real subscription.",
};
const sub = { priority: 0, target: fixtureTarget };
const api = { priority: 1, target: { type: "api", providerId: "fixture-provider" } } as const;
const period = { start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" };
const requestLimit = (amount = "2") =>
  rollingLimit({ id: "five-hour", type: "request_limit", amount });
function catalog(limits: PlanLimitV1[] = [requestLimit()]): CatalogV1 {
  return JSON.parse(
    JSON.stringify(
      makeFixtureCatalog({
        limits,
        models: Object.fromEntries(
          Object.entries(fixtureModels).map(([id, model]) => [
            id,
            { ...model, providerIds: ["fixture-provider"] },
          ]),
        ),
      }),
    ),
  );
}
function event(id: string, occurredAt = "2026-09-01T00:00:00Z", tokens = 1_000_000) {
  return makeEvent({ id, occurredAt, usage: completeUsage({ uncachedInputTokens: tokens }) });
}
function input(
  events: TextUsageEventV1[],
  overrides: Partial<StackCandidateInput> = {},
): StackCandidateInput {
  return {
    events,
    catalog: catalog(),
    context: fixtureContext,
    period,
    target: { type: "hybrid", routes: [sub, api] },
    capacityEvidence: { 0: evidence },
    ...overrides,
  };
}
const only = (...routes: HybridTargetV1["routes"]): HybridTargetV1 => ({ type: "hybrid", routes });

describe("configured exact-model stack capacity replay", () => {
  it("charges once, routes overflow only, and preserves original replay results", () => {
    const events = [event("a"), event("b"), event("c")];
    const candidate = input(events);
    const result = evaluateStackCandidate(candidate);
    expect(result.costs).toMatchObject({
      fixed: "20",
      variable: "1",
      modeledTotal: "21",
      complete: true,
    });
    expect(result.coverage).toEqual({ recorded: 3, covered: 3, excluded: 0, unserved: 0 });
    expect(result.assignments.map((entry) => entry.assignedPriority)).toEqual([0, 0, 1]);
    expect(result.assignments[2]?.attempts).toEqual([
      { priority: 0, outcome: "blocked", blockingLimitIds: ["five-hour"] },
      { priority: 1, outcome: "priced", blockingLimitIds: [] },
    ]);
    expect(result.routes[0]?.result).toEqual(replay({ ...candidate, target: fixtureTarget }));
    expect(result.routes[1]?.receipt?.total).toBe("1");
    expect(result.routes[1]?.receipt?.lines[0]).toMatchObject({
      tokens: 1_000_000,
      ratePerMillion: "1.00",
      subtotal: "1",
    });
    expect(result.capacityRejectedCalls).toBe(1);
    expect(result.exactModelCalls).toBe(3);
  });

  it("identical volume, different bursts give different capacity outcomes", () => {
    const burst = evaluateStackCandidate(
      input([event("a"), event("b"), event("c")], { target: only(sub) }),
    );
    const even = evaluateStackCandidate(
      input([event("a"), event("b", "2026-09-01T05:00:00Z"), event("c", "2026-09-01T10:00:00Z")], {
        target: only(sub),
      }),
    );
    expect(burst.status).toBe("infeasible");
    expect(burst.coverage.unserved).toBe(1);
    expect(even.status).toBe("complete");
  });

  it("first-use reset is half-open and preserves nanosecond precision", () => {
    const result = evaluateStackCandidate(
      input(
        [
          event("a", "2026-09-01T00:00:00.000000001Z"),
          event("b", "2026-09-01T05:00:00.000000000Z"),
          event("c", "2026-09-01T05:00:00.000000001Z"),
        ],
        { catalog: catalog([requestLimit("1")]) },
      ),
    );
    expect(result.assignments.map((entry) => entry.assignedPriority)).toEqual([0, 1, 0]);
  });

  it.each([
    ["day", "UTC", "2026-09-01T23:59:59Z", "2026-09-02T00:00:00Z"],
    ["week", "UTC", "2026-09-06T23:59:59Z", "2026-09-07T00:00:00Z"],
    ["day", "America/New_York", "2026-09-02T03:59:59Z", "2026-09-02T04:00:00Z"],
  ] as const)("calendar %s reset in %s", (unit, timezone, before, after) => {
    const limit = calendarLimit({
      id: "calendar",
      type: "request_limit",
      amount: "1",
      window: { type: "calendar", unit, timezone },
    });
    const result = evaluateStackCandidate(
      input([event("a", before), event("b", before), event("c", after)], {
        catalog: catalog([limit]),
      }),
    );
    expect(result.assignments.map((entry) => entry.assignedPriority)).toEqual([0, 1, 0]);
  });

  it("a weekly rejection consumes no capacity from the next five-hour pool", () => {
    const result = evaluateStackCandidate(
      input(
        [
          event("a", "2026-09-06T22:00:00Z"),
          event("b", "2026-09-06T23:00:00Z"),
          event("c", "2026-09-07T00:00:00Z"),
        ],
        {
          catalog: catalog([
            requestLimit("2"),
            calendarLimit({
              id: "weekly",
              type: "request_limit",
              amount: "1",
              window: { type: "calendar", unit: "week", timezone: "UTC" },
            }),
          ]),
        },
      ),
    );
    expect(result.assignments.map((entry) => entry.assignedPriority)).toEqual([0, 1, 0]);
    expect(result.assignments[1]?.attempts[0]?.blockingLimitIds).toEqual(["weekly"]);
  });

  it("retains every simultaneously blocking rule", () => {
    const result = evaluateStackCandidate(
      input([event("a"), event("b")], {
        catalog: catalog([
          requestLimit("1"),
          calendarLimit({
            id: "daily",
            type: "request_limit",
            amount: "1",
            window: { type: "calendar", unit: "day", timezone: "UTC" },
          }),
        ]),
      }),
    );
    expect(result.assignments[1]?.attempts[0]?.blockingLimitIds).toEqual(["five-hour", "daily"]);
  });

  it("latches until reset while plain rejection admits a smaller later call", () => {
    const events = [
      event("a", undefined, 2),
      event("b", undefined, 1),
      event("c", "2026-09-01T05:00:00Z", 1),
    ];
    const limit = rollingLimit({
      id: "tokens",
      type: "token_limit",
      amount: "1",
      exceed: "latch_until_reset",
    });
    expect(
      evaluateStackCandidate(input(events, { catalog: catalog([limit]) })).assignments.map(
        (entry) => entry.assignedPriority,
      ),
    ).toEqual([1, 1, 0]);
    expect(
      evaluateStackCandidate(
        input(events, { catalog: catalog([{ ...limit, exceed: "reject_request" }]) }),
      ).assignments.map((entry) => entry.assignedPriority),
    ).toEqual([1, 0, 0]);
  });

  it("prices every disjoint category and handles overlapping cache/reasoning", () => {
    const mixed = makeEvent({
      id: "mixed",
      occurredAt: period.start,
      usage: overlappingUsage({
        inputTokens: 3_000_000,
        cacheReadTokens: 1_000_000,
        cacheWriteTokens: 1_000_000,
        outputTokens: 2_000_000,
        reasoningTokens: 1_000_000,
      }),
    });
    const result = evaluateStackCandidate(input([mixed], { target: only(api) }));
    expect(result.costs).toMatchObject({ fixed: "0", variable: "7.1", modeledTotal: "7.1" });
    expect(result.routes[0]?.receipt?.lines).toHaveLength(5);
  });

  it("credit pool admission uses existing token-price conversion", () => {
    const result = evaluateStackCandidate(
      input([event("a"), event("b")], {
        catalog: catalog([rollingLimit({ id: "credits", type: "credit_pool", amount: "1" })]),
      }),
    );
    expect(result.assignments.map((entry) => entry.assignedPriority)).toEqual([0, 1]);
    expect(result.costs.variable).toBe("1");
  });

  it("preserves useful scoped costs with unknown calls", () => {
    const unknown = makeEvent({
      id: "unknown",
      occurredAt: period.start,
      model: { rawName: "not-in-catalog" },
    });
    const result = evaluateStackCandidate(input([event("a"), unknown], { target: only(api) }));
    expect(result.status).toBe("partial");
    expect(result.costs).toMatchObject({ modeledTotal: "1", complete: false });
    expect(result.coverage).toEqual({ recorded: 2, covered: 1, excluded: 1, unserved: 0 });
    expect(result.excludedCostImpact).toBe("unbounded");
    expect(result.assignments[1]?.attempts[0]?.outcome).toBe("unresolved");
    expect(result.routes[0]?.result.economics).toBeUndefined();
  });

  it("missing prices and missing telemetry remain exclusions, never free calls", () => {
    const cat = catalog();
    delete cat.pricing["fixture-small-pricing"];
    cat.plans = {};
    cat.planVersions = {};
    const missingPrice = evaluateStackCandidate(
      input([event("a")], { catalog: cat, target: only(api) }),
    );
    expect(missingPrice.coverage.excluded).toBe(1);
    expect(missingPrice.costs.complete).toBe(false);
    const incomplete = makeEvent({ id: "incomplete", occurredAt: period.start, usage: {} });
    expect(
      evaluateStackCandidate(input([incomplete], { target: only(api) })).assignments[0]?.attempts[0]
        ?.outcome,
    ).toBe("usage_incomplete");
  });

  it("missing category pricing keeps priced calls in the receipt", () => {
    const medium = (id: string, reasoningTokens: number) =>
      makeEvent({
        id,
        occurredAt: period.start,
        model: { canonicalId: "fixture-medium", rawName: "fixture-medium" },
        usage: completeUsage({ uncachedInputTokens: 1_000_000, reasoningTokens }),
      });
    const result = evaluateStackCandidate(
      input([medium("a", 0), medium("b", 1)], { target: only(api) }),
    );
    expect(result.costs.modeledTotal).toBe("2");
    expect(result.coverage).toMatchObject({ covered: 1, excluded: 1 });
    expect(result.assignments[1]?.attempts[0]?.outcome).toBe("price_category_undocumented");
  });

  it("empty and one-call workloads retain explicit billing semantics", () => {
    expect(evaluateStackCandidate(input([]))).toMatchObject({
      status: "empty",
      costs: { fixed: "20", variable: "0" },
      coverage: { recorded: 0 },
    });
    expect(evaluateStackCandidate(input([], { target: only(api) })).costs.modeledTotal).toBe("0");
    expect(
      evaluateStackCandidate(input([event("a")])).routes.map((route) => route.callsAssigned),
    ).toEqual([1, 0]);
  });

  it("multiple subscriptions and providers preserve each model and charge unused plans", () => {
    const cat = catalog([requestLimit("1")]);
    const second = makeFixtureCatalog({
      planId: "second",
      priceAmount: "100",
      limits: [requestLimit("1")],
      models: cat.models,
    });
    Object.assign(cat.plans, second.plans);
    Object.assign(cat.planVersions, second.planVersions);
    const result = evaluateStackCandidate(
      input([event("a"), event("b"), event("c")], {
        catalog: cat,
        target: only(
          sub,
          { priority: 1, target: { type: "subscription", planId: "second" } },
          { ...api, priority: 2 },
        ),
        capacityEvidence: { 0: evidence, 1: evidence },
      }),
    );
    expect(result.assignments.map((entry) => entry.assignedPriority)).toEqual([0, 1, 2]);
    expect(result.costs.modeledTotal).toBe("121");
    const unused = evaluateStackCandidate(
      input([event("a")], {
        catalog: cat,
        target: only(sub, { priority: 1, target: { type: "subscription", planId: "second" } }),
        capacityEvidence: { 0: evidence, 1: evidence },
      }),
    );
    expect(unused.costs.fixed).toBe("120");
  });

  it("routes distinct models through their recorded provider offerings", () => {
    const cat = catalog();
    const provider = cat.providers["fixture-provider"];
    const model = cat.models["fixture-medium"];
    if (provider === undefined || model === undefined) throw new Error("Missing fixture");
    cat.providers.second = { ...provider, id: "second" };
    model.providerIds = ["second"];
    const medium = makeEvent({
      id: "b",
      occurredAt: period.start,
      model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
    });
    const result = evaluateStackCandidate(
      input([event("a"), medium], {
        catalog: cat,
        target: only(api, { priority: 2, target: { type: "api", providerId: "second" } }),
      }),
    );
    expect(result.costs.modeledTotal).toBe("3");
    expect(result.assignments.map((entry) => entry.assignedPriority)).toEqual([1, 2]);
  });

  it.each([
    "synthetic",
    "published-hard-limit",
    "published-estimate",
    "relative-provider-limit",
    "empirical-user-calibration",
    "inferred",
  ] as const)("keeps %s capacity evidence separate from price evidence", (kind) => {
    const cat = makeFixtureCatalog({ limits: [requestLimit()], verificationStatus: "verified" });
    const result = evaluateStackCandidate(
      input([event("a")], {
        catalog: cat,
        target: only(sub),
        capacityEvidence: { 0: { ...evidence, kind } },
      }),
    );
    expect(result.routes[0]?.capacity?.confidence).toBe(
      kind === "published-hard-limit"
        ? "high-confidence-modeled"
        : kind === "empirical-user-calibration"
          ? "user-calibrated"
          : "estimated",
    );
    expect(result.routes[0]?.capacity?.evidence.kind).toBe(kind);
  });

  it("deterministic ordering, no mutation, and observers do not change replay", () => {
    const candidate = input([event("b"), event("a")], { target: only(api, sub) });
    const before = JSON.stringify(candidate);
    const result = evaluateStackCandidate(candidate);
    expect(result).toEqual(
      evaluateStackCandidate({ ...candidate, events: [...candidate.events].reverse() }),
    );
    expect(result.assignments.map((entry) => entry.eventId)).toEqual(["a", "b"]);
    expect(JSON.stringify(candidate)).toBe(before);
    const replayInput = { ...candidate, target: fixtureTarget };
    expect(replayWithReceipt(replayInput, { subscription: () => {} })).toEqual(
      replayWithReceipt(replayInput),
    );
  });

  it.each([
    { target: only(sub, sub) },
    { target: only(sub, { ...sub, priority: 2 }) },
    { target: only({ ...sub, conditions: { fallbackOnly: true } }) },
    { period: { ...period, end: period.start } },
    { period: { ...period, end: "2026-11-01T00:00:00Z" } },
    { capacityEvidence: {} },
  ])("refuses unsupported or ambiguous scenario %j", (overrides) => {
    expect(() => evaluateStackCandidate(input([event("a")], overrides))).toThrow();
  });

  it("rejects out-of-period events, duplicates, and invalid timestamps", () => {
    for (const events of [[event("a", period.end)], [event("a"), event("a")], [event("a", "bad")]])
      expect(() => evaluateStackCandidate(input(events))).toThrow();
  });

  it("validates submillisecond observation-period boundaries", () => {
    const period = {
      start: "2026-09-01T00:00:00.000000001Z",
      end: "2026-09-01T00:00:00.000000003Z",
    };
    expect(evaluateStackCandidate(input([event("a", period.start)], { period })).status).toBe(
      "complete",
    );
    for (const timestamp of ["2026-09-01T00:00:00.000000000Z", period.end])
      expect(() => evaluateStackCandidate(input([event("a", timestamp)], { period }))).toThrow(
        /observation period/,
      );
  });

  it("refuses qualitative capacity, unknown reset, annual billing and soft rules", () => {
    const qualitative = makeFixtureCatalog({
      limits: [],
      qualitativeLimits: [{ id: "opaque", label: "opaque", statement: "More usage" }],
    });
    expect(() => evaluateStackCandidate(input([], { catalog: qualitative }))).toThrow(
      /qualitative/,
    );
    expect(() =>
      evaluateStackCandidate(
        input([], {
          target: only({
            priority: 0,
            target: { ...fixtureTarget, resetAssumption: { kind: "fixed-unknown" } },
          }),
        }),
      ),
    ).toThrow(/reset/);
    const annual = catalog();
    for (const version of Object.values(annual.planVersions)) version.price.interval = "year";
    for (const plan of Object.values(annual.plans))
      for (const version of plan.versions) version.price.interval = "year";
    expect(() => evaluateStackCandidate(input([], { catalog: annual }))).toThrow(/monthly/);
    expect(() =>
      evaluateStackCandidate(
        input([], { catalog: catalog([{ ...requestLimit(), exceed: "record_only" }]) }),
      ),
    ).toThrow(/hard admission/);
  });

  it("proves the 10k-call burst scenario across four configured strategies", () => {
    const events = Array.from({ length: 10_000 }, (_, i) =>
      event(
        String(i).padStart(5, "0"),
        new Date(Date.UTC(2026, 8, 1 + Math.floor(i / 2000) * 7)).toISOString(),
        14_000,
      ),
    );
    const low = catalog([requestLimit("1000")]);
    const high = catalog([requestLimit("2000")]);
    for (const version of Object.values(high.planVersions)) version.price.amount = "100";
    for (const plan of Object.values(high.plans))
      for (const version of plan.versions) version.price.amount = "100";
    const results = [
      evaluateStackCandidate(input(events, { catalog: low, target: only(sub) })),
      evaluateStackCandidate(input(events, { catalog: high, target: only(sub) })),
      evaluateStackCandidate(input(events, { catalog: low })),
      evaluateStackCandidate(input(events, { catalog: low, target: only(api) })),
    ];
    expect(results.map((result) => [result.status, result.costs.modeledTotal])).toEqual([
      ["infeasible", "20"],
      ["complete", "100"],
      ["complete", "90"],
      ["complete", "140"],
    ]);
    expect(results[2]?.routes.map((route) => route.callsAssigned)).toEqual([5000, 5000]);
    expect(results[2]?.routes[1]?.receipt?.total).toBe("70");
  });

  it("refuses opt-in translations instead of silently weakening exact preservation", () => {
    const target = only({
      ...api,
      target: {
        ...api.target,
        modelTranslation: {
          id: "fixture-policy",
          version: "1.0.0",
          name: "Synthetic substitution",
          provenance: "builtin-scenario",
          transform: "token-preserving",
          rules: [{ sourceModelId: "fixture-small", targetModelId: "fixture-medium" }],
        },
      },
    });
    expect(() => evaluateStackCandidate(input([event("a")], { target }))).toThrow(/exact models/);
  });

  it("handles 100k calls without per-event replay or losing overflow assignments", () => {
    const events = Array.from({ length: 100_000 }, (_, i) =>
      event(
        String(i).padStart(6, "0"),
        new Date(Date.UTC(2026, 8, 1) + i * 1000).toISOString(),
        10,
      ),
    );
    const result = evaluateStackCandidate(
      input(events, { catalog: catalog([requestLimit("10000")]) }),
    );
    expect(result.coverage).toEqual({
      recorded: 100_000,
      covered: 100_000,
      excluded: 0,
      unserved: 0,
    });
    expect(result.routes.map((route) => route.callsAssigned)).toEqual([60_000, 40_000]);
    expect(result.costs).toMatchObject({ fixed: "20", variable: "0.4", modeledTotal: "20.4" });
    expect(result.assignments).toHaveLength(100_000);
  }, 30_000);
});
