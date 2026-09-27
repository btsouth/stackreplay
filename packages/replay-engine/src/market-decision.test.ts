import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { describe, expect, it } from "vitest";
import { buildDemoExport } from "../../test-fixtures/src/demo-workload.js";
import { optimizeCompiledExactModels } from "./compiled-optimizer.js";
import { marketDecisionInputs } from "./market-decision.js";
import { Decimal } from "./money.js";

const catalog = loadBundledCatalog();
describe("D0 representative market decision", () => {
  it("keeps all 900 calls and exact receipts in both explicit assumptions", () => {
    const events = buildDemoExport("moderate").events,
      original = JSON.stringify(events);
    const inputs = marketDecisionInputs(catalog, DECISION_MARKET, events);
    expect(inputs).toHaveLength(2);
    expect(inputs[0]?.events).toBe(events);
    expect(inputs[1]?.events).toBe(events);
    const results = inputs.map((input) => optimizeCompiledExactModels(input));
    for (const r of results) {
      expect(r.scope).toMatchObject({ recorded: 900, required: 900, excluded: 0 });
      expect(r.candidates.find((c) => c.id === "api")).toMatchObject({
        status: "feasible",
        modeled: 900,
      });
      expect(r.explanation?.assignments).toHaveLength(900);
      expect(r.explanation?.receipts.reduce((n, r) => n + r.accepted, 0)).toBe(900);
    }
    expect(results.map((r) => r.candidates[0]?.totalUsd)).toEqual(["5.93358645", "6.0962667"]);
    for (const r of results) {
      let total = new Decimal(0);
      for (const receipt of r.explanation?.receipts ?? [])
        for (const line of receipt.cash) {
          expect(
            new Decimal(line.tokens)
              .mul(line.ratePerMillion)
              .div(1_000_000)
              .mul(line.factor)
              .eq(line.usd),
          ).toBe(true);
          total = total.add(line.usd);
        }
      expect(total.eq(r.candidates[0]?.totalUsd ?? "-1")).toBe(true);
      expect(r.explanation?.assignments.filter((a) => a.modelId === "gpt-5-6-sol")).toHaveLength(
        261,
      );
    }
    expect(results[0]?.scope).toEqual(results[1]?.scope);
    expect(results[0]?.scenario.scenarioHash).not.toBe(results[1]?.scenario.scenarioHash);
    expect(JSON.stringify(events)).toBe(original);
  });
  it("repeated evaluation is deterministic and empty workloads remain empty", () => {
    const events = buildDemoExport("moderate").events;
    const input = marketDecisionInputs(catalog, DECISION_MARKET, events)[0];
    if (!input) throw new Error();
    expect(optimizeCompiledExactModels(input)).toEqual(optimizeCompiledExactModels(input));
    expect(marketDecisionInputs(catalog, DECISION_MARKET, [])).toEqual([]);
  });
  it("retains nanosecond boundaries and the full scope on the fast timestamp path", () => {
    const original = buildDemoExport("moderate").events[0];
    if (!original) throw new Error();
    const timestamps = [
      "2026-09-15T12:00:00.000000003Z",
      "2026-09-15T12:00:00Z",
      "2026-09-15T12:00:00.000000001Z",
    ];
    const input = marketDecisionInputs(
      catalog,
      DECISION_MARKET,
      timestamps.map((occurredAt, i) => ({ ...original, id: `ns-${i}`, occurredAt })),
    )[0];
    if (!input) throw new Error();
    expect(input.scenario.period).toEqual({
      start: "2026-09-15T12:00:00Z",
      end: "2026-09-15T12:00:00.000000004Z",
    });
    expect(optimizeCompiledExactModels(input).scope.required).toBe(3);
  });
  it("does not reuse a pinned promotion outside its valid rules range", () => {
    const input = marketDecisionInputs(
      catalog,
      { ...DECISION_MARKET, rulesAt: DECISION_MARKET.reviewUntil },
      buildDemoExport("moderate").events,
    )[0];
    if (!input) throw new Error();
    const result = optimizeCompiledExactModels(input);
    expect(result.scope.required).toBe(900);
    expect(result.candidates[0]?.status).toBe("not_computable");
    expect(result.candidates[0]?.totalUsd).toBeUndefined();
  });
  it("opaque subscriptions remain visible facts, never executable candidates", () => {
    const subscriptions = DECISION_MARKET.plans.filter(
      (p) => p.artifact.purchase.kind === "subscription",
    );
    expect(subscriptions).toHaveLength(10);
    expect(subscriptions.every((p) => p.artifact.computation.kind === "not_computable")).toBe(true);
    for (const c of DECISION_MARKET.scenarios)
      expect(c.artifacts.every((p) => p.purchase.kind === "api")).toBe(true);
  });
  it("missing cache-write interpretation remains unknown in the admitted base", () => {
    const events = buildDemoExport("moderate").events;
    const baseline = {
      ...DECISION_MARKET,
      scenarios: [
        {
          id: "unspecified",
          label: "Unspecified",
          assumption: "No cache duration assumed",
          artifacts: DECISION_MARKET.plans
            .filter((p) => p.artifact.purchase.kind === "api")
            .map((p) => p.artifact),
        },
      ],
    };
    const input = marketDecisionInputs(catalog, baseline, events)[0];
    if (!input) throw new Error();
    const r = optimizeCompiledExactModels(input);
    expect(r.scope.required).toBe(900);
    expect(r.candidates[0]?.status).toBe("not_computable");
  });
});
