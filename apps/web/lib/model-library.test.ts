import { bundledModelIdentity } from "@stackreplay/catalog/bundled";
import { describe, expect, it } from "vitest";
import { marketDiscovery } from "./market-discovery";
import {
  defaultSortDirection,
  developerOptions,
  hasPublishedApiPrice,
  isIncludedInSubscription,
  isInView,
  type ModelSortKey,
  modelSortValue,
  modelsInView,
  placesSummary,
  searchModels,
  sortModels,
} from "./model-library";
import { loadPublicCatalog } from "./public-catalog";
import { includedPlanCounts } from "./subscription-access";

/**
 * The public model library (launch taxonomy): releases lead, legacy releases
 * have their own view, and family identity records stay out of the default
 * list while remaining searchable and resolvable.
 */
const catalog = loadPublicCatalog("2026-09-24");
const byId = (id: string) => {
  const model = catalog.modelById(id);
  if (model === undefined) throw new Error(`missing ${id}`);
  return model;
};
const FAMILIES = ["claude-fable", "claude-haiku", "claude-opus", "claude-sonnet"];

describe("default model listing", () => {
  const listed = modelsInView(catalog.models, "models");
  const ids = listed.map((model) => model.id);

  it("excludes family identity records", () => {
    for (const id of FAMILIES) expect(ids, id).not.toContain(id);
    expect(listed.every((model) => model.kind === "release")).toBe(true);
  });

  it("excludes legacy releases, which have their own view", () => {
    expect(ids).not.toContain("claude-opus-4-7");
    expect(modelsInView(catalog.models, "legacy").map((model) => model.id)).toContain(
      "claude-opus-4-7",
    );
  });

  it("leads with current releases", () => {
    const current = [
      "claude-fable-5-1",
      "claude-haiku-4-5",
      "claude-opus-5-5",
      "claude-sonnet-5-5",
    ];
    expect(ids.slice(0, current.length).sort()).toEqual(current);
    expect(listed.slice(0, current.length).every((model) => model.lifecycle === "current")).toBe(
      true,
    );
  });

  it("lists family records only in the identity view", () => {
    const identity = modelsInView(catalog.models, "identity").map((model) => model.id);
    expect(identity.sort()).toEqual(FAMILIES);
    expect(isInView(byId("claude-opus"), "models")).toBe(false);
    expect(isInView(byId("claude-opus"), "legacy")).toBe(false);
  });
});

describe("identity records stay searchable and resolvable", () => {
  it("finds the family record by its catalog id, first", () => {
    const results = searchModels(catalog.models, "claude-opus");
    expect(results[0]?.id).toBe("claude-opus");
    expect(results[0]?.kind).toBe("family");
    // The concrete releases that share the spelling are found as well.
    expect(results.map((model) => model.id)).toContain("claude-opus-5-5");
  });

  it("finds a family by the name a harness uses", () => {
    expect(searchModels(catalog.models, "opus")[0]?.id).toBe("claude-opus");
  });

  it("finds the release that owns an exact alias", () => {
    expect(searchModels(catalog.models, "claude-haiku-4-5-20251001")[0]?.id).toBe(
      "claude-haiku-4-5",
    );
    expect(searchModels(catalog.models, "anthropic/claude-opus-4.8")[0]?.id).toBe(
      "claude-opus-4-8",
    );
  });

  it("points a family record at its concrete releases, current first", () => {
    const opus = byId("claude-opus");
    expect(opus.releaseIds[0]).toBe("claude-opus-5-5");
    expect(opus.releaseIds).toContain("claude-opus-4-7");
  });

  it("still resolves family names in the identity index the engine uses", () => {
    const identity = bundledModelIdentity();
    expect(identity.resolve("opus").canonicalId).toBe("claude-opus");
    expect(identity.resolve("claude-sonnet").canonicalId).toBe("claude-sonnet");
  });
});

describe("developer and routes", () => {
  it("names the developer separately from the routes that offer a model", () => {
    const opus47 = byId("claude-opus-4-7");
    expect(opus47.developerName).toBe("Anthropic");
    expect(opus47.providerNames[0]).toBe("GitHub");
    expect(opus47.places.map((place) => place.label)).toContain("Anthropic API");
  });

  it("uses sourced developers without confusing them with resellers", () => {
    const kimi = byId("kimi-k3");
    expect(kimi.developerId).toBe("moonshot");
    expect(kimi.providerIds).toEqual(["github"]);
    const options = developerOptions(catalog.models).map((option) => option.id);
    expect(options).toContain("moonshot");
    expect(options).not.toContain("github");
    expect(options).toContain("cursor");
  });

  it("summarizes places by human name, Direct API first", () => {
    const summary = placesSummary(byId("claude-opus-5-5"));
    expect(summary.labels[0]).toBe("Anthropic API");
    expect(summary.labels[1]).toMatch(/^Claude /u);
    expect(summary.more).toBeGreaterThan(0);
  });
});

describe("model table sorting and filters", () => {
  const current = marketDiscovery("2026-09-29");
  const facts = {
    prices: current.prices,
    planCounts: includedPlanCounts(current.catalog.plans),
  };
  const releases = current.catalog.models.filter((model) => model.kind === "release");
  const published = (key: ModelSortKey) =>
    releases.filter((model) => modelSortValue(model, key, facts) !== undefined).length;

  for (const key of ["input", "output", "cacheRead", "context", "maxOutput"] as const) {
    for (const direction of ["ascending", "descending"] as const) {
      it(`sorts ${key} ${direction} with unpublished values last`, () => {
        const sorted = sortModels(releases, key, direction, facts);
        const values = sorted.map((model) => modelSortValue(model, key, facts));
        const count = published(key);
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThan(releases.length);
        expect(values.slice(count).every((value) => value === undefined)).toBe(true);
        const known = values.slice(0, count) as number[];
        const expected = [...known].sort((a, b) => (direction === "ascending" ? a - b : b - a));
        expect(known).toEqual(expected);
      });
    }
  }

  it("counts plans from explicit links and treats zero as a real value", () => {
    const sorted = sortModels(releases, "plans", "descending", facts);
    expect(modelSortValue(sorted[0], "plans", facts)).toBeGreaterThan(0);
    const last = sorted.at(-1);
    expect(last && modelSortValue(last, "plans", facts)).toBe(0);
  });

  it("starts price sorts cheapest first and limits largest first", () => {
    expect(defaultSortDirection("input")).toBe("ascending");
    expect(defaultSortDirection("context")).toBe("descending");
    expect(defaultSortDirection("maxOutput")).toBe("descending");
  });

  it("filters to published API prices and subscription access", () => {
    const byId = (id: string) => {
      const model = current.catalog.modelById(id);
      if (!model) throw new Error(`missing ${id}`);
      return model;
    };
    expect(hasPublishedApiPrice(byId("claude-sonnet-5-5"), facts)).toBe(true);
    expect(hasPublishedApiPrice(byId("nemotron-3-ultra"), facts)).toBe(false);
    expect(isIncludedInSubscription(byId("claude-sonnet-5-5"), facts)).toBe(true);
    expect(isIncludedInSubscription(byId("claude-sonnet-5-5"), { ...facts, planCounts: {} })).toBe(
      false,
    );
  });
});
