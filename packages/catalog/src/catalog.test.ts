import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalize } from "./canonical.js";
import { getPlanVersion } from "./catalog.js";
import {
  buildCatalog,
  CatalogValidationError,
  loadCatalogFromDirectory,
  loadDefaultCatalog,
} from "./load.js";
import { createModelIdentityIndex } from "./resolve.js";
import { type RawCatalogData, validateCatalogData } from "./validate.js";

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing test fixture entry");
  return value;
}

function rawEntry(file: string, data: unknown) {
  return { file, data };
}

const validProvider = {
  id: "example-provider",
  role: "provider",
  name: "Example Provider",
  sources: [{ url: "https://example.invalid/p", title: "Example", checkedAt: "2026-01-01" }],
  lastVerifiedAt: "2026-01-01",
  verificationStatus: "estimated",
};

const validModel = {
  id: "example-model",
  role: "model",
  name: "Example Model",
  sources: [{ url: "https://example.invalid/m", title: "Example", checkedAt: "2026-01-01" }],
  lastVerifiedAt: "2026-01-01",
  verificationStatus: "estimated",
};

const validPricing = {
  id: "example-model-pricing",
  role: "pricing",
  modelId: "example-model",
  currency: "USD",
  unit: "per_1m_tokens",
  basis: "api_list_price",
  rates: { input: "1.00", output: "2.00" },
  effectiveFrom: "2026-01-01",
  sources: [{ url: "https://example.invalid/pricing", title: "Example", checkedAt: "2026-01-01" }],
  lastVerifiedAt: "2026-01-01",
  verificationStatus: "estimated",
};

function validPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: "example-plan",
    role: "plan",
    name: "Example Plan",
    providerId: "example-provider",
    versions: [
      {
        effectiveFrom: "2026-08-01",
        price: { currency: "USD", amount: "20.00", interval: "month" },
        limits: [
          {
            id: "rolling-credits",
            label: "Credits",
            type: "credit_pool",
            amount: "20.00",
            exceed: "reject_request",
            window: { type: "rolling", duration: "PT5H", anchor: "first_use" },
          },
        ],
        modelRules: [{ model: "example-model", pricingRef: "example-model-pricing" }],
        sources: [
          { url: "https://example.invalid/plan", title: "Example", checkedAt: "2026-08-01" },
        ],
        lastVerifiedAt: "2026-08-01",
        verificationStatus: "estimated",
      },
    ],
    ...overrides,
  };
}

function raw(overrides: Partial<RawCatalogData> = {}): RawCatalogData {
  return {
    providers: [rawEntry("providers/example.yaml", validProvider)],
    models: [rawEntry("models/example.yaml", validModel)],
    plans: [rawEntry("plans/example.yaml", validPlan())],
    pricing: [rawEntry("pricing/example.yaml", validPricing)],
    ...overrides,
  };
}

describe("validateCatalogData", () => {
  it("accepts a consistent catalog", () => {
    expect(validateCatalogData(raw())).toEqual([]);
  });

  it("reports schema violations with file context", () => {
    const issues = validateCatalogData(raw({ models: [rawEntry("models/bad.yaml", { id: "x" })] }));
    expect(
      issues.some((issue) => issue.code === "SCHEMA_INVALID" && issue.file === "models/bad.yaml"),
    ).toBe(true);
  });

  it("rejects duplicate ids", () => {
    const issues = validateCatalogData(
      raw({ providers: [rawEntry("a.yaml", validProvider), rawEntry("b.yaml", validProvider)] }),
    );
    expect(issues.some((issue) => issue.code === "DUPLICATE_ID")).toBe(true);
  });

  it("rejects overlapping plan versions", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    const second = { ...versions[0], effectiveFrom: "2026-08-15", effectiveTo: "2026-09-01" };
    const issues = validateCatalogData(
      raw({
        plans: [rawEntry("plans/example.yaml", { ...plan, versions: [...versions, second] })],
      }),
    );
    expect(issues.some((issue) => issue.code === "VERSION_OVERLAP")).toBe(true);
  });

  it("rejects effectiveTo before effectiveFrom", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    const bad = { ...versions[0], effectiveFrom: "2026-09-01", effectiveTo: "2026-08-01" };
    const issues = validateCatalogData(
      raw({ plans: [rawEntry("plans/example.yaml", { ...plan, versions: [bad] })] }),
    );
    expect(issues.some((issue) => issue.code === "VERSION_DATE_ORDER")).toBe(true);
  });

  it("warns when a non-excluded model rule has no pricingRef", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    const rule = { model: "example-model" };
    const issues = validateCatalogData(
      raw({
        plans: [
          rawEntry("plans/example.yaml", {
            ...plan,
            versions: [{ ...versions[0], modelRules: [rule] }],
          }),
        ],
      }),
    );
    expect(issues.some((issue) => issue.code === "MODEL_RULE_INVALID")).toBe(true);
  });

  it("rejects unknown pricing references and unknown models", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    const issues = validateCatalogData(
      raw({
        plans: [
          rawEntry("plans/example.yaml", {
            ...plan,
            versions: [
              {
                ...versions[0],
                modelRules: [{ model: "ghost-model", pricingRef: "ghost-pricing" }],
              },
            ],
          }),
        ],
      }),
    );
    expect(issues.some((issue) => issue.code === "PRICING_REF_UNKNOWN")).toBe(true);
    expect(issues.some((issue) => issue.code === "MODEL_REF_MISSING")).toBe(true);
  });

  it("requires whole numbers for token and request limits", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    const limit = {
      id: "monthly-tokens",
      label: "Tokens",
      type: "token_limit",
      amount: "1.5",
      exceed: "reject_request",
      window: { type: "calendar", unit: "month", timezone: "UTC" },
    };
    const issues = validateCatalogData(
      raw({
        plans: [
          rawEntry("plans/example.yaml", {
            ...plan,
            versions: [{ ...versions[0], limits: [limit] }],
          }),
        ],
      }),
    );
    expect(issues.some((issue) => issue.code === "LIMIT_AMOUNT_INVALID")).toBe(true);
  });

  it("rejects invalid timezones and out-of-range durations", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    const badTz = {
      id: "monthly",
      label: "Tokens",
      type: "token_limit",
      amount: "100",
      exceed: "reject_request",
      window: { type: "calendar", unit: "month", timezone: "Not/AZone" },
    };
    const badDuration = {
      id: "rolling",
      label: "Credits",
      type: "credit_pool",
      amount: "10.00",
      exceed: "reject_request",
      window: { type: "rolling", duration: "P999999999999D", anchor: "first_use" },
    };
    const issues = validateCatalogData(
      raw({
        plans: [
          rawEntry("plans/example.yaml", {
            ...plan,
            versions: [{ ...versions[0], limits: [badTz, badDuration] }],
          }),
        ],
      }),
    );
    expect(issues.some((issue) => issue.code === "TIMEZONE_INVALID")).toBe(true);
    expect(issues.some((issue) => issue.code === "WINDOW_INVALID")).toBe(true);
  });

  it("rejects malformed duration strings at the schema layer", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    const malformed = {
      id: "rolling",
      label: "Credits",
      type: "credit_pool",
      amount: "10.00",
      exceed: "reject_request",
      window: { type: "rolling", duration: "PT5X", anchor: "first_use" },
    };
    const issues = validateCatalogData(
      raw({
        plans: [
          rawEntry("plans/example.yaml", {
            ...plan,
            versions: [{ ...versions[0], limits: [malformed] }],
          }),
        ],
      }),
    );
    expect(issues.some((issue) => issue.code === "SCHEMA_INVALID")).toBe(true);
  });

  it("rejects out-of-range promotion multipliers", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    const promotion = {
      id: "promo",
      label: "Promo",
      multiplier: "99",
      effectiveFrom: "2026-09-01",
    };
    const issues = validateCatalogData(
      raw({
        plans: [
          rawEntry("plans/example.yaml", {
            ...plan,
            versions: [{ ...versions[0], promotions: [promotion] }],
          }),
        ],
      }),
    );
    expect(issues.some((issue) => issue.code === "MULTIPLIER_OUT_OF_RANGE")).toBe(true);
  });
});

describe("loader", () => {
  it("loads the bundled catalog with a stable content version", () => {
    const first = loadDefaultCatalog();
    const second = loadDefaultCatalog();
    expect(first.catalogVersion).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(first.catalogVersion).toBe(second.catalogVersion);
    // The catalog ships two namespaces: the synthetic development set and the
    // sourced launch catalog. The synthetic one is asserted exactly; the real one
    // is asserted structurally, so adding a sourced provider does not require
    // editing this test.
    const providerIds = Object.keys(first.providers);
    expect(providerIds).toContain("example-cloud");
    expect(providerIds).toContain("example-open");
    const syntheticModels = Object.keys(first.models).filter((id) => id.startsWith("example-"));
    const syntheticPlans = Object.keys(first.plans).filter((id) => id.startsWith("example-"));
    expect(syntheticModels).toHaveLength(3);
    expect(syntheticPlans).toHaveLength(3);
    expect(Object.keys(first.planVersions).sort()).toEqual(
      expect.arrayContaining([
        "example-cloud-pro@2026-08-01",
        "example-cloud-starter@2026-08-01",
        "example-cloud-starter@2026-09-15",
        "example-open-basic@2026-08-01",
      ]),
    );
    // Pricing ships in two namespaces too: the three synthetic records and the
    // sourced API list-price layer. The synthetic set is asserted exactly; the
    // sourced set is asserted structurally, and every sourced record must be
    // attached to a model the catalog knows and carry its own sources.
    const syntheticPricing = Object.keys(first.pricing).filter((id) => id.startsWith("example-"));
    expect(syntheticPricing).toHaveLength(3);
    for (const pricingId of Object.keys(first.pricing).filter((id) => !id.startsWith("example-"))) {
      const record = first.pricing[pricingId];
      expect(record?.sources.length ?? 0).toBeGreaterThan(0);
      expect(record?.currency).toBe("USD");
      expect(record?.unit).toBe("per_1m_tokens");
      expect(first.models[record?.modelId ?? ""]).toBeDefined();
    }
    // Every real entry carries a source and a verification state.
    for (const planId of Object.keys(first.plans).filter((id) => !id.startsWith("example-"))) {
      const plan = first.plans[planId];
      expect(plan?.versions.length ?? 0).toBeGreaterThan(0);
      for (const version of plan?.versions ?? []) {
        expect(version.sources.length).toBeGreaterThan(0);
        expect(version.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      }
    }
  });

  it("exposes plan versions through the version id convention", () => {
    const catalog = loadDefaultCatalog();
    const version = getPlanVersion(catalog, "example-cloud-starter@2026-09-15");
    expect(version?.planName).toBe("Example Cloud Starter");
    expect(version?.price.amount).toBe("20.00");
  });

  it("throws a validation error when data is invalid", () => {
    const dir = mkdtempSync(join(tmpdir(), "stackreplay-catalog-"));
    for (const subdirectory of ["providers", "models", "plans", "pricing"]) {
      mkdirSync(join(dir, subdirectory));
    }
    // A provider without sources fails schema validation.
    writeFileSync(
      join(dir, "providers", "broken.yaml"),
      "id: example-provider\nrole: provider\nname: Broken\n",
    );
    expect(() => loadCatalogFromDirectory(dir)).toThrow(CatalogValidationError);
  });
});

describe("launch catalog: model identity", () => {
  it("resolves the identifiers real workloads emit and leaves the rest unresolved", () => {
    const catalog = loadDefaultCatalog();
    const identity = createModelIdentityIndex(catalog);

    // Identifiers taken from a real local workload: provider spellings with dots,
    // and vendor-qualified router ids. Each is resolvable because the catalog
    // declares it with a source whose scope matches its evidence.
    const resolvable: Array<[string, string]> = [
      ["gpt-5.6-sol", "gpt-5-6-sol"],
      ["gpt-5.6", "gpt-5-6-sol"],
      ["openai/gpt-5.6-terra", "gpt-5-6-terra"],
      ["claude-opus-4-8", "claude-opus-4-8"],
      ["anthropic/claude-opus-4.8", "claude-opus-4-8"],
      ["deepseek-v4.1-flash", "deepseek-v4-1-flash"],
      ["deepseek/deepseek-v4.1-flash", "deepseek-v4-1-flash"],
      ["deepseek-flash", "deepseek-v4-1-flash"],
      ["z-ai/glm-5.3-flashx", "glm-5-3-flashx"],
      ["glm-5.3-flashx", "glm-5-3-flashx"],
      // Z.ai publishes the row name GLM-5.3; the bare spelling matches that
      // verified provider id case-insensitively, not the removed unscoped
      // bare-router alias.
      ["glm-5.3", "glm-5-3"],
    ];
    for (const [observed, canonical] of resolvable) {
      const resolution = identity.resolve(observed);
      expect(resolution.canonicalId, observed).toBe(canonical);
      // A declaration, not a guess: an exact catalog id or name, or an alias
      // the catalog carries. Never a similarity match.
      expect(["alias", "canonical_name", "canonical_id"], observed).toContain(resolution.basis);
    }

    // Identifiers no source justifies stay unresolved. Guessing one of these onto
    // a similar-looking model would silently attribute consumption. Bare router
    // spellings whose evidence only covers the prefixed id are declared scoped
    // to the harnesses where they are observed; unobserved bare spellings have
    // no declaration at all and stay unresolved everywhere.
    for (const observed of [
      "gpt-daybreak-blue-latest",
      "gpt-5.3-codex-spark",
      "ox-alpha-free",
      "omen-alpha",
      "codex-auto-review",
      "cline-pass/deepseek-v4.1-flash",
      "muse-spark-1.3-contributor",
      "deepseek-flash-2",
      "claude-opus-4.8",
    ]) {
      const resolution = identity.resolve(observed);
      expect(resolution.canonicalId, observed).toBeUndefined();
      expect(resolution.reason, observed).toBe("unknown");
    }

    // Harness-scoped bare spellings resolve in their observing harnesses via
    // the scoped alias. Outside those harnesses they resolve only where a
    // separate verified declaration covers the spelling (DeepSeek's published
    // model name; Z.ai's published GLM-5.3-Flash provider id, matched
    // case-insensitively). The scoped aliases never widen resolution.
    for (const harness of ["opencode", "t3-code", "hermes"]) {
      const scoped = identity.resolve("glm-5.3-flash", { harness });
      expect(scoped.canonicalId, `glm-5.3-flash@${harness}`).toBe("glm-5-3-flash");
      expect(scoped.aliasKind, `glm-5.3-flash@${harness}`).toBe("harness_alias");
      expect(scoped.harness, `glm-5.3-flash@${harness}`).toBe(harness);
    }
    // deepseek-v4.1-flash matches the model's published name before any alias
    // lookup, so its scoped aliases are provenance only.
    for (const harness of ["t3-code", "opencode", "hermes"]) {
      const scoped = identity.resolve("deepseek-v4.1-flash", { harness });
      expect(scoped.canonicalId, `deepseek-v4.1-flash@${harness}`).toBe("deepseek-v4-1-flash");
    }
  });

  it("gives every declared alias its own sources and a verification state", () => {
    const catalog = loadDefaultCatalog();
    const identity = createModelIdentityIndex(catalog);
    const aliases = identity.aliases.filter((alias) => !alias.id.startsWith("example-"));
    expect(aliases.length).toBeGreaterThan(0);
    for (const alias of aliases) {
      expect(alias.sources.length, alias.id).toBeGreaterThan(0);
      expect(alias.lastVerifiedAt, alias.id).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      expect(["verified", "estimated"], alias.id).toContain(alias.verificationStatus);
      for (const source of alias.sources) {
        expect(source.url, alias.id).toMatch(/^https:\/\//u);
        expect(source.checkedAt, alias.id).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      }
    }
  });

  it("prices the models real workloads run, per documented category only", () => {
    const catalog = loadDefaultCatalog();
    const priced: Array<[string, string, string]> = [
      ["gpt-5-6-sol", "4.00", "20.00"],
      ["claude-opus-5", "5.00", "25.00"],
      ["claude-fable-5-1", "10.00", "50.00"],
      ["claude-opus-4-8", "5.00", "25.00"],
      // DeepSeek publishes no unconditional flat rates: the record's base rates
      // are the documented off-peak rates and its tier carries the peak window.
      // Values stay as the provider prints them (one decimal: "$0.6").
      ["deepseek-v4-1-flash", "0.15", "0.6"],
      ["glm-5-3-flash", "0.15", "0.50"],
    ];
    for (const [modelId, input, output] of priced) {
      const record = Object.values(catalog.pricing).find((entry) => entry.modelId === modelId);
      expect(record, modelId).toBeDefined();
      expect(record?.rates.input, modelId).toBe(input);
      expect(record?.rates.output, modelId).toBe(output);
      expect(record?.sources.length ?? 0, modelId).toBeGreaterThan(0);
    }
    // A model whose provider documents no cache-write rate or no reasoning
    // billing relationship must not invent one.
    const deepseek = Object.values(catalog.pricing).find(
      (entry) => entry.modelId === "deepseek-v4-1-flash",
    );
    expect(deepseek?.rates.cacheWrite).toBeUndefined();
    expect(deepseek?.rates.reasoning).toBeUndefined();
    // DeepSeek's peak window is the documented schedule, not a fabricated
    // flattened rate: it lives on a tier with the published UTC windows.
    const peak = deepseek?.tiers?.find((tier) => tier.id === "peak-hours");
    expect(peak && "utcWindows" in peak.when ? peak.when.utcWindows.length : 0).toBe(2);
    expect(peak?.rates.input).toBe("0.3");
    expect(peak?.rates.output).toBe("1.2");
    expect(peak?.rates.cacheRead).toBe("0.006");
  });
});

describe("launch catalog: Anthropic usage-credit semantics", () => {
  /**
   * Anthropic's $2000 daily figure is a usage-credit *funding* rule: it belongs to the
   * prepaid Add Funds / auto-reload flow, not to how much workload the plan will admit
   * before rejecting requests. Recording it as a numeric replay limit would let a replay
   * simulate capacity Anthropic never documented, so it is a sourced qualitative fact on
   * every individual paid tier instead. The $2000/month discounted-bundle cap is a
   * billing rule for the same reason.
   */
  const paidTiers = ["anthropic-claude-pro", "anthropic-claude-max-5x", "anthropic-claude-max-20x"];

  it("exposes no numeric replay limit on any individual paid Anthropic tier", () => {
    const catalog = loadDefaultCatalog();
    for (const planId of paidTiers) {
      const version = required(catalog.plans[planId]).versions[0];
      expect(version?.limits).toEqual([]);
      expect(version?.limits.some((limit) => limit.id === "daily-credit-redemption")).toBe(false);
    }
  });

  it("records both documented usage-credit facts qualitatively, with sources", () => {
    const catalog = loadDefaultCatalog();
    for (const planId of paidTiers) {
      const version = required(catalog.plans[planId]).versions[0];
      const statements = (version?.qualitativeLimits ?? []).map((limit) => limit.statement);
      const redemption = (version?.qualitativeLimits ?? []).find((limit) =>
        limit.statement.includes("daily redemption limit of $2000"),
      );
      const bundleCap = (version?.qualitativeLimits ?? []).find((limit) =>
        limit.statement.includes("$2000 worth of discounted bundles per month"),
      );
      expect(statements.length).toBeGreaterThan(0);
      expect(redemption?.sourceUrl).toBe(
        "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
      );
      expect(bundleCap?.sourceUrl).toBe(
        "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
      );
      // The label has to keep a reader from reading a funding rule as simulated capacity.
      expect(redemption?.label).toContain("not simulated workload capacity");
    }
  });

  it("keeps numeric replay limits to the plans that document a consumable allowance", () => {
    const catalog = loadDefaultCatalog();
    const numeric = Object.values(catalog.plans)
      // The synthetic `example-` development plans are fixtures, not launch claims.
      .filter((plan) => !plan.id.startsWith("example-"))
      .flatMap((plan) =>
        plan.versions.flatMap((version) =>
          version.limits.map((limit) => ({ planId: plan.id, providerId: plan.providerId, limit })),
        ),
      );
    // Five limits across five plans, all GitHub Copilot. A new numeric limit means a
    // provider documented a consumable allowance with a simulatable window, so this
    // count is expected to change deliberately, never incidentally.
    expect(numeric).toHaveLength(5);
    expect(new Set(numeric.map((entry) => entry.planId)).size).toBe(5);
    expect(new Set(numeric.map((entry) => entry.providerId))).toEqual(new Set(["github"]));
  });
});

describe("canonicalize", () => {
  it("is independent of key order", () => {
    const a = { b: 1, a: { d: 2, c: [3, 4] } };
    const b = { a: { c: [3, 4], d: 2 }, b: 1 };
    expect(canonicalize(a)).toEqual(canonicalize(b));
  });
});

describe("independent audit: semantic validation and catalog identity", () => {
  it.each(["effectiveFrom", "lastVerifiedAt"])("rejects impossible %s dates", (field) => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    required(versions[0])[field] = "2026-02-30";
    expect(
      validateCatalogData(raw({ plans: [rawEntry("p.yaml", plan)] })).some(
        (issue) => issue.code === "SCHEMA_INVALID",
      ),
    ).toBe(true);
  });
  it.each(["PT0S", "P0D"])("rejects zero duration %s", (duration) => {
    const plan = validPlan();
    const version = required(plan.versions[0]);
    required(version.limits[0]).window.duration = duration;
    expect(() => buildCatalog(raw({ plans: [rawEntry("p.yaml", plan)] }))).toThrow(
      CatalogValidationError,
    );
  });
  it("does not silently overwrite duplicate entries in buildCatalog", () => {
    expect(() =>
      buildCatalog(
        raw({ providers: [rawEntry("a", validProvider), rawEntry("b", validProvider)] }),
      ),
    ).toThrow(CatalogValidationError);
  });
  it("rejects duplicate limit ids and model rules", () => {
    const plan = validPlan();
    const version = required(plan.versions[0]);
    version.limits.push(required(version.limits[0]));
    version.modelRules.push(required(version.modelRules[0]));
    const issues = validateCatalogData(raw({ plans: [rawEntry("p", plan)] }));
    expect(issues.filter((issue) => issue.code === "DUPLICATE_ID")).toHaveLength(2);
  });
  it("rejects a price belonging to a different model", () => {
    const data = raw({
      models: [rawEntry("a", validModel), rawEntry("b", { ...validModel, id: "other" })],
      pricing: [rawEntry("p", { ...validPricing, modelId: "other" })],
    });
    expect(validateCatalogData(data).some((issue) => issue.code === "PRICING_MODEL_MISMATCH")).toBe(
      true,
    );
  });
  it("rejects out-of-range model multipliers without floating-point rounding", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    required(versions[0]).modelRules = [
      {
        model: "example-model",
        pricingRef: "example-model-pricing",
        multiplier: "10.000000000000000001",
      },
    ];
    expect(
      validateCatalogData(raw({ plans: [rawEntry("p", plan)] })).some(
        (issue) => issue.code === "MULTIPLIER_OUT_OF_RANGE",
      ),
    ).toBe(true);
  });
  it("version array order and file order do not affect the content hash", () => {
    const plan = validPlan();
    const first = { ...required(plan.versions[0]), effectiveTo: "2026-08-31" };
    const second = { ...required(plan.versions[0]), effectiveFrom: "2026-09-01" };
    const data = raw({
      plans: [rawEntry("p", { ...plan, versions: [first, second] })],
      models: [rawEntry("a", validModel), rawEntry("b", { ...validModel, id: "other" })],
    });
    const version = buildCatalog(data).catalogVersion;
    data.models.reverse();
    data.plans = [rawEntry("renamed.yaml", { ...plan, versions: [second, first] })];
    expect(buildCatalog(data).catalogVersion).toBe(version);
    second.price = { ...second.price, amount: "21.00" };
    expect(buildCatalog(data).catalogVersion).not.toBe(version);
  });

  it("requires an explicit exceed behavior on every limit", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    const withoutExceed: Record<string, unknown> = {
      id: "no-exceed",
      label: "No exceed behavior",
      type: "request_limit",
      amount: "10",
      window: { type: "rolling", duration: "PT5H", anchor: "first_use" },
    };
    const issues = validateCatalogData(
      raw({
        plans: [
          rawEntry("p", { ...plan, versions: [{ ...versions[0], limits: [withoutExceed] }] }),
        ],
      }),
    );
    expect(issues.some((issue) => issue.code === "SCHEMA_INVALID")).toBe(true);
  });

  it("requires an explicit overage rate for allow_overage token and request limits", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    const tokenLimit: Record<string, unknown> = {
      id: "tokens",
      label: "Tokens",
      type: "token_limit",
      amount: "1000",
      exceed: "allow_overage",
      window: { type: "rolling", duration: "PT5H", anchor: "first_use" },
    };
    const issues = validateCatalogData(
      raw({
        plans: [rawEntry("p", { ...plan, versions: [{ ...versions[0], limits: [tokenLimit] }] })],
      }),
    );
    expect(issues.some((issue) => issue.code === "LIMIT_OVERAGE_RATE_MISSING")).toBe(true);

    const withRate = { ...tokenLimit, overageRate: { amount: "5.00", unit: "per_1m_tokens" } };
    const okIssues = validateCatalogData(
      raw({
        plans: [rawEntry("p", { ...plan, versions: [{ ...versions[0], limits: [withRate] }] })],
      }),
    );
    expect(okIssues).toEqual([]);
  });

  it("rejects overage rates that do not match the limit type or the exceed behavior", () => {
    const plan = validPlan();
    const versions = plan.versions as Array<Record<string, unknown>>;
    const mismatched: Record<string, unknown> = {
      id: "requests",
      label: "Requests",
      type: "request_limit",
      amount: "10",
      exceed: "allow_overage",
      overageRate: { amount: "0.50", unit: "per_1m_tokens" },
      window: { type: "rolling", duration: "PT5H", anchor: "first_use" },
    };
    const issues = validateCatalogData(
      raw({
        plans: [rawEntry("p", { ...plan, versions: [{ ...versions[0], limits: [mismatched] }] })],
      }),
    );
    expect(issues.some((issue) => issue.code === "LIMIT_OVERAGE_RATE_INVALID")).toBe(true);

    const creditWithRate: Record<string, unknown> = {
      id: "credits",
      label: "Credits",
      type: "credit_pool",
      amount: "20.00",
      exceed: "allow_overage",
      overageRate: { amount: "1.00", unit: "per_request" },
      window: { type: "rolling", duration: "PT5H", anchor: "first_use" },
    };
    const creditIssues = validateCatalogData(
      raw({
        plans: [
          rawEntry("p", { ...plan, versions: [{ ...versions[0], limits: [creditWithRate] }] }),
        ],
      }),
    );
    expect(creditIssues.some((issue) => issue.code === "LIMIT_OVERAGE_RATE_INVALID")).toBe(true);

    const rateWithoutOverage: Record<string, unknown> = {
      id: "rejecting",
      label: "Rejecting",
      type: "token_limit",
      amount: "1000",
      exceed: "reject_request",
      overageRate: { amount: "5.00", unit: "per_1m_tokens" },
      window: { type: "rolling", duration: "PT5H", anchor: "first_use" },
    };
    const rejectIssues = validateCatalogData(
      raw({
        plans: [
          rawEntry("p", { ...plan, versions: [{ ...versions[0], limits: [rateWithoutOverage] }] }),
        ],
      }),
    );
    expect(rejectIssues.some((issue) => issue.code === "LIMIT_OVERAGE_RATE_INVALID")).toBe(true);
  });
});
