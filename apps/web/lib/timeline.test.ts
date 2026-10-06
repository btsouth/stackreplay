import { describe, expect, it } from "vitest";
import { localDayOf } from "./timeline";

describe("localDayOf", () => {
  it("reads the viewer's calendar day, not the UTC day", () => {
    // 03:30 UTC on Sep 24 is still the evening of Sep 23 in New York.
    expect(localDayOf("UTC")("2026-09-24T03:30:00Z")).toBe("2026-09-24");
    expect(localDayOf("America/New_York")("2026-09-24T03:30:00Z")).toBe("2026-09-23");
    // A half-hour zone moves the boundary by its own offset.
    expect(localDayOf("Asia/Kolkata")("2026-09-23T18:45:00Z")).toBe("2026-09-24");
  });
  it("accepts epoch milliseconds", () => {
    expect(localDayOf("UTC")(Date.parse("2026-09-24T03:30:00Z"))).toBe("2026-09-24");
  });
  it("falls back to UTC for a zone the runtime does not know", () => {
    expect(localDayOf("Not/AZone")("2026-09-23T23:00:00Z")).toBe("2026-09-23");
  });
});
