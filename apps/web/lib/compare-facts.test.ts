import { describe, expect, it } from "vitest";
import {
  buildCompareFacts,
  CAPACITY_REPLAY,
  COMPATIBILITY_ONLY,
  type CompareFacts,
  codingToolsFor,
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
    facts.usage.numeric ? "" : "Provider does not publish a numeric allowance.",
    facts.simulation,
    ...facts.afterLimit.lines,
    ...facts.afterLimit.quotes.map((quote) => quote.text),
    facts.evidence,
  ].join("\n");
}

describe("public compare facts", () => {
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
    expect(featured).toContain("Claude Sonnet 5");
    // Family identity records are not listed as models.
    const all = [...featured, ...facts.models.more.map((model) => model.name)];
    for (const family of ["Opus", "Sonnet", "Haiku", "Fable"]) expect(all).not.toContain(family);
    // Current releases lead; legacy ones follow under "+ N more".
    expect(facts.models.featured.every((model) => !model.legacy)).toBe(true);
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
    // The $200 record does not mention Codex, so none is claimed for it.
    expect(codingToolsFor(pro200)).toEqual([]);
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
