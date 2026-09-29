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

const noticeOf = (asOf: string) =>
  planTermsNotice(timeline(asOf), { planName: "ChatGPT Pro $200", providerName: "OpenAI" });

describe("ChatGPT Pro $200 notice", () => {
  it("says nothing on Sep 28, before the revision was announced", () => {
    expect(noticeOf("2026-09-28")).toBeUndefined();
  });

  it("leads with the market offer from Sep 29, with grandfathering as a secondary exception", () => {
    expect(noticeOf("2026-09-29")).toEqual({
      state: "revised",
      effectiveFrom: "2026-09-29",
      headline: "Revised usage allowance since Sep 29, 2026",
      detail:
        "New and non-grandfathered subscriptions get the revised usage allowance, described by OpenAI staff as ≈50% of the previous API-equivalent spend.",
      exception: {
        lead: "Already on ChatGPT Pro $200?",
        text: "Eligible existing subscribers keep their previous allowance through Oct 29, 2026.",
      },
    });
  });

  it("keeps the exception through Oct 29 and drops it from Oct 30", () => {
    expect(noticeOf("2026-10-29")?.exception).toBeDefined();
    const after = noticeOf("2026-10-30");
    expect(after?.exception).toBeUndefined();
    expect(after?.detail).toBe(
      "New subscribers get the revised usage allowance, described by OpenAI staff as ≈50% of the previous API-equivalent spend.",
    );
  });

  it("gives Replay the market terms by default, and offers the grandfathered terms", () => {
    expect(planTermsInUse(timeline("2026-09-28"))).toEqual({ terms: "Current terms" });
    expect(planTermsInUse(timeline("2026-10-01"))).toEqual({
      terms: "Current market terms, revised Sep 29, 2026",
      change: "≈50% of the previous API-equivalent spend",
      cohortOffer: {
        id: "grandfathered",
        label: "Eligible existing subscribers",
        text: "Eligible existing subscribers keep their previous allowance through Oct 29, 2026.",
        through: "2026-10-29",
      },
    });
    const grandfathered = bundledPlanTimeline("openai-chatgpt-pro-20x", "2026-10-01", {
      cohort: "grandfathered",
    });
    if (grandfathered === undefined) throw new Error("Pro $200 missing");
    expect(planTermsInUse(grandfathered)).toEqual({
      terms: "Eligible existing subscribers: previous allowance through Oct 29, 2026",
    });
    expect(planTermsInUse(timeline("2026-10-30")).cohortOffer).toBeUndefined();
  });

  it("never calls the change a token cut, the pause a shutdown, or says everyone lost the old allowance", () => {
    for (const day of ["2026-09-15", "2026-09-29", "2026-10-01", "2026-10-30"]) {
      const text = allText(day);
      expect(text).not.toMatch(/fewer tokens|less tokens|tokens? cut|half the tokens/i);
      expect(text).not.toMatch(/disabled|shut down|discontinued/i);
      expect(text).not.toMatch(/all (existing )?subscribers (lose|lost)|everyone (lost|loses)/i);
    }
  });
});

describe("ChatGPT Pro $200 history steps", () => {
  const rows = (asOf: string) =>
    planHistorySteps(timeline(asOf)).map((step) => [step.dateLabel, step.state]);

  it("on Sep 28: only the pause is known", () => {
    expect(rows("2026-09-28")).toEqual([["Sep 10, 2026", "past"]]);
  });

  it("on Sep 29: previous terms, the pause, the reopening with a grandfathering note, and its end", () => {
    const steps = planHistorySteps(timeline("2026-09-29"));
    expect(steps.map((step) => [step.dateLabel, step.state])).toEqual([
      ["Earlier", "previous"],
      ["Sep 10, 2026", "past"],
      ["Sep 29, 2026", "current"],
      ["After Oct 29, 2026", "scheduled"],
    ]);
    expect(steps[0]?.lines[0]?.details).toEqual([
      "Offered to new subscribers until Sep 28, 2026",
      "Kept by eligible existing subscribers through Oct 29, 2026",
      "Start date not published",
    ]);
    const pause = steps[1]?.lines[0];
    expect(pause?.title).toBe("New subscriptions paused");
    expect(pause?.audience).toBe(
      "Applies to new subscribers and upgrades · Existing subscribers not affected",
    );
    const sep29 = steps[2];
    expect(sep29?.lines.map((line) => line.title)).toEqual([
      "Available to new subscribers again",
      "Lower usage allowance for new subscriptions",
    ]);
    expect(sep29?.lines[1]?.details[0]).toBe("≈50% of the previous API-equivalent spend");
    expect(sep29?.note).toEqual({
      label: "Grandfathered allowance",
      text: "Eligible existing subscribers keep their previous allowance through Oct 29, 2026.",
    });
    expect(steps[3]?.date).toBe("2026-10-30");
    expect(steps[3]?.lines[0]?.title).toBe("Grandfathered allowance ends");
  });

  it("after Oct 29: the end of grandfathering is past, and one step is current", () => {
    const steps = planHistorySteps(timeline("2026-10-30"));
    expect(steps.map((step) => [step.dateLabel, step.state])).toEqual([
      ["Earlier", "previous"],
      ["Sep 10, 2026", "past"],
      ["Sep 29, 2026", "current"],
      ["After Oct 29, 2026", "past"],
    ]);
    expect(steps[2]?.note?.text).toBe(
      "Eligible existing subscribers kept their previous allowance through Oct 29, 2026.",
    );
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
    const sep29 = planHistorySteps(timeline("2026-09-29")).find(
      (step) => step.date === "2026-09-29",
    );
    expect(sep29?.audience).toBe("Applies to new subscribers");
    expect(sep29?.lines.every((line) => line.audience === undefined)).toBe(true);
  });
});

describe("the terms a stored result used", () => {
  const input = bundledPlanTimelineInput("openai-chatgpt-pro-20x");
  if (input === undefined) throw new Error("Pro $200 missing");
  it("names terms from the result's own plan version, not today's", () => {
    expect(versionTermsLabel(input, "openai-chatgpt-pro-20x@2026-09-22")).toBe(
      "terms before the Sep 29, 2026 revision",
    );
    expect(versionTermsLabel(input, "openai-chatgpt-pro-20x@2026-09-29")).toBe(
      "terms effective Sep 29, 2026",
    );
    expect(versionTermsLabel(input, "openai-chatgpt-pro-20x@2026-09-29~grandfathered")).toBe(
      "eligible existing subscribers' previous allowance through Oct 29, 2026",
    );
  });
  it("says nothing for a plan that was never revised", () => {
    const plus = bundledPlanTimelineInput("openai-chatgpt-plus");
    if (plus === undefined) throw new Error("Plus missing");
    expect(versionTermsLabel(plus, "openai-chatgpt-plus@2026-09-29")).toBeUndefined();
  });
});
