// biome-ignore-all lint/style/noNonNullAssertion: synthetic fixture entries.
import { describe, expect, it } from "vitest";
import { syntheticExecutionCatalog } from "../test-fixtures/execution.js";
import { compileExecutionPlan } from "./execution-compiler.js";

function fixture() {
  const catalog = syntheticExecutionCatalog(["api"]);
  const plan = catalog.plans["fixture-api"]!,
    version = plan.executionVersions![0]!;
  const rate = version.rates[0]!;
  const original = catalog.pricing[rate.pricingRef!]!;
  catalog.pricing.promotion = {
    ...original,
    id: "promotion",
    rates: { ...original.rates, input: "4", output: "20", cacheRead: "0.4" },
  };
  plan.executionOverlays = [
    {
      id: "promo",
      validFrom: "2026-09-01T00:00:00Z",
      validUntil: "2026-10-01T00:00:00Z",
      planVersionIds: [version.id],
      precedence: 0,
      requirementIds: [],
      claimRefs: ["overlay"],
      modifications: ["input", "output", "cacheRead"].map((category) => ({
        kind: "cash_category_override" as const,
        rateId: rate.id,
        category: category as "input" | "output" | "cacheRead",
        pricingRef: "promotion",
        claimRefs: ["overlay"],
      })),
    },
  ];
  const compile = (ids = ["promo"], at = "2026-09-12T00:00:00Z") =>
    compileExecutionPlan(catalog, plan.id, version.id, ids, at).artifact;
  return { catalog, plan, version, rate, compile };
}
describe("category-specific cash overlays", () => {
  it("overrides independently, retains base identity and never mutates source prices", () => {
    const { catalog, rate, compile } = fixture(),
      before = JSON.stringify(catalog);
    const a = compile(),
      b = compile();
    expect(a).toEqual(b);
    if (a.computation.kind !== "executable") throw new Error(JSON.stringify(a.computation));
    const r = a.computation.rates.find((r) => r.id === rate.id)!;
    expect(r.rates).toMatchObject({ input: "4", output: "20", cacheRead: "0.4" });
    expect(r.basePricingRef).toBe(rate.pricingRef);
    expect(r.cashOverrides).toHaveLength(3);
    expect(r.claimRefs).toContain("overlay");
    expect(JSON.stringify(catalog)).toBe(before);
    expect(compile([]).artifactHash).not.toBe(a.artifactHash);
  });
  it("honors half-open promotion validity without leaking into base compilation", () => {
    const { compile } = fixture();
    expect(compile().validity.end).toBe("2026-10-01T00:00:00.000Z");
    expect(() => compile(["promo"], "2026-10-01T00:00:00Z")).toThrow("not valid");
    expect(() => compile(["promo"], "2026-08-31T23:59:59Z")).toThrow();
    const base = compile([]),
      after = compile([], "2026-10-01T00:00:00Z");
    expect(base.artifactHash).toBe(after.artifactHash);
  });
  it("can price a promotion without inventing unknown permanent base prices", () => {
    const { rate, compile } = fixture();
    rate.pricingRef = null;
    expect(compile().computation.kind).toBe("executable");
    expect(compile([]).computation).toMatchObject({
      kind: "not_computable",
      reasons: expect.arrayContaining([expect.objectContaining({ code: "price_unknown" })]),
    });
  });
  it("rejects equal-precedence collisions in one category, not independent categories", () => {
    const { plan, compile } = fixture();
    plan.executionOverlays!.push({ ...plan.executionOverlays![0]!, id: "other" });
    expect(() => compile(["promo", "other"])).toThrow("Ambiguous overlay");
  });
  it("never changes a shared allowance debit rate", () => {
    const { version, rate, compile } = fixture();
    version.debits.push({
      id: "d",
      poolId: "p",
      meterId: "m",
      claimRefs: ["debit"],
      operation: { kind: "rate", rateId: rate.id, debitFactor: "1" },
    });
    expect(() => compile()).toThrow("dedicated USD cash rate");
  });
  it("does not turn missing source categories or incompatible tiers into zero", () => {
    const { catalog, compile } = fixture();
    delete catalog.pricing.promotion!.rates.cacheRead;
    expect(compile().computation.kind).toBe("not_computable");
  });
});
