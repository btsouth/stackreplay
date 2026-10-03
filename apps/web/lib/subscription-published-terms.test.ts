import { describe, expect, it } from "vitest";
import { buildCompareFacts } from "./compare-facts";
import { loadPublicCatalog } from "./public-catalog";
import {
  type SubscriptionPublishedTerms,
  selectSubscriptionPublishedTerms,
  subscriptionPublishedTerms,
} from "./subscription-published-terms";
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

  it("adds October 3 Kiro and Cursor Teams terms without rewriting older Kiro terms", () => {
    const historical = subscriptionPublishedTerms("kiro-pro", "2026-10-02");
    expect(historical?.checkedAt).toBe("2026-09-29");
    expect(
      historical?.tables
        ?.find((table) => table.id === "model-multipliers")
        ?.rows.some((row) => row[0] === "Claude Sonnet 5.5"),
    ).toBe(false);

    const current = subscriptionPublishedTerms("kiro-pro", "2026-10-03");
    expect(current?.checkedAt).toBe("2026-10-03");
    expect(
      current?.tables
        ?.find((table) => table.id === "model-multipliers")
        ?.rows.find((row) => row[0] === "Claude Sonnet 5.5"),
    ).toEqual(["Claude Sonnet 5.5", "1.3×"]);
    expect(current?.terms.find((term) => term.label === "Workflows")?.value).toContain(
      "existing account usage view",
    );
    expect(subscriptionPublishedTerms("kiro-pro", "2026-10-02")).toEqual(historical);
  });

  it("records the six new public plans' buyer terms on October 3 only", () => {
    for (const [id, allowance] of [
      ["kiro-free", "50 provider credits per month; add-ons unavailable"],
      ["kiro-pro-plus", "2,000 credits per month; add-ons at $0.04 per credit"],
      ["kiro-pro-max", "5,000 credits per month; add-ons at $0.04 per credit"],
      ["kiro-power", "10,000 credits per month; add-ons at $0.04 per credit"],
      ["cursor-teams-standard", "Two monthly per-seat pools: Cursor Models and Other Models"],
      [
        "cursor-teams-premium",
        "Two monthly per-seat pools; Premium is 5x Standard usage or Agent limits",
      ],
    ] as const) {
      expect(subscriptionPublishedTerms(id, "2026-10-02"), id).toBeUndefined();
      const terms = subscriptionPublishedTerms(id, "2026-10-03");
      expect(terms?.checkedAt, id).toBe("2026-10-03");
      expect(terms?.allowanceSummary, id).toBe(allowance);
      expect(
        terms?.sourceUrls.every((url) => url.startsWith("https://")),
        id,
      ).toBe(true);
    }
  });

  it("keeps Cursor Teams pool sizes and annual terms explicitly unknown", () => {
    for (const id of ["cursor-teams-standard", "cursor-teams-premium"]) {
      const terms = subscriptionPublishedTerms(id, "2026-10-03");
      expect(terms?.terms.find((term) => term.label === "Included usage")?.value).toContain(
        "does not publish the absolute size",
      );
      expect(terms?.availabilityNote).toContain("minimum seats");
      expect(terms?.terms.find((term) => term.label === "Cursor Token Rate")?.value).toContain(
        "input, output and cached tokens",
      );
    }
  });
});

describe("same-day terms revisions", () => {
  it("chooses the last appended complete tie and retains future effective-date priority", () => {
    const first: SubscriptionPublishedTerms = {
      checkedAt: "2026-10-03",
      sourceUrls: [],
      allowanceSummary: "First",
      terms: [],
    };
    const revised = { ...first, allowanceSummary: "Revised" };
    const future = { ...first, effectiveFrom: "2026-10-10", allowanceSummary: "Future" };
    expect(selectSubscriptionPublishedTerms([first, revised, future], "2026-10-03")).toBe(revised);
    expect(selectSubscriptionPublishedTerms([first, revised, future], "2026-10-10")).toBe(future);
    expect(selectSubscriptionPublishedTerms([future, revised], "2026-10-10")).toBe(future);
    expect(
      selectSubscriptionPublishedTerms([{ ...first, checkedAt: "2026-10-04" }, first], "2026-10-04")
        ?.checkedAt,
    ).toBe("2026-10-04");
    expect(selectSubscriptionPublishedTerms([first, revised], "2026-10-02")).toBeUndefined();
  });
  it("keeps previous Google snapshots and adds sourced cessation and separate API billing", () => {
    for (const id of ["google-ai-pro", "google-ai-ultra", "google-ai-ultra-20x"] as const) {
      const records = subscriptions[id];
      expect(records).toHaveLength(3);
      expect(subscriptionPublishedTerms(id, "2026-10-02")).toEqual(records[0]);
      expect(subscriptionPublishedTerms(id, "2026-10-03")).toEqual(records[2]);
      const terms = subscriptionPublishedTerms(id, "2026-10-03");
      expect(terms).not.toHaveProperty("effectiveFrom");
      expect(terms?.availabilityNote).toContain("ceased June 18, 2026");
      expect(terms?.availabilityNote).toContain("Standard and Enterprise are unaffected");
      expect(
        terms?.terms.find((term) => term.label === "Conflicting CLI quota documentation")?.value,
      ).toContain("No restoration evidence");
      expect(terms?.afterLimit).toContain("only for products that accept them");
      expect(terms?.afterLimit).toContain("separately billed");
      expect(terms?.codingTools).toEqual(["Google Antigravity", "Jules"]);
    }
  });
});
