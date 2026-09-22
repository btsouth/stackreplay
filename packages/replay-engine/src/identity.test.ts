import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import {
  FIXTURE_PLAN_VERSION_ID,
  fixtureContext,
  fixtureModels,
  makeFixtureCatalog,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";

/**
 * Model identity in the replay engine (M4A).
 *
 * An adapter records the identifier a source reported, and the engine resolves it
 * against the catalog with the same rules the adapters use. The behaviour these
 * tests lock:
 *
 *   - a declared alias resolves, so a dotted provider spelling or a harness alias
 *     becomes the canonical model and its consumption counts;
 *   - a harness-scoped alias applies only under that harness;
 *   - an identifier the catalog cannot justify stays unresolved, which keeps its
 *     consumption unknown instead of letting an invented identity consume against
 *     a plan's limits.
 */

const target = { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID } as const;

const catalog = makeFixtureCatalog({
  limits: [
    {
      id: "requests",
      label: "Requests per month",
      type: "request_limit",
      amount: "100000",
      window: { type: "calendar", unit: "month", timezone: "UTC" },
      exceed: "reject_request",
    },
  ],
  modelRules: [{ model: "fixture-small", pricingRef: "fixture-small-pricing" }],
  models: {
    ...fixtureModels,
    "fixture-small": {
      id: "fixture-small",
      role: "model",
      name: "Fixture Small",
      aliases: [
        {
          id: "fixture-small-dotted",
          alias: "fixture.small",
          kind: "provider_id",
          sources: [
            { url: "https://example.invalid/alias", title: "Fixture", checkedAt: "2026-08-01" },
          ],
          lastVerifiedAt: "2026-08-01",
          verificationStatus: "verified",
        },
        {
          id: "fixture-small-scoped",
          alias: "small-fast",
          kind: "harness_alias",
          harness: "fixture-harness",
          sources: [
            { url: "https://example.invalid/alias", title: "Fixture", checkedAt: "2026-08-01" },
          ],
          lastVerifiedAt: "2026-08-01",
          verificationStatus: "estimated",
        },
      ],
      sources: [
        {
          url: "https://example.invalid/fixture-small",
          title: "Fixture",
          checkedAt: "2026-08-01",
        },
      ],
      lastVerifiedAt: "2026-08-01",
      verificationStatus: "estimated",
    },
  },
});

function replayModel(rawName: string, harnessId?: string) {
  const event = makeEvent({
    id: "identity-event",
    occurredAt: "2026-09-01T00:00:00Z",
    model: { rawName },
    confidence: { usage: "exact", model: "unknown" },
    usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
    ...(harnessId === undefined ? {} : { harnessId }),
  });
  return replay({ events: [event], target, catalog, context: fixtureContext });
}

describe("model identity", () => {
  it("counts consumption for a model reached through a declared alias", () => {
    const result = replayModel("fixture.small");
    expect(result.unsupportedModels).toEqual([]);
    expect(result.constraints[0]?.attemptedUnits).toBe("1");
    expect(result.constraints[0]?.consumedUnits).toBe("1");
    expect(result.coverage.models.status).toBe("known");
  });

  it("applies a harness-scoped alias only under that harness", () => {
    const scoped = replayModel("small-fast", "fixture-harness");
    expect(scoped.unsupportedModels).toEqual([]);
    expect(scoped.coverage.models.status).toBe("known");

    const otherHarness = replayModel("small-fast", "another-harness");
    expect(otherHarness.unsupportedModels).toEqual([
      { rawName: "small-fast", eventCount: 1, reason: "unresolved" },
    ]);
    expect(otherHarness.coverage.models.status).toBe("unknown");
  });

  it("leaves an unjustified identifier unresolved instead of inventing a model", () => {
    for (const candidate of ["fixture.small.turbo", "fixture-small-2", "fixture_small"]) {
      const result = replayModel(candidate);
      expect(result.unsupportedModels).toEqual([
        { rawName: candidate, eventCount: 1, reason: "unresolved" },
      ]);
      // Nothing was reattributed to a real model, so no limit saw consumption.
      expect(result.constraints[0]?.attemptedUnits).toBe("0");
      expect(result.coverage.models.status).toBe("unknown");
      expect(result.warnings.map((warning) => warning.code)).toContain("MODEL_UNRESOLVED");
    }
  });

  it("resolves the same identifier the same way on every run", () => {
    const first = replayModel("fixture.small");
    const second = replayModel("fixture.small");
    expect(second.constraints).toEqual(first.constraints);
    expect(second.unsupportedModels).toEqual(first.unsupportedModels);
  });
});
