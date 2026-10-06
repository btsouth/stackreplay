import { describe, expect, it } from "vitest";
import { addAmounts } from "@stackreplay/share/money";
import { addRecapMoney } from "./recap-money";
describe("recap aggregate money", () => {
  it("matches exact sums across the schema's decimal envelope", () => {
    const values = [
      "0",
      "1",
      "1.2300",
      "0.000000000000000001",
      "9999999999.999999999999999999",
      "0.32",
    ];
    for (const a of values)
      for (const b of values) expect(addRecapMoney(a, b)).toBe(addAmounts([a, b]));
  });
});
