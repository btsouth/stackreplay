import { describe, expect, it } from "vitest";
import {
  evidenceDimensionV1Schema,
  modelTranslationPolicyV1Schema,
  replayEvidenceV1Schema,
  replaySemanticsV1Schema,
  resetAssumptionV1Schema,
  workloadScopeV1Schema,
} from "./replay-semantics.js";

/**
 * M4B semantics contracts.
 *
 * The contract under test: identity, translation, mode, dispositions,
 * replayability and evidence are separate serialized concepts, and a result
 * cannot be re-read as something it is not. These are schema-level guards that
 * sit behind the engine's own behavior tests.
 */

const policy = {
  id: "fixture-translation",
  version: "1.0.0",
  name: "Fixture synthetic translation",
  provenance: "builtin-scenario" as const,
  transform: "token-preserving" as const,
  rules: [{ sourceModelId: "example-sol", targetModelId: "example-terra" }],
};

const completeDimension = {
  status: "complete" as const,
  events: { covered: 3, total: 3 },
  tokens: { covered: 100, total: 100 },
};

function semantics(overrides: Record<string, unknown> = {}) {
  return {
    mode: "exact" as const,
    targetStack: {
      providerId: "example-provider",
      planId: "example-plan",
      planVersionId: "example-plan@2026-01-01",
      effectiveAt: "2026-09-15",
      catalogVersion: "fixture:1",
      overageMode: "disabled" as const,
      reset: { kind: "rolling" as const },
    },
    dispositions: { included: 3, overage: 0, blocked: 0, unavailable: 0, unknown: 0 },
    replayability: { class: "deterministic" as const, reasons: [] },
    evidence: {
      modelResolution: completeDimension,
      usageCategories: completeDimension,
      pricing: { status: "not_applicable" as const, reason: "no monetary denominator" },
      rules: completeDimension,
      temporal: completeDimension,
      translationMethod: { method: "none" as const },
      resetPhase: { status: "established" as const },
    },
    modelMix: {
      models: [
        {
          modelId: "example-sol",
          resolutionKind: "exact-id" as const,
          eventCount: 3,
          tokenCount: 100,
        },
      ],
      unresolvedEventCount: 0,
    },
    workloadScope: {
      kind: "imported_workload" as const,
      statement: "This replay covers the imported coding workload only.",
    },
    ...overrides,
  };
}

function translated() {
  return semantics({
    mode: "translated" as const,
    targetStack: {
      providerId: "example-provider",
      planId: "example-plan",
      planVersionId: "example-plan@2026-01-01",
      effectiveAt: "2026-09-15",
      catalogVersion: "fixture:1",
      overageMode: "disabled" as const,
      reset: { kind: "rolling" as const },
      modelTranslation: policy,
    },
    translation: {
      applied: [{ sourceModelId: "example-sol", targetModelId: "example-terra", eventCount: 2 }],
      substitutedEvents: 2,
    },
    evidence: {
      modelResolution: completeDimension,
      usageCategories: completeDimension,
      pricing: { status: "not_applicable" as const, reason: "no monetary denominator" },
      rules: completeDimension,
      temporal: completeDimension,
      translationMethod: {
        method: "token-preserving" as const,
        policyId: policy.id,
        policyVersion: policy.version,
      },
      resetPhase: { status: "established" as const },
    },
  });
}

describe("M4B translation policy", () => {
  it("accepts an explicit token-preserving scenario policy", () => {
    expect(modelTranslationPolicyV1Schema.parse(policy)).toEqual(policy);
  });

  it("refuses a rule that substitutes a model for itself", () => {
    const result = modelTranslationPolicyV1Schema.safeParse({
      ...policy,
      rules: [{ sourceModelId: "example-sol", targetModelId: "example-sol" }],
    });
    expect(result.success).toBe(false);
  });

  it("refuses two rules for one source model, so a substitution is never ambiguous", () => {
    const result = modelTranslationPolicyV1Schema.safeParse({
      ...policy,
      rules: [
        { sourceModelId: "example-sol", targetModelId: "example-terra" },
        { sourceModelId: "example-sol", targetModelId: "example-luna" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("requires a declared provenance for the assumption", () => {
    const { provenance: _provenance, ...withoutProvenance } = policy;
    expect(modelTranslationPolicyV1Schema.safeParse(withoutProvenance).success).toBe(false);
  });
});

describe("M4B replay mode cannot be misread", () => {
  it("accepts a consistent exact replay", () => {
    expect(replaySemanticsV1Schema.safeParse(semantics()).success).toBe(true);
  });

  it("accepts a consistent translated replay", () => {
    expect(replaySemanticsV1Schema.safeParse(translated()).success).toBe(true);
  });

  it("refuses translated mode without an applied substitution", () => {
    expect(
      replaySemanticsV1Schema.safeParse(
        semantics({
          mode: "translated",
          targetStack: { ...translated().targetStack },
          translation: { applied: [], substitutedEvents: 0 },
        }),
      ).success,
    ).toBe(false);
  });

  it("refuses an exact replay that carries substitutions", () => {
    const value = translated();
    expect(replaySemanticsV1Schema.safeParse({ ...value, mode: "exact" }).success).toBe(false);
  });

  it("refuses a stack policy without an applied translation, and the reverse", () => {
    const withPolicy = translated() as Record<string, unknown>;
    const { translation: _translation, ...policyOnly } = withPolicy;
    expect(replaySemanticsV1Schema.safeParse(policyOnly).success).toBe(false);

    const exact = semantics();
    expect(
      replaySemanticsV1Schema.safeParse({
        ...exact,
        translation: {
          applied: [
            { sourceModelId: "example-sol", targetModelId: "example-terra", eventCount: 1 },
          ],
          substitutedEvents: 1,
        },
      }).success,
    ).toBe(false);
  });

  it("refuses a translated replay that states no token transform", () => {
    const value = translated();
    expect(
      replaySemanticsV1Schema.safeParse({
        ...value,
        evidence: { ...value.evidence, translationMethod: { method: "none" } },
      }).success,
    ).toBe(false);
  });

  it("refuses an exact replay that claims a transform", () => {
    const value = semantics();
    expect(
      replaySemanticsV1Schema.safeParse({
        ...value,
        evidence: {
          ...value.evidence,
          translationMethod: { method: "token-preserving", policyId: "p", policyVersion: "1" },
        },
      }).success,
    ).toBe(false);
  });
});

describe("M4B evidence dimensions carry their own denominators", () => {
  it("refuses a complete dimension with an uncovered quantity", () => {
    expect(
      evidenceDimensionV1Schema.safeParse({
        status: "complete",
        events: { covered: 2, total: 3 },
      }).success,
    ).toBe(false);
  });

  it("refuses a partial dimension whose fractions are full without a reason", () => {
    expect(
      evidenceDimensionV1Schema.safeParse({
        status: "partial",
        events: { covered: 3, total: 3 },
      }).success,
    ).toBe(false);
    // With a reason, a partial dimension may explain what its fractions exclude.
    expect(
      evidenceDimensionV1Schema.safeParse({
        status: "partial",
        events: { covered: 3, total: 3 },
        reason: "3 event(s) name models the catalog does not establish",
      }).success,
    ).toBe(true);
  });

  it("refuses a covered quantity above its denominator", () => {
    expect(
      evidenceDimensionV1Schema.safeParse({
        status: "partial",
        events: { covered: 4, total: 3 },
        reason: "impossible",
      }).success,
    ).toBe(false);
  });

  it("requires a reason when a dimension does not apply, and no fractions", () => {
    expect(evidenceDimensionV1Schema.safeParse({ status: "not_applicable" }).success).toBe(false);
    expect(
      evidenceDimensionV1Schema.safeParse({
        status: "not_applicable",
        events: { covered: 0, total: 3 },
        reason: "no monetary denominator",
      }).success,
    ).toBe(false);
  });

  it("keeps the evidence model free of any universal confidence or score field", () => {
    const keys = Object.keys(replayEvidenceV1Schema.shape).sort();
    expect(keys).toEqual([
      "modelResolution",
      "pricing",
      "resetPhase",
      "rules",
      "temporal",
      "translationMethod",
      "usageCategories",
    ]);
    for (const key of keys) expect(key.toLowerCase()).not.toContain("confidence");
  });
});

describe("M4B reset and scope stay explicit", () => {
  it("accepts the four reset shapes and refuses a fixed phase without a phase", () => {
    expect(resetAssumptionV1Schema.safeParse({ kind: "rolling" }).success).toBe(true);
    expect(resetAssumptionV1Schema.safeParse({ kind: "fixed-unknown" }).success).toBe(true);
    expect(resetAssumptionV1Schema.safeParse({ kind: "not-applicable" }).success).toBe(true);
    expect(
      resetAssumptionV1Schema.safeParse({ kind: "fixed-known", phase: "day (UTC)" }).success,
    ).toBe(true);
    expect(resetAssumptionV1Schema.safeParse({ kind: "fixed-known" }).success).toBe(false);
  });

  it("requires workload scope to state what the replay covers", () => {
    expect(
      workloadScopeV1Schema.safeParse({ kind: "imported_workload", statement: "only the import" })
        .success,
    ).toBe(true);
    expect(workloadScopeV1Schema.safeParse({ kind: "imported_workload" }).success).toBe(false);
  });

  it("refuses a model mix entry that counts nothing", () => {
    const value = semantics();
    expect(
      replaySemanticsV1Schema.safeParse({
        ...value,
        modelMix: {
          models: [
            { modelId: "example-sol", resolutionKind: "exact-id", eventCount: 0, tokenCount: 0 },
          ],
          unresolvedEventCount: 0,
        },
      }).success,
    ).toBe(false);
  });

  it("refuses a replayability class no evidence could justify", () => {
    const value = semantics();
    // Removing a state the engine can never legitimately emit is the point: a
    // class that only a future milestone with real meter evidence may claim must
    // not be declarable today, or a hand-written result could wear it for free.
    expect(
      replaySemanticsV1Schema.safeParse({
        ...value,
        replayability: { class: "calibrated", reasons: [] },
      }).success,
    ).toBe(false);
    expect(
      replaySemanticsV1Schema.safeParse({
        ...value,
        replayability: { class: "almost-deterministic", reasons: [] },
      }).success,
    ).toBe(false);
    expect(
      replaySemanticsV1Schema.safeParse({
        ...value,
        replayability: { class: "deterministic", reasons: [] },
      }).success,
    ).toBe(true);
  });
});
