import { describe, expect, it } from "vitest";
import { compareSearch, readComparePlans } from "./compare-url";

const plans = ["a", "b", "c", "d"];
const fallback = ["a", "b"] as const;

describe("compare page URL", () => {
  it("reads two or three distinct plans and falls back for unknown ids", () => {
    expect(readComparePlans("?left=c&right=d", plans, fallback)).toEqual(["c", "d"]);
    expect(readComparePlans("?left=c&right=d&third=a", plans, fallback)).toEqual(["c", "d", "a"]);
    expect(readComparePlans("?left=zzz&third=c", plans, fallback)).toEqual(["a", "b", "c"]);
    expect(readComparePlans("?left=c&right=d&third=c", plans, fallback)).toEqual(["c", "d"]);
    expect(readComparePlans("", plans, fallback)).toEqual(["a", "b"]);
  });

  it("keeps the default pair plain and writes every other choice", () => {
    expect(compareSearch(["a", "b"], fallback)).toBe("");
    expect(compareSearch(["c", "b"], fallback)).toBe("?left=c&right=b");
    expect(compareSearch(["a", "b", "d"], fallback)).toBe("?left=a&right=b&third=d");
  });
});
