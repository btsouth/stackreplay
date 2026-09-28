import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { describe, expect, it } from "vitest";
import { buildDemoExport } from "../../test-fixtures/src/demo-workload.js";
import { optimizeCompiledExactModels, repriceCompiledApiWorkload } from "./compiled-optimizer.js";
import { marketDecisionInputs } from "./market-decision.js";

const catalog = loadBundledCatalog();
describe("recorded API repricing independent of subscription cycles", () => {
  it.each([35, 400])(
    "prices an entire %i-day span without moving, clipping or extrapolating calls",
    (days) => {
      const original = buildDemoExport("moderate").events;
      const events = original.map((event, i) => ({
        ...event,
        occurredAt: new Date(
          Date.UTC(2026, 0, 1) + (i / (original.length - 1)) * (days - 1) * 86400000,
        ).toISOString(),
      }));
      const before = JSON.stringify(events);
      const inputs = marketDecisionInputs(catalog, DECISION_MARKET, events);
      const first = inputs[0];
      if (!first) throw new Error("fixture missing");
      expect(() => optimizeCompiledExactModels(first)).toThrow(/31 days/);
      const results = inputs.map((input) => repriceCompiledApiWorkload(input));
      expect(results.map((result) => result.candidates[0]?.totalUsd)).toEqual([
        "5.93358645",
        "6.0962667",
      ]);
      for (const result of results) {
        expect(result.methodology).toBe("compiled-api-repricing-v1");
        expect(result.scope).toMatchObject({ recorded: 900, required: 900, excluded: 0 });
        expect(result.explanation?.assignments).toHaveLength(900);
        expect(
          result.explanation?.receipts.reduce((sum, receipt) => sum + receipt.accepted, 0),
        ).toBe(900);
        expect(result.scope.period.start).toBe(events[0]?.occurredAt.replace(".000Z", "Z"));
      }
      expect(results[0]?.scope).toEqual(results[1]?.scope);
      expect(JSON.stringify(events)).toBe(before);
    },
  );
  it("refuses subscription artifacts instead of bypassing their purchase-cycle rules", () => {
    const input = marketDecisionInputs(
      catalog,
      DECISION_MARKET,
      buildDemoExport("moderate").events,
    )[0];
    if (!input) throw new Error("fixture missing");
    const subscription = DECISION_MARKET.plans.find(
      (plan) => plan.artifact.purchase.kind === "subscription",
    )?.artifact;
    if (!subscription) throw new Error("fixture missing");
    expect(() =>
      repriceCompiledApiWorkload({ ...input, artifacts: [...input.artifacts, subscription] }),
    ).toThrow(/only API artifacts/);
  });
  it("keeps unknown categories unpriced and preserves observed timestamps", () => {
    const events = buildDemoExport("moderate").events;
    const unspecified = {
      ...DECISION_MARKET,
      scenarios: [
        {
          id: "unspecified",
          label: "Unspecified",
          assumption: "No cache-write duration supplied",
          artifacts: DECISION_MARKET.plans
            .filter((plan) => plan.artifact.purchase.kind === "api")
            .map((plan) => plan.artifact),
        },
      ],
    };
    const input = marketDecisionInputs(catalog, unspecified, events)[0];
    if (!input) throw new Error("fixture missing");
    const result = repriceCompiledApiWorkload(input);
    expect(result.candidates[0]?.status).toBe("not_computable");
    expect(result.candidates[0]?.totalUsd).toBeUndefined();
    expect(result.scope.recorded).toBe(900);
  });
});
