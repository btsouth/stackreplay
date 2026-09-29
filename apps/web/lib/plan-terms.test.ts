import { bundledPlanTimeline, bundledPlanTimelineInput } from "@stackreplay/catalog/bundled";
import { describe, expect, it } from "vitest";
import {
  audienceWords,
  percentOfRatio,
  planHistorySteps,
  planTermsInUse,
  planTermsNotice,
  relativeValuePhrase,
  versionTermsLabel,
} from "./plan-terms";

const timeline = (asOf: string) => {
  const resolved = bundledPlanTimeline("openai-chatgpt-pro-20x", asOf);
  if (resolved === undefined) throw new Error("Pro $200 missing");
  return resolved;
};

const allText = (asOf: string) => {
  const t = timeline(asOf);
  return JSON.stringify([planTermsNotice(t), planHistorySteps(t), planTermsInUse(t)]);
};

describe("plan change wording", () => {
  it("turns a ratio into a percent without float noise", () => {
    expect(percentOfRatio("0.5")).toBe("50");
    expect(percentOfRatio("0.125")).toBe("12.5");
    expect(percentOfRatio("1")).toBe("100");
    expect(percentOfRatio("0.07")).toBe("7");
    expect(percentOfRatio("abc")).toBeUndefined();
  });

  it("states the change as API-equivalent spend, approximately", () => {
    expect(
      relativeValuePhrase({
        measure: "api_equivalent_spend",
        ratio: "0.5",
        approximate: true,
        comparedTo: "previous_terms",
        evidence: [],
      }),
    ).toBe("≈50% of the previous API-equivalent spend");
  });

  it("names audiences in plain words", () => {
    expect(audienceWords(["new_subscribers", "upgrades"])).toBe("new subscribers and upgrades");
    expect(audienceWords(["existing_subscribers"])).toBe("existing subscribers");
  });
});

describe("ChatGPT Pro $200 notice", () => {
  it("reads as an official scheduled change on Sep 29", () => {
    expect(planTermsNotice(timeline("2026-09-29"))).toEqual({
      state: "scheduled",
      effectiveFrom: "2026-09-30",
      headline: "Official change effective Sep 30, 2026",
      detail: "For new subscribers: new terms provide ≈50% of the previous API-equivalent spend.",
    });
  });

  it("reads as changed from Sep 30, with no second catalog edit", () => {
    for (const day of ["2026-09-30", "2026-10-01", "2026-12-01"])
      expect(planTermsNotice(timeline(day))).toMatchObject({
        state: "revised",
        headline: "Terms changed Sep 30, 2026",
        detail: "For new subscribers: usage is ≈50% of the previous API-equivalent spend.",
      });
  });

  it("gives Replay its terms line", () => {
    expect(planTermsInUse(timeline("2026-09-29"))).toEqual({
      terms: "Current terms",
      change: "Official revision takes effect Sep 30, 2026",
    });
    expect(planTermsInUse(timeline("2026-10-01"))).toEqual({
      terms: "Using terms effective Sep 30, 2026",
      change: "≈50% of the previous API-equivalent spend",
    });
  });

  it("never calls the change a token cut, or the pause a shutdown", () => {
    for (const day of ["2026-09-15", "2026-09-29", "2026-09-30", "2026-10-01"]) {
      const text = allText(day);
      expect(text).not.toMatch(/fewer tokens|less tokens|tokens? cut|half the tokens/i);
      expect(text).not.toMatch(/disabled|shut down|discontinued/i);
    }
  });
});

describe("ChatGPT Pro $200 history steps", () => {
  it("before Sep 30: current terms, the pause, the announcement, then the scheduled change", () => {
    const steps = planHistorySteps(timeline("2026-09-29"));
    expect(steps.map((step) => [step.dateLabel, step.state])).toEqual([
      ["Earlier", "current"],
      ["Sep 10, 2026", "past"],
      ["Sep 29, 2026", "past"],
      ["Sep 30, 2026", "scheduled"],
    ]);
    expect(steps[0]?.lines[0]?.details).toEqual([
      "In effect through Sep 29, 2026",
      "Start date not published",
    ]);
    const pause = steps[1]?.lines[0];
    expect(pause?.title).toBe("New subscriptions paused");
    expect(pause?.audience).toBe(
      "Applies to new subscribers and upgrades · Existing subscribers not affected",
    );
    expect(steps[3]?.lines.map((line) => line.title)).toEqual([
      "New subscriptions reopen",
      "Usage economics change",
    ]);
    expect(steps[3]?.lines[1]?.details[0]).toBe("≈50% of the previous API-equivalent spend");
  });

  it("after Sep 30: previous terms, then the Sep 30 step as the current terms", () => {
    const steps = planHistorySteps(timeline("2026-10-01"));
    expect(steps.map((step) => [step.dateLabel, step.state])).toEqual([
      ["Earlier", "previous"],
      ["Sep 10, 2026", "past"],
      ["Sep 29, 2026", "past"],
      ["Sep 30, 2026", "current"],
    ]);
    // Old and new terms are never both current.
    expect(steps.filter((step) => step.state === "current")).toHaveLength(1);
  });

  it("states the reduction once per surface", () => {
    const steps = planHistorySteps(timeline("2026-10-01"));
    const mentions = JSON.stringify(steps).match(/API-equivalent/g) ?? [];
    expect(mentions).toHaveLength(1);
  });

  it("draws nothing for a plan that has never changed", () => {
    const plain = bundledPlanTimeline("openai-chatgpt-plus", "2026-09-29");
    if (plain === undefined) throw new Error("Plus missing");
    expect(planTermsNotice(plain)).toBeUndefined();
    expect(planHistorySteps(plain)).toEqual([]);
  });
});

describe("shared audiences", () => {
  it("says a step's shared audience once", () => {
    const sep30 = planHistorySteps(timeline("2026-09-29")).find(
      (step) => step.date === "2026-09-30",
    );
    expect(sep30?.audience).toBe("Applies to new subscribers");
    expect(sep30?.lines.every((line) => line.audience === undefined)).toBe(true);
  });
});

describe("the terms a stored result used", () => {
  const input = bundledPlanTimelineInput("openai-chatgpt-pro-20x");
  if (input === undefined) throw new Error("Pro $200 missing");
  it("names terms from the result's own plan version, not today's", () => {
    expect(versionTermsLabel(input, "openai-chatgpt-pro-20x@2026-09-22")).toBe(
      "terms before the Sep 30, 2026 revision",
    );
    expect(versionTermsLabel(input, "openai-chatgpt-pro-20x@2026-09-30")).toBe(
      "terms effective Sep 30, 2026",
    );
  });
  it("says nothing for a plan that was never revised", () => {
    const plus = bundledPlanTimelineInput("openai-chatgpt-plus");
    if (plus === undefined) throw new Error("Plus missing");
    expect(versionTermsLabel(plus, "openai-chatgpt-plus@2026-09-29")).toBeUndefined();
  });
});
