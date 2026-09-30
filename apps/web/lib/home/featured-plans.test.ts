import { describe, expect, it } from "vitest";
import { limitSentence } from "../catalog-copy";
import { loadPublicCatalog, type PublicPlanSummary } from "../public-catalog";
import { capacityEvidence, FEATURED_PLAN_IDS, featuredPlanCards, planCard } from "./featured-plans";

const catalog = loadPublicCatalog("2026-09-30");
const modelIds = catalog.models.map((model) => model.id);
const plan = (id: string) => catalog.planById(id) as PublicPlanSummary;

describe("capacity evidence", () => {
  const base = { limits: [], qualitativeLimits: [] } as const;

  it("is calculable only with a published numeric limit the engine replays", () => {
    expect(capacityEvidence(plan("github-copilot-pro-plus"))).toBe("calculable");
    expect(plan("github-copilot-pro-plus").limits.length).toBeGreaterThan(0);
  });

  it("is bounded when usage structure is published without an absolute allowance", () => {
    for (const id of ["anthropic-claude-max-20x", "openai-chatgpt-pro", "cursor-pro"]) {
      expect(plan(id).limits).toHaveLength(0);
      expect(capacityEvidence(plan(id))).toBe("bounded");
    }
    expect(
      capacityEvidence({
        ...base,
        relativeAllowances: [{ multiple: "25", comparedToPlanName: "ChatGPT Plus" }],
      }),
    ).toBe("bounded");
  });

  it("is access only when nothing but the lineup is known", () => {
    expect(capacityEvidence(base)).toBe("access-only");
  });
});

describe("featured subscription cards", () => {
  const cards = featuredPlanCards(catalog.plans, modelIds);

  it("resolves every configured plan and skips one the catalog no longer lists", () => {
    expect(cards.map((card) => card.id)).toEqual([...FEATURED_PLAN_IDS]);
    expect(
      featuredPlanCards(catalog.plans, modelIds, { ids: ["cursor-pro", "retired-plan"] }).map(
        (card) => card.id,
      ),
    ).toEqual(["cursor-pro"]);
  });

  it("states the published allowance, reset cadence and after-limit terms first", () => {
    const max = planCard(plan("anthropic-claude-max-20x"), modelIds);
    const terms = plan("anthropic-claude-max-20x").publishedTerms;
    expect(max.price).toBe("$200 / month");
    expect(max.usage).toBe(terms?.allowanceSummary);
    expect(max.resets).toBe("Sessions reset every five hours.");
    expect(max.afterLimit).toBe(terms?.afterLimit);
    expect(max.models?.count).toBeGreaterThan(0);
  });

  it("never claims a bounded plan fits a workload, and keeps the gap secondary", () => {
    for (const card of cards.filter((entry) => entry.evidence.state === "bounded")) {
      expect(card.evidence.label).toBe("Bounded");
      expect(card.evidence.summary).toMatch(/can't be proven/u);
      expect(card.evidence.summary).not.toMatch(/\bfits\b|within your|enough for/iu);
      // The missing detail is the catalog's own sourced statement, shown behind a disclosure.
      const statement = plan(card.id).qualitativeLimits.find(
        (limit) => limit.id === "what-the-provider-does-not-publish",
      )?.statement;
      expect(card.evidence.gap).toBe(statement);
    }
  });

  it("names the replayable number for a calculable plan", () => {
    const copilot = planCard(plan("github-copilot-pro-plus"), modelIds);
    const limit = plan("github-copilot-pro-plus").limits[0];
    expect(copilot.evidence.state).toBe("calculable");
    expect(copilot.evidence.summary.toLowerCase()).toContain(
      limitSentence(limit as never).toLowerCase(),
    );
  });

  it("leads with known facts, never a bare not-published verdict", () => {
    for (const card of cards) {
      for (const value of [
        card.price,
        card.usage,
        card.resets,
        card.afterLimit,
        card.evidence.label,
      ])
        if (value !== undefined)
          expect(value).not.toMatch(/^(not published|unknown|unavailable)/iu);
      expect(card.usage).toBeDefined();
    }
  });

  it("introduces a lineup with its newest releases when release days are known", () => {
    const card = planCard(plan("anthropic-claude-max-20x"), modelIds, (id) =>
      id === undefined ? "" : (catalog.modelById(id)?.releaseDate?.date ?? ""),
    );
    const newest = (plan("anthropic-claude-max-20x").modelAccess?.groups ?? [])
      .flatMap((group) => group.models)
      .filter((model) => model.modelId !== undefined)
      .map((model) => ({
        name: model.name,
        date: catalog.modelById(model.modelId as string)?.releaseDate?.date ?? "",
      }))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    expect(card.models?.names[0]).toBe(newest?.name);
  });

  it("lists the canonical models each plan includes, for the personal lineup check", () => {
    const max = planCard(plan("anthropic-claude-max-20x"), modelIds);
    expect(max.includedModelIds).toContain("claude-opus-5-5");
    expect(max.includedModelIds).not.toContain("gpt-6-1-sol");
  });
});
