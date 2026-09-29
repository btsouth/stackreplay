import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import {
  type ExecutionReplayResultV1,
  executionReplayResultV1Schema,
  type ModelTranslationPolicyV1,
  type ServiceTierV1,
} from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";

/**
 * Direct API replay at a processing tier, against the real catalog.
 *
 * A tier is a pricing dimension: the same recorded demand on the same model is
 * priced at that tier's published rates, a model without a price at the tier is
 * unpriced (never Standard), and a tier the provider has only announced is
 * never priced at all.
 */

const catalog = loadBundledCatalog();
const rulesAsOf = "2026-09-29";

const event = (id: string, model: string, hour = 0) =>
  makeEvent({
    id,
    occurredAt: `2026-09-20T${String(hour).padStart(2, "0")}:00:00Z`,
    model: { rawName: model },
    // 200K input tokens per event, under the 272K long-context threshold.
    usage: completeUsage({
      uncachedInputTokens: 100_000,
      cacheReadTokens: 100_000,
      outputTokens: 10_000,
    }),
  });

const run = (
  events: ReturnType<typeof makeEvent>[],
  serviceTier?: ServiceTierV1,
  modelTranslation?: ModelTranslationPolicyV1,
): ExecutionReplayResultV1 => {
  const result = replay({
    events,
    target: {
      type: "api",
      providerId: "openai",
      ...(serviceTier === undefined ? {} : { serviceTier }),
      ...(modelTranslation === undefined ? {} : { modelTranslation }),
    },
    catalog,
    context: { rulesAsOf },
  });
  expect(executionReplayResultV1Schema.safeParse(result).success).toBe(true);
  return result;
};

const warningCodes = (result: ExecutionReplayResultV1) => result.warnings.map((w) => w.code);

describe("Direct API replay by processing tier", () => {
  it("prices Standard exactly as before, with no tier recorded", () => {
    const result = run([event("a", "gpt-6.1-sol")]);
    // 0.1M input at $2, 0.1M cached at $0.10, 0.01M output at $10.
    expect(result.economics?.targetCost.amount).toBe("0.31");
    expect(result.versions.serviceTier).toBeUndefined();
    expect(result.versions.pricingReferences).toEqual(["gpt-6-1-sol-pricing"]);
    expect(run([event("a", "gpt-6.1-sol")], "standard").versions.serviceTier).toBeUndefined();
  });

  it("prices a documented tier at that tier's rates and records the tier", () => {
    const fast = run([event("a", "gpt-6.1-sol")], "fast");
    expect(fast.economics?.targetCost.amount).toBe("0.62");
    expect(fast.versions.serviceTier).toBe("fast");
    expect(fast.versions.pricingReferences).toEqual(["gpt-6-1-sol-fast-pricing"]);
    expect(fast.assumptions.map((a) => a.id)).toContain("SERVICE_TIER_PRICING");
    const batch = run([event("a", "gpt-6.1-sol")], "batch");
    expect(batch.economics?.targetCost.amount).toBe("0.155");
  });

  it("leaves a model without a tier price unpriced instead of using Standard", () => {
    // GPT-6 Sol has Standard prices in the catalog but no recorded Fast price.
    const result = run([event("a", "gpt-6-sol")], "fast");
    expect(result.economics).toBeUndefined();
    expect(warningCodes(result)).toContain("API_TIER_NOT_AVAILABLE");
    expect(result.versions.pricingReferences).toBeUndefined();
  });

  it("never prices a tier that is only coming soon", () => {
    const result = run([event("a", "gpt-6.1-sol")], "ultrafast");
    expect(result.economics).toBeUndefined();
    expect(warningCodes(result)).toContain("API_TIER_NOT_AVAILABLE");
    // Astra's Ultrafast is available and priced at its own published rates.
    const astra = run([event("a", "gpt-6-astra")], "ultrafast");
    expect(astra.economics?.targetCost.amount).toBe("9.6");
  });

  it("does not let one unpriced model become a zero in a mixed workload", () => {
    const result = run([event("a", "gpt-6.1-sol", 1), event("b", "gpt-6-sol", 2)], "fast");
    expect(result.economics).toBeUndefined();
    expect(result.coverage.requests.status).toBeDefined();
  });

  it("keeps recorded GPT-6 Sol demand as GPT-6 Sol unless a translation says otherwise", () => {
    const recorded = run([event("a", "gpt-6-sol")]);
    expect(recorded.semantics?.modelMix.models[0]?.modelId).toBe("gpt-6-sol");
    expect(recorded.versions.pricingReferences?.some((ref) => ref.startsWith("gpt-6-1-sol"))).toBe(
      false,
    );
    const translated = run([event("a", "gpt-6-sol")], undefined, {
      id: "try-gpt-6-1-sol",
      version: "1",
      name: "Try GPT-6.1 Sol",
      provenance: "user",
      transform: "token-preserving",
      rules: [{ sourceModelId: "gpt-6-sol", targetModelId: "gpt-6-1-sol" }],
    });
    expect(translated.semantics?.mode).toBe("translated");
    // The recorded identity is preserved beside the substitution.
    expect(translated.semantics?.modelMix.models[0]?.modelId).toBe("gpt-6-sol");
    expect(translated.versions.pricingReferences).toEqual(["gpt-6-1-sol-pricing"]);
  });
});
