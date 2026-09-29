import { describe, expect, it } from "vitest";
import { priceNumber } from "./market-prices";
import { modelLayoutFromSearch } from "./model-layout";
import { tokenSize } from "./model-specifications";

describe("model figures", () => {
  it("shows per-1M rates at two decimals or more, keeping every published digit", () => {
    expect(priceNumber("0.3")).toBe("$0.30");
    expect(priceNumber("0.26")).toBe("$0.26");
    expect(priceNumber("2")).toBe("$2.00");
    expect(priceNumber("0.0028")).toBe("$0.0028");
    expect(priceNumber("3.125")).toBe("$3.125");
    expect(priceNumber(undefined)).toBe("Not listed");
    expect(priceNumber({ billedAs: "output" })).toBe("Billed as output");
  });

  it("shows token counts at three significant digits", () => {
    expect(tokenSize(131_072)).toBe("131K");
    expect(tokenSize(65_536)).toBe("65.5K");
    expect(tokenSize(1_048_576)).toBe("1.05M");
    expect(tokenSize(1_000_000)).toBe("1M");
    expect(tokenSize(128_000)).toBe("128K");
    expect(tokenSize(undefined)).toBe("Not documented");
  });

  it("reads the models layout from the query string", () => {
    expect(modelLayoutFromSearch("?view=table")).toBe("table");
    expect(modelLayoutFromSearch("?view=cards")).toBe("cards");
    expect(modelLayoutFromSearch("")).toBe("cards");
  });
});
