import {
  type CatalogV1,
  createModelIdentityIndex,
  type ModelV1,
  modelResolutionKindOf,
} from "@stackreplay/catalog";
import { describe, expect, it } from "vitest";
import {
  compareToExpectation,
  crossingsExpectation,
  dispositionsExpectation,
  evaluateBacktestCase,
  modeExpectation,
  observationDelta,
  reconstructListPrice,
  resolutionExpectation,
} from "./backtest.js";
import { replay } from "./engine.js";
import {
  calendarLimit,
  FIXTURE_PLAN_VERSION_ID,
  fixtureContext,
  fixtureModels,
  fixturePricing,
  makeFixtureCatalog,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";

/**
 * Backtesting / self-replay foundation (M4B plan section 13).
 *
 * Every expectation here is derived by hand from the fixture's synthetic price
 * table or its documented window semantics, then compared with the engine's
 * reconstruction through one explicit comparison shape. No provider is
 * contacted, and no case is ever labelled calibrated.
 */

const SEPT_1 = Date.parse("2026-09-01T00:00:00Z");

const aliasedModels: Record<string, ModelV1> = {
  "fixture-small": {
    ...(fixtureModels["fixture-small"] as ModelV1),
    aliases: [
      {
        id: "fixture-small-route",
        alias: "router/small",
        kind: "provider_route",
        sources: [
          { url: "https://example.invalid/alias", title: "Fixture", checkedAt: "2026-08-01" },
        ],
        lastVerifiedAt: "2026-08-01",
        verificationStatus: "estimated",
      },
    ],
  },
  "fixture-medium": fixtureModels["fixture-medium"] as ModelV1,
};

describe("backtesting: synthetic list price reconstructs to its known total", () => {
  it("prices explicit resource categories independently", () => {
    const reconstruction = reconstructListPrice(makeFixtureCatalog({ limits: [] }), [
      {
        pricingId: "fixture-small-pricing",
        atMs: SEPT_1,
        usage: completeUsage({
          uncachedInputTokens: 1_000_000,
          cacheReadTokens: 1_000_000,
          outputTokens: 500_000,
        }),
      },
      {
        pricingId: "fixture-small-pricing",
        atMs: SEPT_1,
        usage: completeUsage({ uncachedInputTokens: 2_000_000 }),
      },
    ]);
    // 1.00 (input) + 0.10 (cache read) + 1.00 (output) + 2.00 (input) = 4.10
    expect(reconstruction.status).toBe("known");
    expect(reconstruction.amount).toBe("4.1");
    expect(reconstruction.currency).toBe("USD");
    expect(reconstruction.categories).toEqual([
      { category: "input", tokens: 3_000_000 },
      { category: "cacheRead", tokens: 1_000_000 },
      { category: "output", tokens: 500_000 },
    ]);
    expect(reconstruction.pricingReferences).toEqual(["fixture-small-pricing"]);
  });

  it("matches the comparison shape for the known total", () => {
    const catalog = makeFixtureCatalog({ limits: [] });
    const reconstruction = reconstructListPrice(catalog, [
      {
        pricingId: "fixture-small-pricing",
        atMs: SEPT_1,
        usage: completeUsage({ uncachedInputTokens: 4_100_000 }),
      },
    ]);
    if (reconstruction.status !== "known" || reconstruction.amount === undefined)
      throw new Error("expected a known reconstruction");
    const comparison = evaluateBacktestCase({
      caseId: "list-price-round-numbers",
      description: "4.1M input tokens at the fixture's $1.00 per 1M tokens",
      expected: { kind: "list-price", amount: "4.1", currency: "USD" },
      reconstructed: {
        kind: "list-price",
        amount: reconstruction.amount,
        currency: reconstruction.currency ?? "USD",
      },
      catalogVersion: catalog.catalogVersion,
    });
    expect(comparison.matched).toBe(true);
    expect(comparison.differences).toEqual([]);
    expect(comparison.calibration).toBe("uncalibrated");
    expect(comparison.observation).toBeUndefined();
    expect(comparison.delta).toBeUndefined();
  });

  it("reports an unpriced material category as unknown rather than pricing it approximately", () => {
    const reconstruction = reconstructListPrice(makeFixtureCatalog({ limits: [] }), [
      {
        pricingId: "fixture-medium-pricing",
        atMs: SEPT_1,
        usage: completeUsage({ uncachedInputTokens: 1_000_000, cacheReadTokens: 100_000 }),
      },
    ]);
    expect(reconstruction.status).toBe("unknown");
    expect(reconstruction.amount).toBeUndefined();
    expect(reconstruction.reason).toContain("not established by the pinned pricing record");
  });

  it("records an observed total beside the reconstruction, with an exact decimal delta", () => {
    const reconstruction = { amount: "4.1", currency: "USD" };
    const observation = { amount: "4.2", currency: "USD" };
    expect(observationDelta(reconstruction, observation)).toEqual({
      absolute: "0.1",
      relative: "0.024390",
    });
    const comparison = evaluateBacktestCase({
      caseId: "list-price-with-observation",
      description: "reconstruction beside an observed total",
      expected: { kind: "list-price", amount: "4.1", currency: "USD" },
      reconstructed: { kind: "list-price", amount: "4.1", currency: "USD" },
      catalogVersion: "fixture:golden-v1",
      observation: {
        amount: "4.2",
        currency: "USD",
        source: "fixture invoice",
        observedAt: "2026-10-01",
      },
    });
    expect(comparison.matched).toBe(true);
    expect(comparison.calibration).toBe("uncalibrated");
    expect(comparison.delta).toEqual({ absolute: "0.1", relative: "0.024390" });
    expect(comparison.observation?.source).toBe("fixture invoice");
  });
});

describe("backtesting: a documented subscription rule reconstructs its crossings", () => {
  const event = (id: string, day: string, tokens: number) =>
    makeEvent({
      id,
      occurredAt: `${day}T00:00:00Z`,
      usage: completeUsage({ uncachedInputTokens: tokens }),
    });

  it("crosses a calendar-month limit once and rejects the requests that do not fit", () => {
    const result = replay({
      events: [
        event("e1", "2026-09-01", 600),
        event("e2", "2026-09-02", 600),
        event("e3", "2026-10-01", 600),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({
        limits: [calendarLimit({ id: "monthly", type: "token_limit", amount: "1000" })],
      }),
      context: fixtureContext,
    });
    expect(crossingsExpectation(result)).toEqual({ kind: "limit-crossings", crossings: 1 });
    expect(
      compareToExpectation({ kind: "limit-crossings", crossings: 1 }, crossingsExpectation(result))
        .matched,
    ).toBe(true);
    // September crosses once (600 + 600 > 1000); October does not.
    expect(result.constraints[0]?.rejectedEvents).toBe(1);
    expect(dispositionsExpectation(result)).toEqual({
      kind: "dispositions",
      included: 2,
      overage: 0,
      blocked: 1,
      unavailable: 0,
      unknown: 0,
    });

    const comparison = evaluateBacktestCase({
      caseId: "monthly-crossing",
      description: "600+600 tokens against a 1000-token calendar-month limit",
      expected: { kind: "limit-crossings", crossings: 1 },
      reconstructed: crossingsExpectation(result),
      result,
      catalogVersion: result.versions.catalog,
    });
    expect(comparison.matched).toBe(true);
    expect(comparison.evidence?.rules.status).toBe("complete");
    expect(comparison.versions.rulesAsOf).toBe("2026-09-15");
    expect(comparison.calibration).toBe("uncalibrated");
  });

  it("reports a wrong expectation as a difference instead of passing", () => {
    const result = replay({
      events: [event("e1", "2026-09-01", 600), event("e2", "2026-09-02", 600)],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({
        limits: [calendarLimit({ id: "monthly", type: "token_limit", amount: "1000" })],
      }),
      context: fixtureContext,
    });
    const comparison = compareToExpectation(
      { kind: "limit-crossings", crossings: 2 },
      crossingsExpectation(result),
    );
    expect(comparison.matched).toBe(false);
    expect(comparison.differences).toEqual(["expected 2, reconstructed 1"]);
  });
});

describe("backtesting: identity, mode and dispositions reconstruct from the same fixtures", () => {
  const catalog: CatalogV1 = makeFixtureCatalog({
    limits: [calendarLimit({ id: "monthly", type: "token_limit", amount: "1000" })],
    models: aliasedModels,
  });

  it("reconstructs a documented route as the same canonical model and an exact replay", () => {
    const outcome = createModelIdentityIndex(catalog).resolve("router/small");
    expect(modelResolutionKindOf(outcome)).toBe("documented-route");
    expect(outcome.canonicalId).toBe("fixture-small");
    // The expectation is written by hand rather than derived from the helper it
    // is compared against, and a wrong identity must be reported as a difference
    // (M4B review: a helper compared with itself passes no matter what it does).
    expect(
      compareToExpectation(
        {
          kind: "model-resolution",
          resolutionKind: "documented-route",
          canonicalModelId: "fixture-small",
        },
        resolutionExpectation(outcome),
      ).matched,
    ).toBe(true);
    expect(
      compareToExpectation(
        {
          kind: "model-resolution",
          resolutionKind: "exact-id",
          canonicalModelId: "fixture-small",
        },
        resolutionExpectation(outcome),
      ).matched,
    ).toBe(false);

    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: "2026-09-01T00:00:00Z",
          usage: completeUsage({ uncachedInputTokens: 500 }),
          model: { rawName: "router/small" },
        }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog,
      context: fixtureContext,
    });
    expect(modeExpectation(result)).toEqual({ kind: "replay-mode", mode: "exact" });
    expect(
      compareToExpectation({ kind: "replay-mode", mode: "exact" }, modeExpectation(result)).matched,
    ).toBe(true);
  });

  it("reconstructs a cross-model substitution as a translated replay", () => {
    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: "2026-09-01T00:00:00Z",
          usage: completeUsage({ uncachedInputTokens: 500 }),
          model: { rawName: "router/small" },
        }),
      ],
      target: {
        type: "subscription",
        planVersionId: FIXTURE_PLAN_VERSION_ID,
        modelTranslation: {
          id: "fixture-translation",
          version: "1.0.0",
          name: "Fixture synthetic translation",
          provenance: "builtin-scenario",
          transform: "token-preserving",
          rules: [{ sourceModelId: "fixture-small", targetModelId: "fixture-medium" }],
        },
      },
      catalog,
      context: fixtureContext,
    });
    expect(
      compareToExpectation({ kind: "replay-mode", mode: "translated" }, modeExpectation(result))
        .matched,
    ).toBe(true);
    expect(result.semantics?.translation?.substitutedEvents).toBe(1);
  });

  it("reconstructs an unresolved model as reduced coverage and an unknown disposition", () => {
    const outcome = createModelIdentityIndex(catalog).resolve("ghost-model");
    expect(modelResolutionKindOf(outcome)).toBe("unresolved");
    expect(
      compareToExpectation(
        { kind: "model-resolution", resolutionKind: "unresolved" },
        resolutionExpectation(outcome),
      ).matched,
    ).toBe(true);
    expect(
      compareToExpectation(
        {
          kind: "model-resolution",
          resolutionKind: "documented-route",
          canonicalModelId: "fixture-small",
        },
        resolutionExpectation(outcome),
      ).matched,
    ).toBe(false);

    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: "2026-09-01T00:00:00Z",
          usage: completeUsage({ uncachedInputTokens: 500 }),
          model: { rawName: "ghost-model" },
        }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog,
      context: fixtureContext,
    });
    expect(
      compareToExpectation(
        { kind: "dispositions", included: 0, overage: 0, blocked: 0, unavailable: 0, unknown: 1 },
        dispositionsExpectation(result),
      ).matched,
    ).toBe(true);
    expect(result.semantics?.evidence.modelResolution.status).toBe("partial");
    expect(result.semantics?.modelMix.unresolvedEventCount).toBe(1);
  });
});

describe("backtesting: comparison shapes stay honest", () => {
  it("refuses to compare mismatched reconstruction kinds", () => {
    const comparison = compareToExpectation(
      { kind: "replay-mode", mode: "exact" },
      { kind: "limit-crossings", crossings: 1 },
    );
    expect(comparison.matched).toBe(false);
    expect(comparison.differences[0]).toContain("the expectation is a replay-mode");
  });

  it("records an observation without a fabricated delta when the case is not money", () => {
    const observation = {
      amount: "12.34",
      currency: "USD",
      source: "fixture meter export",
      observedAt: "2026-09-30",
    };
    const crossings = evaluateBacktestCase({
      caseId: "crossings-with-observation",
      description: "a crossings case that happens to carry an observation",
      expected: { kind: "limit-crossings", crossings: 1 },
      reconstructed: { kind: "limit-crossings", crossings: 1 },
      catalogVersion: "fixture:golden-v1",
      observation,
    });
    expect(crossings.matched).toBe(true);
    expect(crossings.observation).toEqual(observation);
    // A delta against crossings would be arithmetic on unrelated units.
    expect(crossings.delta).toBeUndefined();
    expect(crossings.observationNote).toContain("without a delta");

    const money = evaluateBacktestCase({
      caseId: "list-price-with-observation",
      description: "a money case with an observation",
      expected: { kind: "list-price", amount: "100.00", currency: "USD" },
      reconstructed: { kind: "list-price", amount: "100.00", currency: "USD" },
      catalogVersion: "fixture:golden-v1",
      observation: { ...observation, amount: "90.00" },
    });
    expect(money.delta?.absolute).toBe("-10");
    expect(money.delta?.relative).toBe("-0.100000");
    expect(money.observationNote).toBeUndefined();
  });

  it("keeps the fixture pricing table immutable while reconstructing", () => {
    const snapshot = JSON.stringify(fixturePricing);
    reconstructListPrice(makeFixtureCatalog({ limits: [] }), [
      {
        pricingId: "fixture-small-pricing",
        atMs: SEPT_1,
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      },
    ]);
    expect(JSON.stringify(fixturePricing)).toBe(snapshot);
  });
});
