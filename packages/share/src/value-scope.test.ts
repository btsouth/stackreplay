import { describe, expect, it } from "vitest";
import { composeValueScope } from "./value-scope.js";
import { partOfWhole } from "./verdict.js";

describe("price scope words", () => {
  it("never rounds an incomplete part to 100% or a nonzero part to 0%", () => {
    expect(partOfWhole(3_199, 3_200)).toBe("99.97%");
    expect(partOfWhole(99_999, 100_000)).toBe("99.999%");
    expect(partOfWhole(1, 100_000)).toBe("0.001%");
    expect(partOfWhole(4_845, 5_000)).toBe("96.9%");
    expect(partOfWhole(3_200, 3_200)).toBe("100%");
    expect(partOfWhole(0, 3_200)).toBe("0%");
  });

  it("states the known-token demand a partial price leaves out", () => {
    expect(
      composeValueScope({
        recordedCalls: 3_200,
        pricedCalls: 3_199,
        knownTokens: { total: 1_560_000_000, priced: 560_000_000 },
      }),
    ).toEqual({
      complete: false,
      calls: "3,199 of 3,200 calls (99.97%)",
      tokens:
        "The priced calls carry 35.9% of known processed tokens; the 1 left out carries 64.1%.",
      pricedTokenPercent: "35.9%",
    });
    expect(composeValueScope({ recordedCalls: 3_200, pricedCalls: 3_200 })).toEqual({
      complete: true,
      calls: "All 3,200 calls",
    });
  });
});
