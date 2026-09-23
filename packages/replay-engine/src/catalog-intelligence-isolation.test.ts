import { catalogV1Schema, stableStringify } from "@stackreplay/catalog";
import {
  type CandidateChangeV1,
  candidateChangeV1Schema,
  candidateIdentity,
  type SourceRegistryV1,
  validateCandidate,
} from "@stackreplay/catalog/intelligence";
import { loadDefaultCatalog } from "@stackreplay/catalog/load";
import { describe, expect, it } from "vitest";
import historicalPrice from "../../../data/catalog-intelligence/m4h-c1/candidates/google-ai-ultra-original-price.json" with {
  type: "json",
};
import historicalSources from "../../../data/catalog-intelligence/m4h-c1/sources.json" with {
  type: "json",
};
import { replay } from "./engine.js";
import {
  FIXTURE_PLAN_VERSION_ID,
  fixtureContext,
  makeFixtureCatalog,
  rollingLimit,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";

const registry: SourceRegistryV1 = {
  version: 1,
  sources: [
    {
      id: "synthetic-pricing",
      url: "https://vendor.invalid/pricing",
      providerId: "fixture-provider",
      kind: "provider_pricing",
      authority: "provider_owned",
      claimKinds: ["subscription_price"],
      evidenceClasses: ["published"],
      status: "active",
    },
  ],
};

function proposedPrice(): CandidateChangeV1 {
  const candidate: CandidateChangeV1 = {
    version: 1,
    id: "",
    sourceId: "synthetic-pricing",
    sourceUrl: "https://vendor.invalid/pricing",
    observedAt: "2026-09-20T12:00:00Z",
    claim: {
      kind: "subscription_price",
      subject: { planId: "fixture-plan", planVersionId: FIXTURE_PLAN_VERSION_ID },
      proposed: { amount: "999999.00", currency: "USD", interval: "month" },
    },
    proposedEffectiveDate: "2026-09-20",
    effectiveDateEvidence: "Provider states effective date",
    evidenceClass: "published",
    evidence: { excerpt: "Synthetic monthly price changed" },
    extractionMethod: "llm_assisted",
    review: {
      status: "accepted",
      reviewer: "synthetic-reviewer",
      decidedAt: "2026-09-21T00:00:00Z",
    },
  };
  candidate.id = candidateIdentity(candidate);
  return candidate;
}

describe("candidate intelligence is isolated from accepted Replay truth", () => {
  it("validation and accepted review cannot alter catalog output or Replay", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const beforeCatalog = stableStringify(catalog);
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
    ];
    const run = () =>
      replay({
        events,
        target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
        catalog,
        context: fixtureContext,
      });
    const beforeResult = stableStringify(run());
    const candidate = proposedPrice();
    expect(validateCandidate(candidate, registry, catalog)).toEqual([]);
    expect(candidate.review.status).toBe("accepted");
    expect(catalogV1Schema.safeParse({ ...catalog, candidates: [candidate] }).success).toBe(false);
    expect(stableStringify(catalog)).toBe(beforeCatalog);
    expect(catalog.planVersions[FIXTURE_PLAN_VERSION_ID]?.price.amount).toBe("20.00");
    expect(stableStringify(run())).toBe(beforeResult);
  });

  it("a real historical $249.99 candidate cannot change the $199.99 accepted plan or Replay", () => {
    const catalog = loadDefaultCatalog();
    const registry = historicalSources;
    const candidate = candidateChangeV1Schema.parse(historicalPrice);
    const planVersionId = "google-ai-ultra-20x@2026-09-21";
    const events = [
      makeEvent({
        id: "historical-isolation-event",
        occurredAt: "2026-09-21T12:00:00Z",
        model: { rawName: "gemini-3-1-pro", canonicalId: "gemini-3-1-pro" },
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
    ];
    const run = () =>
      replay({
        events,
        target: { type: "subscription", planVersionId },
        catalog,
        context: { rulesAsOf: "2026-09-21" },
      });
    const before = stableStringify(run());
    const acceptedVersion = catalog.catalogVersion;
    const findings = validateCandidate(candidate, registry, catalog);
    expect(candidate.claim).toMatchObject({
      kind: "subscription_price",
      proposed: { amount: "249.99", currency: "USD", interval: "month" },
    });
    expect(findings.map((finding) => finding.code)).toContain("unknown_plan");
    expect(catalog.planVersions[planVersionId]?.price.amount).toBe("199.99");
    expect(loadDefaultCatalog().catalogVersion).toBe(acceptedVersion);
    expect(stableStringify(run())).toBe(before);
  });
});
