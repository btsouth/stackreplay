import { describe, expect, it } from "vitest";
import { loadDefaultCatalog } from "./load.js";
import { createModelIdentityIndex } from "./resolve.js";
import { modelV1Schema } from "./schema.js";
import { familyReleaseIds, modelKindOf } from "./taxonomy.js";
import { type RawCatalogData, validateCatalogData } from "./validate.js";

/**
 * Model taxonomy (launch).
 *
 * A record says whether it is a concrete release or a family identity, which
 * release family it belongs to, whether its developer lists it as current or
 * legacy, and who develops it. Every one of those is an explicit field: nothing
 * is read from an id or a name, and identity resolution is unchanged.
 */

const source = { url: "https://example.invalid/m", title: "Example", checkedAt: "2026-01-01" };

function modelEntry(id: string, extra: Record<string, unknown> = {}) {
  return {
    file: `${id}.yaml`,
    data: {
      id,
      role: "model",
      name: id,
      sources: [source],
      lastVerifiedAt: "2026-01-01",
      verificationStatus: "estimated",
      ...extra,
    },
  };
}

function rawWith(models: RawCatalogData["models"]): RawCatalogData {
  return {
    providers: [
      {
        file: "p.yaml",
        data: {
          id: "maker",
          role: "provider",
          name: "Maker",
          sources: [source],
          lastVerifiedAt: "2026-01-01",
          verificationStatus: "estimated",
        },
      },
    ],
    models,
    plans: [],
    pricing: [],
  };
}

const codes = (raw: RawCatalogData) =>
  validateCatalogData(raw)
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.code);

describe("model taxonomy schema", () => {
  it("parses a record written before the taxonomy fields existed, as a release", () => {
    const parsed = modelV1Schema.parse(modelEntry("legacy-shape").data);
    expect(parsed.kind).toBeUndefined();
    expect(modelKindOf(parsed)).toBe("release");
    expect(parsed.lifecycle).toBeUndefined();
    expect(parsed.developerId).toBeUndefined();
  });

  it("accepts a family with releases that name it, and a developer that is a provider", () => {
    expect(
      codes(
        rawWith([
          modelEntry("fam", { kind: "family", developerId: "maker" }),
          modelEntry("rel", { familyId: "fam", lifecycle: "current", developerId: "maker" }),
        ]),
      ),
    ).toEqual([]);
  });

  it("rejects a developer that is not a provider record", () => {
    expect(codes(rawWith([modelEntry("rel", { developerId: "nobody" })]))).toContain(
      "DEVELOPER_REF_MISSING",
    );
  });

  it("rejects a family reference that does not point at a family record", () => {
    expect(
      codes(rawWith([modelEntry("other"), modelEntry("rel", { familyId: "other" })])),
    ).toContain("FAMILY_REF_INVALID");
    expect(codes(rawWith([modelEntry("rel", { familyId: "missing" })]))).toContain(
      "FAMILY_REF_INVALID",
    );
  });

  it("rejects a family record that declares a lifecycle or a family of its own", () => {
    expect(
      codes(
        rawWith([
          modelEntry("fam", { kind: "family" }),
          modelEntry("fam-2", { kind: "family", familyId: "fam" }),
          modelEntry("fam-3", { kind: "family", lifecycle: "current" }),
        ]),
      ).filter((code) => code === "FAMILY_RECORD_INVALID"),
    ).toHaveLength(2);
  });

  it("rejects an unknown kind or lifecycle", () => {
    expect(modelV1Schema.safeParse(modelEntry("x", { kind: "alias" }).data).success).toBe(false);
    expect(modelV1Schema.safeParse(modelEntry("x", { lifecycle: "retired" }).data).success).toBe(
      false,
    );
  });
});

describe("launch catalog: Anthropic lineup (checked 2026-09-24)", () => {
  const catalog = loadDefaultCatalog();
  const model = (id: string) => {
    const found = catalog.models[id];
    if (found === undefined) throw new Error(`missing ${id}`);
    return found;
  };

  it("keeps the family names as identity records, not releases", () => {
    for (const id of ["claude-fable", "claude-haiku", "claude-opus", "claude-sonnet"]) {
      expect(model(id).kind, id).toBe("family");
      expect(model(id).developerId, id).toBe("anthropic");
    }
  });

  it("classifies the current lineup and the legacy models Anthropic still lists", () => {
    const current = ["claude-fable-5-1", "claude-haiku-4-5", "claude-opus-5-5", "claude-sonnet-5"];
    const legacy = [
      "claude-fable-5",
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-opus-4-8-fast-mode",
      "claude-opus-5",
      "claude-sonnet-4-6",
    ];
    for (const id of current) expect(model(id).lifecycle, id).toBe("current");
    for (const id of legacy) expect(model(id).lifecycle, id).toBe("legacy");
    for (const id of [...current, ...legacy]) {
      expect(modelKindOf(model(id)), id).toBe("release");
      expect(model(id).developerId, id).toBe("anthropic");
    }
  });

  it("links each family to its releases through declared family ids", () => {
    expect(familyReleaseIds(catalog, "claude-opus")).toEqual([
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-opus-4-8-fast-mode",
      "claude-opus-5",
      "claude-opus-5-5",
    ]);
    expect(familyReleaseIds(catalog, "claude-haiku")).toEqual(["claude-haiku-4-5"]);
  });

  it("keeps who develops a model separate from the routes that offer it", () => {
    // Claude Opus 4.7 is developed by Anthropic and offered through GitHub as well
    // as the Claude API. The first recorded route is GitHub, and the developer is
    // still Anthropic: the two facts are recorded separately.
    const opus47 = model("claude-opus-4-7");
    expect(opus47.providerIds?.[0]).toBe("github");
    expect(opus47.providerIds).toContain("anthropic");
    expect(opus47.developerId).toBe("anthropic");
    // A route alone never establishes a developer: GitHub and Cursor route many
    // models and develop none of these, so no model names them as developer.
    for (const entry of Object.values(catalog.models)) {
      expect(["github", "cursor"], entry.id).not.toContain(entry.developerId);
    }
    // A model whose own sources do not establish a developer keeps none.
    expect(model("kimi-k3").developerId).toBeUndefined();
  });

  it("offers every current and still-available Anthropic release on the Claude API route", () => {
    for (const id of [
      "claude-fable-5-1",
      "claude-fable-5",
      "claude-haiku-4-5",
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-opus-5",
      "claude-opus-5-5",
      "claude-sonnet-4-6",
      "claude-sonnet-5",
    ]) {
      expect(model(id).providerIds, id).toContain("anthropic");
    }
  });

  it("resolves family names and aliases exactly as before", () => {
    const index = createModelIdentityIndex(catalog);
    expect(index.resolve("claude-opus")).toMatchObject({
      canonicalId: "claude-opus",
      basis: "canonical_id",
    });
    expect(index.resolve("opus")).toMatchObject({
      canonicalId: "claude-opus",
      basis: "canonical_name",
    });
    expect(index.resolve("Sonnet")).toMatchObject({ canonicalId: "claude-sonnet" });
    expect(index.resolve("claude-haiku-4-5-20251001")).toMatchObject({
      canonicalId: "claude-haiku-4-5",
      basis: "alias",
    });
    expect(index.resolve("anthropic/claude-opus-4.8")).toMatchObject({
      canonicalId: "claude-opus-4-8",
      basis: "alias",
    });
  });

  it("leaves plan model rules that name a family untouched", () => {
    const max = catalog.plans["anthropic-claude-max-20x"]?.versions.at(-1);
    const rules = max?.modelRules.filter((rule) => model(rule.model).kind === "family");
    expect(rules?.map((rule) => [rule.model, rule.excluded === true])).toEqual([
      ["claude-fable", true],
      ["claude-haiku", false],
      ["claude-opus", false],
      ["claude-sonnet", false],
    ]);
  });
});
