import { executionReplayResultV1Schema } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import { ReplayEngineError } from "./errors.js";
import {
  FIXTURE_PLAN_VERSION_ID,
  fixtureContext,
  makeFixtureCatalog,
  rollingLimit,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";

const target = { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID } as const;

const catalog = makeFixtureCatalog({
  limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
});

const firstEvent = makeEvent({
  id: "e1",
  occurredAt: "2026-09-01T00:00:00Z",
  usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
});
const secondEvent = makeEvent({
  id: "e2",
  occurredAt: "2026-09-01T01:00:00Z",
  usage: completeUsage({ outputTokens: 500_000 }),
});
const events = [firstEvent, secondEvent];

function expectEngineError(fn: () => unknown, code: string): void {
  try {
    fn();
    throw new Error("expected replay to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(ReplayEngineError);
    const engineError = error as ReplayEngineError;
    expect(engineError.code).toBe(code);
    expect(engineError.safeMessage.length).toBeGreaterThan(0);
    expect(engineError.safeMessage).not.toContain("at ");
  }
}

describe("replay input handling", () => {
  it("rejects non-subscription targets with TARGET_NOT_IMPLEMENTED", () => {
    expectEngineError(
      () =>
        replay({
          events,
          target: { type: "api", providerId: "p", pricingVersionId: "v" },
          catalog,
          context: fixtureContext,
        }),
      "TARGET_NOT_IMPLEMENTED",
    );
    expectEngineError(
      () =>
        replay({
          events,
          target: { type: "local", hardwareProfileId: "h", localModelProfileId: "m" },
          catalog,
          context: fixtureContext,
        }),
      "TARGET_NOT_IMPLEMENTED",
    );
  });

  it("rejects unknown plan versions with PLAN_VERSION_NOT_FOUND", () => {
    expectEngineError(
      () =>
        replay({
          events,
          target: { type: "subscription", planVersionId: "nope@2026-01-01" },
          catalog,
          context: fixtureContext,
        }),
      "PLAN_VERSION_NOT_FOUND",
    );
  });

  it("rejects an unknown plan id with PLAN_VERSION_NOT_FOUND", () => {
    expectEngineError(
      () =>
        replay({
          events,
          target: { type: "subscription", planId: "nope" },
          catalog,
          context: fixtureContext,
        }),
      "PLAN_VERSION_NOT_FOUND",
    );
  });

  it("rejects invalid events with IMPORT_SCHEMA_INVALID", () => {
    expectEngineError(
      () =>
        replay({
          events: [{ ...firstEvent, occurredAt: "2026-09-01T00:00:00+02:00" }],
          target,
          catalog,
          context: fixtureContext,
        }),
      "IMPORT_SCHEMA_INVALID",
    );
  });

  it("rejects duplicate event ids because imports must be idempotent", () => {
    expectEngineError(
      () => replay({ events: [firstEvent, firstEvent], target, catalog, context: fixtureContext }),
      "IMPORT_SCHEMA_INVALID",
    );
  });

  it("rejects an invalid catalog with CATALOG_INVALID", () => {
    expectEngineError(
      () =>
        replay({
          events,
          target,
          catalog: { catalogVersion: "broken" } as never,
          context: fixtureContext,
        }),
      "CATALOG_INVALID",
    );
  });
});

describe("result shape and determinism", () => {
  it("validates against the v1 result schema", () => {
    const result = replay({ events, target, catalog, context: fixtureContext });
    expect(executionReplayResultV1Schema.safeParse(result).success).toBe(true);
  });

  it("is byte-identical for identical inputs", () => {
    const first = replay({ events, target, catalog, context: fixtureContext });
    const second = replay({ events, target, catalog, context: fixtureContext });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("is invariant to the input event order", () => {
    const shuffled = [secondEvent, firstEvent];
    const ordered = replay({ events, target, catalog, context: fixtureContext });
    const reordered = replay({ events: shuffled, target, catalog, context: fixtureContext });
    expect(JSON.stringify(reordered)).toBe(JSON.stringify(ordered));
  });

  it("does not mutate its inputs", () => {
    const snapshot = JSON.stringify({ events, catalog });
    replay({ events, target, catalog, context: fixtureContext });
    expect(JSON.stringify({ events, catalog })).toBe(snapshot);
  });

  it("records generalized versions and the explicit rules context", () => {
    const result = replay({ events, target, catalog, context: fixtureContext });
    expect(result.versions).toEqual({
      engine: "0.0.3",
      schema: 1,
      catalog: "fixture:golden-v1",
      methodology: "1.2.0",
      rulesAsOf: "2026-09-15",
      targetType: "subscription",
      targetReference: FIXTURE_PLAN_VERSION_ID,
      pricingReferences: ["fixture-medium-pricing", "fixture-small-pricing"],
    });
    expect(result.subscription).toMatchObject({
      planId: "fixture-plan",
      planVersionId: FIXTURE_PLAN_VERSION_ID,
      name: "Fixture Plan",
      providerId: "fixture-provider",
      interval: "month",
    });
  });

  it("echoes the execution target reference", () => {
    const result = replay({ events, target, catalog, context: fixtureContext });
    expect(result.target).toEqual(target);
  });

  it("reports an empty workload without violations", () => {
    const result = replay({ events: [], target, catalog, context: fixtureContext });
    expect(result.violations).toEqual([]);
    expect(result.constraints.every((constraint) => constraint.status === "not_applicable")).toBe(
      true,
    );
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 100,
      covered: 0,
      total: 0,
    });
    expect(result.workload).toEqual({ eventCount: 0, modelCount: 0, tokenTotals: {} });
    expect(result.feasibility).toEqual({
      status: "full",
      coveragePercent: 100,
      coverageDimension: "requests",
    });
  });

  it("includes economics with a precise basis and no savings field", () => {
    const result = replay({ events, target, catalog, context: fixtureContext });
    expect(result.economics).toEqual({
      basePlanCost: { amount: "20.00", currency: "USD" },
      targetCost: { amount: "20.00", currency: "USD" },
      costBasis: "fixed_plan_price",
    });
    expect(JSON.stringify(result)).not.toContain("savings");
  });

  it("keeps coverage dimensions separate instead of blending them", () => {
    const result = replay({ events, target, catalog, context: fixtureContext });
    expect(Object.keys(result.coverage).sort()).toEqual(["models", "requests", "usage"]);
    expect(result.feasibility.coveragePercent).toBe(result.coverage.requests.percent);
    expect(result.feasibility.coverageDimension).toBe("requests");
  });

  it("records accepted consumption, attempted demand and rejection counts per constraint", () => {
    const result = replay({ events, target, catalog, context: fixtureContext });
    const constraint = result.constraints[0];
    expect(constraint).toMatchObject({
      id: "credits",
      kind: "credit_pool",
      unit: "usd",
      exceed: "reject_request",
      status: "pass",
      limitUnits: "100",
      consumedUnits: "2",
      attemptedUnits: "2",
      rejectedEvents: 0,
      indeterminateEvents: 0,
      eligibleEvents: 2,
      violationCount: 0,
    });
    expect(constraint?.overageUnits).toBeUndefined();
    expect(constraint?.overageCost).toBeUndefined();
  });
});
