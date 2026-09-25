import { describe, expect, it } from "vitest";
import {
  boundText,
  composeVerdict,
  shareText,
  type VerdictFactsV1,
  verdictFactsV1Schema,
} from "./verdict.js";

/**
 * The verdict contract: every first sentence carries a date, a dollar amount,
 * a count of the person's calls or a bounded share, and never only an engine
 * state. The fixtures are the product audit's own scenarios.
 */

const MEANINGFUL =
  /\$[\d,]+|\b[A-Z][a-z]{2} \d{1,2}\b|\d[\d,]* (?:recorded )?calls?\b|\d+(?:\.\d+)?%/u;
const ENGINE_STATES =
  /full coverage ruled out|capacity not quantified|not determinable|not established|would have fit/iu;

function facts(overrides: Partial<VerdictFactsV1>): VerdictFactsV1 {
  const base: VerdictFactsV1 = {
    version: 1,
    target: {
      kind: "subscription",
      name: "Copilot Pro+",
      providerName: "GitHub",
      price: { amount: "39", interval: "month" },
      capacity: "numeric",
    },
    mode: "exact",
    substitutions: [],
    scope: { kind: "all", recordedCalls: 66_851 },
    calls: {
      total: 66_851,
      withinAllowance: 4_167,
      overage: 62_601,
      blocked: 0,
      unavailable: 0,
      undecided: 83,
      unrecognized: 83,
    },
    servedMakers: ["Anthropic", "OpenAI"],
    unavailableMakers: [],
    namedBy: "maker",
    periodDays: 34,
    money: { planPrice: "39", overage: "9672.82" },
  };
  return verdictFactsV1Schema.parse({ ...base, ...overrides });
}

function check(verdict: ReturnType<typeof composeVerdict>): void {
  expect(verdict.headline).toMatch(MEANINGFUL);
  expect(verdict.headline).not.toMatch(ENGINE_STATES);
  for (const line of [verdict.headline, ...verdict.support]) {
    expect(line).not.toMatch(/\.\.(?!\.)/u);
    expect(line.trim()).toMatch(/[.!?]$/u);
  }
}

describe("replay verdicts", () => {
  const runOut = (
    dates: { date: string; day: number; undecidedBefore?: number }[],
  ): VerdictFactsV1["runOut"] => ({ limit: "credits", behaviour: "overage", dates, windows: 2 });
  const noUndecided = {
    total: 66_851,
    withinAllowance: 4_167,
    overage: 62_684,
    blocked: 0,
    unavailable: 0,
    undecided: 0,
    unrecognized: 0,
  };

  it("numeric plan with nothing undecided: exact run-out dates and overage", () => {
    const verdict = composeVerdict(
      facts({
        calls: noUndecided,
        runOut: runOut([
          { date: "2026-08-23", day: 3, undecidedBefore: 0 },
          { date: "2026-09-01", day: 12, undecidedBefore: 0 },
        ]),
      }),
    );
    check(verdict);
    expect(verdict.headline).toBe(
      "Copilot Pro+ credits would have run out on Aug 23 (day 3) and again on Sep 1. This workload would have generated about $9,673 in modeled overage over 34 days on top of the $39/month subscription.",
    );
    expect(verdict.figure).toMatchObject({ value: "Aug 23", kind: "date" });
    expect(verdict.secondary).toEqual({ value: "$9,673", caption: "modeled overage over 34 days" });
    expect(verdict.support.join(" ")).not.toMatch(/unresolved|undecided|recognized/u);
    expect(verdict.short).toBe("Runs out Aug 23 (day 3) · $9,673 overage");
  });

  it("undecided calls before the run-out: the date is what recognized calls establish", () => {
    const verdict = composeVerdict(
      facts({
        calls: { ...noUndecided, undecided: 1, unrecognized: 1, overage: 62_683 },
        runOut: runOut([
          { date: "2026-08-29", day: 10, undecidedBefore: 1 },
          { date: "2026-09-10", day: 21, undecidedBefore: 1 },
        ]),
        money: { planPrice: "39", overage: "178.12" },
      }),
    );
    check(verdict);
    expect(verdict.headline).toBe(
      "Recognized calls alone would exhaust Copilot Pro+ credits by Aug 29 (day 10) and again by Sep 10. They would generate about $178 in modeled overage over 34 days on top of the $39/month subscription.",
    );
    expect(verdict.support[0]).toBe(
      "1 unresolved call, recorded before Aug 29, could move the run-out earlier and add to the overage.",
    );
    expect(verdict.figure).toMatchObject({
      value: "Aug 29",
      caption: "recognized calls · credits run out by day 10",
    });
    expect(verdict.secondary?.caption).toBe("modeled overage from recognized calls over 34 days");
    expect(verdict.short).toBe("Runs out by Aug 29 (day 10) · at least $178 overage");
  });

  it("undecided calls only after the run-out: the date stands, the overage is qualified", () => {
    const verdict = composeVerdict(
      facts({
        runOut: runOut([
          { date: "2026-08-23", day: 3, undecidedBefore: 0 },
          { date: "2026-09-01", day: 12, undecidedBefore: 0 },
        ]),
      }),
    );
    check(verdict);
    expect(verdict.headline).toBe(
      "Copilot Pro+ credits would have run out on Aug 23 (day 3) and again on Sep 1. Recognized calls alone would have generated about $9,673 in modeled overage over 34 days on top of the $39/month subscription.",
    );
    expect(verdict.support[0]).toBe(
      "83 unresolved calls, all recorded after Aug 23, could add to the overage but not move that run-out.",
    );
    expect(verdict.short).toBe("Runs out Aug 23 (day 3) · at least $9,673 overage");
  });

  it("undecided calls between two run-outs: only the later date is qualified", () => {
    const verdict = composeVerdict(
      facts({
        runOut: runOut([
          { date: "2026-08-23", day: 3, undecidedBefore: 0 },
          { date: "2026-09-01", day: 12, undecidedBefore: 20 },
        ]),
      }),
    );
    expect(verdict.headline).toMatch(
      /^Copilot Pro\+ credits would have run out on Aug 23 \(day 3\) and again by Sep 1\./u,
    );
  });

  it("undecided calls with no recorded chronology are read as earlier", () => {
    const verdict = composeVerdict(
      facts({
        runOut: runOut([
          { date: "2026-08-23", day: 3 },
          { date: "2026-09-01", day: 12 },
        ]),
      }),
    );
    check(verdict);
    expect(verdict.headline).toMatch(
      /^Recognized calls alone would exhaust Copilot Pro\+ credits by Aug 23 \(day 3\) and again by Sep 1\./u,
    );
    expect(verdict.support[0]).toBe(
      "83 unresolved calls could move the run-out earlier and add to the overage.",
    );
  });

  it("numeric limits not reached with undecided calls: only recognized calls are said to fit", () => {
    const verdict = composeVerdict(
      facts({
        calls: {
          total: 3_200,
          withinAllowance: 3_199,
          overage: 0,
          blocked: 0,
          unavailable: 0,
          undecided: 1,
          unrecognized: 1,
        },
        money: { planPrice: "39" },
      }),
    );
    check(verdict);
    expect(verdict.headline).toBe(
      "Recognized calls stay within Copilot Pro+'s published limits: all 3,199 calls over 34 days.",
    );
    expect(verdict.support[0]).toBe(
      "1 unresolved call could still use the allowance, so whether the full workload fits can't be determined.",
    );
    expect(verdict.support[1]).toBe(
      "No overage from recognized calls: the $39/month price covers them.",
    );
    expect(verdict.support.join(" ")).not.toMatch(/covers this recorded demand/u);
  });

  it("poor model coverage: says the plan can't run the work, with the count", () => {
    const verdict = composeVerdict(
      facts({
        target: {
          kind: "subscription",
          name: "Copilot Pro",
          providerName: "GitHub",
          price: { amount: "10", interval: "month" },
          capacity: "numeric",
        },
        calls: {
          total: 66_851,
          withinAllowance: 19,
          overage: 0,
          blocked: 0,
          unavailable: 66_749,
          undecided: 83,
          unrecognized: 83,
        },
        unavailableMakers: ["Anthropic", "OpenAI", "DeepSeek", "Z.AI"],
        money: { planPrice: "10" },
      }),
    );
    check(verdict);
    expect(verdict.headline).toBe(
      "Copilot Pro can't run most of this workload: only 19 of 66,851 calls use models available on the plan.",
    );
  });

  it("mixed workload on a qualitative plan: what runs, what doesn't, and why capacity stays open", () => {
    const verdict = composeVerdict(
      facts({
        target: {
          kind: "subscription",
          name: "Claude Max 20x",
          providerName: "Anthropic",
          price: { amount: "200", interval: "month" },
          capacity: "unpublished",
        },
        calls: {
          total: 66_851,
          withinAllowance: 35_445,
          overage: 0,
          blocked: 0,
          unavailable: 31_323,
          undecided: 83,
          unrecognized: 83,
        },
        servedMakers: ["Anthropic"],
        unavailableMakers: ["OpenAI", "DeepSeek", "Z.AI"],
        money: { planPrice: "200" },
      }),
    );
    check(verdict);
    // Capacity is the question, and it cannot be answered: the verdict says
    // so first, and model availability follows as a quiet, labelled fact.
    expect(verdict.headline).toBe(
      "Whether Claude Max 20x would have kept up with your 66,851 calls can't be determined: Anthropic doesn't publish its usage limits as numbers.",
    );
    expect(verdict.support[0]).toBe(
      "Model availability only: 35,445 of your 66,851 calls (53.0–53.1%) use models Claude Max 20x offers, the ones on Anthropic models. The other 31,323 use OpenAI, DeepSeek and Z.AI models that aren't available there.",
    );
    expect(verdict.weight).toBe("quiet");
    expect(verdict.figure.caption).toMatch(/capacity unknown/u);
    expect(verdict.bound).toEqual({ low: 35_445 / 66_851, high: 35_528 / 66_851 });
    expect(verdict.support.join(" ")).toMatch(
      /83 of 66,851 calls \(0\.12%\) use model IDs StackReplay couldn't resolve/u,
    );
  });

  it("Direct API: a dollar figure that says it is not what you paid", () => {
    const verdict = composeVerdict(
      facts({
        target: {
          kind: "api",
          name: "Anthropic API",
          providerName: "Anthropic",
          capacity: "not-applicable",
        },
        scope: { kind: "all", recordedCalls: 35_375 },
        calls: {
          total: 35_375,
          withinAllowance: 35_375,
          overage: 0,
          blocked: 0,
          unavailable: 0,
          undecided: 0,
          unrecognized: 0,
        },
        periodDays: 32,
        money: { apiCost: "7733.845" },
      }),
    );
    check(verdict);
    expect(verdict.headline).toBe(
      "This recorded demand is worth $7,733.85 at Anthropic's published API rates over 32 days.",
    );
    expect(verdict.support[0]).toBe("That's a list-price equivalent, not what you paid.");
    expect(verdict.figure).toMatchObject({ value: "$7,733", minor: ".85", kind: "money" });
  });

  it("Direct API over the resolved scope states the scope in the first sentence", () => {
    const verdict = composeVerdict(
      facts({
        target: {
          kind: "api",
          name: "Anthropic API",
          providerName: "Anthropic",
          capacity: "not-applicable",
        },
        scope: { kind: "resolved", recordedCalls: 35_458 },
        calls: {
          total: 35_375,
          withinAllowance: 35_375,
          overage: 0,
          blocked: 0,
          unavailable: 0,
          undecided: 0,
          unrecognized: 0,
        },
        money: { apiCost: "7733.85" },
      }),
    );
    check(verdict);
    expect(verdict.headline).toMatch(
      /^Your 35,375 calls with recognized models are worth \$7,733\.85/u,
    );
    expect(verdict.support.join(" ")).toMatch(/83 calls with unrecognized model IDs are left out/u);
    expect(verdict.figure.caption).toBe(
      "35,375 of 35,458 calls · at Anthropic's published API rates · not what you paid",
    );
    expect(verdict.short).toBe("$7,733.85 at list prices · 35,375 of 35,458 calls");
  });

  it("Direct API that serves part of a mixed workload: the served share, not a refusal", () => {
    const verdict = composeVerdict(
      facts({
        target: {
          kind: "api",
          name: "OpenAI API",
          providerName: "OpenAI",
          capacity: "not-applicable",
        },
        calls: {
          total: 66_851,
          withinAllowance: 29_292,
          overage: 0,
          blocked: 0,
          unavailable: 37_476,
          undecided: 83,
          unrecognized: 83,
        },
        unavailableMakers: ["Anthropic", "DeepSeek", "Z.AI"],
        money: {},
      }),
    );
    check(verdict);
    expect(verdict.headline).toBe(
      "The OpenAI API offers the models behind 29,292 of your 66,851 calls (43.8–43.9%).",
    );
  });

  it("Translated: names the substitution and keeps the claim conditional", () => {
    const verdict = composeVerdict(
      facts({
        target: {
          kind: "subscription",
          name: "Claude Max 20x",
          providerName: "Anthropic",
          price: { amount: "200", interval: "month" },
          capacity: "unpublished",
        },
        mode: "translated",
        substitutions: [
          { from: "GPT-5.6 Sol", to: "Claude Opus 5.5", calls: 16_434 },
          { from: "GPT-6 Sol", to: "Claude Opus 5.5", calls: 4_687 },
        ],
        calls: {
          total: 66_851,
          withinAllowance: 66_768,
          overage: 0,
          blocked: 0,
          unavailable: 0,
          undecided: 83,
          unrecognized: 83,
        },
        money: { planPrice: "200" },
      }),
    );
    check(verdict);
    expect(verdict.modeLabel).toBe("Translated replay");
    expect(verdict.headline).toBe(
      "Under your model substitution, whether Claude Max 20x would have kept up with your 66,851 calls can't be determined: Anthropic doesn't publish its usage limits as numbers.",
    );
    expect(verdict.support[0]).toBe(
      "Model availability only: Claude Max 20x offers every model in your 66,768 calls with recognized models after your substitution. That shows the models are available there, not that its limits would hold.",
    );
    const support = verdict.support.join(" ");
    expect(support).toMatch(/Substitution you chose: GPT-5\.6 Sol → Claude Opus 5\.5/u);
    expect(support).toMatch(/nothing here says they would do the same work/u);
  });

  it("names models, not makers, when one maker is on both sides", () => {
    const verdict = composeVerdict(
      facts({
        target: {
          kind: "subscription",
          name: "Cursor Pro",
          providerName: "Cursor",
          price: { amount: "20", interval: "month" },
          capacity: "unpublished",
        },
        calls: {
          total: 2_600,
          withinAllowance: 1_387,
          overage: 0,
          blocked: 0,
          unavailable: 1_213,
          undecided: 0,
          unrecognized: 0,
        },
        servedMakers: ["GPT-5.6 Sol"],
        unavailableMakers: ["GPT-6 Sol", "GPT-6 Astra"],
        namedBy: "model",
        money: { planPrice: "20" },
      }),
    );
    check(verdict);
    expect(verdict.support[0]).toBe(
      "Model availability only: 1,387 of your 2,600 calls (53.3%) use models Cursor Pro offers, the ones on GPT-5.6 Sol. The other 1,213 use GPT-6 Sol and GPT-6 Astra, which aren't available there.",
    );
    const long = composeVerdict(
      facts({
        target: {
          kind: "subscription",
          name: "Copilot Pro",
          providerName: "GitHub",
          price: { amount: "10", interval: "month" },
          capacity: "numeric",
        },
        calls: {
          total: 5_000,
          withinAllowance: 1_332,
          overage: 0,
          blocked: 0,
          unavailable: 3_668,
          undecided: 0,
          unrecognized: 0,
        },
        unavailableMakers: ["Claude Opus 4.8", "GPT-5.6 Sol", "GPT-6 Sol", "GLM 5.3"],
        namedBy: "model",
        money: { planPrice: "10" },
      }),
    );
    expect(long.support[0]).toBe(
      "The other 3,668 use Claude Opus 4.8, GPT-5.6 Sol and 2 other models, which it doesn't offer.",
    );
  });

  it("a plan that runs none of the work says so with the count", () => {
    const verdict = composeVerdict(
      facts({
        target: {
          kind: "subscription",
          name: "Copilot Pro",
          providerName: "GitHub",
          price: { amount: "10", interval: "month" },
          capacity: "numeric",
        },
        calls: {
          total: 35_375,
          withinAllowance: 0,
          overage: 0,
          blocked: 0,
          unavailable: 35_375,
          undecided: 0,
          unrecognized: 0,
        },
        unavailableMakers: ["Anthropic"],
        money: { planPrice: "10" },
      }),
    );
    check(verdict);
    expect(verdict.headline).toBe(
      "Copilot Pro can't run this workload: none of your 35,375 calls use models it offers.",
    );
  });
});

describe("share text", () => {
  it("is precise enough to tell two ends of a range apart", () => {
    expect(shareText(19 / 66_851)).toBe("0.03%");
    expect(shareText(1)).toBe("100%");
    expect(shareText(0.99995)).toBe("99.9%");
    expect(boundText(0.53021, 0.53145)).toBe("53.0–53.1%");
    expect(boundText(0.97, 0.97012)).toBe("97.00–97.01%");
  });
});
