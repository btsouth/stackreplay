import { describe, expect, it } from "vitest";
import { composeWorkloadFact } from "./workload-facts.js";

describe("late-night workload fact", () => {
  it("is a complete sentence with or without a published time zone", () => {
    const fact = {
      id: "late-night" as const,
      figure: 3,
      baseline: 0,
      ratio: 0,
      share: 0.184,
      count: 7,
    };
    expect(composeWorkloadFact(fact)).toEqual({
      text: "18.4% of your calls came between 10 PM and 4 AM on 3 of 7 active days.",
      comparison: "",
    });
    expect(composeWorkloadFact({ ...fact, zone: "America/New_York" }).text).toBe(
      "18.4% of your calls came between 10 PM and 4 AM (America/New_York) on 3 of 7 active days.",
    );
  });
});
