import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadBundledCatalog } from "./bundled.js";
import { compileExecutionPlan } from "./execution-compiler.js";
import { createModelIdentityIndex } from "./resolve.js";

const rulesAt = "2026-09-27T17:39:00Z";
const metadataHash = (value: unknown) =>
  `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const admitted = [
  [
    "anthropic-api-sonnet-5",
    "sha256:99dbe83280f4741f29a805cd1a32d4cafcd62b8aedbd2881073be44011fc7c54",
    3,
    "executable",
    ["claude-sonnet-5"],
  ],
  [
    "openai-api-gpt-6-sol",
    "sha256:5cd4814fbdfc3e16208d2b1da5c827333ea490f5a72f129e067d8c54c41ec217",
    4,
    "executable",
    ["gpt-6-sol"],
  ],
  [
    "anthropic-claude-pro",
    "sha256:fc7e8ee3d5bde5a4259ee7776c85ccdbceee5294733eba562e464bbf30bcf567",
    6,
    "not_computable",
    ["claude-haiku-4-5", "claude-sonnet-5"],
  ],
  [
    "anthropic-claude-max-20x",
    "sha256:b634afb1505d657bedbf6ebda1694160e8fba37210d065c9207cdf009c0928ee",
    6,
    "not_computable",
    ["claude-haiku-4-5", "claude-sonnet-5"],
  ],
  [
    "openai-chatgpt-plus",
    "sha256:ab4173252ecf3a380ef032665aaaf4eb2edf1ee700b0a82e2db41743cc2a0394",
    6,
    "not_computable",
    ["gpt-6-luna", "gpt-6-sol"],
  ],
  [
    "openai-chatgpt-pro",
    "sha256:672b8f54f3011a1b3fe6540b30a6f91bb51acf7cecbe7713e4a458ddbfd6ea42",
    6,
    "not_computable",
    ["gpt-6-luna", "gpt-6-sol"],
  ],
  [
    "command-code-goat",
    "sha256:6d73c3c0ca8382e84c7e1e2e265d6896741a7762122b8f3cd979811129cfd262",
    7,
    "not_computable",
    ["glm-5-3-flash"],
  ],
  [
    "ollama-cloud-pro",
    "sha256:dd4fe108ae6c01cc18e98e438ba2c9d15a685a7439e764f767a3471e46af721d",
    7,
    "not_computable",
    ["glm-5-3-flash"],
  ],
  [
    "cursor-pro",
    "sha256:2ebbcb486933b015ab7f8d3debd128d05e2cbb5c5e6e421dd6fb30382c28173d",
    6,
    "not_computable",
    ["claude-sonnet-5"],
  ],
  [
    "github-copilot-pro",
    "sha256:950ef6ef9c7f98be954f2920c1ce8b8d394c18454b12879e78b1e761d14a377d",
    7,
    "not_computable",
    ["claude-sonnet-5"],
  ],
] as const;

describe("C2B manually admitted current market", () => {
  const catalog = loadBundledCatalog();

  it("resolves sourced harness spellings into the existing GLM model", () => {
    const identity = createModelIdentityIndex(catalog);
    expect(identity.resolve("glm-5.3-flash:cloud", { harness: "ollama" }).canonicalId).toBe(
      "glm-5-3-flash",
    );
    expect(identity.resolve("z-ai/glm-5.3-flash", { harness: "command-code" }).canonicalId).toBe(
      "glm-5-3-flash",
    );
  });

  it("pins evidence, exact access and repeated semantic identity", () => {
    for (const [id, hash, count, computation, models] of admitted) {
      const versionId = `${id}-current-20260927`;
      const version = catalog.plans[id]?.executionVersions?.find((entry) => entry.id === versionId);
      expect(version?.validity).toMatchObject({
        start: "2026-09-27T17:38:00Z",
        end: "2026-10-27T00:00:00Z",
        basis: "current-market",
      });
      expect(version?.claims).toHaveLength(count);
      for (const claim of version?.claims ?? []) {
        expect(claim.sourceUrl).toMatch(/^https:\/\//);
        expect(claim.effectiveDateBasis).toBe("catalog_activation");
        if (!claim.sourceUrl || !claim.excerpt) throw new Error("C2B claim needs review text");
        expect(claim.normalizedClaimHash).toBe(
          metadataHash({ id: claim.id, statement: claim.excerpt }),
        );
        expect(claim.evidencePackageHash).toBe(
          metadataHash({
            locator: claim.locator,
            observedAt: claim.observedAt,
            statement: claim.excerpt,
            url: claim.sourceUrl,
          }),
        );
        expect(claim.observedAt).toBeTruthy();
        expect(claim.reviewedAt).toBeTruthy();
      }
      const first = compileExecutionPlan(catalog, id, versionId, [], rulesAt).artifact;
      const repeat = compileExecutionPlan(catalog, id, versionId, [], rulesAt).artifact;
      expect(first.artifactHash).toBe(hash);
      expect(repeat.artifactHash).toBe(hash);
      expect(first.computation.kind).toBe(computation);
      expect(first.knownAccess).toMatchObject([{ models: [...models] }]);
      if (computation === "not_computable") {
        expect(first.purchase).toMatchObject({ kind: "subscription" });
        expect(first.computation).toMatchObject({ kind: "not_computable" });
      }
    }
  });

  it("leaves disputed OpenCode Go outside accepted execution versions", () => {
    expect(catalog.plans["opencode-go"]?.executionVersions ?? []).toHaveLength(0);
    expect(() =>
      compileExecutionPlan(catalog, "opencode-go", "opencode-go-current-20260927", [], rulesAt),
    ).toThrow();
  });
});
