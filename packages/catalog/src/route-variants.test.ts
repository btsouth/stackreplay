import { describe, expect, it } from "vitest";
import { loadDefaultCatalog } from "./load.js";
import { createModelIdentityIndex, observedRouteVariantOf } from "./resolve.js";
import type { RawCatalogData } from "./validate.js";
import { validateCatalogData } from "./validate.js";

/**
 * Provider route variants: an identifier can select a separately priced route
 * of a model (Command Code's `deepseek/deepseek-v4.1-flash-fast`) without
 * becoming a model of its own.
 */

describe("Command Code V4.1 Flash identifiers", () => {
  const identity = createModelIdentityIndex(loadDefaultCatalog());

  it("resolves the Fast route to canonical DeepSeek V4.1 Flash and keeps the variant beside it", () => {
    expect(
      identity.resolve("deepseek/deepseek-v4.1-flash-fast", { harness: "command-code" }),
    ).toEqual({
      observed: "deepseek/deepseek-v4.1-flash-fast",
      canonicalId: "deepseek-v4-1-flash",
      basis: "alias",
      aliasId: "deepseek-v4-1-flash-command-code-fast-route",
      aliasKind: "provider_route",
      harness: "command-code",
      variant: { id: "fast", providerId: "command-code", label: "Fast" },
    });
  });

  it("resolves the regular model code through Command Code's own declaration, with no variant", () => {
    const regular = identity.resolve("deepseek/deepseek-v4.1-flash", { harness: "command-code" });
    expect(regular.canonicalId).toBe("deepseek-v4-1-flash");
    expect(regular.aliasId).toBe("deepseek-v4-1-flash-command-code-model-code");
    expect(regular.variant).toBeUndefined();
  });

  it("does not resolve the Fast spelling outside Command Code", () => {
    for (const options of [undefined, { harness: "opencode" }, { harness: "t3-code" }])
      expect(
        identity.resolve("deepseek/deepseek-v4.1-flash-fast", options).canonicalId,
        JSON.stringify(options),
      ).toBeUndefined();
  });

  it("recovers the variant of an event whose canonical id was attached at import", () => {
    const fast = {
      rawName: "deepseek/deepseek-v4.1-flash-fast",
      harness: "command-code",
      canonicalId: "deepseek-v4-1-flash",
    };
    expect(observedRouteVariantOf(identity, fast)?.id).toBe("fast");
    expect(observedRouteVariantOf(identity, { ...fast, canonicalId: undefined })?.id).toBe("fast");
    // An event attributed to another model is not on this model's route.
    expect(observedRouteVariantOf(identity, { ...fast, canonicalId: "deepseek-v4-pro" })).toBe(
      undefined,
    );
    expect(observedRouteVariantOf(identity, { ...fast, harness: undefined })).toBeUndefined();
    expect(
      observedRouteVariantOf(identity, { ...fast, rawName: "deepseek/deepseek-v4.1-flash" }),
    ).toBeUndefined();
  });
});

const SOURCE = { url: "https://example.invalid/source", title: "Fixture", checkedAt: "2026-09-01" };
const stamp = { sources: [SOURCE], lastVerifiedAt: "2026-09-01", verificationStatus: "verified" };

function provider(id: string) {
  return { file: `providers/${id}.yaml`, data: { id, role: "provider", name: id, ...stamp } };
}

function price(id: string, variantId?: string) {
  return {
    file: `pricing/${id}.yaml`,
    data: {
      id,
      role: "pricing",
      modelId: "m",
      currency: "USD",
      unit: "per_1m_tokens",
      basis: "target_billing_rate",
      endpointId: "router",
      ...(variantId === undefined ? {} : { variantId }),
      rates: { input: "1.00", output: "2.00" },
      effectiveFrom: "2026-09-01",
      ...stamp,
    },
  };
}

function check(options: {
  rule?: Record<string, unknown>;
  planProvider?: string;
  alias?: Record<string, unknown>;
}): string[] {
  const raw: RawCatalogData = {
    providers: [provider("router"), provider("maker")],
    models: [
      {
        file: "models/m.yaml",
        data: {
          id: "m",
          role: "model",
          name: "M",
          aliases: [
            {
              id: "m-router-fast",
              alias: "maker/m-fast",
              kind: "provider_route",
              harness: "router-cli",
              variant: { id: "fast", providerId: "router", label: "Fast" },
              ...stamp,
              ...options.alias,
            },
          ],
          ...stamp,
        },
      },
    ],
    plans: [
      {
        file: "plans/router-plan.yaml",
        data: {
          id: "router-plan",
          role: "plan",
          name: "Router Plan",
          providerId: options.planProvider ?? "router",
          versions: [
            {
              effectiveFrom: "2026-09-01",
              price: { currency: "USD", amount: "10", interval: "month" },
              limits: [],
              qualitativeLimits: [{ id: "usage", label: "Usage", statement: "Some usage." }],
              modelRules: [
                {
                  model: "m",
                  pricingRef: "m-router",
                  variants: [{ id: "fast", pricingRef: "m-router-fast" }],
                  ...options.rule,
                },
              ],
              ...stamp,
            },
          ],
        },
      },
    ],
    pricing: [price("m-router"), price("m-router-fast", "fast")],
  };
  return validateCatalogData(raw)
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.code);
}

describe("route variant validation", () => {
  it("accepts a plan that prices its provider's variant from the variant's own record", () => {
    expect(check({})).toEqual([]);
  });

  it("rejects a rule whose own price is a variant record, which would price the default route at it", () => {
    expect(check({ rule: { pricingRef: "m-router-fast" } })).toContain("PRICING_VARIANT_MISMATCH");
  });

  it("rejects a variant priced by the default route's record", () => {
    expect(check({ rule: { variants: [{ id: "fast", pricingRef: "m-router" }] } })).toContain(
      "PRICING_VARIANT_MISMATCH",
    );
  });

  it("rejects a variant no alias declares for the plan's own provider", () => {
    expect(check({ planProvider: "maker" })).toContain("RULE_VARIANT_UNDECLARED");
    expect(check({ rule: { variants: [{ id: "turbo" }] } })).toContain("RULE_VARIANT_UNDECLARED");
  });

  it("rejects a variant on an alias that is not scoped to a harness", () => {
    expect(check({ alias: { harness: undefined } })).toContain("ALIAS_VARIANT_UNSCOPED");
  });

  it("makes a variant of a multiplied model state its own multiplier", () => {
    expect(check({ rule: { multiplier: "2" } })).toContain("MODEL_RULE_INVALID");
    expect(
      check({
        rule: {
          multiplier: "2",
          variants: [{ id: "fast", pricingRef: "m-router-fast", multiplier: "2" }],
        },
      }),
    ).toEqual([]);
  });
});
