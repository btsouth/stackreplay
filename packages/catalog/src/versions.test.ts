import { describe, expect, it } from "vitest";
import { selectLoadedPlanVersionAt, selectPlanVersionAt } from "./versions.js";

/**
 * The plan-version rule is shared by the engine, the public read model and the
 * plan pickers. These tests state the rule directly, including the two cases the
 * surfaces used to disagree about: the boundary day of a version that declares an
 * `effectiveTo`, and a day on which no version is in force at all.
 */
describe("selectPlanVersionAt", () => {
  const versions = [
    { effectiveFrom: "2026-01-01", effectiveTo: "2026-06-30" },
    { effectiveFrom: "2026-09-01" },
  ];

  it("treats effectiveTo as inclusive, so the end day belongs to the ending version", () => {
    expect(selectPlanVersionAt(versions, "2026-06-30")?.effectiveFrom).toBe("2026-01-01");
    expect(selectPlanVersionAt(versions, "2026-07-01")).toBeUndefined();
  });

  it("treats effectiveFrom as inclusive", () => {
    expect(selectPlanVersionAt(versions, "2026-01-01")?.effectiveFrom).toBe("2026-01-01");
    expect(selectPlanVersionAt(versions, "2025-12-31")).toBeUndefined();
  });

  it("returns undefined on a day no version covers, never a later version", () => {
    expect(selectPlanVersionAt(versions, "2026-08-15")).toBeUndefined();
  });

  it("prefers the latest effectiveFrom when intervals touch on a change day", () => {
    const touching = [
      { effectiveFrom: "2026-01-01", effectiveTo: "2026-10-01" },
      { effectiveFrom: "2026-10-01" },
    ];
    expect(selectPlanVersionAt(touching, "2026-10-01")?.effectiveFrom).toBe("2026-10-01");
  });

  it("is independent of the order versions are stored in", () => {
    const reversed = [...versions].reverse();
    expect(selectPlanVersionAt(reversed, "2026-05-01")?.effectiveFrom).toBe("2026-01-01");
    expect(selectPlanVersionAt(reversed, "2026-12-24")?.effectiveFrom).toBe("2026-09-01");
  });

  it("answers for a full timestamp as the day it falls in", () => {
    expect(selectPlanVersionAt(versions, "2026-06-30T23:59:59.000Z")?.effectiveFrom).toBe(
      "2026-01-01",
    );
    expect(selectPlanVersionAt(versions, "2026-07-01T00:00:00.000Z")).toBeUndefined();
  });

  it("selects among loaded versions for one plan only", () => {
    const loaded = [
      { planId: "plan-a", effectiveFrom: "2026-01-01" },
      { planId: "plan-b", effectiveFrom: "2026-02-01" },
    ] as never;
    expect(selectLoadedPlanVersionAt(loaded, "plan-b", "2026-03-01")?.planId).toBe("plan-b");
    expect(selectLoadedPlanVersionAt(loaded, "plan-c", "2026-03-01")).toBeUndefined();
  });
});
