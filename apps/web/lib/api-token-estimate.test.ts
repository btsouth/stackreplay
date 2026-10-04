import { describe, expect, it } from "vitest";
import {
  calculateApiTokenEstimate,
  formatTokenEstimateUsd,
  parseTokenCount,
  parseTokenRate,
} from "./api-token-estimate";

const rate = { inputRatePerMillion: "0.5", outputRatePerMillion: "1.5" };

describe("exact token scenarios", () => {
  it.each([
    ["1000000", "1000000", "0.50", "1.50", "2.00"],
    ["0", "0", "0.00", "0.00", "0.00"],
    ["1", "1", "0.0000005", "0.0000015", "0.000002"],
    ["000001", " 0 ", "0.0000005", "0.00", "0.0000005"],
    [
      "999999999999999999999999999999",
      "0",
      "499999999999999999999999.9999995",
      "0.00",
      "499999999999999999999999.9999995",
    ],
  ])(
    "keeps all money digits for %s input and %s output",
    (input, output, inputCost, outputCost, total) => {
      expect(calculateApiTokenEstimate(rate, input, output)).toMatchObject({
        ok: true,
        inputCost,
        outputCost,
        total,
      });
    },
  );
  it("aligns different decimal scales and keeps the smallest accepted rate", () => {
    expect(
      calculateApiTokenEstimate(
        {
          inputRatePerMillion: "0.000000000000000001",
          outputRatePerMillion: "1.234567890123456789",
        },
        "1",
        "1",
      ),
    ).toMatchObject({
      ok: true,
      inputCost: "0.000000000000000000000001",
      outputCost: "0.000001234567890123456789",
      total: "0.00000123456789012345679",
    });
  });
  it("formats cents and subcents without rounding to zero", () => {
    expect(formatTokenEstimateUsd("2.00")).toBe("$2.00");
    expect(formatTokenEstimateUsd("0.0000005")).toBe("$0.0000005");
    expect(formatTokenEstimateUsd("1000000000000000000.1000")).toBe(
      "$1,000,000,000,000,000,000.10",
    );
  });
  it("bounds only the visual ratio, including zero cost", () => {
    expect(calculateApiTokenEstimate(rate, "1000000", "1000000")).toMatchObject({
      inputShare: "25.00%",
      outputShare: "75.00%",
    });
    expect(calculateApiTokenEstimate(rate, "0", "0")).toMatchObject({
      inputShare: "0.00%",
      outputShare: "0.00%",
    });
  });
});

it.each([
  ["", "blank"],
  ["   ", "blank"],
  ["-1", "negative"],
  ["-0", "negative"],
  ["1.5", "fractional"],
  ["1.0", "fractional"],
  ["Infinity", "nonnumeric"],
  ["NaN", "nonnumeric"],
  ["1e6", "nonnumeric"],
  ["1,000", "nonnumeric"],
  ["+1", "nonnumeric"],
  ["one", "nonnumeric"],
  ["1".repeat(31), "too_large"],
  ["0".repeat(1000), "too_large"],
])("rejects token input %s (%s) in either category", (value, code) => {
  expect(parseTokenCount(value)).toMatchObject({ ok: false, code });
  expect(calculateApiTokenEstimate(rate, value, "1").ok).toBe(false);
  expect(calculateApiTokenEstimate(rate, "1", value).ok).toBe(false);
});

it.each([
  "-1",
  "Infinity",
  "",
  "1e-3",
  "01",
  "0.",
  "0.0000000000000000001",
  "1".repeat(29),
  "1".repeat(10000),
])("rejects invalid or unbounded decimal rate %s", (value) => {
  expect(parseTokenRate(value)).toBeUndefined();
  expect(
    calculateApiTokenEstimate({ ...rate, inputRatePerMillion: value }, "1", "1"),
  ).toMatchObject({ ok: false, invalidRates: true });
});

it("accepts numeric zero and the external decimal envelope", () => {
  expect(parseTokenRate("0")).toEqual({ units: 0n, places: 0 });
  expect(parseTokenRate("1234567890123456789012345678.00")).toBeUndefined();
  expect(parseTokenRate("1234567890.123456789012345678")).toBeDefined();
  expect(
    calculateApiTokenEstimate({ inputRatePerMillion: "0", outputRatePerMillion: "0" }, "1", "1"),
  ).toMatchObject({ ok: true, total: "0.00" });
});
