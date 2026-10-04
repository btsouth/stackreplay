import { describe, expect, it } from "vitest";
import {
  calculateFullDeveloperSeatMonthlyTotal,
  formatExactUsd,
} from "./public-plan-seat-estimate";

describe("full developer seat monthly estimate", () => {
  it.each([
    ["0", "80", "$80", true],
    ["1", "120", "$120", false],
    ["5", "280", "$280", false],
    ["123456789012345", "4938271560493880", "$4,938,271,560,493,880", false],
  ] as const)("calculates %s seats exactly", (seats, total, totalDisplay, zeroSeats) => {
    expect(calculateFullDeveloperSeatMonthlyTotal("80", "40", seats)).toEqual({
      ok: true,
      seats: BigInt(seats).toString(),
      seatsDisplay: BigInt(seats).toLocaleString("en-US"),
      total,
      totalDisplay,
      zeroSeats,
    });
  });

  it("keeps fractional published amounts exact", () => {
    expect(calculateFullDeveloperSeatMonthlyTotal("0.10", "0.20", "3")).toEqual({
      ok: true,
      seats: "3",
      seatsDisplay: "3",
      total: "0.70",
      totalDisplay: "$0.70",
      zeroSeats: false,
    });
    expect(formatExactUsd("19.999")).toBe("$19.999");
  });

  it.each([
    ["blank", "   ", "blank"],
    ["negative", "-1", "negative"],
    ["fractional", "1.5", "fractional"],
    ["nonnumeric", "one", "nonnumeric"],
    ["nonfinite", "Infinity", "nonnumeric"],
    ["too large", "1".repeat(31), "too_large"],
  ] as const)("rejects %s seat input", (_label, input, code) => {
    expect(calculateFullDeveloperSeatMonthlyTotal("80", "40", input)).toMatchObject({
      ok: false,
      code,
    });
  });

  it("rejects invalid published money instead of returning NaN", () => {
    expect(calculateFullDeveloperSeatMonthlyTotal("eighty", "40", "1")).toMatchObject({
      ok: false,
      code: "invalid_money",
    });
    expect(calculateFullDeveloperSeatMonthlyTotal("80", "40.0.0", "1")).toMatchObject({
      ok: false,
      code: "invalid_money",
    });
  });
});
