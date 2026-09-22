import { describe, expect, it } from "vitest";
import {
  apiTargetV1Schema,
  executionTargetV1Schema,
  subscriptionTargetV1Schema,
} from "./execution-target.js";
import {
  constraintResultV1Schema,
  executionReplayResultV1Schema,
  unsupportedModelV1Schema,
} from "./replay-result.js";
import {
  apiReplayTargetStackV1Schema,
  replaySemanticsV1Schema,
  subscriptionReplayTargetStackV1Schema,
} from "./replay-semantics.js";

/**
 * M4C Direct API target contracts.
 *
 * The contract under test (M4C plan sections 6, 14-16, 31): the pre-M4A API shell
 * still parses so old documents stay readable, the API target stack is a distinct
 * shape from a subscription stack, and a result may not wear a target type its
 * own stack, constraints, subscription detail or economics contradict.
 */

const completeDimension = {
  status: "complete" as const,
  events: { covered: 2, total: 2 },
  tokens: { covered: 30, total: 30 },
};

const knownCoverage = { status: "known" as const, percent: 100, covered: 2, total: 2 };

const apiSemantics = (overrides: Record<string, unknown> = {}) => ({
  mode: "exact" as const,
  targetStack: {
    type: "api" as const,
    providerId: "example-provider",
    effectiveAt: "2026-09-15",
    catalogVersion: "fixture:1",
  },
  dispositions: { included: 2, overage: 0, blocked: 0, unavailable: 0, unknown: 0 },
  replayability: {
    class: "deterministic" as const,
    reasons: [{ id: "numeric_mechanics", description: "prices are numeric" }],
  },
  evidence: {
    modelResolution: completeDimension,
    usageCategories: completeDimension,
    pricing: completeDimension,
    rules: { status: "not_applicable" as const, reason: "no allowance system applies" },
    temporal: completeDimension,
    translationMethod: { method: "none" as const },
    resetPhase: { status: "not_applicable" as const, reason: "no allowance window" },
  },
  modelMix: {
    models: [
      {
        modelId: "example-sol",
        resolutionKind: "exact-id" as const,
        eventCount: 2,
        tokenCount: 30,
      },
    ],
    unresolvedEventCount: 0,
  },
  workloadScope: {
    kind: "imported_workload" as const,
    statement: "This replay covers the imported workload only.",
  },
  ...overrides,
});

/** A complete, valid Direct API result. */
const apiResult = (overrides: Record<string, unknown> = {}) => ({
  version: 1 as const,
  workload: {
    eventCount: 2,
    from: "2026-09-01T00:00:00Z",
    to: "2026-09-01T01:00:00Z",
    modelCount: 1,
    tokenTotals: { inputTokens: 30 },
  },
  target: { type: "api" as const, providerId: "example-provider" },
  feasibility: { status: "full" as const, coveragePercent: 100, coverageDimension: "requests" },
  coverage: { requests: knownCoverage, usage: knownCoverage, models: knownCoverage },
  constraints: [],
  violations: [],
  unsupportedModels: [],
  economics: { targetCost: { amount: "3.50", currency: "USD" }, costBasis: "api_list_price" },
  assumptions: [{ id: "DIRECT_API_LIST_PRICE", description: "List prices only." }],
  confidence: { level: "high" as const, factors: [] },
  warnings: [],
  versions: {
    engine: "0.0.4",
    schema: 1 as const,
    catalog: "fixture:1",
    methodology: "1.4.0",
    rulesAsOf: "2026-09-15",
    targetType: "api" as const,
    targetReference: "example-provider",
    pricingReferences: ["example-api-pricing"],
  },
  semantics: apiSemantics(),
  ...overrides,
});

describe("M4C: the API target shell still parses", () => {
  it("accepts the fields the pre-M4A shell carried, for parsing compatibility", () => {
    // Refusing these at execution is the engine's job (it raises
    // API_PRICING_REFERENCE_NOT_SUPPORTED / API_MODEL_MAPPING_NOT_SUPPORTED);
    // refusing them at parse time would make already-stored documents unreadable.
    const legacy = {
      type: "api",
      providerId: "example-provider",
      pricingVersionId: "example-pricing-2025",
      modelMapping: [{ fromModelId: "example-sol", toModelId: "example-terra" }],
    };
    expect(apiTargetV1Schema.safeParse(legacy).success).toBe(true);
  });

  it("accepts a translation policy as the only cross-model mechanism", () => {
    const withPolicy = {
      type: "api",
      providerId: "example-provider",
      modelTranslation: {
        id: "example-policy",
        version: "1.0.0",
        name: "Example policy",
        provenance: "user",
        transform: "token-preserving",
        rules: [{ sourceModelId: "example-sol", targetModelId: "example-terra" }],
      },
    };
    expect(apiTargetV1Schema.safeParse(withPolicy).success).toBe(true);
  });

  it("requires a provider and rejects a bare api target", () => {
    expect(apiTargetV1Schema.safeParse({ type: "api" }).success).toBe(false);
    expect(apiTargetV1Schema.safeParse({ type: "api", providerId: "" }).success).toBe(false);
  });

  it("stays a distinct variant of the target union", () => {
    expect(apiTargetV1Schema.safeParse({ type: "subscription", planId: "p" }).success).toBe(false);
    expect(subscriptionTargetV1Schema.safeParse({ type: "api", providerId: "p" }).success).toBe(
      false,
    );
    expect(executionTargetV1Schema.safeParse({ type: "api", providerId: "p" }).success).toBe(true);
  });
});

describe("M4C: the API target stack is not a subscription stack", () => {
  const apiStack = {
    type: "api" as const,
    providerId: "example-provider",
    effectiveAt: "2026-09-15",
    catalogVersion: "fixture:1",
  };

  it("accepts an API stack without any plan, allowance or reset", () => {
    expect(apiReplayTargetStackV1Schema.safeParse(apiStack).success).toBe(true);
    expect(
      replaySemanticsV1Schema.safeParse(apiSemantics()).success,
      "an API stack parses inside the semantics block",
    ).toBe(true);
  });

  it("refuses plan fields on an API stack", () => {
    expect(
      apiReplayTargetStackV1Schema.safeParse({ ...apiStack, planVersionId: "p@1" }).success,
    ).toBe(false);
    expect(
      apiReplayTargetStackV1Schema.safeParse({ ...apiStack, overageMode: "disabled" }).success,
    ).toBe(false);
    expect(
      apiReplayTargetStackV1Schema.safeParse({ ...apiStack, reset: { kind: "rolling" } }).success,
    ).toBe(false);
  });

  it("refuses a subscription stack that claims to be the API shape", () => {
    const subscriptionStack = {
      providerId: "example-provider",
      planId: "example-plan",
      planVersionId: "example-plan@2026-01-01",
      effectiveAt: "2026-09-15",
      catalogVersion: "fixture:1",
      overageMode: "disabled" as const,
      reset: { kind: "rolling" as const },
    };
    expect(apiReplayTargetStackV1Schema.safeParse(subscriptionStack).success).toBe(false);
    expect(subscriptionReplayTargetStackV1Schema.safeParse(subscriptionStack).success).toBe(true);
    // A subscription stack that omits `type` stays exactly what it always was.
    expect(
      subscriptionReplayTargetStackV1Schema.safeParse({ ...subscriptionStack, type: "api" })
        .success,
    ).toBe(false);
  });

  it("refuses overage dispositions on a target whose rules forbid overage", () => {
    const semantics = apiSemantics({
      targetStack: {
        providerId: "example-provider",
        planId: "example-plan",
        planVersionId: "example-plan@2026-01-01",
        effectiveAt: "2026-09-15",
        catalogVersion: "fixture:1",
        overageMode: "disabled",
        reset: { kind: "rolling" },
      },
      dispositions: { included: 2, overage: 1, blocked: 0, unavailable: 0, unknown: 0 },
    });
    expect(replaySemanticsV1Schema.safeParse(semantics).success).toBe(false);
  });
});

/**
 * The message of the first issue at a path, so a negative test can prove the
 * intended invariant fired rather than a fixture that was never valid.
 */
const issueMessageAt = (
  parsed: ReturnType<typeof executionReplayResultV1Schema.safeParse>,
  path: string[],
): string | undefined => {
  if (parsed.success) return undefined;
  const wanted = path.join(".");
  return parsed.error.issues.find((issue) => issue.path.join(".") === wanted)?.message;
};

describe("M4C: an API result cannot masquerade as a subscription result", () => {
  it("accepts a faithful Direct API result", () => {
    expect(executionReplayResultV1Schema.safeParse(apiResult()).success).toBe(true);
  });

  const subscriptionStack = {
    providerId: "example-provider",
    planId: "example-plan",
    planVersionId: "example-plan@2026-01-01",
    effectiveAt: "2026-09-15",
    catalogVersion: "fixture:1",
    overageMode: "disabled" as const,
    reset: { kind: "rolling" as const },
  };

  it("refuses an API target pinned by a subscription stack", () => {
    expect(
      executionReplayResultV1Schema.safeParse(
        apiResult({ semantics: apiSemantics({ targetStack: subscriptionStack }) }),
      ).success,
    ).toBe(false);
  });

  it("refuses a subscription target pinned by an API stack", () => {
    const relabelled = apiResult({
      target: { type: "subscription", planVersionId: "example-plan@2026-01-01" },
      versions: {
        ...apiResult().versions,
        targetType: "subscription",
        targetReference: "example-plan@2026-01-01",
      },
    });
    expect(executionReplayResultV1Schema.safeParse(relabelled).success).toBe(false);
  });

  it("refuses a stack that names a different provider than the target", () => {
    expect(
      executionReplayResultV1Schema.safeParse(
        apiResult({
          semantics: apiSemantics({
            targetStack: {
              type: "api",
              providerId: "another-provider",
              effectiveAt: "2026-09-15",
              catalogVersion: "fixture:1",
            },
          }),
        }),
      ).success,
    ).toBe(false);
  });

  it("refuses allowance constraints or violations on an API result", () => {
    // The literal is checked against its own schema first: a refusal has to come
    // from the API-target rule, not from a fixture that was never a constraint.
    const constraint = {
      id: "monthly",
      label: "Monthly tokens",
      kind: "token_limit",
      unit: "tokens",
      window: { kind: "calendar", description: "calendar month (UTC)" },
      exceed: "reject_request",
      limitUnits: "100",
      attemptedUnits: "30",
      consumedUnits: "30",
      eligibleEvents: 2,
      rejectedEvents: 0,
      indeterminateEvents: 0,
      violationCount: 0,
      status: "pass",
    };
    expect(constraintResultV1Schema.safeParse(constraint).success, "fixture is a constraint").toBe(
      true,
    );
    expect(
      executionReplayResultV1Schema.safeParse(apiResult({ constraints: [constraint] })).success,
      "an API target has no allowance to report",
    ).toBe(false);
    expect(
      executionReplayResultV1Schema.safeParse(
        apiResult({
          constraints: [constraint],
          violations: [
            {
              constraintId: "monthly",
              unit: "tokens",
              attempted: "30",
              limit: "100",
              blockedEvents: 0,
            },
          ],
        }),
      ).success,
    ).toBe(false);
  });

  /** A subscription detail that is valid on its own. */
  const planDetail = {
    planId: "example-plan",
    planVersionId: "example-plan@2026-01-01",
    name: "Example plan",
    providerId: "example-provider",
    price: { amount: "20.00", currency: "USD" },
    interval: "month",
    verificationStatus: "estimated",
  };

  it("refuses an API target that omits the optional semantics block", () => {
    // The semantics block is optional so pre-M4B documents stay readable, which
    // means a plan replay must not become a list-price replay by dropping it.
    const planEconomics = {
      basePlanCost: { amount: "20.00", currency: "USD" },
      targetCost: { amount: "20.00", currency: "USD" },
      costBasis: "fixed_plan_price",
    };
    // The pieces the API target has to refuse are valid on a plan replay first.
    // Without this the refusals below could come from a malformed fixture, as
    // they did while the detail was missing its required verification status.
    const planReplay = {
      ...apiResult({
        target: { type: "subscription", planVersionId: "example-plan@2026-01-01" },
        versions: {
          ...apiResult().versions,
          targetType: "subscription",
          targetReference: "example-plan@2026-01-01",
        },
        subscription: planDetail,
        economics: planEconomics,
        semantics: undefined,
      }),
    };
    expect(
      executionReplayResultV1Schema.safeParse(planReplay).success,
      "fixture is a faithful plan replay",
    ).toBe(true);

    const withoutSemantics = { ...apiResult(), semantics: undefined };
    expect(executionReplayResultV1Schema.safeParse(withoutSemantics).success).toBe(true);
    const detailOnApi = executionReplayResultV1Schema.safeParse({
      ...withoutSemantics,
      subscription: planDetail,
    });
    expect(
      detailOnApi.success,
      "subscription detail cannot ride along on an API target without semantics",
    ).toBe(false);
    expect(issueMessageAt(detailOnApi, ["subscription"])).toBe(
      "a Direct API replay carries no subscription detail",
    );
    const economicsOnApi = executionReplayResultV1Schema.safeParse({
      ...withoutSemantics,
      economics: planEconomics,
    });
    expect(
      economicsOnApi.success,
      "a plan-cost basis cannot ride along on an API target without semantics",
    ).toBe(false);
    expect(issueMessageAt(economicsOnApi, ["economics", "costBasis"])).toBe(
      "a Direct API replay's cost is an API list-price total",
    );
  });

  it("refuses billed overage or blocked demand on an API result", () => {
    expect(
      executionReplayResultV1Schema.safeParse(apiResult()).success,
      "base fixture is a faithful API result",
    ).toBe(true);
    // Each mutation still accounts for every replayed event exactly once, so the
    // generic disposition total cannot be what rejects it: the API rule is the
    // only candidate left.
    for (const dispositions of [
      { included: 0, overage: 2, blocked: 0, unavailable: 0, unknown: 0 },
      { included: 1, overage: 0, blocked: 1, unavailable: 0, unknown: 0 },
    ]) {
      const parsed = executionReplayResultV1Schema.safeParse(
        apiResult({ semantics: apiSemantics({ dispositions }) }),
      );
      expect(
        parsed.success,
        "a Direct API target has no allowance to exceed and no request to refuse",
      ).toBe(false);
      expect(issueMessageAt(parsed, ["semantics", "dispositions"])).toBe(
        "a Direct API target bills no overage and blocks no request",
      );
    }
  });

  it("refuses subscription detail on an API result", () => {
    const parsed = executionReplayResultV1Schema.safeParse(apiResult({ subscription: planDetail }));
    expect(parsed.success).toBe(false);
    expect(issueMessageAt(parsed, ["subscription"])).toBe(
      "a Direct API replay carries no subscription detail",
    );
  });

  it("refuses a plan-cost basis on an API result", () => {
    expect(
      executionReplayResultV1Schema.safeParse(
        apiResult({
          economics: {
            basePlanCost: { amount: "20.00", currency: "USD" },
            targetCost: { amount: "20.00", currency: "USD" },
            costBasis: "fixed_plan_price",
          },
        }),
      ).success,
    ).toBe(false);
  });

  it("refuses a plan base cost smuggled under the API list-price basis", () => {
    expect(
      executionReplayResultV1Schema.safeParse(
        apiResult({
          economics: {
            basePlanCost: { amount: "20.00", currency: "USD" },
            targetCost: { amount: "23.50", currency: "USD" },
            costBasis: "api_list_price",
          },
        }),
      ).success,
    ).toBe(false);
  });
});

describe("M4C: unsupported-model reasons name the finding", () => {
  it("accepts the API readings alongside the subscription ones", () => {
    for (const reason of [
      "not_supported",
      "excluded",
      "unresolved",
      "not_offered",
      "offering_unestablished",
    ]) {
      expect(
        unsupportedModelV1Schema.safeParse({
          rawName: "example-sol",
          canonicalId: "example-sol",
          eventCount: 1,
          reason,
        }).success,
      ).toBe(true);
    }
  });

  it("rejects a reason outside the vocabulary", () => {
    expect(
      unsupportedModelV1Schema.safeParse({
        rawName: "example-sol",
        eventCount: 1,
        reason: "probably-not-offered",
      }).success,
    ).toBe(false);
  });
});
