import { describe, expect, it } from "vitest";
import {
  buildCompareFacts,
  CAPACITY_REPLAY,
  COMPATIBILITY_ONLY,
  type CompareFacts,
  codingToolsFor,
  compareModelMatrix,
  DEFAULT_COMPARE_PAIR,
  defaultComparePair,
  NO_NAMED_MODEL,
  statementExcerpt,
} from "./compare-facts";
import { loadPublicCatalog } from "./public-catalog";

/**
 * The public compare rows speak plan questions (launch): price, models by name,
 * coding tools, usage limits in words, what StackReplay can simulate, what
 * happens after the limit, and evidence. Catalog vocabulary stays in the
 * inspect view.
 */
const catalog = loadPublicCatalog("2026-09-24");
function factsFor(planId: string): CompareFacts {
  const plan = catalog.planById(planId);
  if (plan === undefined) throw new Error(`missing ${planId}`);
  return buildCompareFacts(plan, catalog.modelById);
}

/** The text a person reads in the primary rows, not the inspect view. */
function primaryText(facts: CompareFacts): string {
  return [
    facts.price,
    ...facts.models.featured.map((model) => model.name),
    ...facts.models.more.map((model) => model.name),
    ...facts.codingTools,
    ...facts.usage.lines.map((line) => line.text),
    facts.usage.lines.length ? "" : "No numeric allowance is recorded in this snapshot.",
    facts.simulation,
    ...facts.afterLimit.lines,
    ...facts.afterLimit.quotes.map((quote) => quote.text),
    facts.evidence,
  ].join("\n");
}

describe("public compare facts", () => {
  it("distinguishes recorded coverage dates from provider effective dates", () => {
    const current = loadPublicCatalog("2026-10-03");
    for (const id of [
      "kiro-free",
      "kiro-pro",
      "kiro-pro-plus",
      "kiro-pro-max",
      "kiro-power",
      "cursor-teams-standard",
      "cursor-teams-premium",
    ]) {
      const plan = current.planById(id);
      expect(plan?.effectiveFromBasis, id).toBe("catalog_recorded");
      if (!plan) throw new Error(`missing ${id}`);
      expect(buildCompareFacts(plan, current.modelById).effective, id).toBe(
        "Rules recorded in catalog on Oct 3, 2026",
      );
    }
    for (const plan of current.plans) {
      const facts = buildCompareFacts(plan, current.modelById);
      if (plan.effectiveFromBasis === "provider") {
        expect(facts.effective, plan.id).toMatch(/^Provider rules effective from /u);
      } else {
        expect(facts.effective, plan.id).not.toMatch(/effective from|in effect since/u);
      }
    }
  });

  it("never uses catalog vocabulary in the primary rows", () => {
    for (const plan of catalog.plans) {
      const text = primaryText(buildCompareFacts(plan, catalog.modelById));
      expect(text, plan.id).not.toMatch(/documented routes?|qualitative|catalogued/iu);
    }
  });

  it("describes Claude Max 20x in plain terms with real model names", () => {
    const facts = factsFor("anthropic-claude-max-20x");
    expect(facts.price).toBe("$200 / month");
    const featured = facts.models.featured.map((model) => model.name);
    expect(featured).toContain("Claude Opus 5.5");
    // Family identity records are not listed as models.
    const all = [...featured, ...facts.models.more.map((model) => model.name)];
    expect(all).toContain("Claude Sonnet 5");
    for (const family of ["Opus", "Sonnet", "Haiku", "Fable"]) expect(all).not.toContain(family);
    // Current releases lead. Remaining slots can include legacy releases.
    const releases = [...facts.models.featured, ...facts.models.more];
    const firstLegacy = releases.findIndex((model) => model.legacy);
    expect(firstLegacy).toBeGreaterThan(0);
    expect(releases.slice(firstLegacy).every((model) => model.legacy)).toBe(true);
    expect(facts.models.more.some((model) => model.name === "Claude Opus 4.7")).toBe(true);
    expect(facts.codingTools).toEqual(["Claude Code"]);
    expect(facts.usage.numeric).toBe(false);
    expect(facts.simulation).toBe(COMPATIBILITY_ONLY);
    expect(facts.afterLimit.quotes[0]?.text).toContain("Usage credits");
    expect(facts.evidence).toMatch(/^Verified Sep \d+, 2026$/u);
  });

  it("states numeric allowances as amounts in words", () => {
    const facts = factsFor("github-copilot-pro-plus");
    expect(facts.usage.numeric).toBe(true);
    expect(facts.usage.lines[0]?.text).toBe("$70 of usage credit per month");
    expect(facts.simulation).toBe(CAPACITY_REPLAY);
    expect(facts.afterLimit.lines[0]).toMatch(/continue past the included amount/u);
    expect(facts.codingTools).toEqual(["GitHub Copilot"]);
  });

  it("features models from several developers on a multi-developer plan", () => {
    const facts = factsFor("github-copilot-pro-plus");
    const developers = new Set(facts.models.featured.map((model) => model.developerId ?? "none"));
    expect(developers.size).toBeGreaterThan(2);
    expect(facts.models.featured.every((model) => !model.legacy)).toBe(true);
    expect(facts.models.featured.length + facts.models.more.length).toBe(facts.models.total);
  });

  it("shortens a long provider statement to whole sentences for the primary row", () => {
    const facts = factsFor("openai-chatgpt-pro");
    const quote = facts.afterLimit.quotes[0];
    expect(quote?.excerpt.length).toBeLessThan(quote?.text.length ?? 0);
    expect(quote?.excerpt).toContain("temporarily unavailable until the allowance resets.");
    expect(quote?.excerpt.endsWith(" …")).toBe(true);
    expect(statementExcerpt("Short. Enough.")).toBe("Short. Enough.");
  });

  it("says when no named model can be replayed", () => {
    expect(factsFor("github-copilot-free").simulation).toBe(NO_NAMED_MODEL);
  });

  it("names a coding tool only when the plan's own evidence names it", () => {
    const pro200 = catalog.planById("openai-chatgpt-pro-20x");
    const pro100 = catalog.planById("openai-chatgpt-pro");
    if (pro200 === undefined || pro100 === undefined) throw new Error("missing plans");
    expect(codingToolsFor(pro100)).toEqual(["Codex"]);
    // First-party Pro documentation establishes Codex for both tiers.
    expect(codingToolsFor(pro200)).toEqual(["Codex"]);
  });

  it("states use in other apps for Claude and ChatGPT plans alike", () => {
    const current = loadPublicCatalog("2026-09-30");
    const otherApps = (id: string) => {
      const plan = current.planById(id);
      if (plan === undefined) throw new Error(`missing ${id}`);
      return buildCompareFacts(plan, current.modelById).otherApps ?? "";
    };
    for (const id of [
      "anthropic-claude-pro",
      "anthropic-claude-max-5x",
      "anthropic-claude-max-20x",
    ])
      expect(otherApps(id)).toContain("may not offer Claude sign-in");
    for (const id of ["openai-chatgpt-pro", "openai-chatgpt-pro-20x", "openai-chatgpt-pro-500"])
      expect(otherApps(id)).toContain("Sign in with ChatGPT");
    // The five-hour limit is shared across apps on Plus; Pro plans have none.
    expect(otherApps("openai-chatgpt-plus")).toContain("including the five-hour limit");
    expect(otherApps("openai-chatgpt-business")).toContain("limited to Plus and Pro");
    expect(otherApps("cursor-pro")).toBe("");
  });

  it("keeps every model rule, including identity records, for the inspect view", () => {
    const rules = factsFor("anthropic-claude-max-20x").rules;
    expect(rules.find((rule) => rule.id === "claude-opus")?.kindLabel).toBe("Family name");
    expect(rules.find((rule) => rule.id === "claude-fable")?.excluded).toBe(true);
  });

  it("names current Claude releases on Pro and marks Fable as usage credits only", () => {
    const facts = factsFor("anthropic-claude-pro");
    const names = [...facts.models.featured, ...facts.models.more].map((model) => model.name);
    expect(names).toEqual(expect.arrayContaining(["Claude Sonnet 5", "Claude Haiku 4.5"]));
    expect(names.some((name) => name.includes("Fable"))).toBe(false);
    const fable = facts.rules.find((rule) => rule.id === "claude-fable-5-1");
    expect(fable).toMatchObject({ excluded: true, usageCredits: true });
  });

  it("defaults to Claude Max 20x against ChatGPT Pro", () => {
    expect(defaultComparePair(catalog.plans)).toEqual([...DEFAULT_COMPARE_PAIR]);
    expect(
      defaultComparePair([
        { id: "a", providerId: "x" },
        { id: "b", providerId: "x" },
        { id: "c", providerId: "y" },
      ]),
    ).toEqual(["a", "c"]);
  });
});

describe("October 3 public coding coverage", () => {
  const current = loadPublicCatalog("2026-10-03");
  const factsFor = (id: string) => {
    const plan = current.planById(id);
    if (!plan) throw new Error(`missing ${id}`);
    return buildCompareFacts(plan, current.modelById);
  };

  it("renders Kiro's numeric credits as buyer terms, not replay limits", () => {
    for (const [id, summary] of [
      ["kiro-free", "50 provider credits per month; add-ons unavailable"],
      ["kiro-pro-plus", "2,000 credits per month; add-ons at $0.04 per credit"],
      ["kiro-pro-max", "5,000 credits per month; add-ons at $0.04 per credit"],
      ["kiro-power", "10,000 credits per month; add-ons at $0.04 per credit"],
    ] as const) {
      const facts = factsFor(id);
      expect(facts.usage.numeric).toBe(false);
      expect(facts.usage.lines[0]?.text).toBe(summary);
    }
    expect(factsFor("kiro-free").codingTools).not.toContain("Kiro Web");
    expect(
      factsFor("kiro-pro-plus").publishedTerms?.terms.find((term) => term.label === "Workflows")
        ?.value,
    ).toContain("existing account usage view");
  });

  it("shows Cursor Teams per-seat prices and per-user model pools", () => {
    const standard = factsFor("cursor-teams-standard");
    const premium = factsFor("cursor-teams-premium");
    expect(standard.price).toBe("$40 per paid user / month");
    expect(premium.price).toBe("$120 per paid user / month");
    expect(factsFor("kiro-pro-plus").price).toBe("$40 per user / month");
    expect(standard.usage.lines[0]?.text).toBe(
      "Two monthly per-seat pools: Cursor Models and Other Models",
    );
    expect(
      standard.publishedTerms?.terms.find((term) => term.label === "Cursor Token Rate")?.value,
    ).toContain("input, output and cached tokens");
    expect(
      premium.publishedTerms?.terms.find((term) => term.label === "Included usage")?.value,
    ).toContain("5x");
    expect(standard.models.more.length + standard.models.featured.length).toBeGreaterThan(0);
  });
});

describe("model by model", () => {
  const current = loadPublicCatalog();
  const factsFor = (planId: string) => {
    const plan = current.planById(planId);
    if (plan === undefined) throw new Error(`missing ${planId}`);
    return buildCompareFacts(plan, current.modelById);
  };
  it("lists every included model once, shared models first", () => {
    const left = factsFor("command-code-max-20x");
    const right = factsFor("command-code-goat");
    const rows = compareModelMatrix([left, right]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(rows.filter((row) => row.included[0]).length).toBe(left.models.total);
    expect(rows.filter((row) => row.included[1]).length).toBe(right.models.total);
    const shared = rows.map((row) => row.included.every(Boolean));
    expect(shared.indexOf(false)).toBeGreaterThan(0);
    expect(shared.slice(shared.indexOf(false))).not.toContain(true);
  });

  it("previews catalogued models before names without a model page", () => {
    const featured = factsFor("command-code-go").models.featured;
    expect(featured.length).toBeGreaterThan(0);
    expect(featured[0]?.id.startsWith("published:")).toBe(false);
    expect(featured.map((model) => model.name)).not.toContain("Space Bunny Alpha");
  });
});
