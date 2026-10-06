import { describe, expect, it } from "vitest";
import { count, formatTokens, plainRange } from "./format";

describe("scan formatting", () => {
  it("never turns a missing quantity into a number", () => {
    expect(formatTokens(undefined)).toBeUndefined();
    expect(plainRange(undefined, "2026-09-20")).toBe("no recorded dates");
  });
  it("keeps compact figures recognisably rounded", () => {
    expect(formatTokens(1_045_821)).toBe("1.0M");
    expect(formatTokens(9_450)).toBe("9.4K");
    expect(formatTokens(512)).toBe("512");
    expect(count(1_234_567)).toBe("1,234,567");
  });
  it("writes calendar dates as they are, never shifted", () => {
    expect(plainRange("2026-09-18", "2026-09-18")).toBe("Sep 18, 2026");
    expect(plainRange("2026-08-22", "2026-09-20")).toBe("Aug 22 to Sep 20, 2026");
    expect(plainRange("2025-12-30", "2026-01-02")).toBe("Dec 30, 2025 to Jan 2, 2026");
  });
});
