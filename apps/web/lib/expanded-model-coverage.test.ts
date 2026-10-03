import { describe, expect, it } from "vitest";
import { featuredModels } from "./home/featured-models";
import { developerOptions, matchesDeveloper, modelsInView, searchModels } from "./model-library";
import { modelCapabilities } from "./model-specifications";
import { loadPublicCatalog } from "./public-catalog";

const catalog = loadPublicCatalog("2026-10-03");
const expected = {
  "amazon-nova-2-lite": {
    developer: "amazon",
    alias: "amazon.nova-2-lite-v1:0",
    capabilities: ["Tool calling", "Vision", "Video input"],
  },
  "cohere-command-a-plus": {
    developer: "cohere",
    alias: "command-a-plus-05-2026",
    capabilities: ["Reasoning", "Tool calling", "Vision", "Structured output"],
  },
  "cohere-north-mini-code": {
    developer: "cohere",
    alias: "north-mini-code-1-0",
    capabilities: ["Reasoning", "Tool calling", "Structured output"],
  },
  "llama-4-maverick": {
    developer: "meta",
    alias: "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
    capabilities: ["Vision"],
  },
  "llama-4-scout": {
    developer: "meta",
    alias: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    capabilities: ["Vision"],
  },
} as const;

function publicModel(id: keyof typeof expected) {
  const model = catalog.modelById(id);
  if (model === undefined) throw new Error(`missing ${id}`);
  return model;
}

describe("expanded model library coverage", () => {
  it("lists all five releases in the default release view", () => {
    const listed = new Set(modelsInView(catalog.models, "models").map((model) => model.id));
    for (const id of Object.keys(expected)) expect(listed.has(id), id).toBe(true);
  });

  it("exposes the developers, aliases and modality-derived capabilities", () => {
    const developers = new Set(developerOptions(catalog.models).map((option) => option.id));
    for (const [id, facts] of Object.entries(expected)) {
      const model = publicModel(id as keyof typeof expected);
      expect(developers.has(facts.developer), `${id} developer`).toBe(true);
      expect(matchesDeveloper(model, facts.developer), `${id} filter`).toBe(true);
      expect(searchModels(catalog.models, facts.alias)[0]?.id, `${id} alias`).toBe(id);
      expect(searchModels(catalog.models, model.name)[0]?.id, `${id} name`).toBe(id);
      expect(modelCapabilities(model), id).toEqual(facts.capabilities);
    }
  });

  it("keeps the new records out of the configured featured comparison", () => {
    const featured = new Set(featuredModels(catalog).map((model) => model.id));
    for (const id of Object.keys(expected)) expect(featured.has(id), id).toBe(false);
  });
});
