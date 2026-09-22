import type { ModelV1 } from "@stackreplay/catalog";
import {
  type ExecutionReplayResultV1,
  executionReplayResultV1Schema,
  isApiReplayTargetStackV1,
  type ModelTranslationPolicyV1,
  type SubscriptionReplayTargetStackV1,
} from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import { ReplayEngineError } from "./errors.js";
import {
  calendarLimit,
  FIXTURE_CATALOG_VERSION,
  FIXTURE_PLAN_VERSION_ID,
  FIXTURE_RULES_AS_OF,
  fixtureContext,
  fixtureModels,
  makeFixtureCatalog,
  rollingLimit,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";

/**
 * M4B replay-semantics tests.
 *
 * The contract under test (M4B plan sections 3-13): identity is not
 * translation, exact is not translated, dispositions are distinct, replayability
 * is not verification, evidence dimensions stay separate with explicit
 * denominators, and unknown stays unknown.
 */

const at = (hour: number) => `2026-09-01T${String(hour).padStart(2, "0")}:00:00Z`;
const input = (tokens: number, model?: string) => ({
  usage: completeUsage({ uncachedInputTokens: tokens }),
  ...(model === undefined ? {} : { model: { rawName: model, canonicalId: model } }),
});

/**
 * The subscription target stack of a fixture replay. The result's stack is a
 * backward-compatible union since M4C; these M4B tests narrow to the branch
 * they exercise, and a replay that pinned the API branch would fail here rather
 * than read a field off the wrong shape.
 */
function subscriptionStack(result: ExecutionReplayResultV1): SubscriptionReplayTargetStackV1 {
  const stack = result.semantics?.targetStack;
  if (stack === undefined) throw new Error("expected replay semantics");
  if (isApiReplayTargetStackV1(stack)) throw new Error("expected a subscription target stack");
  return stack;
}

const aliasSource = {
  url: "https://example.invalid/alias",
  title: "Fixture alias",
  checkedAt: "2026-08-01",
};

/** Fixture models with one provider id alias and one documented provider route. */
const aliasedModels: Record<string, ModelV1> = {
  "fixture-small": {
    ...(fixtureModels["fixture-small"] as ModelV1),
    aliases: [
      {
        id: "fixture-small-provider-id",
        alias: "fixture-small-2026-01",
        kind: "provider_id",
        sources: [aliasSource],
        lastVerifiedAt: "2026-08-01",
        verificationStatus: "estimated",
      },
    ],
  },
  "fixture-medium": {
    ...(fixtureModels["fixture-medium"] as ModelV1),
    aliases: [
      {
        id: "fixture-medium-route",
        alias: "router/medium",
        kind: "provider_route",
        sources: [aliasSource],
        lastVerifiedAt: "2026-08-01",
        verificationStatus: "estimated",
      },
    ],
  },
  /** Established model the fixture plan has no rule for. */
  "fixture-ghost": {
    id: "fixture-ghost",
    role: "model",
    name: "Fixture Ghost",
    sources: [
      { url: "https://example.invalid/fixture-ghost", title: "Fixture", checkedAt: "2026-08-01" },
    ],
    lastVerifiedAt: "2026-08-01",
    verificationStatus: "estimated",
  },
};

/** Usage that does not report every canonical category, so its total is unknown. */
const partialAccounting = (input: number) => ({
  inputTokens: input,
  outputTokens: 0,
  cacheReadTokens: 0,
  accounting: {
    cacheReadIncludedInInput: false,
    cacheWriteIncludedInInput: false,
    reasoningIncludedInOutput: false,
  },
});

const tokenLimit = () => rollingLimit({ id: "tokens", type: "token_limit", amount: "1000" });
const creditPool = (exceed: "allow_overage" | "reject_request") =>
  rollingLimit({ id: "pool", type: "credit_pool", amount: "5.00", exceed });

const translationPolicy: ModelTranslationPolicyV1 = {
  id: "fixture-translation",
  version: "1.0.0",
  name: "Fixture synthetic translation",
  provenance: "builtin-scenario",
  transform: "token-preserving",
  rules: [{ sourceModelId: "fixture-small", targetModelId: "fixture-medium" }],
};

function translatedTarget() {
  return {
    type: "subscription" as const,
    planVersionId: FIXTURE_PLAN_VERSION_ID,
    modelTranslation: translationPolicy,
  };
}

describe("M4B: model identity is factual, resolution kind is explicit", () => {
  it("keeps an exact canonical id exact", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(6_000_000) })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    expect(result.semantics?.modelMix.models).toEqual([
      {
        modelId: "fixture-small",
        resolutionKind: "exact-id",
        eventCount: 1,
        tokenCount: 6_000_000,
      },
    ]);
    expect(result.semantics?.evidence.modelResolution).toEqual({
      status: "complete",
      events: { covered: 1, total: 1 },
      tokens: { covered: 6_000_000, total: 6_000_000 },
    });
  });

  it("resolves a declared provider id alias to the same canonical model", () => {
    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: at(0),
          usage: completeUsage({ uncachedInputTokens: 6_000_000 }),
          model: { rawName: "fixture-small-2026-01" },
        }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({
        limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "10000000" })],
        models: aliasedModels,
      }),
      context: fixtureContext,
    });
    expect(result.semantics?.modelMix.models).toEqual([
      {
        modelId: "fixture-small",
        resolutionKind: "documented-alias",
        eventCount: 1,
        tokenCount: 6_000_000,
      },
    ]);
    // The same underlying model reached through an alias is still exact replay.
    expect(result.semantics?.mode).toBe("exact");
    expect(result.coverage.requests.percent).toBe(100);
  });

  it("resolves a documented same-model provider route without calling it translation", () => {
    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: at(0),
          usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
          model: { rawName: "router/medium" },
        }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()], models: aliasedModels }),
      context: fixtureContext,
    });
    expect(result.semantics?.modelMix.models).toEqual([
      {
        modelId: "fixture-medium",
        resolutionKind: "documented-route",
        eventCount: 1,
        tokenCount: 1_000_000,
      },
    ]);
    expect(result.semantics?.mode).toBe("exact");
    expect(result.semantics?.translation).toBeUndefined();
  });

  it("keeps an unresolved identifier unresolved, with reduced coverage and no mode change", () => {
    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: at(0),
          usage: completeUsage({ uncachedInputTokens: 6_000_000 }),
          model: { rawName: "ghost-model" },
        }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    expect(result.semantics?.mode).toBe("exact");
    expect(result.semantics?.dispositions).toEqual({
      included: 0,
      overage: 0,
      blocked: 0,
      unavailable: 0,
      unknown: 1,
    });
    expect(result.semantics?.modelMix).toEqual({ models: [], unresolvedEventCount: 1 });
    const resolution = result.semantics?.evidence.modelResolution;
    expect(resolution?.status).toBe("partial");
    expect(resolution?.events).toEqual({ covered: 0, total: 1 });
    // The usage denominator exists, and none of it resolved to a model.
    expect(resolution?.tokens).toEqual({ covered: 0, total: 6_000_000 });
    expect(resolution?.reason).toContain("no catalog source establishes");
    expect(result.unsupportedModels).toEqual([
      { rawName: "ghost-model", eventCount: 1, reason: "unresolved" },
    ]);
  });
});

describe("M4B: exact replay versus translated replay", () => {
  it("stays exact when the whole workload uses the target's own models", () => {
    const result = replay({
      events: [
        makeEvent({ id: "e1", occurredAt: at(0), ...input(1_000_000, "fixture-small") }),
        makeEvent({ id: "e2", occurredAt: at(1), ...input(1_000_000, "fixture-medium") }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    expect(result.semantics?.mode).toBe("exact");
    expect(result.semantics?.translation).toBeUndefined();
    expect(result.semantics?.evidence.translationMethod).toEqual({ method: "none" });
    expect(result.assumptions.map((assumption) => assumption.id)).not.toContain(
      "MODEL_TRANSLATION_ASSUMPTION",
    );
  });

  it("becomes translated and states the substitution, transform and policy", () => {
    const result = replay({
      events: [
        makeEvent({ id: "e1", occurredAt: at(0), ...input(1_000_000, "fixture-small") }),
        makeEvent({ id: "e2", occurredAt: at(1), ...input(1_000_000, "fixture-medium") }),
      ],
      target: translatedTarget(),
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    const semantics = result.semantics;
    expect(semantics?.mode).toBe("translated");
    expect(semantics?.translation).toEqual({
      applied: [{ sourceModelId: "fixture-small", targetModelId: "fixture-medium", eventCount: 1 }],
      substitutedEvents: 1,
    });
    expect(semantics?.targetStack.modelTranslation).toEqual(translationPolicy);
    expect(semantics?.evidence.translationMethod).toEqual({
      method: "token-preserving",
      policyId: translationPolicy.id,
      policyVersion: translationPolicy.version,
    });
    expect(result.versions.translationPolicy).toEqual({
      id: translationPolicy.id,
      version: translationPolicy.version,
    });

    // The observed mix still describes what was recorded, not what was run.
    expect(semantics?.modelMix.models).toEqual([
      {
        modelId: "fixture-medium",
        resolutionKind: "exact-id",
        eventCount: 1,
        tokenCount: 1_000_000,
      },
      {
        modelId: "fixture-small",
        resolutionKind: "exact-id",
        eventCount: 1,
        tokenCount: 1_000_000,
      },
    ]);
    // Coverage counts the models the target would run, which is now one model.
    expect(semantics?.workloadScope.kind).toBe("imported_workload");

    // The assumption is stated in both places a reader looks.
    const assumptionIds = result.assumptions.map((assumption) => assumption.id);
    expect(assumptionIds).toContain("MODEL_TRANSLATION_ASSUMPTION");
    expect(assumptionIds).toContain("TRANSLATION_TOKEN_PRESERVING");
    expect(
      result.assumptions.find((assumption) => assumption.id === "TRANSLATION_TOKEN_PRESERVING")
        ?.description,
    ).toContain("No empirical conversion ratio");
    expect(result.confidence.factors.map((factor) => factor.id)).toContain("model_translation");
  });

  it("invents no translation when the scenario supplies no policy", () => {
    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: at(0),
          usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
          model: { rawName: "fixture-ghost", canonicalId: "fixture-ghost" },
        }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()], models: aliasedModels }),
      context: fixtureContext,
    });
    expect(result.semantics?.mode).toBe("exact");
    expect(result.semantics?.translation).toBeUndefined();
    expect(result.semantics?.dispositions.unavailable).toBe(1);
    expect(result.unsupportedModels).toEqual([
      {
        rawName: "fixture-ghost",
        canonicalId: "fixture-ghost",
        eventCount: 1,
        reason: "not_supported",
      },
    ]);
  });

  it("rejects a policy that names models outside the catalog", () => {
    const bad = (rule: { sourceModelId: string; targetModelId: string }) =>
      replay({
        events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(1_000_000, "fixture-small") })],
        target: {
          type: "subscription",
          planVersionId: FIXTURE_PLAN_VERSION_ID,
          modelTranslation: { ...translationPolicy, rules: [rule] },
        },
        catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
        context: fixtureContext,
      });
    expect(() =>
      bad({ sourceModelId: "not-in-catalog", targetModelId: "fixture-medium" }),
    ).toThrowError(ReplayEngineError);
    expect(() => bad({ sourceModelId: "fixture-small", targetModelId: "not-in-catalog" })).toThrow(
      /IMPORT_SCHEMA_INVALID/,
    );
  });

  it("cannot be re-read as an exact replay", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(1_000_000, "fixture-small") })],
      target: translatedTarget(),
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    const semantics = result.semantics;
    if (semantics === undefined) throw new Error("expected semantics");
    expect(executionReplayResultV1Schema.safeParse(result).success).toBe(true);
    expect(
      executionReplayResultV1Schema.safeParse({
        ...result,
        semantics: { ...semantics, mode: "exact" },
      }).success,
    ).toBe(false);
    expect(
      executionReplayResultV1Schema.safeParse({
        ...result,
        semantics: { ...semantics, translation: undefined },
      }).success,
    ).toBe(false);
    expect(
      executionReplayResultV1Schema.safeParse({
        ...result,
        versions: { ...result.versions, translationPolicy: undefined },
      }).success,
    ).toBe(false);
  });
});

describe("M4B: dispositions keep included, overage, blocked, unavailable and unknown apart", () => {
  it("keeps included usage included", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500) })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    expect(result.semantics?.dispositions).toEqual({
      included: 1,
      overage: 0,
      blocked: 0,
      unavailable: 0,
      unknown: 0,
    });
  });

  it("reports paid overage as overage, never as blocked", () => {
    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: at(0),
          usage: completeUsage({ uncachedInputTokens: 4_000_000 }),
        }),
        makeEvent({
          id: "e2",
          occurredAt: at(1),
          usage: completeUsage({ uncachedInputTokens: 4_000_000 }),
        }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [creditPool("allow_overage")] }),
      context: fixtureContext,
    });
    expect(result.semantics?.dispositions).toEqual({
      included: 1,
      overage: 1,
      blocked: 0,
      unavailable: 0,
      unknown: 0,
    });
    expect(result.economics?.overageCost?.amount).toBe("3");
  });

  it("reports a rejected request as blocked when the target forbids overage", () => {
    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: at(0),
          usage: completeUsage({ uncachedInputTokens: 4_000_000 }),
        }),
        makeEvent({
          id: "e2",
          occurredAt: at(1),
          usage: completeUsage({ uncachedInputTokens: 4_000_000 }),
        }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [creditPool("reject_request")] }),
      context: fixtureContext,
    });
    expect(result.semantics?.dispositions).toEqual({
      included: 1,
      overage: 0,
      blocked: 1,
      unavailable: 0,
      unknown: 0,
    });
  });

  it("keeps an unavailable model unavailable, and accounts for every event once", () => {
    const result = replay({
      events: [
        makeEvent({ id: "e1", occurredAt: at(0), ...input(500, "fixture-small") }),
        makeEvent({ id: "e2", occurredAt: at(1), ...input(500, "fixture-ghost") }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()], models: aliasedModels }),
      context: fixtureContext,
    });
    expect(result.semantics?.dispositions).toEqual({
      included: 1,
      overage: 0,
      blocked: 0,
      unavailable: 1,
      unknown: 0,
    });
    const dispositions = result.semantics?.dispositions;
    const accounted =
      (dispositions?.included ?? 0) +
      (dispositions?.overage ?? 0) +
      (dispositions?.blocked ?? 0) +
      (dispositions?.unavailable ?? 0) +
      (dispositions?.unknown ?? 0);
    expect(accounted).toBe(result.workload.eventCount);
  });

  it("keeps insufficient consumption unknown instead of guessing", () => {
    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: at(0),
          usage: partialAccounting(4_000_000),
        }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [creditPool("allow_overage")] }),
      context: fixtureContext,
    });
    expect(result.semantics?.dispositions.unknown).toBe(1);
    expect(result.semantics?.evidence.usageCategories.status).toBe("partial");
    expect(result.coverage.requests.status).toBe("unknown");
    expect(result.semantics?.replayability.class).toBe("bounded");
    expect(result.semantics?.replayability.reasons.map((reason) => reason.id)).toContain(
      "unknown_consumption",
    );
  });
});

describe("M4B: replayability classifies target mechanics, not model choice", () => {
  it("is deterministic for numeric rules with complete quantities and pricing", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500) })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    expect(result.semantics?.replayability.class).toBe("deterministic");
    expect(result.semantics?.replayability.reasons.map((reason) => reason.id)).toEqual([
      "numeric_mechanics",
    ]);
  });

  it("is qualitative, and refuses a numeric fit, when the target states limits qualitatively", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500) })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({
        limits: [],
        qualitativeLimits: [
          {
            id: "qualitative-cap",
            label: "Usage cap",
            statement: "5x more usage than the lower tier",
          },
        ],
      }),
      context: fixtureContext,
    });
    expect(result.semantics?.replayability.class).toBe("qualitative");
    expect(result.semantics?.replayability.reasons.map((reason) => reason.id)).toContain(
      "no_numeric_rules",
    );
    // No numeric fit is manufactured for a qualitative target.
    expect(result.coverage.requests.status).toBe("unknown");
    expect(result.coverage.requests.percent).toBeUndefined();
    expect(result.feasibility.status).toBe("unknown");
    expect(result.warnings.map((warning) => warning.code)).toContain("TARGET_RULES_QUALITATIVE");
  });

  it("stays deterministic in class for a translated replay, whose claim is conditional instead", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500, "fixture-small") })],
      target: translatedTarget(),
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    expect(result.semantics?.mode).toBe("translated");
    expect(result.semantics?.replayability.class).toBe("deterministic");
  });

  it("never emits calibrated", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500) })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    expect(result.semantics?.replayability.class).not.toBe("calibrated");
  });
});

describe("M4B: evidence dimensions stay separate and explicit", () => {
  it("reports one denominator per dimension and no synthesized confidence score", () => {
    const result = replay({
      events: [
        makeEvent({ id: "e1", occurredAt: at(0), ...input(500, "fixture-small") }),
        makeEvent({ id: "e2", occurredAt: at(1), ...input(500, "fixture-medium") }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    const semantics = result.semantics;
    if (semantics === undefined) throw new Error("expected semantics");
    // The M4B block carries dimensions and classes only; the legacy confidence
    // object stays where it was and is not the M4B evidence model.
    expect(Object.keys(semantics).sort()).toEqual([
      "dispositions",
      "evidence",
      "mode",
      "modelMix",
      "replayability",
      "targetStack",
      "workloadScope",
    ]);
    expect(semantics.evidence.usageCategories.events).toEqual({ covered: 2, total: 2 });
    expect(semantics.evidence.rules.events).toEqual({ covered: 2, total: 2 });
    expect(semantics.evidence.temporal.events).toEqual({ covered: 2, total: 2 });
    expect(semantics.evidence.rules.tokens).toEqual({ covered: 1000, total: 1000 });
    expect(semantics.evidence.pricing.status).toBe("not_applicable");
    expect(semantics.evidence.resetPhase.status).toBe("established");
    // Legacy confidence is still present, unmodified in shape.
    expect(result.confidence.factors.length).toBeGreaterThan(0);
  });

  it("reduces pricing coverage when a consumed category is not established", () => {
    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: at(0),
          usage: completeUsage({ uncachedInputTokens: 1_000_000, cacheReadTokens: 500_000 }),
          model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
        }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [creditPool("allow_overage")] }),
      context: fixtureContext,
    });
    expect(result.semantics?.evidence.pricing.status).toBe("partial");
    expect(result.semantics?.evidence.pricing.events).toEqual({ covered: 0, total: 1 });
    expect(result.semantics?.evidence.pricing.reason).toContain("does not establish");
    expect(result.semantics?.replayability.reasons.map((reason) => reason.id)).toContain(
      "pricing_coverage",
    );
    expect(result.semantics?.replayability.class).toBe("bounded");
  });

  it("reports temporal coverage against the pinned plan version's window", () => {
    const result = replay({
      events: [
        makeEvent({ id: "e1", occurredAt: "2026-07-01T00:00:00Z", ...input(500) }),
        makeEvent({ id: "e2", occurredAt: at(1), ...input(500) }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    expect(result.semantics?.evidence.temporal.status).toBe("partial");
    expect(result.semantics?.evidence.temporal.events).toEqual({ covered: 1, total: 2 });
    expect(result.semantics?.evidence.temporal.reason).toContain("outside the pinned plan version");
  });

  it("reports a partial rule dimension when the target's rules do not mention a model", () => {
    const result = replay({
      events: [
        makeEvent({ id: "e1", occurredAt: at(0), ...input(500, "fixture-small") }),
        makeEvent({ id: "e2", occurredAt: at(1), ...input(500, "fixture-ghost") }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()], models: aliasedModels }),
      context: fixtureContext,
    });
    expect(result.semantics?.evidence.rules.status).toBe("partial");
    expect(result.semantics?.evidence.rules.events).toEqual({ covered: 1, total: 2 });
  });
});

describe("M4B: reset and workload scope stay explicit", () => {
  it("derives a rolling reset from rolling windows and a fixed phase from a calendar window", () => {
    const rolling = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500) })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({
        limits: [rollingLimit({ id: "t", type: "token_limit", amount: "1000" })],
      }),
      context: fixtureContext,
    });
    expect(subscriptionStack(rolling).reset).toEqual({ kind: "rolling" });

    const calendar = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500) })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({
        limits: [calendarLimit({ id: "m", type: "token_limit", amount: "1000" })],
      }),
      context: fixtureContext,
    });
    expect(subscriptionStack(calendar).reset).toEqual({
      kind: "fixed-known",
      phase: "calendar month (UTC)",
    });
    expect(calendar.semantics?.evidence.resetPhase.status).toBe("established");
  });

  it("never guesses a fixed reset phase a scenario declares unknown", () => {
    const result = replay({
      events: [
        makeEvent({
          id: "e1",
          occurredAt: at(0),
          usage: completeUsage({ uncachedInputTokens: 4_000_000 }),
        }),
        makeEvent({
          id: "e2",
          occurredAt: at(1),
          usage: completeUsage({ uncachedInputTokens: 4_000_000 }),
        }),
      ],
      target: {
        type: "subscription",
        planVersionId: FIXTURE_PLAN_VERSION_ID,
        resetAssumption: { kind: "fixed-unknown" },
      },
      catalog: makeFixtureCatalog({ limits: [creditPool("allow_overage")] }),
      context: fixtureContext,
    });
    expect(subscriptionStack(result).reset).toEqual({ kind: "fixed-unknown" });
    expect(result.semantics?.evidence.resetPhase.status).toBe("unknown");
    expect(result.semantics?.evidence.resetPhase.reason).toContain("not established");
    expect(result.semantics?.replayability.class).toBe("bounded");
    expect(result.semantics?.replayability.reasons.map((reason) => reason.id)).toContain(
      "reset_phase_unknown",
    );
    expect(result.assumptions.map((assumption) => assumption.id)).toContain("RESET_PHASE_UNKNOWN");
    // The plan's own included capacity is still modelled; only the phase is unknown.
    expect(result.semantics?.dispositions.included).toBe(1);
    expect(result.semantics?.dispositions.overage).toBe(1);
  });

  it("never serializes an imported workload as whole-account coverage", () => {
    const events = [makeEvent({ id: "e1", occurredAt: at(0), ...input(500) })];
    const base = {
      events,
      target: { type: "subscription" as const, planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
    };
    const imported = replay({ ...base, context: fixtureContext });
    expect(imported.semantics?.workloadScope.kind).toBe("imported_workload");
    expect(imported.semantics?.workloadScope.statement).toContain("not the whole provider account");

    const declared = replay({
      ...base,
      context: {
        rulesAsOf: fixtureContext.rulesAsOf,
        workloadScope: { kind: "provider_account_total" },
      },
    });
    expect(declared.semantics?.workloadScope.kind).toBe("provider_account_total");
    // Even a declared total is reported as the caller's claim, never as verified.
    expect(declared.semantics?.workloadScope.statement).toContain("did not verify");

    const observed = replay({
      ...base,
      context: {
        rulesAsOf: fixtureContext.rulesAsOf,
        workloadScope: { kind: "all_observed_local_adapters" },
      },
    });
    expect(observed.semantics?.workloadScope.statement).toContain("never observed here");
  });
});

describe("M4B: target stack and provenance are pinned", () => {
  it("records the stack, the effective instant and the catalog version", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500) })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
      context: fixtureContext,
    });
    expect(result.semantics?.targetStack).toEqual({
      providerId: "fixture-provider",
      planId: "fixture-plan",
      planVersionId: FIXTURE_PLAN_VERSION_ID,
      effectiveAt: "2026-09-15",
      catalogVersion: "fixture:golden-v1",
      overageMode: "disabled",
      reset: { kind: "rolling" },
    });
    expect(result.semantics?.targetStack.effectiveAt).toBe(result.versions.rulesAsOf);
    // The version the result was computed against is the version the stack names.
    expect(subscriptionStack(result).planVersionId).toBe(result.versions.targetReference);
  });

  it("marks a target whose rules allow overage", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500) })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [creditPool("allow_overage")] }),
      context: fixtureContext,
    });
    expect(subscriptionStack(result).overageMode).toBe("enabled");
  });

  it("runs an api target as a Direct API replay instead of refusing it (M4C)", () => {
    // M4B refused this target kind outright. M4C implements it, so the same
    // shape now replays: the provider must exist in the catalog, and the result
    // pins the API target stack rather than a plan.
    const catalog = makeFixtureCatalog({ limits: [tokenLimit()] });
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500) })],
      target: { type: "api", providerId: "fixture-provider" },
      catalog,
      context: fixtureContext,
    });
    expect(result.target).toEqual({ type: "api", providerId: "fixture-provider" });
    expect(result.subscription).toBeUndefined();
    expect(result.constraints).toEqual([]);
    expect(result.violations).toEqual([]);
    expect(result.semantics?.targetStack).toEqual({
      type: "api",
      providerId: "fixture-provider",
      effectiveAt: FIXTURE_RULES_AS_OF,
      catalogVersion: FIXTURE_CATALOG_VERSION,
    });
    expect(executionReplayResultV1Schema.safeParse(result).success).toBe(true);
  });

  it("still refuses the pre-M4A api shell's pricing reference and model mapping (M4C)", () => {
    const catalog = makeFixtureCatalog({ limits: [tokenLimit()] });
    const events = [makeEvent({ id: "e1", occurredAt: at(0), ...input(500) })];
    expect(() =>
      replay({
        events,
        target: { type: "api", providerId: "fixture-provider", pricingVersionId: "synthetic" },
        catalog,
        context: fixtureContext,
      }),
    ).toThrow(/API_PRICING_REFERENCE_NOT_SUPPORTED/);
    expect(() =>
      replay({
        events,
        target: {
          type: "api",
          providerId: "fixture-provider",
          modelMapping: [{ fromModelId: "fixture-small", toModelId: "fixture-medium" }],
        },
        catalog,
        context: fixtureContext,
      }),
    ).toThrow(/API_MODEL_MAPPING_NOT_SUPPORTED/);
  });
});

/**
 * These are the collapsing mutations M4B must make impossible to pass off as a
 * valid result: each one starts from a real result and rewrites exactly the fact
 * an implementation could get wrong, so the guard is the schema's own cross-check
 * rather than a hand-typed expectation.
 */
describe("M4B: collapse guards reject a hand-edited result", () => {
  const requireParsed = (value: ExecutionReplayResultV1) => {
    const parsed = executionReplayResultV1Schema.safeParse(value);
    if (!parsed.success) throw new Error("expected a valid result");
    return parsed.data;
  };

  it("rejects demand replayed without a policy as translated", () => {
    // Unresolved demand is the case that must never drift into translation: the
    // stack carries no policy, so a translated reading is a lie about the run.
    const result = requireParsed(
      replay({
        events: [
          makeEvent({
            id: "e1",
            occurredAt: at(0),
            model: { rawName: "ghost-model" },
            ...input(0),
          }),
        ],
        target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
        catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
        context: fixtureContext,
      }),
    );
    const semantics = result.semantics;
    if (semantics === undefined) throw new Error("expected semantics");
    expect(semantics.mode).toBe("exact");
    expect(
      executionReplayResultV1Schema.safeParse({
        ...result,
        semantics: {
          ...semantics,
          mode: "translated",
          translation: {
            applied: [
              { sourceModelId: "ghost-model", targetModelId: "fixture-small", eventCount: 1 },
            ],
            substitutedEvents: 1,
          },
          evidence: {
            ...semantics.evidence,
            translationMethod: {
              ...semantics.evidence.translationMethod,
              method: "token-preserving",
            },
          },
        },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown consumption re-labelled as establishment", () => {
    const result = requireParsed(
      replay({
        events: [
          makeEvent({
            id: "e1",
            occurredAt: at(0),
            usage: {
              inputTokens: 1_000_000,
              outputTokens: 0,
              accounting: { reasoningIncludedInOutput: false },
            },
          }),
        ],
        target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
        catalog: makeFixtureCatalog({ limits: [creditPool("allow_overage")] }),
        context: fixtureContext,
      }),
    );
    const semantics = result.semantics;
    if (semantics === undefined) throw new Error("expected semantics");
    expect(semantics.evidence.usageCategories.status).toBe("partial");
    expect(
      executionReplayResultV1Schema.safeParse({
        ...result,
        semantics: {
          ...semantics,
          evidence: {
            ...semantics.evidence,
            usageCategories: { ...semantics.evidence.usageCategories, status: "complete" },
          },
        },
      }).success,
    ).toBe(false);
  });

  it("rejects blocked demand re-labelled as paid overage", () => {
    const result = requireParsed(
      replay({
        events: [
          makeEvent({ id: "e1", occurredAt: at(0), ...input(600) }),
          makeEvent({ id: "e2", occurredAt: at(1), ...input(600) }),
        ],
        target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
        catalog: makeFixtureCatalog({ limits: [tokenLimit()] }),
        context: fixtureContext,
      }),
    );
    const semantics = result.semantics;
    if (semantics === undefined) throw new Error("expected semantics");
    expect(subscriptionStack(result).overageMode).toBe("disabled");
    expect(semantics.dispositions).toMatchObject({ included: 1, blocked: 1, overage: 0 });
    expect(
      executionReplayResultV1Schema.safeParse({
        ...result,
        semantics: {
          ...semantics,
          dispositions: { ...semantics.dispositions, blocked: 0, overage: 1 },
        },
      }).success,
    ).toBe(false);
  });
});

describe("M4B remediation: a summary must not outrun the evidence behind it", () => {
  const tokenRule = () => rollingLimit({ id: "t", type: "token_limit", amount: "1000" });

  it("keeps a scenario policy that matched nothing exact, and reports no transform", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500, "fixture-small") })],
      target: {
        type: "subscription",
        planVersionId: FIXTURE_PLAN_VERSION_ID,
        modelTranslation: {
          ...translationPolicy,
          rules: [{ sourceModelId: "fixture-medium", targetModelId: "fixture-small" }],
        },
      },
      catalog: makeFixtureCatalog({ limits: [tokenRule()] }),
      context: fixtureContext,
    });
    const semantics = result.semantics;
    // No event used the policy's source model, so nothing was replayed against a
    // substitute: the result is exact and carries no transform evidence.
    expect(semantics?.mode).toBe("exact");
    expect(semantics?.translation?.substitutedEvents).toBe(0);
    expect(semantics?.translation?.applied).toEqual([]);
    expect(semantics?.evidence.translationMethod).toEqual({ method: "none" });
    const assumptionIds = result.assumptions.map((assumption) => assumption.id);
    expect(assumptionIds).not.toContain("MODEL_TRANSLATION_ASSUMPTION");
    expect(assumptionIds).not.toContain("TRANSLATION_TOKEN_PRESERVING");
    expect(result.confidence.factors.map((factor) => factor.id)).not.toContain("model_translation");
    // The pinned policy is provenance, not a claim that demand was transformed.
    expect(semantics?.targetStack.modelTranslation?.id).toBe(translationPolicy.id);
    expect(executionReplayResultV1Schema.safeParse(result).success).toBe(true);
  });

  it("does not summarize a target that mixes rolling and calendar windows as one phase", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500, "fixture-small") })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({
        limits: [tokenRule(), calendarLimit({ id: "m", type: "token_limit", amount: "1000" })],
      }),
      context: fixtureContext,
    });
    const semantics = result.semantics;
    // The plan resets one allowance on a rolling window and another on a calendar
    // boundary: there is no single phase, and claiming the calendar one alone
    // would silently drop the rolling behaviour.
    expect(subscriptionStack(result).reset).toEqual({ kind: "fixed-unknown" });
    expect(semantics?.evidence.resetPhase.status).toBe("unknown");
    expect(semantics?.evidence.resetPhase.reason).toContain("mix rolling and calendar");
    expect(semantics?.replayability.class).toBe("bounded");
    expect(semantics?.replayability.reasons.map((reason) => reason.id)).toContain(
      "reset_phase_unknown",
    );
    expect(
      result.assumptions.find((assumption) => assumption.id === "RESET_PHASE_UNKNOWN")?.description,
    ).toContain("mix rolling and calendar");
  });

  it("does not summarize a target whose own rules disagree about overage as one mode", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500, "fixture-small") })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({
        limits: [
          rollingLimit({
            id: "pool",
            type: "credit_pool",
            amount: "5.00",
            exceed: "allow_overage",
          }),
          rollingLimit({
            id: "req",
            type: "request_limit",
            amount: "10",
            exceed: "reject_request",
          }),
        ],
      }),
      context: fixtureContext,
    });
    // One rule bills overage and another rejects: the aggregate state is unknown,
    // and the per-rule simulation is what carries the actual outcome.
    expect(subscriptionStack(result).overageMode).toBe("unknown");
    expect(result.semantics?.dispositions).toEqual({
      included: 1,
      overage: 0,
      blocked: 0,
      unavailable: 0,
      unknown: 0,
    });
  });

  it("leaves overage unknown when the target states no numeric limit at all", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(500, "fixture-small") })],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({
        limits: [],
        qualitativeLimits: [
          { id: "fair-use", label: "Fair use", statement: "Usage within fair-use limits." },
        ],
      }),
      context: fixtureContext,
    });
    expect(subscriptionStack(result).overageMode).toBe("unknown");
    expect(subscriptionStack(result).reset).toEqual({ kind: "not-applicable" });
    expect(result.semantics?.replayability.class).toBe("qualitative");
  });

  it("refuses to call a replay deterministic while recorded demand stays undecided", () => {
    const result = replay({
      events: [
        makeEvent({ id: "e1", occurredAt: at(0), ...input(500, "fixture-small") }),
        makeEvent({ id: "e2", occurredAt: at(1), ...input(500, "mystery-model") }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenRule()], models: aliasedModels }),
      context: fixtureContext,
    });
    const semantics = result.semantics;
    // An identifier no catalog source establishes is incomplete evidence for this
    // workload, so the outcome is bounded even though a numeric rule applied and
    // nothing else was missing.
    expect(semantics?.dispositions.unknown).toBe(1);
    expect(semantics?.replayability.class).toBe("bounded");
    expect(semantics?.replayability.reasons.map((reason) => reason.id)).toContain(
      "unresolved_demand",
    );
    expect(semantics?.replayability.reasons.map((reason) => reason.id)).not.toContain(
      "unknown_consumption",
    );
    expect(subscriptionStack(result).overageMode).toBe("disabled");
  });

  it("still reads as deterministic when an unserved model is a known outcome", () => {
    const result = replay({
      events: [
        makeEvent({ id: "e1", occurredAt: at(0), ...input(500, "fixture-small") }),
        makeEvent({ id: "e2", occurredAt: at(1), ...input(500, "fixture-ghost") }),
      ],
      target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      catalog: makeFixtureCatalog({ limits: [tokenRule()], models: aliasedModels }),
      context: fixtureContext,
    });
    // fixture-ghost is established and simply not served: a determined outcome,
    // not undecided demand, so it must not drag the class down by itself.
    expect(result.semantics?.dispositions).toEqual({
      included: 1,
      overage: 0,
      blocked: 0,
      unavailable: 1,
      unknown: 0,
    });
    expect(result.semantics?.replayability.class).toBe("deterministic");
  });

  it("evaluates availability against the effective model of a translation", () => {
    const result = replay({
      events: [makeEvent({ id: "e1", occurredAt: at(0), ...input(1_000_000, "fixture-small") })],
      target: {
        type: "subscription",
        planVersionId: FIXTURE_PLAN_VERSION_ID,
        modelTranslation: {
          ...translationPolicy,
          rules: [{ sourceModelId: "fixture-small", targetModelId: "fixture-ghost" }],
        },
      },
      catalog: makeFixtureCatalog({ limits: [tokenRule()], models: aliasedModels }),
      context: fixtureContext,
    });
    const semantics = result.semantics;
    // The target serves neither a rule nor pricing for fixture-ghost, so the
    // substituted demand is unavailable. Evaluated against the observed model it
    // would have been included, which is the error this pins down.
    expect(semantics?.mode).toBe("translated");
    expect(semantics?.translation).toEqual({
      applied: [{ sourceModelId: "fixture-small", targetModelId: "fixture-ghost", eventCount: 1 }],
      substitutedEvents: 1,
    });
    expect(semantics?.dispositions.unavailable).toBe(1);
    expect(semantics?.dispositions.included).toBe(0);
    expect(result.unsupportedModels.map((model) => model.reason)).toEqual(["not_supported"]);
  });
});
