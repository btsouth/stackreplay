import { bundledModelIdentity } from "@stackreplay/catalog/bundled";
import { describe, expect, it } from "vitest";
import {
  developerOptions,
  isInView,
  modelsInView,
  placesSummary,
  searchModels,
  UNRECORDED_DEVELOPER,
} from "./model-library";
import { loadPublicCatalog } from "./public-catalog";

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
    const current = ["claude-fable-5-1", "claude-haiku-4-5", "claude-opus-5-5", "claude-sonnet-5"];
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

  it("leaves the developer unrecorded when the record does not state one", () => {
    const kimi = byId("kimi-k3");
    expect(kimi.developerId).toBeUndefined();
    expect(kimi.providerIds).toEqual(["github"]);
    const options = developerOptions(catalog.models).map((option) => option.id);
    expect(options).toContain(UNRECORDED_DEVELOPER);
    expect(options).not.toContain("github");
    expect(options).not.toContain("cursor");
  });

  it("summarizes places by human name, Direct API first", () => {
    const summary = placesSummary(byId("claude-opus-5-5"));
    expect(summary.labels[0]).toBe("Anthropic API");
    expect(summary.labels[1]).toMatch(/^Claude /u);
    expect(summary.more).toBeGreaterThan(0);
  });
});
