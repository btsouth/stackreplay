import { describe, expect, it } from "vitest";
import { syntheticExecutionCatalog } from "../test-fixtures/execution.js";
import type { CatalogV1 } from "./catalog.js";
import { DECISION_MARKET } from "./decision-market.js";
import { decisionSnapshotHash } from "./decision-snapshot.js";
import { compileExecutionPlan } from "./execution-compiler.js";
import { buildCatalog } from "./load.js";

const rulesAt = "2026-09-12T00:00:00Z";
const rehash = (catalog: CatalogV1) =>
  buildCatalog({
    providers: Object.values(catalog.providers).map((data) => ({ file: data.id, data })),
    models: Object.values(catalog.models).map((data) => ({ file: data.id, data })),
    pricing: Object.values(catalog.pricing).map((data) => ({ file: data.id, data })),
    plans: Object.values(catalog.plans).map((data) => ({ file: data.id, data })),
  });
function market(catalog: CatalogV1) {
  const plans = ["api", "goat"].map((family) => ({
    id: `fixture-${family}`,
    name: family,
    provider: "Fixture",
    providerId: "fixture-provider",
    claims: [],
    artifact: compileExecutionPlan(catalog, `fixture-${family}`, `${family}-v1`, [], rulesAt)
      .artifact,
  }));
  return {
    rulesAt,
    reviewUntil: "2026-10-01T00:00:00Z",
    catalogHash: catalog.catalogVersion,
    plans,
    scenarios: ["cache-5m", "cache-1h"].map((id) => ({
      id,
      label: id,
      assumption: "Fixture",
      artifacts: plans.map((p) => p.artifact),
    })),
  };
}
describe("admitted decision snapshot identity", () => {
  it("reproduces the generated hash from admitted artifacts", () => {
    expect(DECISION_MARKET.decisionSnapshotHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(decisionSnapshotHash(DECISION_MARKET)).toBe(DECISION_MARKET.decisionSnapshotHash);
  });
  it("preserves PR #21-style metadata changes while retaining different full provenance", () => {
    const catalog = syntheticExecutionCatalog(["api", "goat"]);
    const original = market(catalog);
    const edited = structuredClone(catalog);
    const model = edited.models["fixture-a"];
    if (!model) throw new Error("Missing fixture model");
    model.releaseDate = { date: "2026-09-01", sources: model.sources };
    model.sources = model.sources.map((s) => ({
      ...s,
      title: "Reviewed source title",
      checkedAt: "2026-09-12",
    }));
    model.lastVerifiedAt = "2026-09-12";
    const provider = edited.providers["fixture-provider"];
    if (!provider) throw new Error("Missing fixture provider");
    provider.name = "Updated display name";
    const revised = market(rehash(edited));
    expect(revised.catalogHash).not.toBe(original.catalogHash);
    expect(revised.plans.map((p) => p.artifact.artifactHash)).toEqual(
      original.plans.map((p) => p.artifact.artifactHash),
    );
    expect(revised.plans.map((p) => p.artifact.computation)).toEqual(
      original.plans.map((p) => p.artifact.computation),
    );
    expect(decisionSnapshotHash(revised)).toBe(decisionSnapshotHash(original));
  });
  it("changes for a real referenced API rate mutation", () => {
    const catalog = syntheticExecutionCatalog(["api", "goat"]);
    const original = market(catalog);
    const edited = structuredClone(catalog);
    const price = edited.pricing["fixture-a-price"];
    if (!price) throw new Error("Missing fixture price");
    price.rates.output = "7";
    const revised = market(rehash(edited));
    expect(revised.plans[0]?.artifact.artifactHash).not.toBe(
      original.plans[0]?.artifact.artifactHash,
    );
    expect(decisionSnapshotHash(revised)).not.toBe(decisionSnapshotHash(original));
  });
  it("sorts scenarios, artifacts and plans independently of display copy", () => {
    const original = market(syntheticExecutionCatalog(["api", "goat"]));
    const reordered = {
      ...original,
      catalogHash: "unrelated-provenance",
      plans: original.plans.toReversed().map((p) => ({ ...p, name: "Display only" })),
      scenarios: original.scenarios.toReversed().map((s) => ({
        ...s,
        label: "Display",
        assumption: "Display text",
        artifacts: s.artifacts.toReversed(),
      })),
    };
    expect(decisionSnapshotHash(reordered)).toBe(decisionSnapshotHash(original));
    expect(decisionSnapshotHash({ ...original, rulesAt: "2026-09-13T00:00:00Z" })).not.toBe(
      decisionSnapshotHash(original),
    );
    expect(decisionSnapshotHash({ ...original, reviewUntil: "2026-10-02T00:00:00Z" })).not.toBe(
      decisionSnapshotHash(original),
    );
    expect(decisionSnapshotHash({ ...original, plans: original.plans.slice(1) })).not.toBe(
      decisionSnapshotHash(original),
    );
    expect(
      decisionSnapshotHash({
        ...original,
        scenarios: original.scenarios.map((s) => ({ ...s, id: `${s.id}-different` })),
      }),
    ).not.toBe(decisionSnapshotHash(original));
  });
});
