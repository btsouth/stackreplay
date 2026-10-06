import { expect, it } from "vitest";
import { recapPeriodOptions } from "./recap-periods";

it("hides periods the recorded span already covers", () => {
  expect(recapPeriodOptions(20).map(([value]) => value)).toEqual(["all"]);
  expect(recapPeriodOptions(20)[0]?.[1]).toBe("ALL · 20 DAYS");
  expect(recapPeriodOptions(1)[0]?.[1]).toBe("ALL · 1 DAY");
  expect(recapPeriodOptions(47).map(([value]) => value)).toEqual(["30", "all"]);
  expect(recapPeriodOptions(47).at(-1)?.[1]).toBe("ALL · 47 DAYS");
  expect(recapPeriodOptions(120).map(([value]) => value)).toEqual(["30", "90", "all"]);
});

it("keeps every period when the span is unknown", () => {
  expect(recapPeriodOptions(undefined).map(([value]) => value)).toEqual(["30", "90", "all"]);
  expect(recapPeriodOptions(undefined).at(-1)?.[1]).toBe("ALL");
});
