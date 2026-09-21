import type { CatalogV1, ModelV1 } from "@stackreplay/catalog";
import type { EventConfidenceV1, ModelRefV1 } from "@stackreplay/schema";

/**
 * Model resolution (spec points 22, 23).
 *
 * A source's raw model string is preserved exactly and a canonical catalog id
 * is attached only when the catalog actually knows the name. The matching rule
 * mirrors the replay engine's own resolution (catalog id or catalog name,
 * case-insensitive) so adapter and engine never disagree about a model.
 *
 * No alias guessing happens here: a raw name that the catalog does not know
 * stays unmapped and is reported, never silently rewritten.
 */

export interface ModelMapper {
  /** Resolves a raw model name to a canonical reference plus confidence. */
  map(rawName: string): { model: ModelRefV1; confidence: EventConfidenceV1["model"] };
  /** True when at least one catalog model is known to this mapper. */
  readonly catalogModelCount: number;
  /** Catalog model lookup by canonical id. */
  modelById(id: string): ModelV1 | undefined;
}

export function createModelMapper(catalog: CatalogV1): ModelMapper {
  const models = Object.values(catalog.models);
  const byName = new Map<string, string | null>();
  for (const model of models) {
    for (const candidate of [model.id.toLowerCase(), model.name.toLowerCase()]) {
      const previous = byName.get(candidate);
      byName.set(candidate, previous === undefined || previous === model.id ? model.id : null);
    }
  }
  const byId = new Map(models.map((model) => [model.id, model] as const));

  return {
    catalogModelCount: models.length,
    modelById(id: string): ModelV1 | undefined {
      return byId.get(id);
    },
    map(rawName: string): { model: ModelRefV1; confidence: EventConfidenceV1["model"] } {
      const trimmed = rawName.trim();
      if (trimmed.length === 0) {
        return { model: { rawName: "unknown" }, confidence: "unknown" };
      }
      const lower = trimmed.toLowerCase();
      const exactId = byId.get(trimmed);
      if (exactId !== undefined) {
        return { model: { rawName: trimmed, canonicalId: exactId.id }, confidence: "exact" };
      }
      const resolved = byName.get(lower);
      if (resolved !== undefined && resolved !== null) {
        return { model: { rawName: trimmed, canonicalId: resolved }, confidence: "mapped" };
      }
      return { model: { rawName: trimmed }, confidence: "unknown" };
    },
  };
}
