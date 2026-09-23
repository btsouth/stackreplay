import { describe, expect, it } from "vitest";
import {
  behaviourKind,
  behaviourPhrase,
  billsExcess,
  dispositionPhrase,
  groupByBehaviour,
  refusesExcess,
} from "./constraint-behaviour";

/**
 * Wording is a correctness surface here: these four behaviours describe four
 * different things happening to real demand, and a surface that blurs them tells
 * the reader a workload was refused when it was served, or billed when nothing
 * was charged.
 */
describe("constraint behaviour wording", () => {
  it("never bills a rule that only records", () => {
    expect(billsExcess("record_only")).toBe(false);
    expect(refusesExcess("record_only")).toBe(false);
    expect(behaviourPhrase("record_only")).toBe("recorded only");
    expect(dispositionPhrase("record_only")).toMatch(/admits and refuses nothing/iu);
    expect(dispositionPhrase("record_only")).not.toMatch(/billed|refused|reset/iu);
  });

  it("bills only the rule whose behaviour is to bill", () => {
    expect(billsExcess("allow_overage")).toBe(true);
    expect(dispositionPhrase("allow_overage")).toMatch(/billed/iu);
    for (const behaviour of ["reject_request", "latch_until_reset", "record_only"] as const) {
      expect(billsExcess(behaviour)).toBe(false);
    }
  });

  it("refuses per request without claiming the window reset", () => {
    expect(refusesExcess("reject_request")).toBe(true);
    expect(dispositionPhrase("reject_request")).toMatch(/refused/iu);
    // A per-request rejection is not a latch: nothing was blocked until a reset.
    expect(dispositionPhrase("reject_request")).not.toMatch(/until the window reset/iu);
    expect(behaviourPhrase("reject_request")).not.toMatch(/until the window reset/iu);
  });

  it("says latching only for the rule that latches", () => {
    expect(refusesExcess("latch_until_reset")).toBe(true);
    expect(dispositionPhrase("latch_until_reset")).toMatch(/until the window resets/iu);
  });

  it("reports an absent behaviour as absent, never as a real one", () => {
    for (const phrase of [behaviourPhrase(undefined), dispositionPhrase(undefined)]) {
      expect(phrase).toMatch(/not established/iu);
      expect(phrase).not.toMatch(/recorded only|billed|refused|latched/iu);
    }
    expect(billsExcess(undefined)).toBe(false);
    expect(refusesExcess(undefined)).toBe(false);
    // The absence is a kind of its own, so no consumer has to invent one.
    expect(behaviourKind(undefined)).toBe("unestablished");
  });

  it("gives every declared behaviour its own kind", () => {
    expect(behaviourKind("allow_overage")).toBe("billed");
    expect(behaviourKind("reject_request")).toBe("refused");
    expect(behaviourKind("latch_until_reset")).toBe("latched");
    expect(behaviourKind("record_only")).toBe("recorded");
    // Four behaviours, four kinds: nothing collapses two of them together.
    const kinds = (
      ["allow_overage", "reject_request", "latch_until_reset", "record_only"] as const
    ).map(behaviourKind);
    expect(new Set(kinds).size).toBe(4);
    expect(kinds).not.toContain("unestablished");
  });
});

describe("groupByBehaviour", () => {
  const violations = [
    { constraintId: "billed" },
    { constraintId: "refused" },
    { constraintId: "latched" },
    { constraintId: "recorded" },
    { constraintId: "missing-rule" },
  ];
  const behaviours = new Map([
    ["billed", "allow_overage" as const],
    ["refused", "reject_request" as const],
    ["latched", "latch_until_reset" as const],
    ["recorded", "record_only" as const],
  ]);

  it("classifies each crossing by its rule's declared behaviour", () => {
    const grouped = groupByBehaviour(violations, (violation) =>
      behaviours.get(violation.constraintId),
    );

    expect(grouped.billed.map((entry) => entry.constraintId)).toEqual(["billed"]);
    expect(grouped.refused.map((entry) => entry.constraintId)).toEqual(["refused"]);
    // A latch is not a per-request refusal: the two keep their own words.
    expect(grouped.latched.map((entry) => entry.constraintId)).toEqual(["latched"]);
    expect(grouped.recorded.map((entry) => entry.constraintId)).toEqual(["recorded"]);
    // An unmatched rule gets its own group. It is never counted as recorded,
    // billed or refused, because this result does not state what it did.
    expect(grouped.unestablished.map((entry) => entry.constraintId)).toEqual(["missing-rule"]);
  });

  it("counts every crossing exactly once", () => {
    const grouped = groupByBehaviour(violations, (violation) =>
      behaviours.get(violation.constraintId),
    );
    expect(
      grouped.billed.length +
        grouped.refused.length +
        grouped.latched.length +
        grouped.recorded.length +
        grouped.unestablished.length,
    ).toBe(violations.length);
  });
});
