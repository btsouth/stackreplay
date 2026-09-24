import type {
  ExecutionReplayResultV1,
  ModelTranslationPolicyV1,
  TextUsageV1,
} from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import {
  apiPricingRecord,
  fixtureContext,
  fixtureTarget,
  makeApiFixtureCatalog,
  makeFixtureCatalog,
  overageRate,
  rollingLimit,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";
import { projectReplay } from "./projection.js";

/**
 * The projection is the display contract, so these tests are about what an
 * interface is allowed to say. The properties that matter most each have their
 * own case below: a display value is never re-derived from data the engine
 * already decided (money, pricing, identity), an unknown never becomes a zero,
 * a rule's own behaviour is never replaced by a default, and a result that
 * carries no semantics is not described as if it did.
 */

function eventsInOneWindow(count: number, tokensPerEvent = 1_000) {
  return Array.from({ length: count }, (_, index) =>
    makeEvent({
      id: `ev-${index}`,
      occurredAt: new Date(Date.UTC(2026, 7, 1, 0, index)).toISOString(),
      usage: completeUsage({ uncachedInputTokens: tokensPerEvent }),
    }),
  );
}

/** Events recorded against named models, for the Direct API applicability cases. */
function eventsForModels(spec: readonly { model: string; count: number }[]) {
  let minute = 0;
  return spec.flatMap(({ model, count }) =>
    Array.from({ length: count }, () => {
      const event = makeEvent({
        id: `${model}-${minute}`,
        occurredAt: new Date(Date.UTC(2026, 7, 1, 0, minute)).toISOString(),
        model: { rawName: model, canonicalId: model },
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
      });
      minute += 1;
      return event;
    }),
  );
}

const apiTarget = { type: "api" as const, providerId: "fixture-provider" };

const translationPolicy: ModelTranslationPolicyV1 = {
  id: "test-policy",
  version: "1.0.0",
  name: "Test substitution",
  provenance: "builtin-scenario",
  transform: "token-preserving",
  rules: [{ sourceModelId: "fixture-small", targetModelId: "fixture-medium" }],
};

describe("projectReplay", () => {
  it("keeps the rule's own behaviour on every crossing", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({ id: "req", type: "request_limit", amount: "5", exceed: "reject_request" }),
      ],
    });
    const refused = projectReplay(
      replay({
        events: eventsInOneWindow(9),
        target: fixtureTarget,
        catalog,
        context: fixtureContext,
      }),
      catalog,
    );

    expect(refused.crossings.length).toBeGreaterThan(0);
    expect(refused.crossings[0]?.exceed).toBe("reject_request");
    // A refusal is the rule's behaviour; the crossing carries no money of its own.
    expect("billed" in (refused.crossings[0] ?? {})).toBe(false);
    expect(refused.outcomes.find((outcome) => outcome.key === "blocked")?.count).toBeGreaterThan(0);
    expect(refused.headline.percent).toBeLessThan(100);

    const billingCatalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "req",
          type: "request_limit",
          amount: "5",
          exceed: "allow_overage",
          overageRate: overageRate("0.02", "per_request"),
        }),
      ],
    });
    const billed = projectReplay(
      replay({
        events: eventsInOneWindow(9),
        target: fixtureTarget,
        catalog: billingCatalog,
        context: fixtureContext,
      }),
      billingCatalog,
    );

    expect(billed.crossings.length).toBeGreaterThan(0);
    // The rule bills the excess; the crossing states the rule's behaviour, and the
    // money lives in economics.
    expect(billed.crossings[0]?.exceed).toBe("allow_overage");
    expect("billed" in (billed.crossings[0] ?? {})).toBe(false);
    expect(billed.economics.costBasis).toBe("fixed_plan_price_plus_overage");
    expect(billed.economics.overageCost).toBeDefined();
  });

  it("never reads billing out of a quantity, so a record-only rule bills nothing", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({ id: "req", type: "request_limit", amount: "5", exceed: "record_only" }),
      ],
    });
    const projection = projectReplay(
      replay({
        events: eventsInOneWindow(9),
        target: fixtureTarget,
        catalog,
        context: fixtureContext,
      }),
      catalog,
    );

    const crossing = projection.crossings[0];
    expect(crossing).toBeDefined();
    expect(crossing?.exceed).toBe("record_only");
    // The engine measured demand above capacity even though nothing was billed
    // or refused for it: the quantity is a measurement, not a behaviour.
    expect(crossing?.excessUnits).toBeDefined();
    expect("billed" in (crossing ?? {})).toBe(false);
  });

  it("leaves a crossing's behaviour unestablished when the rule is not in the result", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "req",
          type: "request_limit",
          amount: "5",
          exceed: "allow_overage",
          overageRate: overageRate("0.02", "per_request"),
        }),
      ],
    });
    const result = replay({
      events: eventsInOneWindow(9),
      target: fixtureTarget,
      catalog,
      context: fixtureContext,
    });
    const withoutRules: ExecutionReplayResultV1 = { ...result, constraints: [] };
    const projection = projectReplay(withoutRules, catalog);

    expect(projection.crossings.length).toBeGreaterThan(0);
    // No rule means no stated behaviour, and never an inherited default.
    expect(projection.crossings[0]?.exceed).toBeUndefined();
    expect("billed" in (projection.crossings[0] ?? {})).toBe(false);
  });

  it("reports an undecidable event as unknown, and the fixed price as established anyway", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "100000" })],
    });
    const partial: TextUsageV1 = {
      inputTokens: 400,
      outputTokens: 40,
      accounting: { reasoningIncludedInOutput: false },
    };
    const events = [
      ...eventsInOneWindow(3),
      makeEvent({ id: "ev-partial", occurredAt: "2026-08-01T00:30:00.000Z", usage: partial }),
    ];
    const projection = projectReplay(
      replay({ events, target: fixtureTarget, catalog, context: fixtureContext }),
      catalog,
    );

    expect(projection.workload.complete).toBe(false);
    expect(projection.outcomes.find((outcome) => outcome.key === "unknown")?.count).toBeGreaterThan(
      0,
    );
    expect(projection.dimensions.some((dimension) => dimension.status === "unknown")).toBe(true);
    expect(projection.headline.statusLabel).toBe("Unknown");
    // One event was never evaluated, so anything that depends on consumption is
    // open. The plan's own price is a different fact, and it is established.
    expect(projection.economics.consumptionEstablished).toBe(false);
    // The count comes from the engine's usage/accounting evidence, never from a
    // constraint tally: constraint evidence and consumption evidence are separate.
    expect(projection.economics.indeterminateConsumptionEvents).toBe(1);
    expect(projection.economics.targetCostEstablished).toBe(true);
    expect(projection.economics.costReading).toMatch(/plan price is fixed/iu);
    expect(projection.economics.costReading).not.toMatch(/lower bound/iu);
    expect(projection.economics.targetCost).toBe("20.00");
    expect(projection.economics.costDifference).toBeUndefined();
    expect(projection.headline.percent).toBeUndefined();
    expect(projection.headline.statement.length).toBeGreaterThan(0);
  });

  it("states model compatibility when only the target's capacity is qualitative", () => {
    const catalog = makeFixtureCatalog({
      limits: [],
      qualitativeLimits: [
        {
          id: "usage-allowance",
          label: "Usage allowance",
          statement: "The provider publishes no numeric allowance.",
          sourceUrl: "https://example.invalid/limits",
        },
      ],
    });
    const projection = projectReplay(
      replay({
        events: eventsInOneWindow(3),
        target: fixtureTarget,
        catalog,
        context: fixtureContext,
      }),
      catalog,
    );
    expect(projection.headline.status).toBe("unknown");
    expect(projection.headline.statusLabel).toBe("Models supported; capacity unknown");
    expect(projection.headline.statement).toMatch(/All observed models are supported/iu);
    expect(projection.headline.percent).toBeUndefined();
  });

  it("never infers consumption completeness from the constraint list", () => {
    const catalog = makeApiFixtureCatalog();
    const partial: TextUsageV1 = {
      inputTokens: 400,
      outputTokens: 40,
      accounting: { reasoningIncludedInOutput: false },
    };
    const result = replay({
      events: [
        ...eventsForModels([{ model: "fixture-api-small", count: 3 }]),
        makeEvent({
          id: "ev-api-partial",
          occurredAt: "2026-08-01T00:40:00.000Z",
          model: { rawName: "fixture-api-small", canonicalId: "fixture-api-small" },
          usage: partial,
        }),
      ],
      target: apiTarget,
      catalog,
      context: fixtureContext,
    });
    const projection = projectReplay(result, catalog);

    // A Direct API target declares no constraints by construction, so an empty
    // constraint list is not evidence about consumption. The engine's usage and
    // accounting evidence is, and it says part of this workload reports no
    // complete category set.
    expect(projection.constraints).toHaveLength(0);
    expect(result.semantics?.evidence.usageCategories.status).toBe("partial");
    expect(projection.economics.consumptionEstablished).toBe(false);
    expect(projection.economics.indeterminateConsumptionEvents).toBe(1);
    expect(projection.workload.complete).toBe(false);
    expect(projection.economics.consumptionReading).toMatch(/no complete token accounting/iu);
    expect(projection.economics.consumptionReading).not.toMatch(/^0 |all events/iu);
  });

  it("reports no total rather than a lower bound or a zero", () => {
    const catalog = makeApiFixtureCatalog();
    const result = replay({
      events: eventsForModels([
        { model: "fixture-api-small", count: 2 },
        { model: "fixture-api-unpriced", count: 2 },
      ]),
      target: apiTarget,
      catalog,
      context: fixtureContext,
    });
    const projection = projectReplay(result, catalog);

    // Priced and served are different counts: every event here is served and
    // part of the demand has no price in force, so the engine establishes no
    // total. The projection says that instead of a bound or a zero.
    expect(result.economics).toBeUndefined();
    expect(projection.pricing?.status).toBe("partial");
    expect(projection.economics.targetCost).toBeUndefined();
    expect(projection.economics.targetCostEstablished).toBe(false);
    expect(projection.economics.costReading).toMatch(/not determinable/iu);
    expect(projection.economics.costReading).not.toMatch(/lower bound|\$0|^0\.00/iu);
    expect(projection.economics.reason).toBeDefined();
    expect(projection.economics.reason).not.toMatch(/lower bound/iu);
  });

  it("describes service outcomes with service words only", () => {
    const apiCatalog = makeApiFixtureCatalog();
    const api = projectReplay(
      replay({
        events: eventsForModels([{ model: "fixture-api-small", count: 2 }]),
        target: apiTarget,
        catalog: apiCatalog,
        context: fixtureContext,
      }),
      apiCatalog,
    );
    const served = api.outcomes.find((outcome) => outcome.key === "included");
    expect(served?.label).toBe("Served");
    // The service outcome states applicability and nothing about money:
    // priceability is its own block with its own evidence.
    expect(served?.note).not.toMatch(/price|priced|cost|billed|money|rate|\$/iu);
    expect(served?.note).toMatch(/serv|applicab|reach/iu);
    expect(api.outcomes.find((outcome) => outcome.key === "unavailable")?.note).not.toMatch(
      /price|priced|cost|billed|money|rate|\$/iu,
    );

    const planCatalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "req", type: "request_limit", amount: "5" })],
    });
    const plan = projectReplay(
      replay({
        events: eventsInOneWindow(4),
        target: fixtureTarget,
        catalog: planCatalog,
        context: fixtureContext,
      }),
      planCatalog,
    );
    for (const outcome of plan.outcomes) {
      // `overage` is the engine's own disposition for served-and-billed demand,
      // so it is the one row that may mention billing. Every other row is a
      // statement about service.
      if (outcome.key === "overage") continue;
      expect(outcome.note).not.toMatch(/price|priced|cost|rate/iu);
    }
  });

  it("leaves the workload's token total absent when no bucket was established", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "100000" })],
    });
    const partial: TextUsageV1 = {
      inputTokens: 400,
      outputTokens: 40,
      accounting: { reasoningIncludedInOutput: false },
    };
    const withPartialOnly = projectReplay(
      replay({
        events: [
          ...eventsInOneWindow(3),
          makeEvent({ id: "ev-partial", occurredAt: "2026-08-01T00:30:00.000Z", usage: partial }),
        ],
        target: fixtureTarget,
        catalog,
        context: fixtureContext,
      }),
      catalog,
    );

    // The engine omits the disjoint totals entirely once consumption is
    // incomplete, which is an unknown total rather than a total of zero.
    expect(withPartialOnly.workload.tokens.uncachedInput).toBeUndefined();
    expect(withPartialOnly.workload.knownTokens).toBeUndefined();

    const complete = projectReplay(
      replay({
        events: eventsInOneWindow(3),
        target: fixtureTarget,
        catalog,
        context: fixtureContext,
      }),
      catalog,
    );
    expect(complete.workload.knownTokens).toBe(3_000);
  });

  it("carries the engine's money and never derives a second price for it", () => {
    const catalog = makeApiFixtureCatalog();
    const result = replay({
      events: eventsForModels([{ model: "fixture-api-small", count: 3 }]),
      target: apiTarget,
      catalog,
      context: fixtureContext,
    });
    const projection = projectReplay(result, catalog);

    expect(result.economics).toBeDefined();
    expect(projection.economics.targetCost).toBe(result.economics?.targetCost.amount);
    expect(projection.economics.targetCostEstablished).toBe(true);
    expect(projection.economics.costReading).toBe("established for this workload");

    // The pricing block carries quantities only. No rate and no cost live here,
    // because a rate applied to the workload's aggregated buckets is a second
    // pricing engine that can disagree with the engine that produced the result.
    const pricing = projection.pricing;
    expect(pricing).toBeDefined();
    for (const category of pricing?.categories ?? []) {
      expect(Object.keys(category).sort()).toEqual(["key", "label", "tokens"]);
    }
    expect(JSON.stringify(pricing)).not.toMatch(/\$|ratePerMillion|"cost"/u);
  });

  it("never prices an event because the target served it", () => {
    const catalog = makeApiFixtureCatalog();
    const result = replay({
      events: eventsForModels([
        { model: "fixture-api-small", count: 2 },
        { model: "fixture-api-unpriced", count: 2 },
        { model: "fixture-api-rate-basis", count: 2 },
        { model: "fixture-api-open-only", count: 2 },
        { model: "fixture-api-unknown", count: 1 },
      ]),
      target: apiTarget,
      catalog,
      context: fixtureContext,
    });
    const projection = projectReplay(result, catalog);

    // Served and priced are separate questions with separate evidence: six
    // events were served, two of them had a price in force.
    expect(projection.outcomes.find((outcome) => outcome.key === "included")?.count).toBe(6);
    expect(projection.pricing?.servedEvents).toBe(6);
    expect(projection.pricing?.pricedEvents).toBe(2);
    expect(projection.pricing?.unpricedEvents).toBe(4);
    expect(projection.pricing?.status).toBe("partial");
    expect(projection.pricing?.reason).toMatch(/no API list-price record/iu);

    // Applicability is not a pricing fact, and pricing is not an applicability
    // fact: the projection reports no model-level price gap at all, and the
    // unserved models stay where the engine put them.
    expect(Object.keys(projection.pricing ?? {}).sort()).toEqual([
      "categories",
      "pricedEvents",
      "reason",
      "servedEvents",
      "status",
      "unpricedEvents",
    ]);
    expect(projection.outcomes.find((outcome) => outcome.key === "unavailable")?.count).toBe(2);
    expect(projection.headline.status).toBe("unknown");
    expect(projection.headline.statusLabel).toBe("Not fully served");
    expect(projection.headline.statement).toMatch(/Full request coverage is ruled out/iu);
    expect(projection.headline.statement).toMatch(/left undecided/iu);

    // With part of the workload unpriced the engine reports no cost at all, and
    // the projection repeats that rather than a subtotal.
    expect(result.economics).toBeUndefined();
    expect(projection.economics.targetCost).toBeUndefined();
    expect(projection.economics.targetCostEstablished).toBe(false);
    // No engine report means no total: the projection does not promote the
    // absence into a lower bound or a zero.
    expect(projection.economics.costReading).toMatch(/not determinable/iu);
    expect(projection.economics.costReading).not.toMatch(/lower bound/iu);
    expect(projection.economics.reason).toMatch(/no target cost is reported/iu);
  });

  it("gives a Direct API target no subscription mechanics and its own vocabulary", () => {
    const catalog = makeApiFixtureCatalog();
    const projection = projectReplay(
      replay({
        events: eventsInOneWindow(4),
        target: { type: "api", providerId: "fixture-provider" },
        catalog,
        context: fixtureContext,
      }),
      catalog,
    );

    expect(projection.target.kind).toBe("api");
    expect(projection.target.planId).toBeUndefined();
    expect(projection.constraints).toHaveLength(0);
    expect(projection.crossings).toHaveLength(0);
    expect(projection.economics.costBasis).toBe("api_list_price");
    expect(projection.outcomes.find((outcome) => outcome.key === "included")?.label).toBe("Served");
    for (const key of ["overage", "blocked"] as const) {
      const outcome = projection.outcomes.find((entry) => entry.key === key);
      expect(outcome?.note).toContain("not applicable");
    }
    expect(projection.pricing?.categories.length).toBeGreaterThan(0);
    expect(projection.pricing?.categories.every((category) => category.tokens > 0)).toBe(true);
  });

  it("keeps a documented price out of the identity it prices", () => {
    const catalog = makeApiFixtureCatalog();
    const projection = projectReplay(
      replay({
        events: eventsForModels([
          { model: "fixture-api-small", count: 2 },
          { model: "fixture-api-unknown", count: 1 },
        ]),
        target: apiTarget,
        catalog,
        context: fixtureContext,
      }),
      catalog,
    );

    // `fixture-api-small` carries a catalog alias, which is a catalog fact and
    // not a record of what the sources wrote. Only an unresolved identity has a
    // spelling the engine actually observed.
    for (const model of projection.models) {
      if (model.unresolved) {
        expect(model.observed).toBe("fixture-api-unknown");
      } else {
        expect(model.observed).toBeUndefined();
        expect(model.canonicalId).toBeDefined();
      }
    }
    expect(projection.models.some((model) => model.observed === "fixture-api-small-v2")).toBe(
      false,
    );
    expect(projection.workload.observedModels).toEqual(["fixture-api-unknown"]);
  });

  it("says a result carries no semantics instead of inventing an Exact replay", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "req", type: "request_limit", amount: "5" })],
    });
    const result = replay({
      events: eventsInOneWindow(4),
      target: fixtureTarget,
      catalog,
      context: fixtureContext,
    });
    const { semantics, ...withoutSemantics } = result;
    expect(semantics).toBeDefined();
    const projection = projectReplay(withoutSemantics, catalog);

    expect(projection.mode).toBeUndefined();
    expect(projection.modeNote).toMatch(/not established/iu);
    expect(projection.replayability.class).toBeUndefined();
    expect(projection.replayability.classNote).toMatch(/not established/iu);
    expect(projection.evidenceEstablished).toBe(false);
    expect(projection.evidence).toHaveLength(0);
    // Nothing the missing semantics block would have carried is filled in: no
    // completeness flag, no resolution count, no workload scope, and no
    // second-hand tally standing in for the engine's own dispositions.
    expect(projection.workload.complete).toBeUndefined();
    expect(projection.workload.unresolvedEventCount).toBeUndefined();
    expect(projection.provenance.workloadScopeKind).toBeUndefined();
    expect("undecided" in projection).toBe(false);
    // A count the result does not carry is absent, not a zero, and the headline
    // sentence therefore makes no claim about blocked demand.
    for (const outcome of projection.outcomes) {
      expect(outcome.count).toBeUndefined();
    }
    expect(projection.headline.statement).not.toMatch(/0 blocked|0 billed/iu);
    expect(projection.translation).toBeUndefined();
  });

  it("names the translation assumption and never calls it equivalence", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "req", type: "request_limit", amount: "5" })],
    });
    const projection = projectReplay(
      replay({
        events: eventsInOneWindow(4),
        target: {
          type: "subscription",
          planVersionId: "fixture-plan@2026-08-01",
          modelTranslation: translationPolicy,
        },
        catalog,
        context: fixtureContext,
      }),
      catalog,
    );

    expect(projection.mode).toBe("translated");
    expect(projection.translation?.policyId).toBe("test-policy");
    expect(projection.translation?.method).toBe("token-preserving");
    expect(projection.modeNote).not.toMatch(/equivalent|matches|same quality/iu);
    expect(projection.assumptions.join(" ")).toMatch(/no empirical conversion ratio/iu);
  });

  it("reports evidence as independent dimensions and no combined score", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "req", type: "request_limit", amount: "5" })],
    });
    const projection = projectReplay(
      replay({
        events: eventsInOneWindow(3),
        target: fixtureTarget,
        catalog,
        context: fixtureContext,
      }),
      catalog,
    );

    const keys = Object.keys(projection).join(" ");
    expect(keys).not.toMatch(/confidence|score|grade/iu);
    expect(projection.evidenceEstablished).toBe(true);
    expect(projection.evidence.length).toBeGreaterThanOrEqual(5);
    for (const row of projection.evidence) {
      expect(row.reading.length).toBeGreaterThan(0);
      expect(row.label.length).toBeGreaterThan(0);
    }
    expect(projection.provenance.resetPhase.length).toBeGreaterThan(0);
    expect(projection.provenance.workloadScopeKind).toBe("imported_workload");
    expect(projection.provenance.syntheticTarget).toBe(false);
  });

  it("carries the engine's own status word for the headline", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({ id: "req", type: "request_limit", amount: "2", exceed: "reject_request" }),
      ],
    });
    const result = replay({
      events: eventsInOneWindow(4),
      target: fixtureTarget,
      catalog,
      context: fixtureContext,
    });

    const projection = projectReplay(result, catalog);

    // One replay, one label: every surface reads this string rather than writing
    // its own summary of the same outcome counts.
    expect(projection.headline.status).toBe(result.feasibility.status);
    expect(projection.headline.statusLabel).toBe(
      result.feasibility.status === "full"
        ? "Fully served"
        : result.feasibility.status === "partial"
          ? "Partly served"
          : result.feasibility.status === "none"
            ? "Not served"
            : "Unknown",
    );
    expect(projection.headline.statusLabel).toBe("Partly served");
  });

  it("prices what the catalog states, not what a neighbouring category states", () => {
    const base = apiPricingRecord("fixture-api-small-pricing");
    const catalog = makeApiFixtureCatalog({
      pricing: {
        ...makeApiFixtureCatalog().pricing,
        "fixture-api-small-pricing": {
          ...base,
          rates: { ...base.rates, reasoning: { billedAs: "output" } },
        },
      },
    });
    const projection = projectReplay(
      replay({
        events: eventsForModels([{ model: "fixture-api-small", count: 4 }]),
        target: apiTarget,
        catalog,
        context: fixtureContext,
      }),
      catalog,
    );

    // A redirect is the engine's business, not the display's: the projection
    // reports the categories the workload actually consumed and no rate at all.
    const keys = (projection.pricing?.categories ?? []).map((category) => category.key);
    expect(keys).toContain("uncachedInput");
    for (const category of projection.pricing?.categories ?? []) {
      expect(JSON.stringify(category)).not.toMatch(/rate|price|cost/iu);
    }
  });

  it("states a requests reading with no counts rather than counting them as zero", () => {
    const catalog = makeApiFixtureCatalog();
    const result = replay({
      events: eventsForModels([{ model: "fixture-api-small", count: 3 }]),
      target: apiTarget,
      catalog,
      context: fixtureContext,
    });
    // A partial dimension whose counts the engine did not report: the boundary
    // the headline passes through on its way to every surface.
    const projection = projectReplay(
      {
        ...result,
        coverage: {
          ...result.coverage,
          requests: {
            ...result.coverage.requests,
            covered: undefined,
            total: undefined,
            percent: undefined,
          },
        },
      },
      catalog,
    );

    const statement = projection.headline.statement;
    expect(statement).not.toMatch(/0 of 0|undefined|NaN/u);
    expect(statement).toMatch(/does not report how many modeled requests were served/iu);
    expect(projection.headline.percent).toBeUndefined();
  });
});
