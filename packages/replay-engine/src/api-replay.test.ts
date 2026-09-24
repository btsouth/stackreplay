import type { CatalogV1, PricingV1 } from "@stackreplay/catalog";
import {
  type ExecutionReplayResultV1,
  executionReplayResultV1Schema,
  type ModelTranslationPolicyV1,
} from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import {
  apiFixtureModels,
  apiFixturePricing,
  apiModelRecord,
  apiPricingRecord,
  FIXTURE_CATALOG_VERSION,
  FIXTURE_RULES_AS_OF,
  fixtureContext,
  makeApiFixtureCatalog,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";

/**
 * M4C Direct API replay tests.
 *
 * The contract under test (M4C plan sections 5-20): prices are the records in
 * force at the pinned instant, availability is a per-provider fact, a determined
 * outcome is never downgraded by an unrelated gap, partial pricing never becomes
 * a partial cost, and an API result carries no subscription detail at all.
 */

const at = (hour: number) => `2026-09-01T${String(hour).padStart(2, "0")}:00:00Z`;

const apiTarget = (providerId = "fixture-provider") => ({ type: "api" as const, providerId });

const apiReplay = (
  events: readonly ReturnType<typeof makeEvent>[],
  options: {
    catalog?: CatalogV1;
    providerId?: string;
    rulesAsOf?: string;
    rulesAsOfInstant?: string;
  } = {},
): ExecutionReplayResultV1 =>
  replay({
    events,
    target: apiTarget(options.providerId ?? "fixture-provider"),
    catalog: options.catalog ?? makeApiFixtureCatalog(),
    context:
      options.rulesAsOf === undefined
        ? fixtureContext
        : {
            ...fixtureContext,
            rulesAsOf: options.rulesAsOf,
            ...(options.rulesAsOfInstant === undefined
              ? {}
              : { rulesAsOfInstant: options.rulesAsOfInstant }),
          },
  });

/** An event against one API fixture model, with a complete usage record. */
const apiEvent = (
  id: string,
  model: string,
  usage: Parameters<typeof completeUsage>[0] = { uncachedInputTokens: 1_000_000 },
  hour = 0,
) =>
  makeEvent({
    id,
    occurredAt: at(hour),
    model: { rawName: model, canonicalId: model },
    usage: completeUsage(usage),
  });

const requireResult = (result: ExecutionReplayResultV1): ExecutionReplayResultV1 => {
  const parsed = executionReplayResultV1Schema.safeParse(result);
  if (!parsed.success)
    throw new Error(`result did not validate: ${JSON.stringify(parsed.error.issues, null, 2)}`);
  return result;
};

describe("M4C: Direct API replay prices the workload", () => {
  it("prices every event at the list price of the model in force", () => {
    const result = requireResult(
      apiReplay([
        apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 }),
        apiEvent("e2", "fixture-api-dual", { outputTokens: 1_000_000 }, 1),
      ]),
    );

    expect(result.economics).toEqual({
      targetCost: { amount: "2.5", currency: "USD" },
      costBasis: "api_list_price",
    });
    expect(result.semantics?.dispositions).toEqual({
      included: 2,
      overage: 0,
      blocked: 0,
      unavailable: 0,
      unknown: 0,
    });
    expect(result.constraints).toEqual([]);
    expect(result.violations).toEqual([]);
    expect(result.coverage.requests).toMatchObject({ status: "known", percent: 100 });
    expect(result.semantics?.replayability.class).toBe("deterministic");
    expect(
      result.semantics?.replayability.reasons.some((reason) => reason.id === "numeric_mechanics"),
    ).toBe(true);
  });

  it("prices each canonical token category from the selected record", () => {
    const result = requireResult(
      apiReplay([
        apiEvent("e1", "fixture-api-small", {
          uncachedInputTokens: 1_000_000,
          cacheReadTokens: 1_000_000,
          cacheWriteTokens: 1_000_000,
          outputTokens: 1_000_000,
          reasoningTokens: 1_000_000,
        }),
      ]),
    );
    // 1.00 + 0.10 + 1.00 + 2.00 + 3.00
    expect(result.economics?.targetCost.amount).toBe("7.1");
    expect(result.workload.tokenTotals).toEqual({
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      reasoningTokens: 1_000_000,
    });
  });

  it("prices a conditional request-size tier on the request's input tokens", () => {
    const catalog = withPricing({
      "fixture-api-small-pricing": {
        ...apiPricingRecord("fixture-api-small-pricing"),
        tiers: [
          {
            id: "long-context",
            label: "Long context",
            when: { inputTokensAbove: 2_000_000 },
            rates: {
              input: "2.00",
              output: "4.00",
              cacheRead: "0.20",
              cacheWrite: "2.00",
              reasoning: "6.00",
            },
          },
        ],
      },
    });
    const short = apiReplay(
      [apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 })],
      {
        catalog,
      },
    );
    const long = apiReplay(
      [apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 3_000_000 })],
      {
        catalog,
      },
    );
    expect(short.economics?.targetCost.amount).toBe("1");
    expect(long.economics?.targetCost.amount).toBe("6");
  });

  it("selects the conditional time tier from the historical event instant, not the rules instant", () => {
    const catalog = withPricing({
      "fixture-api-small-pricing": {
        ...apiPricingRecord("fixture-api-small-pricing"),
        tiers: [
          {
            id: "weekend-schedule",
            label: "Weekend schedule",
            when: { utcWindows: [{ days: ["tue"], start: "00:00", end: "23:59" }] },
            rates: {
              input: "5.00",
              output: "5.00",
              cacheRead: "5.00",
              cacheWrite: "5.00",
              reasoning: "5.00",
            },
          },
        ],
      },
    });
    // 2026-09-01 is a Tuesday and 2026-09-14 is a Monday, so the tier can only
    // come from the event's own timestamp: had the code read the tier at the
    // rules instant, the base rate would have been used instead.
    const tuesday = apiReplay(
      [apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 })],
      { catalog, rulesAsOf: "2026-09-14" },
    );
    expect(tuesday.economics?.targetCost.amount).toBe("5");
  });
});

describe("M4C: availability is a fact about the provider, not about the model", () => {
  it("serves a model two providers offer at the same model-scoped price", () => {
    const events = [apiEvent("e1", "fixture-api-dual", { uncachedInputTokens: 1_000_000 })];
    const onFirst = requireResult(apiReplay(events, { providerId: "fixture-provider" }));
    const onSecond = requireResult(apiReplay(events, { providerId: "fixture-open" }));
    expect(onFirst.semantics?.dispositions.included).toBe(1);
    expect(onSecond.semantics?.dispositions.included).toBe(1);
    // One model, one list price: only availability is per provider.
    expect(onFirst.economics?.targetCost.amount).toBe("0.5");
    expect(onSecond.economics?.targetCost.amount).toBe("0.5");
    expect(onFirst.versions.pricingReferences).toEqual(["fixture-api-dual-pricing"]);
    expect(onSecond.versions.pricingReferences).toEqual(["fixture-api-dual-pricing"]);
  });

  it("treats an empty offering set as unestablished, not as an absence", () => {
    const catalog = makeApiFixtureCatalog({
      models: {
        ...apiFixtureModels,
        "fixture-api-no-offering": {
          ...apiModelRecord("fixture-api-no-offering"),
          // An empty set is a set that establishes nothing: it is not the same
          // statement as a catalog that lists other providers instead.
          providerIds: [],
        },
      },
    });
    const result = requireResult(
      apiReplay([apiEvent("e1", "fixture-api-no-offering", { uncachedInputTokens: 1_000_000 })], {
        catalog,
      }),
    );
    expect(result.semantics?.dispositions.unknown).toBe(1);
    expect(result.unsupportedModels).toEqual([
      {
        rawName: "fixture-api-no-offering",
        canonicalId: "fixture-api-no-offering",
        eventCount: 1,
        reason: "offering_unestablished",
      },
    ]);
  });

  it("names the substitute, not the recorded model, when a translation is not offered", () => {
    const policy: ModelTranslationPolicyV1 = {
      id: "fixture-policy",
      version: "1.0.0",
      name: "Fixture synthetic translation",
      provenance: "builtin-scenario",
      transform: "token-preserving",
      rules: [{ sourceModelId: "fixture-api-small", targetModelId: "fixture-api-open-only" }],
    };
    const result = requireResult(
      replay({
        events: [apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 })],
        target: { type: "api", providerId: "fixture-provider", modelTranslation: policy },
        catalog: makeApiFixtureCatalog(),
        context: fixtureContext,
      }),
    );
    expect(result.semantics?.mode).toBe("translated");
    // The provider offers the recorded model; it is the substitute that is not
    // offered, and that is the model the finding has to name.
    expect(result.unsupportedModels).toEqual([
      {
        rawName: "fixture-api-small",
        canonicalId: "fixture-api-open-only",
        eventCount: 1,
        reason: "not_offered",
      },
    ]);
  });
});

describe("M4C: an evidence dimension only claims the gap it can see", () => {
  it("does not report a missing price for a model the provider does not offer", () => {
    // The provider does not offer this model, so no record was ever sought for
    // it. Claiming the pinned instant failed to cover its price would invent a
    // pricing gap that the pricing dimension itself does not report.
    const result = requireResult(
      apiReplay([apiEvent("e1", "fixture-api-open-only", { uncachedInputTokens: 1_000_000 })]),
    );
    expect(result.semantics?.evidence.temporal.status).toBe("complete");
    expect(result.semantics?.evidence.temporal.reason).toBeUndefined();
    expect(result.semantics?.evidence.pricing.reason).not.toContain("in force");
  });

  it("still reports a missing price for an offered model whose record is out of force", () => {
    const result = requireResult(
      apiReplay([apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 })], {
        catalog: makeApiFixtureCatalog({
          pricing: {
            "fixture-api-small-pricing-2026-10": apiPricingRecord(
              "fixture-api-small-pricing-2026-10",
            ),
          },
        }),
      }),
    );
    expect(result.semantics?.evidence.temporal.status).toBe("partial");
    expect(result.semantics?.evidence.temporal.reason).toContain(
      "use a model the selected provider offers",
    );
  });

  it("counts an unresolved model as unresolved even when the event declares exact attribution", () => {
    const event = makeEvent({
      id: "e1",
      occurredAt: at(0),
      model: { rawName: "not-in-the-catalog", canonicalId: undefined },
      usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      confidence: { usage: "exact", model: "exact" },
    });
    const result = requireResult(apiReplay([event]));
    const factor = result.confidence.factors.find((entry) => entry.id === "model_mapping");
    // The subscription path counts a model as unresolved when either the
    // resolution failed or the event declares unknown attribution. A name the
    // catalog does not know cannot be reported as resolved exactly.
    expect(factor?.level).toBe("low");
    expect(result.semantics?.modelMix.unresolvedEventCount).toBe(1);
  });

  it("ranks a name-mapped model as mapped, never as exact", () => {
    // Resolved through the catalog's alias rather than from a declared canonical
    // id, so the mapping is a name mapping and cannot be reported as exact.
    const event = makeEvent({
      id: "e1",
      occurredAt: at(0),
      model: { rawName: "fixture-api-small-v2" },
      usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
    });
    const result = requireResult(apiReplay([event]));
    const factor = result.confidence.factors.find((entry) => entry.id === "model_mapping");
    expect(factor?.level).toBe("medium");
    expect(factor?.description).toContain("name mapping");
  });

  it("counts a declared mapped attribution as mapped even when the id resolves exactly", () => {
    // The subscription path uses an OR over resolution quality and declared
    // attribution, so a declared mapping is never reported as exact.
    const event = makeEvent({
      id: "e1",
      occurredAt: at(0),
      model: { rawName: "fixture-api-small", canonicalId: "fixture-api-small" },
      usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      confidence: { usage: "exact", model: "mapped" },
    });
    const result = requireResult(apiReplay([event]));
    const factor = result.confidence.factors.find((entry) => entry.id === "model_mapping");
    expect(factor?.level).toBe("medium");
  });
});

describe("M4C: the workload determines whether a cost exists at all", () => {
  it("reports no cost for an empty workload rather than a total of zero", () => {
    const result = requireResult(apiReplay([]));
    const codes = result.warnings.map((warning) => warning.code);
    expect(result.workload.eventCount).toBe(0);
    expect(result.economics).toBeUndefined();
    // There is no demand, so there is no incomplete pricing to report: a warning
    // about unserved or unpriced events would be a finding about nothing.
    expect(codes).not.toContain("API_COST_INCOMPLETE");
    expect(result.warnings.filter((warning) => /unserved|unpriced/i.test(warning.message))).toEqual(
      [],
    );
    expect(executionReplayResultV1Schema.safeParse(result).success).toBe(true);
  });

  it("declares the absent allowance window in its assumptions", () => {
    const result = requireResult(
      apiReplay([apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 })]),
    );
    expect(result.assumptions.map((assumption) => assumption.id)).toContain("NO_ALLOWANCE_WINDOW");
  });

  it("states that a list price belongs to the model, not to the provider", () => {
    const result = requireResult(
      apiReplay([apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 })]),
    );
    expect(result.assumptions.map((assumption) => assumption.id)).toContain(
      "MODEL_SCOPED_API_PRICE",
    );
  });
});

describe("M4C: pricing selection is per model and per pinned instant", () => {
  it("does not apply an exact price activation before its published UTC instant", () => {
    const base = apiPricingRecord("fixture-api-small-pricing");
    const catalog = makeApiFixtureCatalog({
      pricing: {
        "fixture-api-small-pricing": {
          ...base,
          effectiveFrom: "2026-08-16",
          effectiveFromInstant: "2026-08-16T16:00:00Z",
        },
      },
    });
    const event = apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 });
    for (const [instant, priced] of [
      ["2026-08-16T15:59:59.999Z", false],
      ["2026-08-16T16:00:00.000Z", true],
      ["2026-08-16T16:00:00.001Z", true],
      ["2026-09-23T12:00:00.000Z", true],
    ] as const) {
      const result = apiReplay([event], {
        catalog,
        rulesAsOf: instant.slice(0, 10),
        rulesAsOfInstant: instant,
      });
      expect(result.economics?.targetCost.amount !== undefined, instant).toBe(priced);
    }
  });

  it("uses the model's own record, never another model's and never the first in the catalog", () => {
    // Deliberately declared in an order where the pricing record that must not
    // be used comes first for the model that is priced second.
    const catalog = makeApiFixtureCatalog({
      pricing: {
        "fixture-api-dual-pricing": apiPricingRecord("fixture-api-dual-pricing"),
        "fixture-api-small-pricing": apiPricingRecord("fixture-api-small-pricing"),
      },
    });
    const result = requireResult(
      apiReplay([apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 })], {
        catalog,
      }),
    );
    expect(result.economics?.targetCost.amount).toBe("1");
    expect(result.versions.pricingReferences).toEqual(["fixture-api-small-pricing"]);
  });

  it("takes the record in force at the pinned instant, not the newest or the oldest", () => {
    const before = requireResult(
      apiReplay([apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 })], {
        rulesAsOf: "2026-09-15",
      }),
    );
    const after = requireResult(
      apiReplay([apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 })], {
        rulesAsOf: "2026-11-01",
      }),
    );
    expect(before.economics?.targetCost.amount).toBe("1");
    expect(before.versions.pricingReferences).toEqual(["fixture-api-small-pricing"]);
    expect(after.economics?.targetCost.amount).toBe("4");
    expect(after.versions.pricingReferences).toEqual(["fixture-api-small-pricing-2026-10"]);
  });

  it("treats a gap in a model's price history as a gap, never as a borrowed record", () => {
    // Only the October record exists, and the replay is pinned before it starts.
    const catalog = makeApiFixtureCatalog({
      pricing: {
        "fixture-api-small-pricing-2026-10": apiPricingRecord("fixture-api-small-pricing-2026-10"),
      },
    });
    const result = requireResult(
      apiReplay([apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 })], {
        catalog,
      }),
    );
    expect(result.economics).toBeUndefined();
    expect(result.semantics?.dispositions).toEqual({
      included: 1,
      overage: 0,
      blocked: 0,
      unavailable: 0,
      unknown: 0,
    });
    // Served but unpriced: a determined outcome with a partial monetary side.
    expect(result.coverage.requests).toMatchObject({ status: "known", percent: 100 });
    expect(result.semantics?.evidence.pricing.status).toBe("partial");
    // The gap is the record, and the dimension says so: nothing was borrowed to
    // fill the instant, and no unpriced category is blamed for it.
    expect(result.semantics?.evidence.pricing.reason).toContain(
      "no API list-price record in force",
    );
    expect(result.semantics?.evidence.pricing.reason).not.toContain("category");
    expect(result.semantics?.evidence.temporal.status).toBe("partial");
    expect(result.semantics?.replayability.class).toBe("bounded");
    expect(result.warnings.map((warning) => warning.code)).toContain("API_PRICE_NOT_IN_FORCE");
    expect(result.warnings.map((warning) => warning.code)).toContain("API_COST_INCOMPLETE");
  });
});

describe("M4C: availability is a per-provider fact", () => {
  it("marks a model the selected provider does not offer as unavailable, never as priced", () => {
    const result = requireResult(apiReplay([apiEvent("e1", "fixture-api-open-only")]));
    expect(result.semantics?.dispositions).toEqual({
      included: 0,
      overage: 0,
      blocked: 0,
      unavailable: 1,
      unknown: 0,
    });
    expect(result.economics).toBeUndefined();
    expect(result.coverage.requests).toMatchObject({ status: "known", percent: 0 });
    expect(result.feasibility.status).toBe("none");
    expect(result.unsupportedModels).toEqual([
      {
        rawName: "fixture-api-open-only",
        canonicalId: "fixture-api-open-only",
        eventCount: 1,
        reason: "not_offered",
      },
    ]);
    // Deterministic: the target's own absence of the model is a determined fact.
    expect(result.semantics?.replayability.class).toBe("deterministic");
    expect(result.warnings.map((warning) => warning.code)).toContain("API_COST_INCOMPLETE");
  });

  it("runs the same model on a provider that does offer it", () => {
    const result = requireResult(
      apiReplay([apiEvent("e1", "fixture-api-open-only", { uncachedInputTokens: 1_000_000 })], {
        providerId: "fixture-open",
      }),
    );
    expect(result.economics?.targetCost.amount).toBe("1");
    expect(result.semantics?.dispositions.included).toBe(1);
  });

  it("leaves a model whose offering set the catalog does not establish as unknown", () => {
    const result = requireResult(apiReplay([apiEvent("e1", "fixture-api-no-offering")]));
    expect(result.semantics?.dispositions).toEqual({
      included: 0,
      overage: 0,
      blocked: 0,
      unavailable: 0,
      unknown: 1,
    });
    expect(result.unsupportedModels).toEqual([
      {
        rawName: "fixture-api-no-offering",
        canonicalId: "fixture-api-no-offering",
        eventCount: 1,
        reason: "offering_unestablished",
      },
    ]);
    expect(result.semantics?.replayability.class).toBe("bounded");
    expect(
      result.semantics?.replayability.reasons.some(
        (reason) => reason.id === "target_applicability_unknown",
      ),
    ).toBe(true);
    expect(result.coverage.requests).toMatchObject({ status: "unknown", covered: 0, total: 1 });
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "API_MODEL_OFFERING_UNESTABLISHED",
    );
  });

  it("refuses a provider the catalog does not contain", () => {
    expect(() => apiReplay([apiEvent("e1", "fixture-api-small")], { providerId: "nope" })).toThrow(
      /TARGET_PROVIDER_UNKNOWN/,
    );
  });
});

describe("M4C: pricing gaps stay gaps", () => {
  it("reports a model with no pricing record as served but unpriced", () => {
    const result = requireResult(apiReplay([apiEvent("e1", "fixture-api-unpriced")]));
    expect(result.semantics?.dispositions.included).toBe(1);
    expect(result.economics).toBeUndefined();
    expect(result.semantics?.evidence.pricing.status).toBe("partial");
    expect(result.warnings.map((warning) => warning.code)).toContain("API_PRICE_NOT_RECORDED");
  });

  it("never prices a model from a non-API billing rate", () => {
    const result = requireResult(apiReplay([apiEvent("e1", "fixture-api-rate-basis")]));
    expect(result.semantics?.dispositions.included).toBe(1);
    expect(result.economics).toBeUndefined();
    expect(result.warnings.map((warning) => warning.code)).toContain("API_PRICE_WRONG_BASIS");
    expect(result.versions.pricingReferences).toBeUndefined();
  });

  it("does not price a consumed category the selected record leaves unestablished", () => {
    const catalog = makeApiFixtureCatalog({
      pricing: {
        "fixture-api-small-pricing": {
          ...apiPricingRecord("fixture-api-small-pricing"),
          rates: { input: "1.00", output: "2.00" },
        },
      },
    });
    const result = requireResult(
      apiReplay(
        [
          apiEvent("e1", "fixture-api-small", {
            uncachedInputTokens: 1_000_000,
            reasoningTokens: 1_000_000,
          }),
        ],
        { catalog },
      ),
    );
    expect(result.semantics?.dispositions.included).toBe(1);
    expect(result.economics).toBeUndefined();
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "API_PRICE_CATEGORY_UNDOCUMENTED",
    );
    expect(result.semantics?.evidence.pricing.status).toBe("partial");
    expect(result.semantics?.evidence.pricing.reason).toContain("consume a category");
    expect(result.semantics?.evidence.pricing.reason).not.toContain("no API list-price record");
  });

  it("publishes no partial subtotal: one unpriced event removes the whole cost", () => {
    const result = requireResult(
      apiReplay([
        apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 }),
        apiEvent("e2", "fixture-api-unpriced", { uncachedInputTokens: 1_000_000 }, 1),
      ]),
    );
    expect(result.economics).toBeUndefined();
    expect(result.semantics?.dispositions.included).toBe(2);
    expect(result.semantics?.replayability.class).toBe("bounded");
    expect(result.workload.eventCount).toBe(2);
  });
});

describe("M4C: undecided demand stays undecided", () => {
  it("reports an event with incomplete token accounting as unknown", () => {
    const incomplete = makeEvent({
      id: "e1",
      occurredAt: at(0),
      model: { rawName: "fixture-api-small", canonicalId: "fixture-api-small" },
      usage: {
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        accounting: {
          cacheReadIncludedInInput: false,
          cacheWriteIncludedInInput: false,
          reasoningIncludedInOutput: false,
        },
      },
    });
    const result = requireResult(apiReplay([incomplete]));
    expect(result.semantics?.dispositions).toEqual({
      included: 0,
      overage: 0,
      blocked: 0,
      unavailable: 0,
      unknown: 1,
    });
    expect(result.coverage.requests).toMatchObject({ status: "unknown", unknownCount: 1 });
    expect(result.semantics?.replayability.class).toBe("bounded");
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "EVENT_TOKEN_ACCOUNTING_UNKNOWN",
    );
    // The unpriced event is a usage gap: the pricing dimension must not claim a
    // category the record does not establish, because the record is fine and the
    // event's accounting is not.
    expect(result.semantics?.evidence.pricing.reason).not.toContain("consume a category");
    // The wording does not call this demand "served": nothing established that
    // the provider serves an event whose accounting is incomplete.
    expect(result.semantics?.evidence.pricing.reason).toContain(
      "part of the applicable demand could not be converted to money with the pinned API list prices",
    );
    expect(result.semantics?.evidence.pricing.reason).not.toContain("served");
  });

  it("reports an unknown model as unknown rather than as unavailable", () => {
    const event = makeEvent({
      id: "e1",
      occurredAt: at(0),
      model: { rawName: "not-in-any-catalog" },
    });
    const result = requireResult(apiReplay([event]));
    expect(result.semantics?.dispositions.unknown).toBe(1);
    expect(result.unsupportedModels).toEqual([
      { rawName: "not-in-any-catalog", eventCount: 1, reason: "unresolved" },
    ]);
    expect(result.warnings.map((warning) => warning.code)).toContain("MODEL_UNRESOLVED");
    expect(result.semantics?.modelMix.unresolvedEventCount).toBe(1);
  });
});

describe("M4C: identity, translation and provenance", () => {
  it("resolves a catalog-declared alias to the model's price", () => {
    const event = makeEvent({
      id: "e1",
      occurredAt: at(0),
      model: { rawName: "fixture-api-small-v2" },
      usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
    });
    const result = requireResult(apiReplay([event]));
    expect(result.economics?.targetCost.amount).toBe("1");
    expect(result.semantics?.modelMix.models).toEqual([
      {
        modelId: "fixture-api-small",
        resolutionKind: "documented-alias",
        eventCount: 1,
        tokenCount: 1_000_000,
      },
    ]);
  });

  it("replays a translated scenario at the substitute's price and labels the assumption", () => {
    const policy: ModelTranslationPolicyV1 = {
      id: "fixture-policy",
      version: "1.0.0",
      name: "Fixture synthetic translation",
      provenance: "builtin-scenario",
      transform: "token-preserving",
      rules: [{ sourceModelId: "fixture-api-small", targetModelId: "fixture-api-dual" }],
    };
    const result = requireResult(
      replay({
        events: [apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 })],
        target: { ...apiTarget(), modelTranslation: policy },
        catalog: makeApiFixtureCatalog(),
        context: fixtureContext,
      }),
    );
    expect(result.economics?.targetCost.amount).toBe("0.5");
    expect(result.semantics?.mode).toBe("translated");
    expect(result.semantics?.targetStack.modelTranslation?.id).toBe("fixture-policy");
    expect(result.versions.translationPolicy).toEqual({ id: "fixture-policy", version: "1.0.0" });
    expect(result.semantics?.evidence.translationMethod).toEqual({
      method: "token-preserving",
      policyId: "fixture-policy",
      policyVersion: "1.0.0",
    });
    expect(result.assumptions.map((assumption) => assumption.id)).toContain(
      "MODEL_TRANSLATION_ASSUMPTION",
    );
    // The mix keeps naming the model the workload was recorded against, and the
    // substitution is reported as the translation it is (M4B) rather than as a
    // different model in the mix.
    expect(result.semantics?.modelMix.models).toEqual([
      {
        modelId: "fixture-api-small",
        resolutionKind: "exact-id",
        eventCount: 1,
        tokenCount: 1_000_000,
      },
    ]);
  });

  it("refuses a translation policy that names a model the catalog does not contain", () => {
    const policy: ModelTranslationPolicyV1 = {
      id: "bad-policy",
      version: "1.0.0",
      name: "Fixture synthetic translation",
      provenance: "builtin-scenario",
      transform: "token-preserving",
      rules: [{ sourceModelId: "fixture-api-small", targetModelId: "not-a-model" }],
    };
    expect(() =>
      replay({
        events: [apiEvent("e1", "fixture-api-small")],
        target: { ...apiTarget(), modelTranslation: policy },
        catalog: makeApiFixtureCatalog(),
        context: fixtureContext,
      }),
    ).toThrow(/IMPORT_SCHEMA_INVALID/);
  });

  it("pins the provider, catalog version and instant in the target stack and versions", () => {
    const result = requireResult(apiReplay([apiEvent("e1", "fixture-api-small")]));
    expect(result.semantics?.targetStack).toEqual({
      type: "api",
      providerId: "fixture-provider",
      effectiveAt: FIXTURE_RULES_AS_OF,
      catalogVersion: FIXTURE_CATALOG_VERSION,
    });
    expect(result.versions).toMatchObject({
      schema: 1,
      catalog: FIXTURE_CATALOG_VERSION,
      rulesAsOf: FIXTURE_RULES_AS_OF,
      targetType: "api",
      // The reference is the provider, not a plan version: no plan is pinned.
      targetReference: "fixture-provider",
      pricingReferences: ["fixture-api-small-pricing"],
    });
    expect(result.semantics?.targetStack).not.toHaveProperty("planVersionId");
    expect(result.subscription).toBeUndefined();
  });

  it("reports the reset phase as not applicable, not as unknown", () => {
    const result = requireResult(apiReplay([apiEvent("e1", "fixture-api-small")]));
    expect(result.semantics?.evidence.resetPhase.status).toBe("not_applicable");
    expect(result.semantics?.evidence.rules.status).toBe("not_applicable");
    expect(result.assumptions.map((assumption) => assumption.id)).toContain(
      "DIRECT_API_LIST_PRICE",
    );
  });
});

describe("M4C: the API path is deterministic and bounded in work", () => {
  it("returns byte-identical results for identical input", () => {
    const build = () =>
      JSON.stringify(
        apiReplay([
          apiEvent("e1", "fixture-api-small", { uncachedInputTokens: 1_000_000 }),
          apiEvent("e2", "fixture-api-dual", { outputTokens: 500_000 }, 1),
        ]),
      );
    expect(build()).toBe(build());
  });

  /**
   * This test builds 100,000 events and replays them, which a hosted runner does
   * in about 7s where a workstation needs well under one, so it carries a budget
   * above the 5s suite default. Its own wall-clock bound is the assertion.
   */
  it("handles a 100k-event workload in one pass without per-event result growth", () => {
    const events = Array.from({ length: 100_000 }, (_, index) =>
      apiEvent(
        `e${index}`,
        "fixture-api-small",
        { uncachedInputTokens: 1_000, outputTokens: 1_000 },
        index % 24,
      ),
    );
    const started = Date.now();
    const result = requireResult(apiReplay(events));
    const elapsed = Date.now() - started;
    // 100k × (1k input @ 1.00/M + 1k output @ 2.00/M) = 300.00
    expect(result.economics?.targetCost.amount).toBe("300");
    expect(result.workload.eventCount).toBe(100_000);
    expect(result.semantics?.dispositions.included).toBe(100_000);
    // A per-event record in the result would blow far past this.
    const serialized = JSON.stringify(result);
    expect(serialized.length).toBeLessThan(20_000);
    expect(elapsed).toBeLessThan(20_000);
  }, 30_000);
});

describe("M4C audit: identity, provider applicability and pricing stay separate", () => {
  const unresolvedEvent = (id: string, hour: number) =>
    makeEvent({
      id,
      occurredAt: at(hour),
      model: { rawName: "not-in-the-catalog", canonicalId: undefined },
      usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      confidence: { usage: "exact", model: "unknown" },
    });

  it("reports an unresolved model as an identity gap, not an applicability or consumption gap", () => {
    const result = requireResult(apiReplay([unresolvedEvent("e1", 0)]));
    const codes = result.warnings.map((warning) => warning.code);
    const factorIds = result.confidence.factors.map((factor) => factor.id);
    const reasons = result.semantics?.replayability.reasons.map((reason) => reason.id) ?? [];

    // The identity gap is reported where identity is reported.
    expect(result.unsupportedModels).toEqual([
      expect.objectContaining({ reason: "unresolved", eventCount: 1 }),
    ]);
    expect(result.semantics?.dispositions.unknown).toBe(1);
    expect(result.semantics?.evidence.modelResolution.status).toBe("partial");
    expect(factorIds).toContain("model_mapping");

    // Provider applicability was never asked, because there is no canonical
    // model to ask about yet.
    expect(codes).not.toContain("API_MODEL_OFFERING_UNESTABLISHED");
    expect(factorIds).not.toContain("model_availability");
    expect(reasons).not.toContain("target_applicability_unknown");

    // Consumption is known: the telemetry is complete, so this is not an
    // unknown-consumption event either, even though the disposition is unknown.
    expect(result.semantics?.evidence.usageCategories.status).toBe("complete");
    expect(reasons).not.toContain("unknown_consumption");
    expect(result.coverage.requests.status).toBe("unknown");
  });

  it("counts provider-applicability uncertainty only for models whose identity is established", () => {
    const result = requireResult(
      apiReplay([
        unresolvedEvent("e1", 0),
        makeEvent({
          id: "e2",
          occurredAt: at(1),
          model: { rawName: "fixture-api-no-offering" },
          usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
          confidence: { usage: "exact", model: "exact" },
        }),
      ]),
    );
    const factor = result.confidence.factors.find((entry) => entry.id === "model_availability");
    const reasons = result.semantics?.replayability.reasons.map((reason) => reason.id) ?? [];

    // Both events are undecided, for different reasons...
    expect(result.semantics?.dispositions.unknown).toBe(2);
    // ...but only the resolved one has an unestablished provider offering.
    expect(factor?.description).toContain("1 event(s)");
    expect(reasons).toContain("target_applicability_unknown");
    expect(
      result.unsupportedModels
        .map((entry) => ({ reason: entry.reason, eventCount: entry.eventCount }))
        .sort((a, b) => (a.reason < b.reason ? -1 : 1)),
    ).toEqual([
      { reason: "offering_unestablished", eventCount: 1 },
      { reason: "unresolved", eventCount: 1 },
    ]);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "API_MODEL_OFFERING_UNESTABLISHED",
    );
  });
});

/** The fixture catalog with one pricing record replaced. */
function withPricing(overrides: Record<string, PricingV1>): CatalogV1 {
  return makeApiFixtureCatalog({
    pricing: { ...apiFixturePricing, ...overrides },
  });
}
