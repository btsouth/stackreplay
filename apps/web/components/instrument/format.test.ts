import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatDay,
  formatExactTokens,
  formatInstant,
  formatMoney,
  formatPercent,
  formatTokens,
  formatWindow,
  humanizeCode,
} from "./format";

/**
 * The one rule these tests exist for: an unknown never becomes a number. The
 * rest pin the display decisions that would otherwise drift (precision of a
 * counterfactual cost, the window separator, UTC instants).
 */

describe("instrument formatting", () => {
  it("returns nothing at all for a missing quantity", () => {
    expect(formatCount(undefined)).toBeUndefined();
    expect(formatTokens(undefined)).toBeUndefined();
    expect(formatExactTokens(undefined)).toBeUndefined();
    expect(formatPercent(undefined)).toBeUndefined();
    expect(formatMoney(undefined)).toBeUndefined();
    expect(formatDay(undefined)).toBeUndefined();
    expect(formatInstant(undefined)).toBeUndefined();
    expect(formatWindow(undefined, "2026-09-20T00:00:00.000Z")).toBeUndefined();
    expect(formatWindow("2026-08-22T00:00:00.000Z", undefined)).toBeUndefined();
    // An unparseable value is missing too, not zero.
    expect(formatMoney("not a number")).toBeUndefined();
    expect(formatDay("whenever")).toBeUndefined();
    expect(formatInstant("whenever")).toBeUndefined();
  });

  it("keeps a rounded figure recognisably rounded", () => {
    expect(formatMoney("48.75538175")).toBe("$48.76");
    expect(formatMoney("20")).toBe("$20.00");
    expect(formatMoney("1891.79")).toBe("$1,891.79");
    expect(formatPercent(76.28054510090165)).toBe("76.3%");
    expect(formatTokens(1_045_821)).toBe("1.0M");
    expect(formatTokens(9_450)).toBe("9.4K");
    expect(formatTokens(512)).toBe("512");
    expect(formatExactTokens(212_204_151)).toBe("212,204,151 tokens");
  });

  it("writes instants in UTC so a replayed window reads the same everywhere", () => {
    expect(formatInstant("2026-09-06T02:02:04.000Z")).toBe("06 Sept, 02:02Z");
    // September is "Sept" in the en-GB short month the ledger uses; the point of
    // the case is that the separator is a word, not an en dash.
    expect(formatWindow("2026-08-22T00:00:00.000Z", "2026-09-20T00:00:00.000Z")).toBe(
      "22 Aug to 20 Sept",
    );
    expect(humanizeCode("rolling_5h_request_window")).toBe("rolling 5h request window");
  });
});
