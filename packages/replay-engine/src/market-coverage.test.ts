import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { describe, expect, it } from "vitest";
import { buildDemoExport } from "../../test-fixtures/src/demo-workload.js";
import { optimizeCompiledExactModels } from "./compiled-optimizer.js";
import { analyzeMarketCoverage } from "./market-coverage.js";
import { marketDecisionInputs } from "./market-decision.js";

const catalog = loadBundledCatalog();
const base = buildDemoExport("moderate").events[0];
if (!base) throw new Error("Missing synthetic event");
function event(model: string, tokens = 1000) {
  if (!base) throw new Error("Missing synthetic event");
  return {
    ...base,
    id: model,
    model: { rawName: model },
    usage: {
      inputTokens: tokens,
      outputTokens: 2000,
      cacheReadTokens: 300000,
      cacheWriteTokens: 4000,
      reasoningTokens: 500,
      accounting: {
        cacheReadIncludedInInput: false,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: true,
      },
    },
  };
}
describe("D3 exact real-mix admission and coverage", () => {
  it("prices the five exact routes, including long context and inclusive reasoning", () => {
    const models = [
      "claude-fable-5-1",
      "claude-opus-5",
      "claude-fable-5",
      "claude-opus-4-8",
      "claude-opus-5-5",
    ];
    const expected = [
      ["0.235", "0.265"],
      ["0.23", "0.245"],
      ["0.46", "0.49"],
      ["0.23", "0.245"],
      ["0.124", "0.136"],
    ];
    for (const [i, model] of models.entries()) {
      const events = [event(model)];
      const inputs = marketDecisionInputs(catalog, DECISION_MARKET, events);
      const result = analyzeMarketCoverage(inputs);
      expect(result.coverage).toMatchObject({
        recorded: 1,
        recognized: 1,
        priced: 1,
        knownTokens: 307000,
        pricedKnownTokens: 307000,
      });
      expect(result.pricedEvents).toBe(events);
      expect(
        inputs.map((input) => optimizeCompiledExactModels(input).candidates[0]?.totalUsd),
      ).toEqual(expected[i]);
    }
  });
  it("prices Sonnet 5.5 with exact identity, both cache durations and inclusive reasoning", () => {
    for (const [tokens, expected] of [
      [1000, ["0.092", "0.098"]],
      [600000, ["1.29", "1.296"]],
    ] as const) {
      const inputs = marketDecisionInputs(catalog, DECISION_MARKET, [
        event("claude-sonnet-5-5", tokens),
      ]);
      expect(analyzeMarketCoverage(inputs).coverage).toMatchObject({
        recorded: 1,
        recognized: 1,
        priced: 1,
      });
      expect(
        inputs.map((input) => optimizeCompiledExactModels(input).candidates[0]?.totalUsd),
      ).toEqual(expected);
    }
  });
  it("retains economically heavy unknowns outside an explicitly separate priced scope", () => {
    const events = [event("claude-fable-5-1"), event("claude-future-unpublished", 9000000)];
    const inputs = marketDecisionInputs(catalog, DECISION_MARKET, events);
    const { coverage, pricedEvents } = analyzeMarketCoverage(inputs);
    expect(coverage).toMatchObject({
      recorded: 2,
      recognized: 1,
      priced: 1,
      knownTokens: 9613000,
      pricedKnownTokens: 307000,
    });
    expect(coverage.models.find((m) => m.model === "Unresolved model")?.reasons).toEqual([
      "unresolved_model",
    ]);
    expect(pricedEvents).toEqual([events[0]]);
    expect(inputs[0]?.events).toBe(events);
  });
  it("does not zero-fill missing token categories or missing write interpretations", () => {
    const missing = event("claude-fable-5-1");
    const { cacheWriteTokens: _missing, ...usage } = missing.usage;
    const result = analyzeMarketCoverage(
      marketDecisionInputs(catalog, DECISION_MARKET, [{ ...missing, usage }]),
    );
    expect(result.coverage).toMatchObject({
      recognized: 1,
      priced: 0,
      unknownTokenCalls: 1,
      knownTokens: 0,
    });
    expect(result.coverage.models[0]?.reasons).toContain("price_unknown");
    const noOverlay = {
      ...DECISION_MARKET,
      scenarios: DECISION_MARKET.scenarios.map((s) => ({
        ...s,
        artifacts: DECISION_MARKET.plans
          .filter((p) => p.artifact.purchase.kind === "api")
          .map((p) => p.artifact),
      })),
    };
    expect(
      analyzeMarketCoverage(marketDecisionInputs(catalog, noOverlay, [missing])).coverage.priced,
    ).toBe(0);
  });
});
