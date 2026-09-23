import { describe, expect, it } from "vitest";
import {
  effectsAt,
  PHASE_CAPTIONS,
  phaseAt,
  phaseAtLeast,
  phaseIndex,
  sequenceFor,
  totalDurationMs,
} from "./choreography";

/**
 * The choreography is a claim about what the engine did, in order, so these
 * tests pin the order and the two properties that would mislead a viewer if
 * they broke: an exact replay never shows a substitution, and the run always
 * terminates in the settled state whatever its length.
 */

describe("the replay sequence", () => {
  it("omits the translation phase for an exact replay", () => {
    const exact = sequenceFor(false).map((step) => step.phase);
    const translated = sequenceFor(true).map((step) => step.phase);

    expect(exact).toEqual(["observed", "identity", "target", "pressure", "settled"]);
    expect(translated).toEqual([
      "observed",
      "identity",
      "translation",
      "target",
      "pressure",
      "settled",
    ]);
    expect(exact).not.toContain("translation");
  });

  it("keeps every run inside the two-second budget", () => {
    expect(totalDurationMs(false)).toBeGreaterThan(1_000);
    expect(totalDurationMs(false)).toBeLessThan(2_000);
    expect(totalDurationMs(true)).toBeGreaterThan(totalDurationMs(false));
    expect(totalDurationMs(true)).toBeLessThan(2_000);
  });

  it("reads a phase from elapsed time, including both boundaries", () => {
    const run = totalDurationMs(false);

    expect(phaseAt(0, false)).toBe("observed");
    expect(phaseAt(run - 1, false)).toBe("pressure");
    expect(phaseAt(run, false)).toBe("settled");
    expect(phaseAt(run * 10, false)).toBe("settled");
    // In a translated run the same instant that means "target" in an exact run
    // is still the substitution step.
    const translatedIndex = phaseIndex("translation", true);
    expect(translatedIndex).toBeGreaterThan(phaseIndex("identity", true));
    expect(phaseAtLeast("target", "translation", true)).toBe(true);
    expect(phaseAtLeast("identity", "translation", true)).toBe(false);
  });

  it("never reports a phase effect the run cannot reach", () => {
    for (const phase of ["observed", "identity", "target", "pressure", "settled"] as const) {
      const exact = effectsAt(phase, false);
      expect(exact.translationActive).toBe(false);
    }
    const settled = effectsAt("settled", true);
    expect(settled).toMatchObject({
      workloadActive: true,
      identityActive: true,
      translationActive: true,
      targetActive: true,
      chronologyActive: true,
      settled: true,
    });
    expect(PHASE_CAPTIONS.translation).toMatch(/substituting a model/iu);
  });
});
