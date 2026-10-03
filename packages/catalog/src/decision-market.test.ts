import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadBundledCatalog } from "./bundled.js";
import { DECISION_MARKET } from "./decision-market.js";
import { compileExecutionPlan } from "./execution-compiler.js";

const catalog = loadBundledCatalog();
describe("D0 admitted market snapshot", () => {
  it("does not admit the October 3 public coverage additions", () => {
    for (const id of [
      "kiro-free",
      "kiro-pro-plus",
      "kiro-pro-max",
      "kiro-power",
      "cursor-teams-standard",
      "cursor-teams-premium",
    ]) {
      expect(
        DECISION_MARKET.plans.find((plan) => plan.id === id),
        id,
      ).toBeUndefined();
    }
    expect(
      DECISION_MARKET.plans.find((plan) => plan.id === "kiro-pro")?.artifact.planVersionId,
    ).toBe("kiro-pro-current-20260927");
  });

  it("reproduces every derived artifact with pinned overlays and catalog identity", () => {
    expect(DECISION_MARKET.catalogHash).toBe(catalog.catalogVersion);
    expect(DECISION_MARKET.plans).toHaveLength(23);
    for (const scenario of DECISION_MARKET.scenarios) {
      expect(scenario.artifacts).toHaveLength(13);
      for (const a of scenario.artifacts)
        expect(
          compileExecutionPlan(
            catalog,
            a.planId,
            a.planVersionId,
            a.appliedOverlayIds,
            DECISION_MARKET.rulesAt,
          ).artifact,
        ).toEqual(a);
    }
  });
  it("pins the post-DevDay snapshot inside every reviewed artifact boundary", () => {
    expect(DECISION_MARKET.rulesAt).toBe("2026-09-29T23:59:59Z");
    expect(DECISION_MARKET.reviewUntil).toBe("2026-10-27T00:00:00Z");
    const artifacts = [
      ...DECISION_MARKET.plans.map((p) => p.artifact),
      ...DECISION_MARKET.scenarios.flatMap((s) => s.artifacts),
    ];
    for (const a of artifacts) {
      expect(Date.parse(a.validity.start)).toBeLessThanOrEqual(Date.parse(DECISION_MARKET.rulesAt));
      expect(Date.parse(a.validity.end)).toBeGreaterThanOrEqual(
        Date.parse(DECISION_MARKET.reviewUntil),
      );
    }
    expect(DECISION_MARKET.scenarios[0]?.artifacts.map((a) => a.planId)).toEqual([
      "anthropic-api-fable-5",
      "anthropic-api-fable-5-1",
      "anthropic-api-haiku-4-5",
      "anthropic-api-opus-4-8",
      "anthropic-api-opus-5",
      "anthropic-api-opus-5-5",
      "anthropic-api-sonnet-5",
      "anthropic-api-sonnet-5-5",
      "openai-api-gpt-5-4-mini",
      "openai-api-gpt-5-6-sol",
      "openai-api-gpt-6-1-sol",
      "openai-api-gpt-6-sol",
      "z-ai-api-glm-5-3-flash",
    ]);
  });
  it("admits exact GPT-6.1 Sol Standard economics without another service tier", () => {
    const p = DECISION_MARKET.plans.find((p) => p.id === "openai-api-gpt-6-1-sol");
    const a = p?.artifact;
    if (a?.computation.kind !== "executable") throw new Error("Missing Sol 6.1 admission");
    expect(a.planVersionId).toBe("openai-api-gpt-6-1-sol-effective-20260929");
    expect(a.appliedOverlayIds).toEqual([]);
    expect(a.purchase.kind).toBe("api");
    expect(a.computation.routes).toHaveLength(1);
    expect(a.computation.routes[0]).toMatchObject({
      models: ["gpt-6-1-sol"],
      cash: { factor: "1" },
    });
    expect(a.computation.rates).toHaveLength(1);
    expect(a.computation.rates[0]).toMatchObject({
      pricingRef: "gpt-6-1-sol-pricing",
      endpointId: "openai-responses-standard",
      rateVersion: "standard-20260929",
      rates: {
        input: "2",
        cacheRead: "0.1",
        cacheWrite: "2.5",
        output: "10",
        reasoning: { billedAs: "output" },
      },
      tiers: [
        {
          when: { inputTokensAbove: 272000 },
          rates: {
            input: "4",
            cacheRead: "0.2",
            cacheWrite: "5",
            output: "15",
            reasoning: { billedAs: "output" },
          },
        },
      ],
    });
    expect(catalog.pricing["gpt-6-1-sol-pricing"]?.serviceTier).toBe("standard");
    expect(
      compileExecutionPlan(catalog, a.planId, a.planVersionId, [], DECISION_MARKET.rulesAt)
        .artifact,
    ).toEqual(a);
    expect(() =>
      compileExecutionPlan(catalog, a.planId, a.planVersionId, [], "2026-09-28T23:59:59Z"),
    ).toThrow();
    expect(() =>
      compileExecutionPlan(catalog, a.planId, a.planVersionId, [], DECISION_MARKET.reviewUntil),
    ).toThrow();
    const version = catalog.plans[a.planId]?.executionVersions?.[0];
    expect(version?.routes[0]).toMatchObject({
      endpointId: "openai-responses-standard",
      protocol: "openai-responses",
      harnessIds: ["direct-http"],
    });
    expect(version?.requirements[0]).toMatchObject({
      kind: "purchase_state",
      value: "active-paid-api-credentials",
      claimRefs: ["credentials", "billing"],
    });
    expect(version?.validity).toMatchObject({ basis: "effective", claimRefs: ["release"] });
    expect(version?.claims.find((c) => c.id === "release")?.effectiveDateBasis).toBe(
      "provider_stated",
    );
    const hash = (value: unknown) =>
      `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
    for (const c of p?.claims ?? []) {
      expect(c.sourceUrl).toMatch(/^https:\/\/(developers|help)\.openai\.com\//);
      expect(c.authority).toBe("provider");
      expect(c.certainty).toBe("published_deterministic");
      expect(Date.parse(c.reviewedAt)).toBeGreaterThan(Date.parse(DECISION_MARKET.rulesAt));
      expect(c.normalizedClaimHash).toBe(hash({ id: c.id, statement: c.excerpt }));
      expect(c.evidencePackageHash).toBe(
        hash({
          locator: c.locator,
          observedAt: c.observedAt,
          statement: c.excerpt,
          url: c.sourceUrl,
        }),
      );
    }
  });
  it("admits GPT-5.6 Sol only with its evidenced promotion, including long-context rates", () => {
    const a = DECISION_MARKET.plans.find((p) => p.id === "openai-api-gpt-5-6-sol")?.artifact;
    if (a?.computation.kind !== "executable") throw new Error("Missing admitted promotion");
    expect(a.computation.routes[0]?.models).toEqual(["gpt-5-6-sol"]);
    const rate = a.computation.rates[0];
    expect(rate?.basePricingRef).toBeNull();
    expect(rate?.rates).toEqual({
      input: "4",
      output: "20",
      cacheRead: "0.4",
      cacheWrite: "5",
      reasoning: { billedAs: "output" },
    });
    expect(rate?.tiers?.[0]?.rates).toEqual({
      input: "8",
      output: "30",
      cacheRead: "0.8",
      cacheWrite: "10",
      reasoning: { billedAs: "output" },
    });
    expect(rate?.cashOverrides).toHaveLength(5);
    expect(
      compileExecutionPlan(catalog, a.planId, a.planVersionId, [], DECISION_MARKET.rulesAt).artifact
        .computation.kind,
    ).toBe("not_computable");
    expect(() =>
      compileExecutionPlan(
        catalog,
        a.planId,
        a.planVersionId,
        a.appliedOverlayIds,
        DECISION_MARKET.reviewUntil,
      ),
    ).toThrow();
  });
  it("keeps conditional pricing variants out of permanent source rates", () => {
    const base = catalog.pricing["anthropic-api-sonnet-5-current-rate"];
    expect(base?.rates.cacheWrite).toBeUndefined();
    expect(base?.rates.reasoning).toBeUndefined();
    expect(catalog.pricing["anthropic-api-sonnet-5-cache-5m-d0"]?.variantId).toBe("cache-write-5m");
    expect(catalog.pricing["anthropic-api-sonnet-5-cache-1h-d0"]?.rates.cacheWrite).toBe("4");
    expect(
      DECISION_MARKET.scenarios[0]?.artifacts.find((p) => p.planId === "anthropic-api-sonnet-5")
        ?.artifactHash,
    ).not.toBe(
      DECISION_MARKET.scenarios[1]?.artifacts.find((p) => p.planId === "anthropic-api-sonnet-5")
        ?.artifactHash,
    );
  });
});
