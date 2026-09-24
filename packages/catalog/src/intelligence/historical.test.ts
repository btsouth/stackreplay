import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { stableStringify } from "../canonical.js";
import {
  defaultCatalogDataDirectory,
  loadCatalogFromDirectory,
  loadDefaultCatalog,
} from "../load.js";
import {
  type CandidateChangeV1,
  candidateChangeV1Schema,
  candidateIdentity,
  serializeCandidate,
  sourceRegistryV1Schema,
} from "./contract.js";
import { historicalManifestV1Schema } from "./historical.js";
import { validateCandidate } from "./validate.js";

const root = fileURLToPath(
  new URL("../../../../data/catalog-intelligence/m4h-c1/", import.meta.url),
);
const read = (path: string) => readFileSync(join(root, path), "utf8");
const registry = sourceRegistryV1Schema.parse(JSON.parse(read("sources.json")));
const manifest = historicalManifestV1Schema.parse(JSON.parse(read("manifest.json")));
const catalog = loadDefaultCatalog();
// M4H-C1 stays bound to its accepted snapshot. A later public catalog refresh
// correctly reports version drift; it does not change the historical findings.
const historicalFindings = (artifact: CandidateChangeV1) =>
  validateCandidate(artifact, registry, catalog).filter(
    (finding) => finding.code !== "accepted_version_changed",
  );
const candidate = (slug: string): CandidateChangeV1 =>
  candidateChangeV1Schema.parse(JSON.parse(read(`candidates/${slug}.json`)));

describe("M4H-C1 historical research artifacts", () => {
  it("serializes every candidate canonically and records exact deterministic findings", () => {
    expect(manifest.entries).toHaveLength(11);
    expect(manifest.acceptedCatalogVersion).toBe(
      "sha256:73684c134d2c88af79929ef674b81d10c11f209435a3a6c071743d4aa4f71f34",
    );
    expect(manifest.entries.map((entry) => entry.slug)).toEqual(
      [...manifest.entries.map((entry) => entry.slug)].sort(),
    );
    expect(new Set(manifest.entries.map((entry) => entry.candidateId)).size).toBe(11);
    for (const entry of manifest.entries) {
      const artifact = candidate(entry.slug);
      expect(entry.candidateFile).toBe(`candidates/${entry.slug}.json`);
      expect(read(entry.candidateFile)).toBe(serializeCandidate(artifact));
      expect(artifact.id).toBe(candidateIdentity(artifact));
      expect(entry.candidateId).toBe(artifact.id);
      expect(entry.sourceId).toBe(artifact.sourceId);
      expect(entry.evidenceClass).toBe(artifact.evidenceClass);
      expect(
        historicalFindings(artifact).map(({ severity, code }) => ({
          severity,
          code,
        })),
      ).toEqual(entry.findings);
      expect(
        entry.findings.some(
          (finding) =>
            finding.severity === "error" && entry.recommendation === "READY_FOR_CATALOG_REVIEW",
        ),
      ).toBe(false);
    }
    expect(stableStringify(JSON.parse(read("manifest.json")))).toBe(stableStringify(manifest));
    expect(read("manifest.json").endsWith("\n")).toBe(true);
  });

  it("keeps repository traceability and source authority explicit", () => {
    expect(registry.sources).toHaveLength(7);
    expect(manifest.limitwatch.commit).toBe("e135b9492b0a09cda9ca49496206f09d90cb8fde");
    for (const entry of manifest.entries) {
      expect(entry.limitwatch.path).toMatch(/^data\//);
      expect(entry.limitwatch.originalSourceUrl).toMatch(/^https?:\/\//);
      expect(registry.sources.some((source) => source.id === entry.sourceId)).toBe(true);
    }
    const withoutTrace = structuredClone(manifest) as Record<string, unknown>;
    const entries = withoutTrace.entries as Array<Record<string, unknown>>;
    delete entries[0]?.limitwatch;
    expect(historicalManifestV1Schema.safeParse(withoutTrace).success).toBe(false);
    for (const source of registry.sources.filter((source) => source.kind === "archive")) {
      expect(source.authority).toBe("archival");
      expect(source.evidenceClasses).toEqual(["observed"]);
    }
  });

  it("preserves known announcement dates and unknown historical start dates", () => {
    const dated = new Set([
      "google-ai-pro-launch-price",
      "google-ai-ultra-original-price",
      "openai-pro-100-introduction-price",
      "openai-pro-100-standard-allowance",
    ]);
    expect(dated.size).toBe(4);
    expect(
      manifest.entries.filter((entry) => candidate(entry.slug).proposedEffectiveDate !== undefined),
    ).toHaveLength(4);
    for (const entry of manifest.entries) {
      const artifact = candidate(entry.slug);
      if (dated.has(entry.slug)) {
        expect(artifact.proposedEffectiveDate).toBeDefined();
        expect(artifact.effectiveDateEvidence).toBeDefined();
      } else {
        expect(artifact.proposedEffectiveDate).toBeUndefined();
        expect(entry.findings.map((finding) => finding.code)).toContain(
          "effective_date_unestablished",
        );
      }
      expect(artifact.observedAt).toBe("2026-09-23T18:34:38Z");
    }
  });

  it("binds the original Ultra excerpt to its dedicated official announcement", () => {
    const ultra = candidate("google-ai-ultra-original-price");
    const entry = manifest.entries.find((item) => item.slug === "google-ai-ultra-original-price");
    const source = registry.sources.find((item) => item.id === "google-ai-ultra-launch-2025");
    const url = "https://blog.google/products-and-platforms/products/google-one/google-ai-ultra/";
    expect(source).toMatchObject({
      url,
      providerId: "google",
      kind: "provider_changelog",
      authority: "provider_owned",
      claimKinds: ["subscription_price"],
      evidenceClasses: ["published"],
    });
    expect(ultra.sourceId).toBe(source?.id);
    expect(entry?.sourceId).toBe(source?.id);
    expect(ultra.sourceUrl).toBe(url);
    expect(ultra.evidence).toEqual({
      excerpt: "Google AI Ultra is available today in the U.S. for $249.99/month",
      reference: url,
    });
    expect(ultra.claim.subject).toEqual({ planId: "google-ai-ultra-original" });
    expect(entry?.collision).toBe("UNMAPPABLE");
    expect(entry?.recommendation).toBe("NEEDS_MORE_EVIDENCE");
    expect(validateCandidate(ultra, registry, catalog).map((finding) => finding.code)).toEqual([
      "unknown_plan",
    ]);
  });

  it("keeps the Google AI Pro launch price within the official source's stated scope", () => {
    const pro = candidate("google-ai-pro-launch-price");
    const source = registry.sources.find((item) => item.id === "google-ai-launch-2025");
    expect(pro.sourceId).toBe(source?.id);
    expect(pro.sourceUrl).toBe(source?.url);
    expect(pro.evidence.reference).toBe(source?.url);
    expect(pro.claim).toEqual({
      kind: "subscription_price",
      subject: { planId: "google-ai-pro" },
      proposed: { amount: "19.99", currency: "USD", interval: "month" },
    });
    expect(pro.proposedEffectiveDate).toBe("2025-05-20");
    expect(pro.effectiveDateEvidence).toContain("starting today");
    expect(historicalFindings(pro)).toEqual([]);
  });

  it("traces OpenAI price to the plan entry and Codex allowance to limit zero", () => {
    const price = manifest.entries.find(
      (entry) => entry.slug === "openai-pro-100-introduction-price",
    );
    const allowance = manifest.entries.find(
      (entry) => entry.slug === "openai-pro-100-standard-allowance",
    );
    expect(price?.limitwatch).toMatchObject({
      path: "data/snapshots/2026-07-01.json",
      entryIndex: 2,
    });
    expect(price?.limitwatch.limitIndex).toBeUndefined();
    expect(allowance?.limitwatch).toMatchObject({
      path: "data/snapshots/2026-07-01.json",
      entryIndex: 2,
      limitIndex: 0,
    });
  });

  it("keeps human review metadata separate from deterministic findings and candidate status", () => {
    const pro = candidate("google-ai-pro-launch-price");
    const entry = manifest.entries.find((item) => item.slug === "google-ai-pro-launch-price");
    expect(pro.review.status).toBe("needs_review");
    expect(entry?.recommendation).toBe("READY_FOR_CATALOG_REVIEW");
    expect(historicalFindings(pro)).toEqual([]);
    const changedReview = structuredClone(manifest);
    const changedEntry = changedReview.entries.find((item) => item.slug === entry?.slug);
    if (!changedEntry) throw new Error("Missing Google AI Pro manifest entry");
    changedEntry.recommendation = "NEEDS_MORE_EVIDENCE";
    changedEntry.collision = "NEW_HISTORICAL_INFORMATION";
    expect(historicalManifestV1Schema.parse(changedReview)).toBeDefined();
    expect(candidate("google-ai-pro-launch-price").review.status).toBe("needs_review");
    expect(historicalFindings(pro)).toEqual([]);
  });

  it("keeps relative claims qualitative and archive claims observed", () => {
    for (const slug of [
      "anthropic-max-5x-relative-usage",
      "anthropic-max-20x-relative-usage",
      "anthropic-pro-weekly-account-reset",
      "openai-pro-100-standard-allowance",
    ]) {
      const artifact = candidate(slug);
      expect(artifact.claim.kind).toBe("qualitative_limit");
    }
    for (const slug of ["google-ai-plus-archive-price", "openai-plus-gpt53-archive-allowance"]) {
      const artifact = candidate(slug);
      expect(artifact.evidenceClass).toBe("observed");
      expect(
        validateCandidate(artifact, registry, catalog).map((finding) => finding.code),
      ).toContain("observed_not_published");
      const promoted = { ...artifact, evidenceClass: "published" as const };
      promoted.id = candidateIdentity(promoted);
      expect(
        validateCandidate(promoted, registry, catalog).map((finding) => finding.code),
      ).toContain("insufficient_authority");
    }
    const price = candidate("openai-pro-100-introduction-price");
    expect(price.claim).toMatchObject({
      kind: "subscription_price",
      proposed: { amount: "100", currency: "USD", interval: "month" },
    });
    expect(historicalFindings(price)).toEqual([]);
  });

  it("cannot promote the excluded Anthropic 900-message estimate into a published constraint", () => {
    const estimateUrl =
      "https://web.archive.org/web/20250910111758/https://support.anthropic.com/en/articles/11014257-about-claude-s-max-plan-usage";
    const estimateRegistry = sourceRegistryV1Schema.parse({
      version: 1,
      sources: [
        ...registry.sources,
        {
          id: "anthropic-retired-estimate-archive",
          url: estimateUrl,
          providerId: "anthropic",
          kind: "archive",
          authority: "archival",
          claimKinds: ["numeric_limit"],
          evidenceClasses: ["observed"],
          status: "active",
        },
      ],
    });
    const estimate: CandidateChangeV1 = {
      ...candidate("anthropic-max-20x-relative-usage"),
      id: "",
      sourceId: "anthropic-retired-estimate-archive",
      sourceUrl: estimateUrl,
      claim: {
        kind: "numeric_limit",
        subject: { planId: "anthropic-claude-max-20x" },
        proposed: { amount: "900", type: "request_limit" },
      },
      evidenceClass: "observed",
      evidence: { excerpt: "at least 900 messages every five hours", reference: estimateUrl },
    };
    estimate.id = candidateIdentity(estimate);
    expect(
      validateCandidate(estimate, estimateRegistry, catalog).map((finding) => finding.code),
    ).toContain("observed_not_published");
    const falselyPublished = { ...estimate, evidenceClass: "published" as const };
    falselyPublished.id = candidateIdentity(falselyPublished);
    expect(
      validateCandidate(falselyPublished, estimateRegistry, catalog).map((finding) => finding.code),
    ).toEqual(expect.arrayContaining(["evidence_not_allowed", "insufficient_authority"]));
  });

  it("rejects a candidate file if placed in an accepted YAML loader directory", () => {
    const scratch = mkdtempSync(join(tmpdir(), "stackreplay-m4hc1-loader-"));
    try {
      cpSync(defaultCatalogDataDirectory(), scratch, { recursive: true });
      writeFileSync(
        join(scratch, "plans", "m4hc1-candidate.yaml"),
        read("candidates/google-ai-ultra-original-price.json"),
      );
      expect(() => loadCatalogFromDirectory(scratch)).toThrow();
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
