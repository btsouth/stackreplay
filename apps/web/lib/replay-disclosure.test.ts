import type { ReplaySemanticsV1 } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { DISPOSITION_ROWS, replayModeNote, resetNote } from "./replay-disclosure";

/**
 * M4B disclosure copy.
 *
 * The replay mode is one fact: whether a cross-model substitution was applied.
 * These tests pin the copy so it cannot quietly grow into a claim about service,
 * coverage or completeness that the result does not support (M4B review: an
 * exact-mode note read as "every request ran against a served model" while the
 * same result listed unavailable and undecided events).
 */

const dimension = { status: "complete" as const, events: { covered: 1, total: 1 } };

function semantics(overrides: {
  mode?: "exact" | "translated";
  dispositions?: Partial<ReplaySemanticsV1["dispositions"]>;
  reset?: ReplaySemanticsV1["targetStack"]["reset"];
  resetPhase?: ReplaySemanticsV1["evidence"]["resetPhase"];
}): ReplaySemanticsV1 {
  const mode = overrides.mode ?? "exact";
  return {
    mode,
    targetStack: {
      providerId: "example",
      planId: "example-plan",
      planVersionId: "example-plan@2026-08-01",
      effectiveAt: "2026-09-15",
      catalogVersion: "example:fixture",
      overageMode: "disabled",
      reset: overrides.reset ?? { kind: "rolling" },
    },
    dispositions: {
      included: 0,
      overage: 0,
      blocked: 0,
      unavailable: 0,
      unknown: 0,
      ...overrides.dispositions,
    },
    replayability: { class: "deterministic", reasons: [] },
    evidence: {
      modelResolution: dimension,
      usageCategories: dimension,
      pricing: { status: "not_applicable", reason: "no monetary denominator" },
      rules: dimension,
      temporal: dimension,
      translationMethod:
        mode === "translated"
          ? { method: "token-preserving", policyId: "scenario-1", policyVersion: "1.0.0" }
          : { method: "none" },
      resetPhase: overrides.resetPhase ?? { status: "established" },
    },
    modelMix: {
      models: [{ modelId: "example-sol", resolutionKind: "exact-id", eventCount: 10 }],
      unresolvedEventCount: 0,
    },
    workloadScope: {
      kind: "imported_workload",
      statement: "This replay covers the imported workload only.",
    },
  } satisfies ReplaySemanticsV1;
}

/** Assertive phrasings the disclosure must never carry (the exact note it replaced). */
const OVERCLAIMS = [
  "every replayed request",
  "the target itself serves",
  "every request ran against",
  "no substitution",
  "covered in full",
  "fully replayed",
];

/**
 * Any sentence that mentions service, coverage or completeness must be a
 * conditional question the result answers elsewhere, never a claim. This catches
 * phrasing the list above would not, in any wording a future edit introduces.
 */
function assertNoServiceClaim(note: string) {
  for (const overclaim of OVERCLAIMS)
    expect(note.toLowerCase()).not.toContain(overclaim.toLowerCase());
  const serviceSentences = note
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => /serv|cover|complete|every/i.test(sentence));
  for (const sentence of serviceSentences) expect(sentence.trim().startsWith("Whether")).toBe(true);
}

describe("M4B disclosure: exact mode states substitution only", () => {
  it("claims no service when part of the demand is unavailable", () => {
    const note = replayModeNote(semantics({ dispositions: { unavailable: 12, included: 88 } }));
    expect(note).toContain("No cross-model substitution was applied.");
    assertNoServiceClaim(note);
  });

  it("claims no service when part of the demand stays undecided", () => {
    const note = replayModeNote(semantics({ dispositions: { unknown: 4, unavailable: 1 } }));
    expect(note).toContain("No cross-model substitution was applied.");
    assertNoServiceClaim(note);
    // The note points at where the answer actually lives.
    expect(note).toContain("Outcomes and Evidence");
  });

  it("states a translated replay as a conditional assumption, not a measurement", () => {
    const note = replayModeNote(semantics({ mode: "translated" }));
    expect(note).toContain("substitute model");
    expect(note).toContain("counterfactual");
    expect(note).toContain("equal token consumption");
    expect(note).not.toContain("No cross-model substitution");
  });
});

describe("M4B disclosure: reset and outcome wording", () => {
  it("shows the engine's reason when the reset behaviour is not established", () => {
    const mixed = resetNote(
      semantics({
        reset: { kind: "fixed-unknown" },
        resetPhase: {
          status: "unknown",
          reason:
            "the target's allowance windows mix rolling and calendar behaviour, so no single reset phase is established, and reset-phase sensitivity is not analysed in this milestone",
        },
      }),
    );
    expect(mixed).toContain("mix rolling and calendar");
    expect(mixed.startsWith("Not established")).toBe(true);

    const declared = resetNote(
      semantics({
        reset: { kind: "fixed-unknown" },
        resetPhase: { status: "unknown", reason: "the phase was declared not established" },
      }),
    );
    expect(declared).toContain("declared not established");

    expect(resetNote(semantics({}))).toBe("Rolling windows, anchored at first use");
    expect(resetNote(semantics({ reset: { kind: "not-applicable" } }))).toBe(
      "No numeric allowance window",
    );
    expect(
      resetNote(semantics({ reset: { kind: "fixed-known", phase: "calendar month (UTC)" } })),
    ).toBe("Fixed window, calendar month (UTC)");
  });

  it("describes unavailable as the effective model rather than the absence of a substitute", () => {
    const unavailable = DISPOSITION_ROWS.find((row) => row.key === "unavailable");
    expect(unavailable?.note).toBe("effective model is not served by the target");
    expect(unavailable?.note).not.toContain("no substitution");
    // Every disposition has a row, and the rows cover the schema's counts.
    expect(DISPOSITION_ROWS.map((row) => row.key)).toEqual([
      "included",
      "overage",
      "blocked",
      "unavailable",
      "unknown",
    ]);
  });
});
