/**
 * Canonical model identity resolution (M4A).
 *
 * Real imported workloads carry identifiers the catalog never authored: dotted
 * provider spellings, vendor-qualified router names, harness-specific aliases.
 * Resolution is a mapping layer over the catalog, never a guess:
 *
 *   1. exact canonical id
 *   2. canonical name (case-insensitive)
 *   3. a declared alias, harness-scoped first, then harness-agnostic
 *   4. unresolved, with a reason
 *
 * An alias only exists because a catalog entry declares it with its own sources,
 * so every mapping is explicit and auditable. Nothing here does fuzzy matching,
 * substring matching, prefix matching or provider inference: a name the catalog
 * does not know stays unresolved and is reported.
 *
 * The same identifier always resolves the same way for the same catalog version:
 * the index is built from a deterministic iteration order and collisions between
 * two models claiming the same key make that key unresolved rather than picking a
 * winner.
 */

import type { ModelResolutionKindV1, VerificationStatusV1 } from "@stackreplay/schema";
import type { CatalogV1 } from "./catalog.js";
import type { CatalogSourceV1, ModelAliasV1, ModelV1 } from "./schema.js";

/** Alias kinds, derived from the catalog schema so they can never drift. */
export type ModelAliasKindV1 = ModelAliasV1["kind"];

export type ModelIdentityBasisV1 = "canonical_id" | "canonical_name" | "alias" | "unresolved";

export type ModelIdentityUnresolvedReasonV1 = "empty" | "unknown" | "ambiguous";

export interface ModelIdentityResolutionV1 {
  /** The identifier exactly as observed, trimmed. Never rewritten. */
  observed: string;
  /** Canonical catalog model id, present only when the identity is resolved. */
  canonicalId?: string;
  basis: ModelIdentityBasisV1;
  /** The declared alias record that matched, when the basis is `alias`. */
  aliasId?: string;
  aliasKind?: ModelAliasKindV1;
  /** The harness scope the matched alias was declared for, when it was scoped. */
  harness?: string;
  /** Present only when unresolved. */
  reason?: ModelIdentityUnresolvedReasonV1;
}

/**
 * M4B resolution kind: a stable, serializable classification of how an identity
 * was established, derived from a resolution and never re-derived by consumers.
 *
 * It exists so "the same underlying model" and "a different model" cannot be
 * confused in a result: every alias kind still means the same model, while a
 * cross-model translation is a separate concept with its own provenance.
 */
export function modelResolutionKindOf(
  resolution: ModelIdentityResolutionV1 | undefined,
): ModelResolutionKindV1 {
  if (resolution === undefined) return "unresolved";
  if (resolution.basis === "canonical_id" || resolution.basis === "canonical_name")
    return "exact-id";
  if (resolution.basis === "alias")
    return resolution.aliasKind === "provider_route" ? "documented-route" : "documented-alias";
  return "unresolved";
}

export interface ModelIdentityAliasViewV1 {
  id: string;
  alias: string;
  kind: ModelAliasKindV1;
  harness?: string;
  sources: readonly CatalogSourceV1[];
  lastVerifiedAt: string;
  verificationStatus: VerificationStatusV1;
}

export interface ModelIdentityIndex {
  readonly modelIds: readonly string[];
  /** Every declared alias, for diagnostics and public provenance surfaces. */
  readonly aliases: readonly ModelIdentityAliasViewV1[];
  resolve(observed: string, options?: { harness?: string }): ModelIdentityResolutionV1;
}

interface AliasKey {
  modelId: string;
  alias: ModelIdentityAliasViewV1;
}

/**
 * A key claimed by two different models resolves to `null` and is reported as
 * ambiguous, so a catalog authoring mistake can never silently pick a mapping.
 */
function claim(map: Map<string, AliasKey | null>, key: string, value: AliasKey): void {
  const previous = map.get(key);
  if (previous === undefined) {
    map.set(key, value);
    return;
  }
  if (previous === null || previous.modelId !== value.modelId) map.set(key, null);
}

export function createModelIdentityIndex(catalog: CatalogV1): ModelIdentityIndex {
  const models: ModelV1[] = Object.values(catalog.models).sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );

  const byId = new Map<string, string>();
  const byName = new Map<string, string | null>();
  const scopedAliases = new Map<string, AliasKey | null>();
  const globalAliases = new Map<string, AliasKey | null>();
  const aliases: ModelIdentityAliasViewV1[] = [];

  for (const model of models) {
    byId.set(model.id, model.id);
    for (const candidate of [model.id.toLowerCase(), model.name.toLowerCase()]) {
      const previous = byName.get(candidate);
      byName.set(candidate, previous === undefined || previous === model.id ? model.id : null);
    }
    for (const alias of model.aliases ?? []) {
      const view: ModelIdentityAliasViewV1 = {
        id: alias.id,
        alias: alias.alias,
        kind: alias.kind,
        ...(alias.harness === undefined ? {} : { harness: alias.harness }),
        sources: alias.sources,
        lastVerifiedAt: alias.lastVerifiedAt,
        verificationStatus: alias.verificationStatus,
      };
      aliases.push(view);
      const key = alias.alias.trim().toLowerCase();
      if (key.length === 0) continue;
      const claimValue: AliasKey = { modelId: model.id, alias: view };
      if (alias.harness === undefined) claim(globalAliases, key, claimValue);
      else claim(scopedAliases, `${alias.harness.toLowerCase()}|${key}`, claimValue);
    }
  }

  aliases.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return {
    modelIds: models.map((model) => model.id),
    aliases,
    resolve(observed: string, options?: { harness?: string }): ModelIdentityResolutionV1 {
      const trimmed = observed.trim();
      if (trimmed.length === 0) return { observed: trimmed, basis: "unresolved", reason: "empty" };

      const exact = byId.get(trimmed);
      if (exact !== undefined)
        return { observed: trimmed, canonicalId: exact, basis: "canonical_id" };

      const lower = trimmed.toLowerCase();
      const byIdLower = byId.get(lower);
      if (byIdLower !== undefined)
        return { observed: trimmed, canonicalId: byIdLower, basis: "canonical_id" };

      const named = byName.get(lower);
      if (named !== undefined && named !== null)
        return { observed: trimmed, canonicalId: named, basis: "canonical_name" };

      const harness = options?.harness?.trim().toLowerCase();
      if (harness !== undefined && harness.length > 0) {
        const scoped = scopedAliases.get(`${harness}|${lower}`);
        if (scoped !== undefined) {
          if (scoped === null)
            return { observed: trimmed, basis: "unresolved", reason: "ambiguous" };
          return {
            observed: trimmed,
            canonicalId: scoped.modelId,
            basis: "alias",
            aliasId: scoped.alias.id,
            aliasKind: scoped.alias.kind,
            ...(scoped.alias.harness === undefined ? {} : { harness: scoped.alias.harness }),
          };
        }
      }

      const global = globalAliases.get(lower);
      if (global !== undefined) {
        if (global === null) return { observed: trimmed, basis: "unresolved", reason: "ambiguous" };
        return {
          observed: trimmed,
          canonicalId: global.modelId,
          basis: "alias",
          aliasId: global.alias.id,
          aliasKind: global.alias.kind,
        };
      }

      if (byName.get(lower) === null)
        return { observed: trimmed, basis: "unresolved", reason: "ambiguous" };
      return { observed: trimmed, basis: "unresolved", reason: "unknown" };
    },
  };
}
