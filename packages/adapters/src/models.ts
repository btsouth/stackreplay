import {
  type CatalogV1,
  createModelIdentityIndex,
  type ModelIdentityIndex,
  type ModelV1,
} from "@stackreplay/catalog";
import type { EventConfidenceV1, ModelRefV1 } from "@stackreplay/schema";

/**
 * Model resolution (spec points 22, 23; M4A identity layer).
 *
 * A source's raw model string is preserved exactly and a canonical catalog id is
 * attached only when the catalog can justify the identity: an exact canonical id,
 * the canonical name, or an alias the catalog declares with its own sources. The
 * matching rules live in one place (`@stackreplay/catalog` resolve), shared with
 * the replay engine, so an adapter and the engine cannot disagree about a name.
 *
 * No alias guessing happens here: a raw name that the catalog does not know
 * stays unmapped and is reported, never silently rewritten.
 */

export interface ModelMapper {
  /**
   * Resolves a raw model name to a canonical reference plus confidence.
   *
   * `harness` scopes harness-specific aliases; pass the harness the record came
   * from when it is known.
   */
  map(
    rawName: string,
    options?: { harness?: string },
  ): { model: ModelRefV1; confidence: EventConfidenceV1["model"] };
  /** True when at least one catalog model is known to this mapper. */
  readonly catalogModelCount: number;
  /** Catalog model lookup by canonical id. */
  modelById(id: string): ModelV1 | undefined;
  /** The shared identity index, for callers that need the mapping basis. */
  readonly identity: ModelIdentityIndex;
}

export function createModelMapper(catalog: CatalogV1): ModelMapper {
  const identity = createModelIdentityIndex(catalog);
  const byId = new Map(Object.values(catalog.models).map((model) => [model.id, model] as const));

  return {
    catalogModelCount: byId.size,
    identity,
    modelById(id: string): ModelV1 | undefined {
      return byId.get(id);
    },
    map(
      rawName: string,
      options?: { harness?: string },
    ): { model: ModelRefV1; confidence: EventConfidenceV1["model"] } {
      const resolution = identity.resolve(rawName, options);
      if (resolution.canonicalId === undefined) {
        return {
          model: { rawName: resolution.observed.length === 0 ? "unknown" : resolution.observed },
          confidence: "unknown",
        };
      }
      return {
        model: { rawName: resolution.observed, canonicalId: resolution.canonicalId },
        confidence: resolution.basis === "canonical_id" ? "exact" : "mapped",
      };
    },
  };
}
