import { Decimal } from "@stackreplay/replay-engine";
import { describe, expect, it } from "vitest";
import { apportionCents, formatCents, formatUsd, formatUsdWhole, toCents } from "./money-display";

describe("money display", () => {
  it("formats exact decimals without float artefacts", () => {
    expect(formatUsd("9812.82119026")).toBe("$9,812.82");
    expect(formatUsd("0.005")).toBe("$0.01");
    expect(formatUsd("7733.845")).toBe("$7,733.85");
    expect(formatUsd("70")).toBe("$70.00");
    expect(formatUsd(undefined)).toBeUndefined();
    expect(formatUsdWhole("9672.82")).toBe("$9,673");
    expect(formatCents(-1234n)).toBe("-$12.34");
  });

  it("apportions rows so they add up to the rounded total exactly", () => {
    // Three rows of a third of a cent each: rounding each alone gives $0.00
    // three times under a total of $0.01.
    const rows = ["0.00333333", "0.00333333", "0.00333334"];
    const cents = apportionCents(rows);
    expect(cents.reduce((sum, value) => sum + value, 0n)).toBe(toCents("0.01"));

    const many = Array.from({ length: 57 }, (_, index) =>
      new Decimal(index + 1).times("1.2345678").div(7).toFixed(9),
    );
    const total = many.reduce((sum, value) => sum.plus(value), new Decimal(0)).toFixed(9);
    const apportioned = apportionCents(many);
    expect(apportioned.reduce((sum, value) => sum + value, 0n)).toBe(toCents(total));
    // No row moves by a cent or more from its exact value.
    apportioned.forEach((value, index) => {
      const exact = new Decimal(many[index] ?? "0").times(100);
      expect(exact.minus(value.toString()).abs().lessThan(1)).toBe(true);
    });
  });
});
