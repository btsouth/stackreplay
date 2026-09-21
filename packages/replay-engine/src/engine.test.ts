import { executionReplayResultV1Schema } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import { ReplayEngineError } from "./errors.js";
import { FIXTURE_PLAN_VERSION_ID, makeFixtureCatalog, rollingLimit } from "./fixtures/catalog.js";
import { makeEvent } from "./fixtures/events.js";

const target = { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID } as const;

const catalog = makeFixtureCatalog({
  limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
});

const firstEvent = makeEvent({
  id: "e1",
  occurredAt: "2026-09-01T00:00:00Z",
  usage: { inputTokens: 1_000_000 },
});
const secondEvent = makeEvent({
  id: "e2",
  occurredAt: "2026-09-01T01:00:00Z",
  usage: { outputTokens: 500_000 },
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
        }),
      "TARGET_NOT_IMPLEMENTED",
    );
    expectEngineError(
      () =>
        replay({
          events,
          target: { type: "local", hardwareProfileId: "h", localModelProfileId: "m" },
          catalog,
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
        }),
      "IMPORT_SCHEMA_INVALID",
    );
  });

  it("rejects duplicate event ids because imports must be idempotent", () => {
    expectEngineError(
      () => replay({ events: [firstEvent, firstEvent], target, catalog }),
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
        }),
      "CATALOG_INVALID",
    );
  });
});

describe("result shape and determinism", () => {
  it("validates against the v1 result schema", () => {
    const result = replay({ events, target, catalog });
    expect(executionReplayResultV1Schema.safeParse(result).success).toBe(true);
  });

  it("is byte-identical for identical inputs", () => {
    const first = replay({ events, target, catalog });
    const second = replay({ events, target, catalog });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("is invariant to the input event order", () => {
    const shuffled = [secondEvent, firstEvent];
    const ordered = replay({ events, target, catalog });
    const reordered = replay({ events: shuffled, target, catalog });
    expect(JSON.stringify(reordered)).toBe(JSON.stringify(ordered));
  });

  it("does not mutate its inputs", () => {
    const snapshot = JSON.stringify({ events, catalog });
    replay({ events, target, catalog });
    expect(JSON.stringify({ events, catalog })).toBe(snapshot);
  });

  it("records the versions used for reproducibility", () => {
    const result = replay({ events, target, catalog });
    expect(result.versions).toEqual({
      engine: "0.0.0",
      catalog: "fixture:golden-v1",
      planVersionId: FIXTURE_PLAN_VERSION_ID,
    });
    expect(result.subscription).toMatchObject({
      planId: "fixture-plan",
      name: "Fixture Plan",
      providerId: "fixture-provider",
      interval: "month",
    });
  });

  it("echoes the execution target reference", () => {
    const result = replay({ events, target, catalog });
    expect(result.target).toEqual(target);
  });

  it("reports an empty workload without violations", () => {
    const result = replay({ events: [], target, catalog });
    expect(result.violations).toEqual([]);
    expect(result.constraints.every((constraint) => constraint.status === "pass")).toBe(true);
    expect(result.coverage.requests).toEqual({ percent: 100, covered: 0, total: 0 });
    expect(result.workload).toEqual({
      eventCount: 0,
      modelCount: 0,
      tokenTotals: {},
    });
    expect(result.feasibility).toEqual({ status: "full", coveragePercent: 100 });
  });

  it("includes economics with a precise basis and no savings field", () => {
    const result = replay({ events, target, catalog });
    expect(result.economics).toEqual({
      targetCost: { amount: "20.00", currency: "USD" },
      costBasis: "fixed_plan_price",
    });
    expect(JSON.stringify(result)).not.toContain("savings");
  });

  it("keeps coverage dimensions separate instead of blending them", () => {
    const result = replay({ events, target, catalog });
    expect(Object.keys(result.coverage).sort()).toEqual(["models", "requests", "usage"]);
    expect(result.feasibility.coveragePercent).toBe(result.coverage.requests.percent);
  });
});
