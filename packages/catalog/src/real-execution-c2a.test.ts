import { describe, expect, it } from "vitest";
import { loadBundledCatalog } from "./bundled.js";
import { compileExecutionPlan } from "./execution-compiler.js";
import { createModelIdentityIndex } from "./resolve.js";

const rulesAt = "2026-09-27T14:40:00Z";
const admitted = [
  [
    "anthropic-api-haiku-4-5",
    "sha256:a8bc2dd280d562a094c088d43fb0f6431523f8af6711a87c5746875de0d7df79",
    3,
    "executable",
  ],
  [
    "openai-api-gpt-5-4-mini",
    "sha256:de410cd4d4b371529ca2f3a36823090ac06c521a4d8cf19502501a472f8557a9",
    3,
    "executable",
  ],
  [
    "z-ai-api-glm-5-3-flash",
    "sha256:7e464f5b461c81b3333832af54896e376d19447388b837ff872333aea19d8cd0",
    3,
    "executable",
  ],
  [
    "anthropic-claude-max-5x",
    "sha256:597f2e01d8f725d396c2d1473586cbb93c2bb0aa98a440eba4a59e8cd763a1df",
    6,
    "not_computable",
  ],
  [
    "kiro-pro",
    "sha256:1335eaa8eec378831d7e451bfb05785f1ea21e440d71dd297fe004a2f415609d",
    6,
    "not_computable",
  ],
] as const;

describe("C2A accepted current-market snapshot", () => {
  const catalog = loadBundledCatalog();
  it("resolves only sourced direct API spellings to existing canonical models", () => {
    const identity = createModelIdentityIndex(catalog);
    expect(identity.resolve("claude-haiku-4-5-20251001").canonicalId).toBe("claude-haiku-4-5");
    expect(identity.resolve("gpt-5.4-mini").canonicalId).toBe("gpt-5-4-mini");
    expect(identity.resolve("glm-5.3-flash").canonicalId).toBe("glm-5-3-flash");
    expect(identity.resolve("unlisted-new-model").canonicalId).toBeUndefined();
  });
  it("keeps only the five reviewed versions in this pilot and pins their hashes", () => {
    for (const [id, hash, claimCount, computation] of admitted) {
      const versionId = `${id}-current-20260927`;
      const version = catalog.plans[id]?.executionVersions?.find((entry) => entry.id === versionId);
      expect(version).toMatchObject({
        validity: {
          start: "2026-09-27T14:38:00Z",
          end: "2026-10-27T00:00:00Z",
          basis: "current-market",
        },
      });
      expect(version?.claims).toHaveLength(claimCount);
      for (const claim of version?.claims ?? []) {
        expect(claim.authority).toBe("provider");
        expect(claim.sourceUrl).toMatch(/^https:\/\//);
        expect(claim.effectiveDateBasis).toBe("catalog_activation");
        expect(claim.normalizedClaimHash).toMatch(/^sha256:[a-f0-9]{64}$/);
        expect(claim.evidencePackageHash).toMatch(/^sha256:[a-f0-9]{64}$/);
        expect(claim.observedAt).toBeTruthy();
        expect(claim.reviewedAt).toBeTruthy();
      }
      const first = compileExecutionPlan(catalog, id, versionId, [], rulesAt).artifact;
      const second = compileExecutionPlan(catalog, id, versionId, [], rulesAt).artifact;
      expect(first.artifactHash).toBe(hash);
      expect(second.artifactHash).toBe(hash);
      expect(first.computation.kind).toBe(computation);
      expect(first.knownAccess).toHaveLength(1);
    }
    expect(catalog.plans["opencode-go"]?.executionVersions ?? []).toHaveLength(0);
    expect(() =>
      compileExecutionPlan(catalog, "opencode-go", "opencode-go-current-20260927", [], rulesAt),
    ).toThrow();
  });
});
