import { describe, expect, it } from "vitest";
import { buildCatalog } from "../load.js";
import {
  type CandidateChangeV1,
  type CandidateClaimV1,
  candidateChangeV1Schema,
  candidateIdentity,
  httpsEvidenceUrlV1Schema,
  type SourceRegistryV1,
  serializeCandidate,
  sourceHealthV1Schema,
  sourceRegistryV1Schema,
} from "./contract.js";
import { validateCandidate } from "./validate.js";

const registry: SourceRegistryV1 = {
  version: 1,
  sources: [
    {
      id: "official-pricing",
      url: "https://vendor.invalid/pricing",
      providerId: "fixture-provider",
      kind: "provider_pricing",
      authority: "provider_owned",
      claimKinds: ["subscription_price", "pricing_rate", "overage_price"],
      evidenceClasses: ["published", "observed", "unsupported"],
      status: "active",
    },
    {
      id: "official-docs",
      url: "https://vendor.invalid/docs",
      providerId: "fixture-provider",
      kind: "provider_docs",
      authority: "provider_owned",
      claimKinds: [
        "numeric_limit",
        "qualitative_limit",
        "model_availability",
        "model_alias",
        "effective_date",
      ],
      evidenceClasses: ["published", "observed", "unsupported"],
      status: "active",
    },
    {
      id: "community",
      url: "https://community.invalid/post",
      kind: "community",
      authority: "community",
      claimKinds: ["numeric_limit", "model_alias", "effective_date"],
      evidenceClasses: ["observed", "unsupported"],
      status: "active",
    },
    {
      id: "archive",
      url: "https://archive.invalid/page",
      kind: "archive",
      authority: "archival",
      claimKinds: ["effective_date", "unclassified_change"],
      evidenceClasses: ["observed", "unsupported"],
      status: "active",
    },
    {
      id: "measurement",
      url: "https://lab.invalid/observation",
      kind: "measurement",
      authority: "measured",
      claimKinds: ["numeric_limit", "overage_price", "qualitative_limit", "model_alias"],
      evidenceClasses: ["observed"],
      retrievalMode: "observation",
      status: "active",
    },
  ],
};

function candidate(
  claim: CandidateClaimV1,
  overrides: Partial<CandidateChangeV1> = {},
): CandidateChangeV1 {
  const sourceId = overrides.sourceId ?? "official-docs";
  const sourceUrl =
    overrides.sourceUrl ??
    registry.sources.find((source) => source.id === sourceId)?.url ??
    "https://unknown.invalid/";
  const result: CandidateChangeV1 = {
    version: 1,
    id: "",
    sourceId,
    sourceUrl,
    observedAt: "2026-09-20T12:00:00Z",
    snapshots: {
      previous: { id: "old", sha256: "a".repeat(64) },
      current: { id: "new", sha256: "b".repeat(64) },
    },
    claim,
    evidenceClass: "published",
    evidence: { excerpt: "A short synthetic source statement." },
    extractionMethod: "manual",
    review: { status: "pending" },
    ...overrides,
  };
  result.id = candidateIdentity(result);
  return result;
}
const codes = (value: CandidateChangeV1, sources: unknown = registry) =>
  validateCandidate(value, sources).map((finding) => finding.code);

describe("M4H-B source and candidate contracts", () => {
  it("rejects duplicate IDs, invalid URLs and role mismatches", () => {
    expect(
      sourceRegistryV1Schema.safeParse({
        ...registry,
        sources: [registry.sources[0], registry.sources[0]],
      }).success,
    ).toBe(false);
    expect(
      sourceRegistryV1Schema.safeParse({
        ...registry,
        sources: [{ ...registry.sources[0], url: "http://vendor.invalid" }],
      }).success,
    ).toBe(false);
    expect(
      sourceRegistryV1Schema.safeParse({
        ...registry,
        sources: [{ ...registry.sources[4], authority: "provider_owned" }],
      }).success,
    ).toBe(false);
    expect(
      sourceRegistryV1Schema.safeParse({
        ...registry,
        sources: [{ ...registry.sources[0], claimKinds: ["numeric_limit", "numeric_limit"] }],
      }).success,
    ).toBe(false);
  });

  it("official pricing can propose a subscription price; a community source cannot publish a cap", () => {
    const price = candidate(
      {
        kind: "subscription_price",
        subject: { planId: "fixture-plan" },
        proposed: { amount: "20.00", currency: "USD", interval: "month" },
      },
      { sourceId: "official-pricing" },
    );
    expect(codes(price)).not.toContain("claim_not_allowed");
    expect(codes(price)).not.toContain("evidence_not_allowed");
    const cap = candidate(
      {
        kind: "numeric_limit",
        subject: { planId: "fixture-plan" },
        proposed: { amount: "900", type: "request_limit" },
      },
      { sourceId: "community", evidenceClass: "published" },
    );
    expect(codes(cap)).toContain("evidence_not_allowed");
    expect(codes(cap)).toContain("insufficient_authority");
    expect(codes(cap)).toContain("effective_date_unestablished");
  });

  it("measured numeric behavior remains observed and cannot establish a published rule", () => {
    const measured = candidate(
      {
        kind: "numeric_limit",
        subject: { planId: "fixture-plan" },
        proposed: { amount: "900", type: "request_limit" },
      },
      { sourceId: "measurement", evidenceClass: "observed", extractionMethod: "measurement" },
    );
    expect(candidateChangeV1Schema.parse(measured).evidenceClass).toBe("observed");
    expect(codes(measured)).toContain("observed_not_published");
    expect(codes(measured)).toContain("reset_window_missing");
    expect(codes(measured)).toContain("exceed_behavior_missing");
  });

  it("archive retrieval and publication dates do not prove an effective date", () => {
    const archived = candidate(
      {
        kind: "effective_date",
        subject: { recordKind: "plan_version", recordId: "fixture-plan@2026-08-01" },
      },
      { sourceId: "archive", evidenceClass: "observed", sourcePublishedOn: "2026-09-19" },
    );
    expect(archived.proposedEffectiveDate).toBeUndefined();
    expect(codes(archived)).toContain("effective_date_unestablished");
    const invented = candidate(archived.claim, {
      sourceId: "archive",
      evidenceClass: "observed",
      proposedEffectiveDate: "2026-09-20",
    });
    expect(codes(invented)).toContain("effective_date_unsupported");
  });

  it("keeps all four price bases distinct and never fills a missing basis", () => {
    const subscription = candidate(
      {
        kind: "subscription_price",
        subject: { planId: "fixture-plan" },
        proposed: { amount: "20" },
      },
      { sourceId: "official-pricing" },
    );
    const api = candidate(
      { kind: "pricing_rate", subject: { modelId: "fixture-small" }, proposed: { amount: "20" } },
      { sourceId: "official-pricing" },
    );
    const billing = candidate(
      {
        kind: "pricing_rate",
        subject: { modelId: "fixture-small", basis: "target_billing_rate" },
        proposed: { amount: "20", unit: "per_1m_tokens", category: "input" },
      },
      { sourceId: "official-pricing" },
    );
    const overage = candidate(
      { kind: "overage_price", subject: { planId: "fixture-plan" }, proposed: { amount: "20" } },
      { sourceId: "official-pricing" },
    );
    expect(codes(subscription)).toContain("pricing_basis_missing");
    expect(codes(api)).toContain("pricing_basis_missing");
    expect(codes(api)).toContain("pricing_unit_missing");
    expect(codes(billing)).not.toContain("pricing_basis_missing");
    expect(codes(overage)).toContain("pricing_basis_missing");
    expect(api.claim.kind === "pricing_rate" && api.claim.subject.basis).toBeUndefined();
  });

  it("does not infer availability scope or a canonical model from a source name", () => {
    const availability = candidate({
      kind: "model_availability",
      subject: { rawModelName: "Fixture Ultra Next" },
      proposed: { available: true },
    });
    expect(codes(availability)).toContain("model_identity_unresolved");
    expect(codes(availability)).toContain("model_scope_ambiguous");
    if (availability.claim.kind === "model_availability") {
      expect(availability.claim.subject.modelId).toBeUndefined();
      expect(availability.claim.subject.planId).toBeUndefined();
    }
  });

  it("reports conflicting proposed effective dates", () => {
    const dated = candidate(
      {
        kind: "effective_date",
        subject: { recordKind: "pricing", recordId: "fixture-price" },
        proposed: { date: "2026-09-19" },
      },
      { proposedEffectiveDate: "2026-09-20", effectiveDateEvidence: "Explicit provider statement" },
    );
    expect(codes(dated)).toContain("conflicting_effective_date");
  });

  it("keeps marketing names unresolved; no alias or provider route is inferred", () => {
    const alias = candidate({
      kind: "model_alias",
      subject: { rawModelName: "Fixture Ultra Next" },
      proposed: { alias: "ultra-next" },
    });
    expect(codes(alias)).toContain("model_identity_unresolved");
    if (alias.claim.kind === "model_alias") {
      expect(alias.claim.subject.modelId).toBeUndefined();
      expect(alias.claim.proposed?.aliasKind).toBeUndefined();
    }
    const measuredAlias = candidate(alias.claim, {
      sourceId: "measurement",
      evidenceClass: "observed",
    });
    expect(codes(measuredAlias)).toContain("observed_not_published");
  });

  it("preserves incomplete values and unsupported claim versions", () => {
    const limit = candidate({
      kind: "numeric_limit",
      subject: { planId: "fixture-plan" },
      proposed: { amount: "900" },
    });
    expect(codes(limit)).toContain("numeric_unit_missing");
    expect(limit.claim.kind === "numeric_limit" && limit.claim.proposed?.window).toBeUndefined();
    const changed = candidate(
      { kind: "unclassified_change", subject: { description: "Source wording changed" } },
      { sourceId: "archive", evidenceClass: "unsupported" },
    );
    expect(codes(changed)).toContain("claim_unclassified");
    expect(codes(changed)).toContain("value_unresolved");
    expect(candidateChangeV1Schema.safeParse({ ...limit, version: 2 }).success).toBe(false);
    expect(candidateChangeV1Schema.safeParse({ ...limit, unexpected: 1 }).success).toBe(false);
    expect(
      candidateChangeV1Schema.safeParse({ ...limit, evidence: { excerpt: "x".repeat(301) } })
        .success,
    ).toBe(false);
  });

  it("makes exact duplicate identity and serialization independent of review/observation", () => {
    const claim: CandidateClaimV1 = {
      kind: "subscription_price",
      subject: { planId: "fixture-plan" },
      proposed: { amount: "20", interval: "month" },
    };
    const first = candidate(claim, { sourceId: "official-pricing" });
    const reviewed = candidate(claim, {
      sourceId: "official-pricing",
      observedAt: "2026-09-22T00:00:00Z",
      review: { status: "accepted", reviewer: "reviewer", decidedAt: "2026-09-22T01:00:00Z" },
    });
    expect(first.id).toBe(reviewed.id);
    expect(codes(reviewed)).not.toContain("identity_mismatch");
    expect(
      validateCandidate(reviewed, registry, undefined, new Set([first.id])).map(
        (finding) => finding.code,
      ),
    ).toContain("duplicate_candidate");
    expect(serializeCandidate(reviewed)).toBe(serializeCandidate(reviewed));
    expect(serializeCandidate(reviewed)).toContain('"status":"accepted"');
    const changed = candidate(
      { ...claim, proposed: { amount: "21", interval: "month" } },
      { sourceId: "official-pricing" },
    );
    expect(changed.id).not.toBe(first.id);
    const equivalent = candidate(
      { ...claim, proposed: { amount: "20.00", interval: "month" } },
      { sourceId: "official-pricing" },
    );
    expect(equivalent.id).toBe(first.id);
  });
});

function syntheticAcceptedCatalog() {
  const source = {
    url: "https://fixture.invalid/facts",
    title: "Synthetic",
    checkedAt: "2026-01-01",
  };
  const provider = (id: string) => ({
    id,
    role: "provider",
    name: id,
    sources: [source],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "estimated",
  });
  const model = (id: string, providerId: string) => ({
    id,
    role: "model",
    name: id,
    providerIds: [providerId],
    sources: [source],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "estimated",
  });
  const version = (
    effectiveFrom: string,
    limitId: string,
    modelId: string,
    effectiveTo?: string,
  ) => ({
    effectiveFrom,
    ...(effectiveTo ? { effectiveTo } : {}),
    price: { currency: "USD", amount: "20.00", interval: "month" },
    limits: [
      {
        id: limitId,
        label: limitId,
        type: "request_limit",
        amount: "100",
        window: { type: "rolling", duration: "PT5H", anchor: "first_use" },
        exceed: "reject_request",
      },
    ],
    modelRules: [{ model: modelId }],
    sources: [source],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "estimated",
  });
  const plan = (id: string, providerId: string, versions: unknown[]) => ({
    id,
    role: "plan",
    name: id,
    providerId,
    versions,
  });
  const pricing = (id: string, modelId: string) => ({
    id,
    role: "pricing",
    modelId,
    currency: "USD",
    unit: "per_1m_tokens",
    basis: "api_list_price",
    rates: { input: "1", output: "2" },
    effectiveFrom: "2026-01-01",
    sources: [source],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "estimated",
  });
  const file = (name: string, data: unknown) => ({ file: name, data });
  return buildCatalog({
    providers: [
      file("providers/fixture.yaml", provider("fixture-provider")),
      file("providers/other.yaml", provider("other-provider")),
    ],
    models: [
      file("models/small.yaml", model("fixture-small", "fixture-provider")),
      file("models/other.yaml", model("other-model", "other-provider")),
    ],
    plans: [
      file(
        "plans/fixture.yaml",
        plan("fixture-plan", "fixture-provider", [
          version("2026-01-01", "fixture-limit", "fixture-small", "2026-08-31"),
          version("2026-09-01", "later-limit", "fixture-small"),
        ]),
      ),
      file(
        "plans/other.yaml",
        plan("other-plan", "other-provider", [version("2026-01-01", "other-limit", "other-model")]),
      ),
    ],
    pricing: [
      file("pricing/fixture.yaml", pricing("fixture-price", "fixture-small")),
      file("pricing/other.yaml", pricing("other-price", "other-model")),
    ],
  });
}

describe("M4H-B targeted audit closure", () => {
  it("guards every provider-published claim from observed promotion, including overage and qualitative limits", () => {
    const claims: CandidateClaimV1[] = [
      {
        kind: "numeric_limit",
        subject: { planId: "fixture-plan" },
        proposed: { amount: "900", type: "request_limit" },
      },
      {
        kind: "overage_price",
        subject: { planId: "fixture-plan" },
        proposed: { amount: "3", unit: "per_request" },
      },
      {
        kind: "qualitative_limit",
        subject: { planId: "fixture-plan" },
        proposed: { statement: "Usage varies" },
      },
    ];
    for (const claim of claims) {
      const observed = candidate(claim, {
        sourceId: "measurement",
        evidenceClass: "observed",
        extractionMethod: "measurement",
        review: { status: "accepted", reviewer: "reviewer", decidedAt: "2026-09-21T00:00:00Z" },
      });
      expect(candidateChangeV1Schema.safeParse(observed).success).toBe(true);
      expect(
        candidateChangeV1Schema.safeParse(JSON.parse(serializeCandidate(observed))).success,
      ).toBe(true);
      expect(codes(observed)).toContain("observed_not_published");
      const official = candidate(claim, {
        sourceId: claim.kind === "overage_price" ? "official-pricing" : "official-docs",
        evidenceClass: "published",
      });
      expect(codes(official)).not.toContain("observed_not_published");
      expect(codes(official)).not.toContain("claim_not_allowed");
      expect(codes(official)).not.toContain("evidence_not_allowed");
    }
  });

  it("requires positive published evidence as well as provider ownership for an effective date", () => {
    const claim: CandidateClaimV1 = {
      kind: "effective_date",
      subject: { recordKind: "plan_version", recordId: "fixture-plan@2026-09-01" },
      proposed: { date: "2026-09-01" },
    };
    const date = {
      proposedEffectiveDate: "2026-09-01",
      effectiveDateEvidence: "Provider explicitly states the date",
    } as const;
    const published = candidate(claim, {
      ...date,
      sourceId: "official-docs",
      evidenceClass: "published",
    });
    expect(codes(published)).not.toContain("effective_date_unsupported");
    const unsupported = candidate(claim, {
      ...date,
      sourceId: "official-docs",
      evidenceClass: "unsupported",
    });
    expect(codes(unsupported)).toContain("effective_date_unsupported");
    const observedOfficial = candidate(claim, {
      ...date,
      sourceId: "official-docs",
      evidenceClass: "observed",
    });
    expect(codes(observedOfficial)).toContain("effective_date_unsupported");
    const community = candidate(claim, {
      ...date,
      sourceId: "community",
      evidenceClass: "published",
    });
    expect(codes(community)).toContain("effective_date_unsupported");
    expect(codes(community)).toContain("insufficient_authority");
    const archive = candidate(claim, { ...date, sourceId: "archive", evidenceClass: "observed" });
    expect(codes(archive)).toContain("effective_date_unsupported");
  });

  it("identifies the semantic candidate artifact, excluding review state and repeated observation time", () => {
    const base = candidate(
      {
        kind: "subscription_price",
        subject: { planId: "fixture-plan" },
        proposed: { amount: "20", currency: "USD", interval: "month" },
      },
      { sourceId: "official-pricing" },
    );
    expect(candidateIdentity(base)).toBe(
      candidateIdentity(JSON.parse(serializeCandidate(base)) as CandidateChangeV1),
    );
    expect(candidateIdentity({ ...base, evidenceClass: "observed" })).not.toBe(base.id);
    expect(
      candidateIdentity({
        ...base,
        proposedEffectiveDate: "2026-09-20",
        effectiveDateEvidence: "Explicit date",
      }),
    ).not.toBe(base.id);
    expect(
      candidateIdentity({ ...base, effectiveDateEvidence: "Different date statement" }),
    ).not.toBe(base.id);
    expect(
      candidateIdentity({ ...base, sourceUrl: "https://vendor.invalid/new-pricing" }),
    ).not.toBe(base.id);
    expect(candidateIdentity({ ...base, evidence: { excerpt: "Different excerpt" } })).not.toBe(
      base.id,
    );
    expect(candidateIdentity({ ...base, version: 2 as 1 })).not.toBe(base.id);
    const reviewed: CandidateChangeV1 = {
      ...base,
      review: { status: "rejected", reviewer: "reviewer", decidedAt: "2026-09-22T00:00:00Z" },
    };
    const observedAgain: CandidateChangeV1 = { ...base, observedAt: "2026-09-23T00:00:00Z" };
    expect(candidateIdentity(reviewed)).toBe(base.id);
    expect(candidateIdentity(observedAgain)).toBe(base.id);
  });

  it("keeps an unknown calendar timezone absent through parse and serialization", () => {
    const makeWindow = (timezone?: string) =>
      candidate({
        kind: "numeric_limit",
        subject: { planId: "fixture-plan" },
        proposed: {
          amount: "10",
          type: "request_limit",
          window: { type: "calendar", unit: "day", ...(timezone ? { timezone } : {}) },
          exceed: "reject_request",
        },
      });
    const unknown = candidateChangeV1Schema.parse(makeWindow());
    const known = candidateChangeV1Schema.parse(makeWindow("America/Louisville"));
    if (unknown.claim.kind !== "numeric_limit" || known.claim.kind !== "numeric_limit")
      throw new Error("wrong claim kind");
    expect(unknown.claim.proposed?.window).toEqual({ type: "calendar", unit: "day" });
    expect(known.claim.proposed?.window).toEqual({
      type: "calendar",
      unit: "day",
      timezone: "America/Louisville",
    });
    const roundTrip = candidateChangeV1Schema.parse(JSON.parse(serializeCandidate(unknown)));
    expect(JSON.stringify(roundTrip)).not.toContain('"timezone":"UTC"');
  });

  it("reports accepted reference and provider relationship mismatches without writes", () => {
    const catalog = syntheticAcceptedCatalog();
    const before = JSON.stringify(catalog);
    const findings = (claim: CandidateClaimV1, sourceId = "official-docs") =>
      validateCandidate(candidate(claim, { sourceId }), registry, catalog).map(
        (finding) => finding.code,
      );
    expect(
      findings({
        kind: "numeric_limit",
        subject: {
          planId: "fixture-plan",
          planVersionId: "other-plan@2026-01-01",
          limitId: "other-limit",
        },
        proposed: { amount: "5" },
      }),
    ).toContain("plan_version_mismatch");
    expect(
      findings({
        kind: "numeric_limit",
        subject: { planId: "fixture-plan", limitId: "other-limit" },
        proposed: { amount: "5" },
      }),
    ).toContain("constraint_plan_mismatch");
    expect(
      findings({
        kind: "numeric_limit",
        subject: {
          planId: "fixture-plan",
          planVersionId: "fixture-plan@2026-01-01",
          limitId: "later-limit",
        },
        proposed: { amount: "5" },
      }),
    ).toContain("constraint_version_mismatch");
    expect(
      findings(
        {
          kind: "pricing_rate",
          subject: { modelId: "fixture-small", pricingId: "other-price", basis: "api_list_price" },
          proposed: { amount: "5" },
        },
        "official-pricing",
      ),
    ).toContain("pricing_model_mismatch");
    expect(
      findings(
        {
          kind: "subscription_price",
          subject: { planId: "other-plan" },
          proposed: { amount: "5" },
        },
        "official-pricing",
      ),
    ).toContain("provider_mismatch");
    expect(
      findings(
        {
          kind: "pricing_rate",
          subject: { modelId: "other-model", pricingId: "other-price", basis: "api_list_price" },
          proposed: { amount: "5" },
        },
        "official-pricing",
      ),
    ).toContain("source_model_provider_mismatch");
    expect(
      findings({
        kind: "model_availability",
        subject: { modelId: "other-model", providerId: "fixture-provider", planId: "other-plan" },
        proposed: { available: true },
      }),
    ).toContain("provider_plan_mismatch");
    expect(
      findings({
        kind: "model_availability",
        subject: { modelId: "other-model", providerId: "fixture-provider" },
        proposed: { available: true },
      }),
    ).toContain("model_offering_differs_from_accepted");
    expect(JSON.stringify(catalog)).toBe(before);
  });

  it("preserves proposed empty objects and reports each missing semantic component", () => {
    const examples: Array<[CandidateClaimV1, string, string[]]> = [
      [
        { kind: "subscription_price", subject: { planId: "fixture-plan" }, proposed: {} },
        "official-pricing",
        ["pricing_amount_missing", "pricing_currency_missing", "pricing_basis_missing"],
      ],
      [
        { kind: "pricing_rate", subject: { modelId: "fixture-small" }, proposed: {} },
        "official-pricing",
        [
          "pricing_amount_missing",
          "pricing_currency_missing",
          "pricing_basis_missing",
          "pricing_unit_missing",
        ],
      ],
      [
        { kind: "numeric_limit", subject: { planId: "fixture-plan" }, proposed: {} },
        "official-docs",
        ["numeric_amount_missing", "numeric_unit_missing", "reset_window_missing"],
      ],
      [
        { kind: "effective_date", subject: { recordKind: "plan_version" }, proposed: {} },
        "official-docs",
        [
          "effective_date_value_missing",
          "effective_date_evidence_missing",
          "effective_date_unestablished",
        ],
      ],
    ];
    for (const [claim, sourceId, expected] of examples) {
      const artifact = candidate(claim, { sourceId });
      expect(candidateChangeV1Schema.safeParse(artifact).success).toBe(true);
      const found = codes(artifact);
      for (const code of expected) expect(found).toContain(code);
      expect(JSON.stringify(artifact.claim.proposed)).toBe("{}");
    }
  });

  it("versions source health and rejects unsupported future versions", () => {
    const health = { version: 1, sourceId: "official-docs", state: "unknown" };
    expect(sourceHealthV1Schema.safeParse(health).success).toBe(true);
    expect(sourceHealthV1Schema.safeParse({ ...health, version: 2 }).success).toBe(false);
    expect(
      sourceHealthV1Schema.safeParse({ sourceId: "official-docs", state: "unknown" }).success,
    ).toBe(false);
  });

  it("validates HTTPS URLs without credentials or raw whitespace/control characters", () => {
    expect(
      httpsEvidenceUrlV1Schema.safeParse("https://example.invalid:8443/path?q=hello%20world#part")
        .success,
    ).toBe(true);
    expect(httpsEvidenceUrlV1Schema.safeParse("https://xn--bcher-kva.invalid/path").success).toBe(
      true,
    );
    for (const url of [
      "http://example.invalid/path",
      "https://user:pass@example.invalid/path",
      "https://example.invalid/a b",
      "https://example.invalid/a\t",
      "https://example.invalid/a\n",
      "https://example.invalid\\other",
      "javascript:alert(1)",
      "file:///tmp/x",
    ]) {
      expect(httpsEvidenceUrlV1Schema.safeParse(url).success).toBe(false);
    }
    const artifact = candidate(
      { kind: "numeric_limit", subject: { planId: "fixture-plan" } },
      { evidence: { reference: "https://user:pass@example.invalid/fact" } },
    );
    expect(candidateChangeV1Schema.safeParse(artifact).success).toBe(false);
  });
});
