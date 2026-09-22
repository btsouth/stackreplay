import type { CatalogV1 } from "@stackreplay/catalog";
import { describe, expect, it } from "vitest";
import { createModelMapper } from "./models.js";

/**
 * Adapter-side model mapping (M4A).
 *
 * The adapter's job is to preserve the identifier a source reported and attach a
 * canonical id only when the catalog justifies it. These tests lock that the
 * adapter uses the shared identity rules, including harness scoping, and that an
 * unknown name is reported as unknown rather than rewritten into something that
 * looks plausible.
 */

const source = (url: string) => ({ url, title: "Test source", checkedAt: "2026-09-21" });

const catalog = {
  version: "test",
  providers: {},
  models: {
    "vendor-sol": {
      id: "vendor-sol",
      role: "model",
      name: "Vendor Sol",
      aliases: [
        {
          id: "vendor-sol-dotted",
          alias: "vendor.sol",
          kind: "provider_id",
          sources: [source("https://example.invalid/alias")],
          lastVerifiedAt: "2026-09-21",
          verificationStatus: "verified",
        },
        {
          id: "vendor-sol-fast",
          alias: "sol-fast",
          kind: "harness_alias",
          harness: "opencode",
          sources: [source("https://example.invalid/alias")],
          lastVerifiedAt: "2026-09-21",
          verificationStatus: "estimated",
        },
      ],
      sources: [source("https://example.invalid/model")],
      lastVerifiedAt: "2026-09-21",
      verificationStatus: "verified",
    },
  },
  plans: {},
  pricing: {},
} as unknown as CatalogV1;

const mapper = createModelMapper(catalog);

describe("adapter model mapping", () => {
  it("keeps the observed name and attaches the canonical id for a declared alias", () => {
    expect(mapper.map("vendor.sol")).toEqual({
      model: { rawName: "vendor.sol", canonicalId: "vendor-sol" },
      confidence: "mapped",
    });
  });

  it("treats an exact canonical id as exact confidence", () => {
    expect(mapper.map("vendor-sol")).toEqual({
      model: { rawName: "vendor-sol", canonicalId: "vendor-sol" },
      confidence: "exact",
    });
  });

  it("applies a harness alias only for the harness it was declared for", () => {
    expect(mapper.map("sol-fast", { harness: "opencode" })).toEqual({
      model: { rawName: "sol-fast", canonicalId: "vendor-sol" },
      confidence: "mapped",
    });
    expect(mapper.map("sol-fast", { harness: "codex" })).toEqual({
      model: { rawName: "sol-fast" },
      confidence: "unknown",
    });
  });

  it("never maps a name the catalog cannot justify", () => {
    for (const candidate of ["vendor.sol.turbo", "vendor-sol-2", "  ", "SOL-FAST"]) {
      expect(mapper.map(candidate).confidence).toBe("unknown");
      expect(mapper.map(candidate).model.canonicalId).toBeUndefined();
    }
  });

  it("carries the catalog size through for diagnostics", () => {
    expect(mapper.catalogModelCount).toBe(1);
    expect(mapper.modelById("vendor-sol")?.name).toBe("Vendor Sol");
  });
});
