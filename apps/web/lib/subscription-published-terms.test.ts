import { describe, expect, it } from "vitest";
import { buildCompareFacts } from "./compare-facts";
import { loadPublicCatalog } from "./public-catalog";
import { subscriptionPublishedTerms } from "./subscription-published-terms";
import subscriptions from "./subscription-published-terms-data.json";

const date = "2026-09-29";
describe("published subscription decision facts", () => {
  it("expires the reviewed Kimi offer on the provider's stated return date", () => {
    for (const [id, regular, boosted] of [
      ["command-code-goat", "$20", "$60"],
      ["command-code-pro", "$30", "$70"],
    ]) {
      if (!id) throw Error("Missing plan ID");
      const allowance = (asOf: string, name: string) =>
        subscriptionPublishedTerms(id, asOf)
          ?.tables?.find((table) => table.id === "model-allowances")
          ?.rows.find((row) => row[0] === name)?.[1];
      // No sourced start date: keep earlier reviewed disclosures intact.
      expect(allowance("2026-10-02", "Kimi K3")).toBe(regular);
      for (const asOf of ["2026-10-03", "2026-10-07"])
        expect(allowance(asOf, "Kimi K3")).toBe(`${boosted} through October 7, 2026`);
      expect(allowance("2026-10-08", "Kimi K3")).toBe(regular);
      expect(allowance("2026-11-01", "Kimi K3")).toBe(regular);
      expect(allowance("2026-10-08", "GLM-5.3 Flash")).toBe(`${boosted} while capacity lasts`);
      expect(
        subscriptionPublishedTerms(id, "2026-10-08")?.terms.some(
          (term) => term.label === "Kimi K3 promotion",
        ),
      ).toBe(false);
      expect(
        subscriptionPublishedTerms(id, "2026-10-07")?.terms.find(
          (term) => term.label === "Kimi K3 promotion",
        )?.value,
      ).toContain("enforced ZDR uses its default allowance");
    }
    // Reading later terms does not mutate the historical disclosure.
    expect(subscriptionPublishedTerms("command-code-goat", date)?.checkedAt).toBe(date);
  });
  it("keeps free-model availability as a disclosure and leaves replay capacity unchanged", () => {
    const current = loadPublicCatalog("2026-10-03");
    const previous = loadPublicCatalog(date);
    for (const id of [
      "command-code-go",
      "command-code-goat",
      "command-code-pro",
      "command-code-max-10x",
      "command-code-max-20x",
    ]) {
      const plan = current.planById(id);
      expect(plan, id).toBeDefined();
      expect(plan?.limits).toEqual(previous.planById(id)?.limits);
      const free = plan?.publishedTerms?.terms.find((term) => term.label === "Free Ling 3.1 Flash");
      expect(free?.value).toContain("no daily request limit");
      expect(free?.value).toContain("$1 in account credits");
      expect(free?.value).toContain("requests cost no credits");
      expect(free?.value).toContain("while available");
    }
    for (const [id, value] of [
      ["command-code-max-10x", "$150"],
      ["command-code-max-20x", "$300"],
    ]) {
      if (!id) throw Error("Missing plan ID");
      expect(
        subscriptionPublishedTerms(id, "2026-10-03")
          ?.tables?.find((table) => table.id === "model-allowances")
          ?.rows.find((row) => row[0] === "Kimi K3")?.[1],
      ).toBe(value);
    }
  });
  it("dates only the announced reversion and preserves earlier source records", () => {
    for (const id of [
      "command-code-go",
      "command-code-goat",
      "command-code-pro",
      "command-code-max-10x",
      "command-code-max-20x",
    ] as const) {
      const historical = JSON.parse(JSON.stringify(subscriptions[id]));
      const reviewed = subscriptionPublishedTerms(id, "2026-10-03");
      expect(reviewed?.checkedAt).toBe("2026-10-03");
      expect(reviewed).not.toHaveProperty("effectiveFrom");
      expect(subscriptionPublishedTerms(id, "2026-09-28")).toBeUndefined();
      // Read the expiry first to catch accidental mutation of earlier records.
      subscriptionPublishedTerms(id, "2026-10-08");
      expect(subscriptionPublishedTerms(id, date)).toEqual(historical);
      expect(subscriptions[id]).toEqual(historical);
    }
    for (const id of ["command-code-goat", "command-code-pro"]) {
      const reverted = subscriptionPublishedTerms(id, "2026-10-08");
      expect(reverted?.effectiveFrom).toBe("2026-10-08");
      expect(reverted?.checkedAt).toBe("2026-10-03");
      expect(
        reverted?.terms.find((term) => term.label === "GLM-5.3 Flash promotion")?.value,
      ).toContain("while capacity lasts");
    }
    const go = subscriptionPublishedTerms("command-code-go", "2026-10-03");
    expect(
      go?.tables
        ?.find((table) => table.id === "model-allowances")
        ?.rows.find((row) => row[0] === "GLM-5.3 Flash")?.[1],
    ).toBe("$10 while capacity lasts");
    expect(go?.terms.some((term) => term.label === "Kimi K3 promotion")).toBe(false);
  });
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
