import { describe, expect, it } from "vitest";
import { evidenceSummary } from "./evidence-summary";

type Row = Parameters<typeof evidenceSummary>[0][number];

/**
 * The summary reads one field, so the fixture supplies that field and stands in
 * for the rest of the row: the cast is deliberate and confined to this test.
 */
function row(status: Row["status"]): Row {
  return { status } as unknown as Row;
}

describe("evidenceSummary", () => {
  it("never reads an empty ledger as a clean one", () => {
    // The defect this covers: an empty collection used to print "every dimension
    // established", which is a claim about a ledger that was never supplied.
    expect(evidenceSummary([])).toBe("no evidence dimension is recorded for this result");
    expect(evidenceSummary([])).not.toMatch(/every dimension established/u);
  });

  it("names partial dimensions when they were reported", () => {
    expect(evidenceSummary([row("complete"), row("complete")])).toBe(
      "every dimension established for this workload",
    );
    expect(evidenceSummary([row("complete"), row("partial")])).toBe("1 dimension partial");
    expect(evidenceSummary([row("partial"), row("partial"), row("complete")])).toBe(
      "2 dimensions partial",
    );
  });

  it("counts only partial dimensions, not every unestablished word", () => {
    // `not_applicable` is the engine stating the question does not apply to this
    // target. It is an answer, so it does not make the header claim a gap.
    expect(evidenceSummary([row("not_applicable"), row("complete")])).toBe(
      "every dimension established for this workload",
    );
  });
});
