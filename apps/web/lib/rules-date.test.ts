import { bundledPlansAt } from "@stackreplay/catalog/bundled";
import { describe, expect, it } from "vitest";
import { calendarDateIn } from "./rules-date";

describe("default rules date", () => {
  // 11:30 PM on Sep 23 in Louisville is already Sep 24 in UTC.
  const evening = new Date("2026-09-24T03:30:00Z");

  it("uses the viewer's calendar date, not the UTC date", () => {
    expect(calendarDateIn(evening, "America/Louisville")).toBe("2026-09-23");
    expect(calendarDateIn(evening, "America/Los_Angeles")).toBe("2026-09-23");
    expect(calendarDateIn(evening, "UTC")).toBe("2026-09-24");
    expect(calendarDateIn(evening, "Asia/Tokyo")).toBe("2026-09-24");
  });

  it("falls back to the UTC date for an unknown zone", () => {
    expect(calendarDateIn(evening, "Not/AZone")).toBe("2026-09-24");
  });

  it("keeps the effective-date contract: the date string alone selects the version", () => {
    const local = calendarDateIn(evening, "America/Louisville");
    for (const plan of bundledPlansAt(local))
      expect(plan.effectiveFrom <= local, `${plan.id} effective ${plan.effectiveFrom}`).toBe(true);
    expect(bundledPlansAt(local)).toEqual(bundledPlansAt("2026-09-23"));
  });
});
