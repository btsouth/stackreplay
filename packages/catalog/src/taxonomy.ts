import type { CatalogV1 } from "./catalog.js";
import type { ModelKindV1, ModelV1 } from "./schema.js";

/**
 * Model taxonomy helpers (launch taxonomy).
 *
 * These read the explicit `kind`, `familyId`, `lifecycle` and `developerId`
 * fields a record declares. Nothing here looks at a model's id or name: a
 * record is a family only because it says so, and a release belongs to a
 * family only because it names one. Identity resolution does not use any of
 * this, so a family record resolves exactly as it did before these fields
 * existed.
 */

/** A record's kind, with the documented default: absent means a concrete release. */
export function modelKindOf(model: Pick<ModelV1, "kind">): ModelKindV1 {
  return model.kind ?? "release";
}

/** The release records that name `familyId` as their family, in id order. */
export function familyReleaseIds(catalog: Pick<CatalogV1, "models">, familyId: string): string[] {
  return Object.values(catalog.models)
    .filter((model) => modelKindOf(model) === "release" && model.familyId === familyId)
    .map((model) => model.id)
    .sort();
}
