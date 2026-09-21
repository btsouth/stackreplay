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

  it("requires a pricingRef for non-excluded model rules", () => {
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
    expect(Object.keys(first.providers)).toEqual(["example-cloud", "example-open"]);
    expect(Object.keys(first.models)).toHaveLength(3);
    expect(Object.keys(first.plans)).toHaveLength(3);
    expect(Object.keys(first.planVersions).sort()).toEqual([
      "example-cloud-pro@2026-08-01",
      "example-cloud-starter@2026-08-01",
      "example-cloud-starter@2026-09-15",
      "example-open-basic@2026-08-01",
    ]);
    expect(Object.keys(first.pricing)).toHaveLength(3);
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
