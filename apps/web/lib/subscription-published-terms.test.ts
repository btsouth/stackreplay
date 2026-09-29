import { describe, expect, it } from "vitest";
import { buildCompareFacts } from "./compare-facts";
import { loadPublicCatalog } from "./public-catalog";
import { subscriptionPublishedTerms } from "./subscription-published-terms";

const date = "2026-09-29";
describe("published subscription decision facts", () => {
  it("keeps current published terms separate from historical replay constraints", () => {
    const catalog = loadPublicCatalog(date);
    const plan = catalog.planById("opencode-go");
    if (!plan) throw Error("Missing plan");
    expect(plan.limits).toEqual([]);
    expect(plan.publishedTerms?.allowanceSummary).toContain("$15–$60");
    expect(buildCompareFacts(plan, catalog.modelById).usage.lines[0]?.text).toContain("20%");
    expect(subscriptionPublishedTerms(plan.id, "2026-09-28")).toBeUndefined();
  });
  it("preserves model-specific Go and Go Plus allowances without adding them", () => {
    const go = subscriptionPublishedTerms("opencode-go", date);
    const plus = subscriptionPublishedTerms("opencode-go-plus", date);
    const allowance = (terms: typeof go, model: string) =>
      terms?.tables?.find((t) => t.id === "allowances")?.rows.find((row) => row[0] === model);
    expect(allowance(go, "GLM-5.3-Flash")).toEqual(["GLM-5.3-Flash", "$12", "$30", "$60"]);
    expect(allowance(go, "Kimi K3")).toEqual(["Kimi K3", "$3", "$7.5", "$15"]);
    expect(allowance(plus, "Kimi K3")).toEqual(["Kimi K3", "$12", "$30", "$60"]);
    expect(allowance(plus, "Kimi K2.6")).toEqual(["Kimi K2.6", "$48", "$120", "$240"]);
    expect(go?.tables?.find((t) => t.id === "allowances")?.rows).toHaveLength(30);
  });
  it("retains rate tiers, absent cache-write prices, temporary offers and estimates", () => {
    const terms = subscriptionPublishedTerms("opencode-go", date);
    const rates = terms?.tables?.find((t) => t.id === "rates");
    expect(rates?.rows.find((row) => row[0] === "GLM-5.3-Flash")?.[4]).toBe("-");
    expect(rates?.rows.find((row) => row[0] === "GPT 6 Luna (> 272K tokens)")).toEqual([
      "GPT 6 Luna (> 272K tokens)",
      "$0.20",
      "$0.75",
      "$0.02",
      "$0.25",
      "$15",
    ]);
    expect(terms?.tables?.find((t) => t.id === "requests")?.note).toContain("not guaranteed");
    expect(terms?.tables?.find((t) => t.id === "request-mix")?.rows).toHaveLength(25);
    expect(
      terms?.tables
        ?.find((t) => t.id === "privacy")
        ?.rows.find((row) => row[0] === "Muse Spark 1.3 Contributor"),
    ).toEqual(["Muse Spark 1.3 Contributor", "Yes", "Not ZDR"]);
  });
  it("records sourced details for every listed subscription and valid table cells", () => {
    for (const plan of loadPublicCatalog(date).plans) {
      const terms = plan.publishedTerms;
      expect(terms, plan.id).toBeDefined();
      expect(terms?.sourceUrls.length).toBeGreaterThan(0);
      for (const table of terms?.tables ?? []) {
        expect(table.sourceUrl).toMatch(/^https:\/\//);
        for (const row of table.rows)
          expect(row.length, `${plan.id}/${table.id}/${row[0]}`).toBe(table.columns.length);
      }
    }
  });
});
