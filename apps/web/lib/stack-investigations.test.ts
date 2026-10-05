import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { describe, expect, it } from "vitest";
import { copyDefects } from "./copy-lint";
import type { TargetKey } from "./routes";
import {
  analyzeStack,
  publishedAllowanceIsSmaller,
  type StackPeriod,
  type StackWorkload,
  type WorkloadFacts,
} from "./stack-analysis";
import { investigations, MAX_INVESTIGATIONS, stackCoverage } from "./stack-investigations";

const rulesAsOf = DECISION_MARKET.rulesAt;
const PERIOD: StackPeriod = {
  kind: "billing",
  source: "custom",
  period: { start: "2026-08-24", end: "2026-09-24" },
  days: 31,
  ended: true,
};
// The shape of the owner's real stack and workload: three subscriptions, Claude Code history only.
const STACK: TargetKey[] = [
  "plan:anthropic-claude-max-5x",
  "plan:openai-chatgpt-pro-20x",
  "plan:command-code-pro",
];

function claude(overrides: Partial<WorkloadFacts> = {}): WorkloadFacts {
  return {
    calls: 29_173,
    knownTokens: 1_000_000,
    activeDays: 26,
    recognized: 29_173,
    priced: 29_173,
    value: { low: "6900", high: "7400" },
    models: [
      {
        id: "claude-opus-5-5",
        calls: 20_000,
        priced: 20_000,
        value: { low: "5000", high: "5400" },
      },
      {
        id: "claude-sonnet-5-5",
        calls: 9_173,
        priced: 9_173,
        value: { low: "1900", high: "2000" },
      },
    ],
    unresolvedCalls: 0,
    blocked: { attempts: 46, days: 14 },
    distinctResponses: true,
    ...overrides,
  };
}

function workload(facts: WorkloadFacts, options: Partial<StackWorkload> = {}): StackWorkload {
  return {
    period: PERIOD,
    overall: facts,
    importSources: [{ id: "claude-code", name: "Claude Code", events: facts.calls }],
    sources: { "claude-code": facts },
    ...options,
  };
}

function analyze(facts: WorkloadFacts, stack: TargetKey[] = STACK) {
  const load = workload(facts);
  const analysis = analyzeStack({ currentStack: stack, rulesAsOf, workload: load });
  return {
    load,
    analysis,
    found: investigations({ analysis, workload: load, currentStack: stack }),
  };
}

describe("analysis coverage", () => {
  it("is explicit when only one tool's history is loaded for a three-plan stack", () => {
    const { load, analysis } = analyze(claude());
    const coverage = stackCoverage(analysis, load);
    expect(coverage.analyzed).toBe(1);
    expect(coverage.total).toBe(3);
    expect(coverage.loadedTools).toEqual(["Claude Code"]);
    expect(coverage.lines.map((line) => [line.plan, line.state])).toEqual([
      ["Claude Max 5x", "loaded"],
      [expect.stringContaining("ChatGPT Pro"), "not-loaded"],
      ["Command Code Pro", "not-loaded"],
    ]);
    expect(coverage.headline).toMatch(
      /^Only Claude Code history is loaded, so 1 subscription of 3/u,
    );
    expect(coverage.headline).toContain("Command Code Pro");
    expect(coverage.headline).toMatch(/are not evaluated/u);
    expect(coverage.unanalyzedMonthly).toBeDefined();
  });

  it("says every subscription is covered only when it is", () => {
    const { load, analysis } = analyze(claude(), ["plan:anthropic-claude-max-5x"]);
    const coverage = stackCoverage(analysis, load);
    expect(coverage.analyzed).toBe(coverage.total);
    expect(coverage.headline).toMatch(/Every subscription/u);
  });

  it("claims nothing before a workload is selected", () => {
    const analysis = analyzeStack({ currentStack: STACK, rulesAsOf });
    const coverage = stackCoverage(analysis, undefined);
    expect(coverage.analyzed).toBe(0);
    expect(coverage.lines.every((line) => line.state === "no-workload")).toBe(true);
    expect(coverage.headline).toMatch(/Select a workload/u);
  });
});

describe("what to investigate", () => {
  it("leads with the cheaper-tier question and surfaces recorded capacity pressure", () => {
    const { found } = analyze(claude());
    const first = found[0];
    expect(first?.kind).toBe("tier-review");
    expect(first?.subject).toBe("Claude Max 5x → Claude Pro");
    const row = (id: string) => first?.rows.find((entry) => entry.id === id);
    expect(row("current")?.value).toBe("Claude Max 5x · $100/mo");
    expect(row("activity")?.value).toBe("29,173 responses");
    expect(row("activity")?.detail).toMatch(/26 of 31 days active · 2 models/u);
    expect(row("pressure")).toMatchObject({
      value: "46 blocked attempts across 14 days",
      evidence: "measured",
      tone: "warning",
    });
    expect(row("spend")?.value).toBe("−$80/mo");
    expect(first?.monthlyDelta).toBe("-80");
    expect(first?.action).toMatchObject({ kind: "test", label: "Analyze downgrade" });
    // The downgrade moves this subscription to the lower tier and keeps the others.
    expect(first?.action?.kind === "test" ? first.action.proposed.map((s) => s.plan) : []).toEqual([
      "plan:anthropic-claude-pro",
      "plan:openai-chatgpt-pro-20x",
      "plan:command-code-pro",
    ]);
  });

  it("never turns non-calculable capacity into a fit claim either way", () => {
    for (const facts of [
      claude(),
      claude({ blocked: { attempts: 0, days: 0 } }),
      claude({ blocked: undefined }),
    ]) {
      const review = analyze(facts).found.find((entry) => entry.kind === "tier-review");
      expect(review).toBeDefined();
      expect(review?.rows.find((entry) => entry.id === "fit")).toMatchObject({
        value: "Cannot be proven",
        evidence: "unknown",
      });
      const text = [
        ...(review?.rows ?? []).flatMap((entry) => [entry.label, entry.value, entry.detail ?? ""]),
        ...(review?.evidence ?? []).map((entry) => entry.text),
      ].join(" ");
      expect(text).not.toMatch(/\bwill (fit|fail)\b|\bfits\b|\bwould fit\b(?! [A-Z])/u);
      expect(text).not.toMatch(/\bsafe to downgrade\b|\bguaranteed\b/iu);
      expect(copyDefects(text)).toEqual([]);
    }
  });

  it("states recorded limits as likely more interruption, never certain failure", () => {
    const review = analyze(claude()).found[0];
    const likely = review?.evidence.find((entry) => entry.level === "likely");
    expect(likely?.text).toMatch(/likely to be interrupted more often/u);
    const none = analyze(claude({ blocked: { attempts: 0, days: 0 } })).found[0];
    expect(none?.evidence.some((entry) => entry.level === "likely")).toBe(false);
    expect(none?.rows.find((entry) => entry.id === "pressure")).toMatchObject({
      value: "No limit events recorded",
      tone: "positive",
    });
  });

  it("calls an allowance smaller only from a stated multiple, never from price", () => {
    const pro = "Pro usage allowance; five-hour and weekly limits";
    const max5 = "5× Pro session allowance; five-hour and weekly limits";
    const max20 = "20× Pro session allowance; five-hour and weekly limits";
    expect(publishedAllowanceIsSmaller(max5, pro)).toBe(true);
    expect(publishedAllowanceIsSmaller(max20, max5)).toBe(true);
    expect(publishedAllowanceIsSmaller(max5, max20)).toBe(false);
    expect(publishedAllowanceIsSmaller(pro, max5)).toBe(false);
    // ChatGPT Pro 200's revised terms publish no multiple of Plus.
    expect(
      publishedAllowanceIsSmaller(
        "Revised Work and Codex allowance with no published multiple of Plus; no five-hour limit",
        "Standard Work and Codex allowance; five-hour limit, weekly limits may apply",
      ),
    ).toBe(false);
  });

  it("says capacity pressure is not recorded when the history carries no limit events", () => {
    const review = analyze(claude({ blocked: undefined })).found[0];
    expect(review?.rows.find((entry) => entry.id === "pressure")).toMatchObject({
      value: "Not recorded",
      evidence: "unknown",
    });
  });

  it("names lower-tier model coverage from the published lineup, unresolved calls apart", () => {
    const review = analyze(
      claude({
        models: [
          { id: "claude-opus-5-5", calls: 20_000, priced: 20_000 },
          { id: "claude-sonnet-5-5", calls: 9_000, priced: 9_000 },
        ],
        unresolvedCalls: 173,
        recognized: 29_000,
      }),
    ).found[0];
    const lineup = review?.rows.find((entry) => entry.id === "lineup");
    expect(lineup?.label).toBe("Claude Pro model coverage");
    expect(lineup?.evidence).toBe("published");
    // Every resolved model is listed; the unresolved calls are named, not counted as covered.
    expect(lineup?.value).toBe("Lists all 2 recorded models");
    expect(lineup?.detail ?? "").toMatch(/173 calls with unresolved models not checked/u);
  });

  it("states lower-tier coverage as a share of every recorded call", () => {
    const review = analyze(
      claude({
        models: [
          { id: "claude-fable-5-1", calls: 20_000, priced: 20_000 },
          { id: "claude-opus-5-5", calls: 5_000, priced: 5_000 },
        ],
        unresolvedCalls: 4_173,
        recognized: 25_000,
      }),
    ).found[0];
    const lineup = review?.rows.find((entry) => entry.id === "lineup");
    // 5,000 listed calls of 29,173 recorded is 17%, not 5,000 of 25,000 resolved (20%).
    expect(lineup?.value).toBe("17% of recorded calls");
    expect(lineup?.detail).toMatch(/^Not listed: Claude Fable 5\.1 \(20,000\)/u);
    expect(lineup?.detail).toMatch(/4,173 calls with unresolved models not checked/u);
  });

  it("surfaces the subscriptions this workload cannot see, with the spend at stake", () => {
    const { found } = analyze(claude());
    const gap = found.find((entry) => entry.kind === "coverage-gap");
    expect(gap).toBeDefined();
    expect(gap?.subject).toContain("Command Code Pro");
    expect(gap?.rows.find((entry) => entry.id === "loaded")?.value).toBe("Claude Code");
    expect(gap?.atStake).toBeDefined();
    expect(gap?.action).toMatchObject({ kind: "link", href: "/app/scan" });
  });

  it("shows at most three findings and never a leverage headline", () => {
    const { found } = analyze(claude());
    expect(found.length).toBeLessThanOrEqual(MAX_INVESTIGATIONS);
    expect(found.some((entry) => (entry.kind as string) === "leverage")).toBe(false);
    const text = found.flatMap((entry) => [entry.question, entry.subject]).join(" ");
    expect(text).not.toMatch(/leverage/iu);
  });

  it("adds nothing to fill space when there is no workload or no recorded call", () => {
    const analysis = analyzeStack({ currentStack: STACK, rulesAsOf });
    expect(investigations({ analysis, workload: undefined, currentStack: STACK })).toEqual([]);
    const empty = claude({
      calls: 0,
      models: [],
      value: undefined,
      activeDays: 0,
      priced: 0,
      recognized: 0,
    });
    expect(analyze(empty).found.filter((entry) => entry.kind === "tier-review")).toEqual([]);
  });
});
