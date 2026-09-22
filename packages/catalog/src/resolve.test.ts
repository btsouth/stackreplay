import { describe, expect, it } from "vitest";
import type { CatalogV1 } from "./catalog.js";
import { createModelIdentityIndex, modelResolutionKindOf } from "./resolve.js";

/**
 * Identity resolution tests (M4A).
 *
 * The contract under test: resolution is a mapping over declared catalog facts,
 * never a guess. An exact id or name resolves, a declared alias resolves with its
 * own basis and provenance, and everything else stays unresolved with a reason.
 */

const source = (url: string) => ({
  url,
  title: "Example source",
  checkedAt: "2026-09-21",
});

function model(
  id: string,
  name: string,
  aliases?: Array<{
    id: string;
    alias: string;
    kind: "provider_id" | "harness_alias" | "provider_route";
    harness?: string;
  }>,
) {
  return {
    id,
    role: "model" as const,
    name,
    sources: [source("https://example.invalid/model")],
    lastVerifiedAt: "2026-09-21",
    verificationStatus: "verified" as const,
    ...(aliases === undefined
      ? {}
      : {
          aliases: aliases.map((alias) => ({
            ...alias,
            sources: [source("https://example.invalid/alias")],
            lastVerifiedAt: "2026-09-21",
            verificationStatus: "verified" as const,
          })),
        }),
  };
}

function catalogWith(models: ReturnType<typeof model>[]): CatalogV1 {
  return {
    version: "test",
    providers: {},
    models: Object.fromEntries(models.map((entry) => [entry.id, entry])),
    plans: {},
    pricing: {},
  } as unknown as CatalogV1;
}

const catalog = catalogWith([
  model("example-sol", "Example Sol", [
    { id: "example-sol-dotted", alias: "example.sol", kind: "provider_id" },
    { id: "example-sol-router", alias: "vendor/example.sol", kind: "harness_alias" },
    { id: "example-sol-scoped", alias: "sol-fast", kind: "harness_alias", harness: "opencode" },
  ]),
  model("example-opus", "Example Opus", [
    { id: "example-opus-dotted", alias: "example-opus-4.8", kind: "provider_id" },
  ]),
]);

const index = createModelIdentityIndex(catalog);

describe("model identity resolution", () => {
  it("resolves an exact canonical id and the canonical name", () => {
    expect(index.resolve("example-sol")).toMatchObject({
      canonicalId: "example-sol",
      basis: "canonical_id",
    });
    expect(index.resolve("Example Sol")).toMatchObject({
      canonicalId: "example-sol",
      basis: "canonical_name",
    });
    expect(index.resolve("  example-sol  ")).toMatchObject({
      observed: "example-sol",
      canonicalId: "example-sol",
      basis: "canonical_id",
    });
  });

  it("resolves a declared provider alias with its own basis and provenance", () => {
    expect(index.resolve("example.sol")).toMatchObject({
      canonicalId: "example-sol",
      basis: "alias",
      aliasId: "example-sol-dotted",
      aliasKind: "provider_id",
    });
    expect(index.resolve("Example-Opus-4.8")).toMatchObject({
      canonicalId: "example-opus",
      basis: "alias",
      aliasId: "example-opus-dotted",
    });
  });

  it("applies a harness-scoped alias only for that harness", () => {
    expect(index.resolve("sol-fast", { harness: "opencode" })).toMatchObject({
      canonicalId: "example-sol",
      basis: "alias",
      aliasId: "example-sol-scoped",
      harness: "opencode",
    });
    expect(index.resolve("sol-fast", { harness: "codex" })).toMatchObject({
      basis: "unresolved",
      reason: "unknown",
    });
    expect(index.resolve("sol-fast")).toMatchObject({ basis: "unresolved", reason: "unknown" });
  });

  it("applies a harness-agnostic alias for any harness", () => {
    expect(index.resolve("vendor/example.sol")).toMatchObject({
      canonicalId: "example-sol",
      basis: "alias",
      aliasId: "example-sol-router",
    });
    expect(index.resolve("vendor/example.sol", { harness: "codex" })).toMatchObject({
      canonicalId: "example-sol",
      basis: "alias",
    });
  });

  it("never matches by similarity, prefix or substring", () => {
    for (const candidate of [
      "example-sol-turbo",
      "example-sol2",
      "sol",
      "vendor/example",
      "example.sol.1",
      "Example  Sol",
    ]) {
      expect(index.resolve(candidate).basis).toBe("unresolved");
      expect(index.resolve(candidate).canonicalId).toBeUndefined();
    }
  });

  it("reports empty and unknown identifiers with a reason", () => {
    expect(index.resolve("   ")).toEqual({ observed: "", basis: "unresolved", reason: "empty" });
    expect(index.resolve("never-heard-of-it")).toEqual({
      observed: "never-heard-of-it",
      basis: "unresolved",
      reason: "unknown",
    });
  });

  it("treats a spelling claimed by two models as ambiguous rather than picking one", () => {
    const conflicted = catalogWith([
      model("example-a", "Example A", [
        { id: "alias-a", alias: "shared-name", kind: "harness_alias" },
      ]),
      model("example-b", "Example B", [
        { id: "alias-b", alias: "shared-name", kind: "harness_alias" },
      ]),
    ]);
    const conflictedIndex = createModelIdentityIndex(conflicted);
    expect(conflictedIndex.resolve("shared-name")).toEqual({
      observed: "shared-name",
      basis: "unresolved",
      reason: "ambiguous",
    });
    expect(conflictedIndex.resolve("example-a")).toMatchObject({ canonicalId: "example-a" });
  });

  it("is deterministic and exposes every declared alias sorted by id", () => {
    const first = index.resolve("example.sol");
    const second = index.resolve("example.sol");
    expect(second).toEqual(first);
    expect(index.aliases.map((alias) => alias.id)).toEqual([
      "example-opus-dotted",
      "example-sol-dotted",
      "example-sol-router",
      "example-sol-scoped",
    ]);
    expect(index.modelIds).toEqual(["example-opus", "example-sol"]);
  });
});

/**
 * M4B resolution kinds. Every alias kind still means the same underlying model,
 * so the classification distinguishes *how* an identity was established and
 * never turns a same-model route into a substitution.
 */
describe("M4B resolution kind", () => {
  const routed = catalogWith([
    model("example-sol", "Example Sol", [
      { id: "example-sol-dotted", alias: "example.sol", kind: "provider_id" },
      { id: "example-sol-classic", alias: "example.sol-classic", kind: "provider_route" },
    ]),
  ]);
  const routedIndex = createModelIdentityIndex(routed);

  it("classifies exact ids and canonical names as exact-id", () => {
    expect(modelResolutionKindOf(routedIndex.resolve("example-sol"))).toBe("exact-id");
    expect(modelResolutionKindOf(routedIndex.resolve("Example Sol"))).toBe("exact-id");
  });

  it("classifies a declared provider alias as documented-alias", () => {
    expect(modelResolutionKindOf(routedIndex.resolve("example.sol"))).toBe("documented-alias");
  });

  it("classifies a documented same-model route as documented-route", () => {
    const resolution = routedIndex.resolve("example.sol-classic");
    expect(resolution).toMatchObject({
      canonicalId: "example-sol",
      basis: "alias",
      aliasKind: "provider_route",
    });
    expect(modelResolutionKindOf(resolution)).toBe("documented-route");
  });

  it("classifies anything without declared evidence as unresolved", () => {
    expect(modelResolutionKindOf(routedIndex.resolve("example-sol-turbo"))).toBe("unresolved");
    expect(modelResolutionKindOf(undefined)).toBe("unresolved");
  });
});
