import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { describe, expect, it } from "vitest";
import { copyDefects } from "./copy-lint";
import type { MarketDecision } from "./market-decision";
import type { TargetKey } from "./routes";
import {
  alignProposal,
  analyzeScenario,
  analyzeStack,
  computeLeverage,
  leverageText,
  paidForPeriod,
  parseStackParam,
  ratioText,
  resolveStackPeriod,
  type StackAnalysis,
  type StackPeriod,
  type StackWorkload,
  stackAssessmentLines,
  stackParam,
  stackPeriodLabel,
  subscriptionsOf,
  type WorkloadFacts,
  workloadFacts,
} from "./stack-analysis";

const rulesAsOf = DECISION_MARKET.rulesAt;
/** The plan keys of a proposed stack, in order. */
const plansOf = (stack: readonly { plan: TargetKey }[] | undefined) =>
  (stack ?? []).map((entry) => entry.plan);
const SEPTEMBER: StackPeriod = {
  kind: "billing",
  source: "cycle",
  period: { start: "2026-08-24", end: "2026-09-24" },
  days: 31,
  ended: true,
};

function facts(overrides: Partial<WorkloadFacts> & { calls: number }): WorkloadFacts {
  return {
    knownTokens: overrides.calls * 1000,
    activeDays: overrides.calls ? 20 : 0,
    recognized: overrides.calls - (overrides.unresolvedCalls ?? 0),
    priced: overrides.value ? overrides.calls : 0,
    models: [],
    unresolvedCalls: 0,
    distinctResponses: true,
    ...overrides,
  };
}

const claude = facts({
  calls: 17_800,
  value: { low: "4820", high: "5300" },
  models: [
    { id: "claude-fable-5-1", calls: 9000, priced: 9000, value: { low: "3000", high: "3300" } },
    { id: "claude-opus-5", calls: 8800, priced: 8800, value: { low: "1820", high: "2000" } },
  ],
  blocked: { attempts: 0, days: 0 },
});
const codex = facts({
  calls: 11_000,
  value: { low: "2100", high: "2100" },
  models: [{ id: "gpt-6-sol", calls: 11_000, priced: 11_000 }],
});
const opencode = facts({
  calls: 374,
  value: { low: "31.5", high: "31.5" },
  models: [
    { id: "claude-sonnet-5", calls: 200, priced: 200 },
    { id: "gpt-5-6-sol", calls: 174, priced: 174 },
  ],
});

function workload(
  sources: Record<string, WorkloadFacts>,
  options: Partial<StackWorkload> = {},
): StackWorkload {
  const calls = Object.values(sources).reduce((sum, f) => sum + f.calls, 0);
  const names: Record<string, string> = {
    "claude-code": "Claude Code",
    codex: "Codex",
    "command-code": "Command Code",
    opencode: "OpenCode",
    hermes: "Hermes",
  };
  return {
    period: SEPTEMBER,
    overall: facts({ calls }),
    importSources: Object.keys(sources).map((id) => ({
      id,
      name: names[id] ?? id,
      events: Math.max(1, sources[id]?.calls ?? 0),
    })),
    sources,
    confirmation: { scope: "all" },
    ...options,
  };
}

function everyText(analysis: StackAnalysis): string[] {
  return [
    ...analysis.subscriptions.flatMap((r) => r.evidence.map((e) => e.text)),
    ...analysis.opportunities.flatMap((o) => [
      o.question,
      o.subject,
      o.statement,
      ...o.figures.map((f) => `${f.label} ${f.value}`),
      ...o.evidence.map((e) => e.text),
    ]),
    analysis.leverage?.note ?? "",
    analysis.leverageNote ?? "",
  ];
}

describe("stack analysis", () => {
  it("an empty stack reports nothing to act on and invents no bill", () => {
    const analysis = analyzeStack({ currentStack: [], rulesAsOf });
    expect(analysis.subscriptions).toEqual([]);
    expect(analysis.opportunities).toEqual([]);
    expect(analysis.monthly).toBeUndefined();
    expect(analysis.leverage).toBeUndefined();
    const withWork = analyzeStack({
      currentStack: [],
      rulesAsOf,
      workload: workload({ "claude-code": claude }),
    });
    expect(withWork.opportunities).toEqual([]);
    expect(withWork.outside.map((w) => w.sourceId)).toEqual(["claude-code"]);
  });

  it("one confirmed subscription: association, exact leverage and measured evidence", () => {
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload({ "claude-code": claude }),
    });
    const report = analysis.subscriptions[0];
    expect(report).toMatchObject({
      visibility: "visible",
      monthlyUsd: "200",
      family: { groupId: "claude", tool: "Claude Code" },
    });
    expect(report?.activity?.share).toBe(1);
    expect(report?.activity?.confirmed).toBe(true);
    // Exact decimal arithmetic: 4,820 / 200 and 5,300 / 200.
    expect(report?.leverage).toMatchObject({
      low: "24.1",
      high: "26.5",
      price: "200",
      priceBasis: "published",
      subset: false,
      level: "measured",
    });
    expect(leverageText(report?.leverage ?? { low: "0", high: "0", subset: false })).toBe(
      "24.1×–26.5×",
    );
    expect(analysis.leverage).toMatchObject({ low: "24.1", high: "26.5", level: "measured" });
    expect(analysis.monthly).toBe("200");
    // Plan fit is never claimed.
    expect(
      report?.evidence.some((e) => e.level === "unknown" && /Plan fit cannot/u.test(e.text)),
    ).toBe(true);
    expect(
      report?.evidence.find((e) => e.level === "measured" && /limit events/u.test(e.text)),
    ).toBeTruthy();
    expect(everyText(analysis).flatMap(copyDefects)).toEqual([]);
  });

  it("several subscriptions: prices add exactly and each tool is associated once", () => {
    const analysis = analyzeStack({
      currentStack: [
        "plan:anthropic-claude-max-20x",
        "plan:openai-chatgpt-pro",
        "plan:command-code-pro",
        "plan:opencode-go",
        "plan:cursor-pro",
        "api:openai",
      ],
      rulesAsOf,
      workload: workload({ "claude-code": claude, codex, opencode }),
    });
    expect(analysis.monthly).toBe("350");
    expect(analysis.planCount).toBe(5);
    const byId = Object.fromEntries(analysis.subscriptions.map((r) => [r.id, r]));
    expect(byId["command-code-pro"]?.visibility).toBe("not-imported");
    expect(byId["cursor-pro"]?.visibility).toBe("not-readable");
    expect(analysis.notReadable).toEqual(["Cursor Pro"]);
    // Command Code history was never imported: no "unused" claim about it.
    expect(analysis.opportunities.some((o) => o.subject === "Command Code Pro")).toBe(false);
    // Stack leverage covers readable plans only; Cursor's price is not in the denominator.
    expect(analysis.leveragePlans).not.toContain("Cursor Pro");
    expect(analysis.leverage?.price).toBe("310");
    expect(everyText(analysis).flatMap(copyDefects)).toEqual([]);
  });

  it("confirmed vs unconfirmed periods change the evidence level, never the arithmetic", () => {
    const confirmed = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload({ "claude-code": claude }),
    });
    const unconfirmed = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload({ "claude-code": claude }, { confirmation: undefined }),
    });
    expect(unconfirmed.leverage?.low).toBe(confirmed.leverage?.low);
    expect(confirmed.leverage?.level).toBe("measured");
    expect(unconfirmed.leverage?.level).toBe("estimated");
    expect(unconfirmed.leverage?.note).toMatch(/not confirmed/u);
    expect(unconfirmed.subscriptions[0]?.evidence[0]?.level).toBe("estimated");

    const recorded = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload(
        { "claude-code": claude },
        {
          period: {
            kind: "recorded",
            period: { start: "2026-08-24", end: "2026-09-24" },
            days: 31,
          },
        },
      ),
    });
    expect(recorded.leverage?.level).toBe("estimated");
    expect(recorded.leverage?.note).toMatch(/not a confirmed billing cycle/u);

    const inProgress = computeLeverage({
      facts: claude,
      price: "200",
      priceBasis: "published",
      period: { ...SEPTEMBER, ended: false },
      confirmed: true,
    });
    expect(inProgress.leverage?.level).toBe("estimated");
    expect(inProgress.leverage?.note).toMatch(/has not ended/u);
  });

  it("an account-scoped confirmation covers only that account's tool and call count", () => {
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x", "plan:openai-chatgpt-pro"],
      rulesAsOf,
      workload: workload(
        { "claude-code": claude, codex },
        { confirmation: { scope: "account", sourceId: "claude-code", calls: claude.calls } },
      ),
    });
    const [max, pro] = analysis.subscriptions;
    expect(max?.activity?.confirmed).toBe(true);
    expect(pro?.activity?.confirmed).toBe(false);
    expect(analysis.leverage?.level).toBe("estimated");
    const otherAccount = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload(
        { "claude-code": claude },
        { confirmation: { scope: "account", sourceId: "claude-code", calls: 12 } },
      ),
    });
    expect(otherAccount.subscriptions[0]?.activity?.confirmed).toBe(false);
  });

  it("a period shorter than a month or an unbounded history withholds leverage", () => {
    const week = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload(
        { "claude-code": claude },
        {
          period: { kind: "recorded", period: { start: "2026-09-14", end: "2026-09-21" }, days: 7 },
        },
      ),
    });
    expect(week.leverage).toBeUndefined();
    expect(week.leverageNote).toMatch(/covers 7 days/u);
    expect(week.subscriptions[0]?.leverage).toBeUndefined();
    const long = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload(
        { "claude-code": claude },
        { period: { kind: "unbounded", firstDate: "2026-07-01", lastDate: "2026-09-20" } },
      ),
    });
    expect(long.leverage).toBeUndefined();
    expect(long.leverageNote).toMatch(/Choose a billing period/u);
  });

  it("a subscription with no activity in an imported tool becomes a removal finding", () => {
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x", "plan:command-code-pro"],
      rulesAsOf,
      workload: workload({ "claude-code": claude, "command-code": facts({ calls: 0 }) }),
    });
    const unused = analysis.opportunities.find((o) => o.kind === "unused");
    expect(unused).toMatchObject({
      subject: "Command Code Pro",
      monthlyDelta: "-20",
      test: { label: "Test removing it" },
    });
    expect(plansOf(unused?.test?.proposed)).toEqual(["plan:anthropic-claude-max-20x"]);
    expect(unused?.statement).toMatch(/imported histories for Aug 24, 2026 – Sep 23, 2026/u);
    expect(
      unused?.evidence.some((e) => e.level === "unknown" && /outside the histories/u.test(e.text)),
    ).toBe(true);
    // Its price still counts against stack leverage.
    expect(analysis.leverage?.price).toBe("220");
    expect(analysis.leverage?.note).toMatch(/Includes Command Code Pro with no recorded activity/u);
  });

  it("no findings when the period has no recorded calls at all", () => {
    const analysis = analyzeStack({
      currentStack: ["plan:command-code-pro"],
      rulesAsOf,
      workload: workload({ "command-code": facts({ calls: 0 }) }),
    });
    expect(analysis.opportunities).toEqual([]);
  });

  it("partial activity: a small share of calls is a low-use finding with its API value", () => {
    const small = facts({
      calls: 300,
      value: { low: "12", high: "12" },
      models: [{ id: "gpt-6-sol", calls: 300, priced: 300 }],
    });
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x", "plan:command-code-pro"],
      rulesAsOf,
      workload: workload({ "claude-code": claude, "command-code": small }),
    });
    const low = analysis.opportunities.find((o) => o.kind === "low-use");
    expect(low?.subject).toBe("Command Code Pro");
    expect(low?.statement).toMatch(/recorded work is valued at \$12\.00/u);
    expect(low?.test?.label).toBe("Replay without it");
  });

  it("a recorded tool whose calls all used models outside the plan's lineup is flagged", () => {
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x", "plan:opencode-go"],
      rulesAsOf,
      workload: workload({ "claude-code": claude, opencode }),
    });
    const off = analysis.opportunities.find((o) => o.kind === "off-lineup");
    expect(off?.subject).toBe("OpenCode Go");
    expect(off?.statement).toMatch(/None of the 374 recorded calls from OpenCode/u);
  });

  it("leverage counts only work on models the plan's published lineup lists", () => {
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-pro"],
      rulesAsOf,
      workload: workload({ "claude-code": claude }),
    });
    const leverage = analysis.subscriptions[0]?.leverage;
    // Claude Pro lists Opus 5 but not Fable 5.1: $1,820–$2,000 over $20.
    expect(leverage).toMatchObject({
      low: "91",
      high: "100",
      value: { low: "1820", high: "2000" },
      calls: 8800,
      excludedCalls: 9000,
      subset: false,
    });
    expect(leverage?.note).toMatch(
      /Counts the 8,800 calls on models Claude Pro lists; 9,000 other/u,
    );
    // A plan whose associated calls used none of its models has no leverage,
    // and its price still counts against the stack.
    const off = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x", "plan:opencode-go"],
      rulesAsOf,
      workload: workload({ "claude-code": claude, opencode }),
    });
    const go = off.subscriptions.find((r) => r.id === "opencode-go");
    expect(go?.leverage).toBeUndefined();
    expect(go?.leverageNote).toMatch(/None of the 374 associated calls used a model/u);
    expect(off.leverage?.price).toBe("210");
    expect(off.leverage?.note).toMatch(
      /Includes OpenCode Go, whose associated calls used no model/u,
    );
    expect(off.opportunities.find((o) => o.kind === "leverage")?.subject).toBe("Claude Max 20x");
  });

  it("partially priced work yields a floor, labelled, and never a whole-workload ratio", () => {
    const partial = facts({
      calls: 1000,
      pricedValue: { low: "900", high: "1000", calls: 800 },
      models: [{ id: "claude-opus-5", calls: 800, priced: 800 }],
      unresolvedCalls: 200,
    });
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-5x"],
      rulesAsOf,
      workload: workload({ "claude-code": partial }),
    });
    const leverage = analysis.subscriptions[0]?.leverage;
    expect(leverage).toMatchObject({
      subset: true,
      pricedCalls: 800,
      calls: 1000,
      level: "estimated",
    });
    expect(leverageText(leverage ?? { low: "0", high: "0", subset: true })).toBe("≥ 9.0×–10.0×");
    expect(leverage?.note).toMatch(/Priced calls only: 800 of 1,000/u);
    // A floor is never used to call a subscription under-used.
    expect(analysis.opportunities.some((o) => o.kind === "low-use")).toBe(false);
    expect(analysis.opportunities.some((o) => o.kind === "leverage")).toBe(false);
  });

  it("unresolved identities keep consolidation from over-claiming coverage", () => {
    const unresolved = facts({
      calls: 1000,
      value: undefined,
      pricedValue: { low: "10", high: "10", calls: 300 },
      models: [{ id: "gpt-6-sol", calls: 300, priced: 300 }],
      unresolvedCalls: 700,
    });
    const analysis = analyzeStack({
      currentStack: ["plan:openai-chatgpt-pro", "plan:command-code-pro"],
      rulesAsOf,
      workload: workload({ codex, "command-code": unresolved }),
    });
    expect(analysis.opportunities.some((o) => o.kind === "consolidate")).toBe(false);
    const resolved = analyzeStack({
      currentStack: ["plan:openai-chatgpt-pro", "plan:command-code-pro"],
      rulesAsOf,
      workload: workload({
        codex,
        "command-code": facts({
          calls: 3000,
          value: { low: "420", high: "420" },
          models: [{ id: "gpt-5-6-sol", calls: 3000, priced: 3000 }],
        }),
      }),
    });
    // Only the smaller tool folds into the plan that already carries more work;
    // Codex is never proposed to move onto Command Code Pro.
    const consolidations = resolved.opportunities.filter((o) => o.kind === "consolidate");
    expect(consolidations).toHaveLength(1);
    const consolidate = consolidations[0];
    expect(consolidate?.subject).toBe("Command Code Pro → ChatGPT Pro 100");
    expect(consolidate?.evidence[0]?.level).toBe("estimated");
    expect(consolidate?.evidence[0]?.text).toMatch(/Sign in with ChatGPT/u);
  });

  it("a cheaper tier listing every recorded model is a downgrade finding; recorded limits suppress it", () => {
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload({ "claude-code": claude }),
    });
    const downgrade = analysis.opportunities.find((o) => o.kind === "downgrade");
    expect(downgrade).toMatchObject({
      subject: "Claude Max 20x → Claude Max 5x",
      monthlyDelta: "-100",
      test: { label: "Test $100 plan" },
    });
    expect(plansOf(downgrade?.test?.proposed)).toEqual(["plan:anthropic-claude-max-5x"]);
    expect(downgrade?.evidence.map((e) => e.level)).toEqual(["published", "measured", "unknown"]);
    expect(downgrade?.evidence[0]?.text).toMatch(/20× Pro session allowance → 5× Pro/u);
    // Claude Pro lacks Fable 5.1 in its included lineup, so it is never the suggestion.
    expect(
      analysis.subscriptions[0]?.tiers.find((t) => t.id === "anthropic-claude-pro")?.missing,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ id: "claude-fable-5-1" })]));
    const blocked = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload({ "claude-code": { ...claude, blocked: { attempts: 7, days: 3 } } }),
    });
    expect(blocked.opportunities.some((o) => o.kind === "downgrade")).toBe(false);
    // The factual leverage highlight remains, never a value judgement.
    const lever = analysis.opportunities.find((o) => o.kind === "leverage");
    expect(lever?.statement).toMatch(/24\.1×–26\.5× its \$200 monthly price/u);
    expect(lever?.evidence.some((e) => /Not money saved/u.test(e.text))).toBe(true);
  });

  it("work outside the stack is surfaced, unless the person said it is billed another way", () => {
    const outside = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload({ "claude-code": claude, codex }),
    });
    expect(outside.outside.map((w) => w.sourceId)).toEqual(["codex"]);
    const uncovered = outside.opportunities.find((o) => o.kind === "uncovered");
    expect(plansOf(uncovered?.test?.proposed)).toEqual([
      "plan:anthropic-claude-max-20x",
      "plan:openai-chatgpt-plus",
    ]);
    const answered = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload({ "claude-code": claude, codex }),
      familyResponses: { chatgpt: "api-other" },
    });
    expect(answered.opportunities.some((o) => o.kind === "uncovered")).toBe(false);
  });

  it("uses locally entered paid amounts for exactly this period", () => {
    const paid = paidForPeriod(
      {
        "plan:anthropic-claude-max-20x": {
          cycle: SEPTEMBER.kind === "billing" ? SEPTEMBER.period : undefined,
          paid: "180",
          provenance: "local-user",
        },
        "plan:openai-chatgpt-pro": {
          cycle: { start: "2026-09-01", end: "2026-10-01" },
          paid: "100",
          provenance: "local-user",
        },
      },
      SEPTEMBER,
    );
    expect(paid).toEqual({ "plan:anthropic-claude-max-20x": "180" });
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload({ "claude-code": claude }, { paid }),
    });
    expect(analysis.subscriptions[0]?.leverage).toMatchObject({ price: "180", priceBasis: "paid" });
    expect(paidForPeriod({}, { kind: "unbounded" })).toEqual({});
  });

  it("an unavailable selection is kept, never priced or analyzed", () => {
    const analysis = analyzeStack({
      currentStack: ["plan:retired-plan"],
      rulesAsOf,
      workload: workload({ "claude-code": claude }),
    });
    expect(analysis.subscriptions[0]).toMatchObject({
      available: false,
      visibility: "not-readable",
      monthlyUsd: undefined,
    });
    expect(analysis.monthly).toBeUndefined();
  });
});

describe("review fixes: evidence follows confirmation and scope", () => {
  it("stack leverage is estimated when an unused plan's tool is not covered by the confirmation", () => {
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x", "plan:openai-chatgpt-plus"],
      rulesAsOf,
      workload: workload(
        { "claude-code": claude, codex: facts({ calls: 0 }) },
        { confirmation: { scope: "account", sourceId: "claude-code", calls: claude.calls } },
      ),
    });
    expect(analysis.subscriptions[0]?.leverage?.level).toBe("measured");
    expect(analysis.leverage?.price).toBe("220");
    expect(analysis.leverage?.level).toBe("estimated");
    const all = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x", "plan:openai-chatgpt-plus"],
      rulesAsOf,
      workload: workload({ "claude-code": claude, codex: facts({ calls: 0 }) }),
    });
    expect(all.leverage?.level).toBe("measured");
  });

  it("the absence of limit events and outside work are estimated without confirmation", () => {
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload({ "claude-code": claude, codex }, { confirmation: undefined }),
    });
    const noLimits = analysis.subscriptions[0]?.evidence.find((e) =>
      /No limit events/u.test(e.text),
    );
    expect(noLimits?.level).toBe("estimated");
    expect(analysis.opportunities.find((o) => o.kind === "downgrade")?.evidence[1]?.level).toBe(
      "estimated",
    );
    const uncovered = analysis.opportunities.find((o) => o.kind === "uncovered");
    expect(uncovered?.evidence[0]?.level).toBe("estimated");
    expect(uncovered?.evidence.some((e) => /not a bill/u.test(e.text))).toBe(true);
    const blocked = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload(
        { "claude-code": { ...claude, blocked: { attempts: 3, days: 2 } } },
        { confirmation: undefined },
      ),
    });
    // A recorded limit is an observation either way.
    expect(
      blocked.subscriptions[0]?.evidence.find((e) => /blocked attempts/u.test(e.text))?.level,
    ).toBe("measured");
  });

  it("outside work is compared with a monthly price only over a month-long period", () => {
    const week = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload(
        { "claude-code": claude, codex },
        {
          period: { kind: "recorded", period: { start: "2026-09-14", end: "2026-09-21" }, days: 7 },
        },
      ),
    });
    expect(week.opportunities.some((o) => o.kind === "uncovered")).toBe(false);
    const long = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload(
        { "claude-code": claude, codex },
        { period: { kind: "unbounded", firstDate: "2026-06-01", lastDate: "2026-09-20" } },
      ),
    });
    expect(long.opportunities.some((o) => o.kind === "uncovered")).toBe(false);
  });

  it("unresolved models never make a lineup claim true by default", () => {
    const unresolved = facts({
      calls: 500,
      models: [],
      unresolvedCalls: 500,
      pricedValue: undefined,
    });
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x"],
      rulesAsOf,
      workload: workload({ "claude-code": unresolved }),
    });
    expect(analysis.opportunities.some((o) => o.kind === "downgrade")).toBe(false);
    const scenario = analyzeScenario({
      current: ["plan:anthropic-claude-max-20x"],
      proposed: ["plan:anthropic-claude-pro"],
      workload: workload({ "claude-code": unresolved }),
      rulesAsOf,
    });
    const lineup = scenario.changes[0]?.findings.find((f) => /lineup/u.test(f.text));
    expect(lineup).toMatchObject({ level: "unknown" });
    expect(lineup?.text).toMatch(/cannot be checked/u);
  });

  it("a cycle still in progress never reads as under-used", () => {
    const small = facts({
      calls: 300,
      value: { low: "12", high: "12" },
      models: [{ id: "gpt-6-sol", calls: 300, priced: 300 }],
    });
    const running = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-20x", "plan:openai-chatgpt-pro"],
      rulesAsOf,
      workload: workload(
        { "claude-code": claude, codex: { ...small, calls: 3000 } },
        { period: { ...SEPTEMBER, ended: false } },
      ),
    });
    expect(running.opportunities.some((o) => o.kind === "low-use")).toBe(false);
  });

  it("priced subsets are labelled wherever they appear, including saved lines without dates", () => {
    const partial = facts({
      calls: 3000,
      pricedValue: { low: "300", high: "300", calls: 2800 },
      models: [{ id: "gpt-5-6-sol", calls: 2800, priced: 2800 }],
      unresolvedCalls: 200,
    });
    const analysis = analyzeStack({
      currentStack: ["plan:openai-chatgpt-pro", "plan:command-code-pro"],
      rulesAsOf,
      workload: workload({ codex, "command-code": partial }),
    });
    const consolidate = analysis.opportunities.find((o) => o.kind === "consolidate");
    expect(consolidate?.figures.find((f) => /API-equivalent/u.test(f.label))?.label).toBe(
      "API-equivalent, priced calls",
    );
    const scenario = analyzeScenario({
      current: ["plan:command-code-pro"],
      proposed: [],
      workload: workload({ "command-code": partial }),
      rulesAsOf,
    });
    expect(scenario.changes[0]?.findings.map((f) => f.text).join(" ")).toMatch(
      /its 2,800 priced calls are valued at \$300\.00; the rest are unknown, not zero/u,
    );
    const lines = stackAssessmentLines(scenario, workload({ "command-code": partial }));
    expect(lines[0]).toBe("31-day billing cycle · 3,000 recorded calls.");
    expect(lines.join(" ")).toMatch(/for 2,800 priced calls only/u);
    expect(lines.join(" ")).not.toMatch(/2026/u);
    expect(lines.at(-1)).toMatch(/plan fit is not claimed/u);
  });
});

describe("stack periods", () => {
  const base = { billing: {}, asOf: "2026-09-30" };
  it("uses a chosen billing cycle or custom period before recorded dates", () => {
    const cycle = resolveStackPeriod({
      ...base,
      choice: { mode: "cycle", subscription: "plan:anthropic-claude-max-5x" },
      billing: {
        "plan:anthropic-claude-max-5x": {
          cycle: { start: "2026-08-24", end: "2026-09-24" },
          provenance: "local-user",
        },
      },
      firstEventAt: "2026-08-01T00:00:00Z",
      lastEventAt: "2026-09-29T00:00:00Z",
    });
    expect(cycle).toMatchObject({ kind: "billing", source: "cycle", days: 31, ended: true });
    expect(stackPeriodLabel(cycle)).toBe("Aug 24, 2026 – Sep 23, 2026");
    const running = resolveStackPeriod({
      ...base,
      choice: { mode: "custom", period: { start: "2026-09-15", end: "2026-10-15" } },
    });
    expect(running).toMatchObject({ kind: "billing", source: "custom", ended: false });
  });
  it("labels a short recorded span and refuses to cut a long one to 30 days", () => {
    const recorded = resolveStackPeriod({
      ...base,
      choice: { mode: "history" },
      firstEventAt: "2026-09-01T10:00:00Z",
      lastEventAt: "2026-09-30T23:00:00Z",
    });
    expect(recorded).toEqual({
      kind: "recorded",
      period: { start: "2026-09-01", end: "2026-10-01" },
      days: 30,
    });
    const long = resolveStackPeriod({
      ...base,
      choice: { mode: "history" },
      firstEventAt: "2026-07-01T00:00:00Z",
      lastEventAt: "2026-09-20T00:00:00Z",
    });
    expect(long).toEqual({ kind: "unbounded", firstDate: "2026-07-01", lastDate: "2026-09-20" });
    expect(resolveStackPeriod({ ...base, choice: { mode: "history" } })).toEqual({
      kind: "unbounded",
    });
  });
});

describe("scenarios", () => {
  const current: TargetKey[] = [
    "plan:anthropic-claude-max-20x",
    "plan:openai-chatgpt-pro",
    "plan:command-code-pro",
    "plan:opencode-go",
  ];
  const work = workload({
    "claude-code": claude,
    codex,
    opencode,
    "command-code": facts({ calls: 0 }),
  });

  it("an unchanged proposal (reset) reports no change", () => {
    const result = analyzeScenario({ current, proposed: [...current], workload: work, rulesAsOf });
    expect(result).toMatchObject({ unchanged: true, monthlyDelta: "0", changes: [] });
  });

  it("removing a subscription: exact spend change and what happens to its recorded work", () => {
    const result = analyzeScenario({
      current,
      proposed: current.filter((k) => k !== "plan:opencode-go" && k !== "plan:command-code-pro"),
      workload: work,
      rulesAsOf,
    });
    expect(result.currentMonthly).toBe("330");
    expect(result.proposedMonthly).toBe("300");
    expect(result.monthlyDelta).toBe("-30");
    const commandCode = result.changes.find((c) => c.title === "Remove Command Code Pro");
    expect(commandCode?.findings[0]?.text).toMatch(/No Command Code activity/u);
    const openCode = result.changes.find((c) => c.title === "Remove OpenCode Go");
    expect(openCode?.monthlyDelta).toBe("-10");
    expect(openCode?.findings[0]?.text).toMatch(/Affects 374 recorded calls from OpenCode/u);
    // Claude Max 20x lists Claude Sonnet 5 but not GPT-5.6 Sol: 53% of the calls.
    expect(openCode?.findings[1]).toMatchObject({ level: "estimated" });
    expect(openCode?.findings[1]?.text).toMatch(/Claude Max 20x lists the models for 53%/u);
    expect(openCode?.findings.at(-1)?.level).toBe("unknown");
    expect(result.uncovered).toBeUndefined();
  });

  it("removing the only plan that lists a tool's models leaves priced work uncovered", () => {
    const result = analyzeScenario({
      current: ["plan:openai-chatgpt-pro"],
      proposed: [],
      workload: workload({ codex }),
      rulesAsOf,
    });
    expect(result.monthlyDelta).toBe("-100");
    expect(result.changes[0]?.findings[1]?.text).toMatch(
      /No plan in the proposed stack lists these models\. At current direct API rates this recorded work is valued at \$2,100\.00\./u,
    );
    expect(result.uncovered).toEqual({
      calls: 11_000,
      tools: ["Codex"],
      pricedCalls: 11_000,
      value: { low: "2100", high: "2100" },
    });
  });

  it("changing a tier: published allowance, lineup, recorded limits and an undetermined fit", () => {
    const blocked = workload({ "claude-code": { ...claude, blocked: { attempts: 7, days: 3 } } });
    const result = analyzeScenario({
      current: ["plan:anthropic-claude-max-20x"],
      proposed: ["plan:anthropic-claude-max-5x"],
      workload: blocked,
      rulesAsOf,
    });
    const change = result.changes[0];
    expect(change?.title).toBe("Claude Max 20x → Claude Max 5x");
    expect(change?.monthlyDelta).toBe("-100");
    expect(change?.findings.map((f) => f.level)).toEqual([
      "published",
      "measured",
      "published",
      "measured",
      "likely",
      "unknown",
    ]);
    expect(change?.findings.at(-1)?.text).toMatch(
      /Cannot determine whether every recorded request would fit Claude Max 5x/u,
    );
    const toPro = analyzeScenario({
      current: ["plan:anthropic-claude-max-20x"],
      proposed: ["plan:anthropic-claude-pro"],
      workload: work,
      rulesAsOf,
    });
    expect(
      toPro.changes[0]?.findings.some((f) => /does not include Claude Fable 5\.1/u.test(f.text)),
    ).toBe(true);
  });

  it("adding a plan for work outside the stack, and a plan StackReplay cannot read", () => {
    const result = analyzeScenario({
      current: ["plan:anthropic-claude-max-20x"],
      proposed: ["plan:anthropic-claude-max-20x", "plan:openai-chatgpt-plus", "plan:cursor-pro"],
      workload: workload({ "claude-code": claude, codex }),
      rulesAsOf,
    });
    expect(result.monthlyDelta).toBe("40");
    const plus = result.changes.find((c) => c.title === "Add ChatGPT Plus");
    expect(plus?.findings[0]?.text).toMatch(/no associated subscription in your current stack/u);
    expect(plus?.findings[1]?.text).toBe(
      "ChatGPT Plus lists the model recorded from Codex in this period.",
    );
    const cursor = result.changes.find((c) => c.title === "Add Cursor Pro");
    expect(cursor?.findings[0]?.level).toBe("unknown");
  });

  it("scenario copy has no template defects", () => {
    const result = analyzeScenario({
      current,
      proposed: ["plan:anthropic-claude-max-5x", "plan:openai-chatgpt-plus", "plan:cursor-pro"],
      workload: work,
      rulesAsOf,
    });
    expect(
      result.changes
        .flatMap((c) => [c.title, ...c.findings.map((f) => f.text)])
        .flatMap(copyDefects),
    ).toEqual([]);
  });

  it("Replay links carry catalog ids and local account keys only, and reject anything else", () => {
    expect(stackParam(["plan:anthropic-claude-max-5x", "api:openai", "plan:opencode-go"])).toBe(
      "anthropic-claude-max-5x,opencode-go",
    );
    // A repeated plan is a second subscription, so it is kept.
    expect(
      plansOf(parseStackParam("anthropic-claude-max-5x,<script>,opencode-go,opencode-go")),
    ).toEqual(["plan:anthropic-claude-max-5x", "plan:opencode-go", "plan:opencode-go"]);
    // Account links survive the round trip; anything not a local account key is dropped.
    const linked = [
      { id: "a1", plan: "plan:anthropic-claude-max-5x" as const, account: "claude-code:sr_abc" },
      { id: "a2", plan: "plan:anthropic-claude-pro" as const, account: "claude-code:sr_def" },
    ];
    const param = stackParam(linked);
    expect(param).toBe(
      "anthropic-claude-max-5x@claude-code:sr_abc,anthropic-claude-pro@claude-code:sr_def",
    );
    expect(parseStackParam(param)?.map((entry) => [entry.plan, entry.account])).toEqual([
      ["plan:anthropic-claude-max-5x", "claude-code:sr_abc"],
      ["plan:anthropic-claude-pro", "claude-code:sr_def"],
    ]);
    expect(parseStackParam("anthropic-claude-pro@/home/me/.claude")?.[0]?.account).toBeUndefined();
    expect(parseStackParam(undefined)).toBeUndefined();
  });

  it("pairs a linked proposal with the subscriptions it repeats", () => {
    const current = [
      { id: "s1", plan: "plan:anthropic-claude-max-20x" as const },
      { id: "s2", plan: "plan:anthropic-claude-pro" as const, account: "claude-code:sr_b" },
      { id: "s3", plan: "plan:anthropic-claude-pro" as const, account: "claude-code:sr_c" },
      { id: "s4", plan: "plan:opencode-go" as const },
    ];
    const proposed = parseStackParam(
      "anthropic-claude-max-5x,anthropic-claude-pro@claude-code:sr_c,anthropic-claude-pro@claude-code:sr_b,opencode-go,opencode-go",
    );
    const aligned = alignProposal(proposed ?? [], current);
    expect(aligned.map((sub) => [sub.id, sub.plan, sub.account])).toEqual([
      // A changed tier in the same family pairs with the plan it replaces.
      ["s1", "plan:anthropic-claude-max-5x", undefined],
      // Same plan and account pairs exactly, whatever the order.
      ["s3", "plan:anthropic-claude-pro", "claude-code:sr_c"],
      ["s2", "plan:anthropic-claude-pro", "claude-code:sr_b"],
      // Each current subscription pairs once; the second copy is a new subscription.
      ["s4", "plan:opencode-go", undefined],
      [proposed?.[4]?.id, "plan:opencode-go", undefined],
    ]);
    expect(new Set(aligned.map((sub) => sub.id)).size).toBe(aligned.length);
  });
});

describe("workload facts from a market result", () => {
  function scenario(id: string, total: string | null, recorded: number, required: number) {
    return {
      id,
      summary: {
        scope: { digest: "sha256:scope", recorded, required, excluded: recorded - required },
        candidates: [{ status: total === null ? "infeasible" : "feasible", totalUsd: total }],
      },
    };
  }
  it("reads a complete range, a priced subset, capacity evidence and unresolved calls", () => {
    const complete = {
      history: { calls: 10, knownTokens: 500, activeDays: 2, nativeResponses: 10 },
      coverage: {
        recorded: 10,
        recognized: 10,
        priced: 10,
        knownTokens: 500,
        pricedKnownTokens: 500,
        unknownTokenCalls: 0,
        models: [{ model: "claude-opus-5", calls: 10, priced: 10, knownTokens: 500, reasons: [] }],
      },
      capacitySignal: { blockedAttempts: 2, warnings: 0, days: 1, accounts: 1 },
      scenarios: [scenario("cache-5m", "1.5", 10, 10), scenario("cache-1h", "2.25", 10, 10)],
    } as unknown as MarketDecision;
    expect(workloadFacts(complete)).toMatchObject({
      calls: 10,
      value: { low: "1.5", high: "2.25" },
      pricedValue: undefined,
      blocked: { attempts: 2, days: 1 },
      distinctResponses: true,
      unresolvedCalls: 0,
    });
    const partial = {
      history: { calls: 10, knownTokens: 500, activeDays: 2 },
      coverage: {
        recorded: 10,
        recognized: 7,
        priced: 6,
        knownTokens: 500,
        pricedKnownTokens: 300,
        unknownTokenCalls: 0,
        models: [
          { model: "claude-opus-5", calls: 6, priced: 6, knownTokens: 300, reasons: [] },
          { model: "Unresolved model", calls: 3, priced: 0, knownTokens: 150, reasons: [] },
        ],
      },
      scenarios: [scenario("cache-5m", null, 10, 6), scenario("cache-1h", null, 10, 6)],
      pricedScope: {
        scenarios: [scenario("cache-5m", "0.9", 6, 6), scenario("cache-1h", "1.2", 6, 6)],
      },
    } as unknown as MarketDecision;
    expect(workloadFacts(partial)).toMatchObject({
      value: undefined,
      pricedValue: { low: "0.9", high: "1.2", calls: 6 },
      unresolvedCalls: 3,
      models: [{ id: "claude-opus-5", calls: 6, priced: 6 }],
      blocked: undefined,
    });
  });
  it("ratios read at a glance", () => {
    expect(ratioText("24.565")).toBe("24.6×");
    expect(ratioText("0.42")).toBe("0.4×");
    expect(ratioText("125.2")).toBe("125×");
  });
});

describe("several accounts on one provider", () => {
  const MAX = "claude-code:sr_max";
  const PRO1 = "claude-code:sr_pro1";
  const PRO2 = "claude-code:sr_pro2";
  const max = facts({
    calls: 48_420,
    value: { low: "6000", high: "6600" },
    models: [{ id: "claude-opus-5-5", calls: 48_420, priced: 48_420 }],
    blocked: { attempts: 46, days: 14 },
  });
  const pro1 = facts({
    calls: 3_198,
    value: { low: "400", high: "440" },
    models: [{ id: "claude-sonnet-5-5", calls: 3_198, priced: 3_198 }],
    blocked: { attempts: 0, days: 0 },
  });
  const pro2 = facts({
    calls: 1_996,
    value: { low: "250", high: "275" },
    models: [{ id: "claude-sonnet-5-5", calls: 1_996, priced: 1_996 }],
    blocked: { attempts: 3, days: 1 },
  });
  const all = facts({ calls: 53_614, blocked: { attempts: 49, days: 14 } });
  const accounts = [
    { key: MAX, source: "claude-code", calls: 48_420, name: "Claude Code account 1", facts: max },
    { key: PRO1, source: "claude-code", calls: 3_198, name: "Claude Code account 2", facts: pro1 },
    { key: PRO2, source: "claude-code", calls: 1_996, name: "Claude Code account 3", facts: pro2 },
  ];
  const scopes = {
    [MAX]: max,
    [PRO1]: pro1,
    [PRO2]: pro2,
    [[PRO1, PRO2].sort().join(",")]: facts({ calls: 5_194, blocked: { attempts: 3, days: 1 } }),
  };
  const work = workload({ "claude-code": all }, { accounts, scopes });
  const linked = [
    { id: "smax", plan: "plan:anthropic-claude-max-5x" as const, account: MAX },
    { id: "spro1", plan: "plan:anthropic-claude-pro" as const, account: PRO1 },
    { id: "spro2", plan: "plan:anthropic-claude-pro" as const, account: PRO2 },
  ];

  it("reads each linked subscription against its own account only", () => {
    const analysis = analyzeStack({ currentStack: linked, rulesAsOf, workload: work });
    expect(analysis.planCount).toBe(3);
    // Two Claude Pro subscriptions count twice in the published total.
    expect(analysis.model.totals).toEqual([
      expect.objectContaining({ currency: "USD", interval: "month", amount: "140" }),
    ]);
    const [maxReport, proReport, pro2Report] = analysis.subscriptions;
    expect(maxReport?.activity?.facts.calls).toBe(48_420);
    expect(maxReport?.activity?.facts.blocked).toEqual({ attempts: 46, days: 14 });
    expect(maxReport?.account?.name).toBe("Claude Code account 1");
    expect(proReport?.activity?.facts.calls).toBe(3_198);
    expect(pro2Report?.activity?.facts.calls).toBe(1_996);
    expect(pro2Report?.activity?.facts.blocked).toEqual({ attempts: 3, days: 1 });
    // Each is its own subscription: no "shared with" grouping, distinct DOM references.
    expect(analysis.subscriptions.map((report) => report.sharedWith)).toEqual([[], [], []]);
    expect(analysis.subscriptions.map((report) => report.ref)).toEqual([
      "anthropic-claude-max-5x",
      "anthropic-claude-pro",
      "anthropic-claude-pro-2",
    ]);
    expect(analysis.outside).toEqual([]);
    for (const text of everyText(analysis)) expect(copyDefects(text)).toEqual([]);
  });

  it("puts an account no subscription pays for outside the stack, by name", () => {
    const analysis = analyzeStack({
      currentStack: [linked[0] as (typeof linked)[number]],
      rulesAsOf,
      workload: work,
    });
    expect(analysis.subscriptions[0]?.activity?.facts.calls).toBe(48_420);
    expect(analysis.outside).toEqual([
      expect.objectContaining({
        sourceId: "claude-code",
        accounts: [PRO1, PRO2].sort(),
        name: "Claude Code, 2 accounts",
      }),
    ]);
  });

  it("reads an unlinked Claude plan with every Claude account, as a one-account stack always was", () => {
    const analysis = analyzeStack({
      currentStack: ["plan:anthropic-claude-max-5x"],
      rulesAsOf,
      workload: work,
    });
    const report = analysis.subscriptions[0];
    expect(report?.activity?.facts.calls).toBe(53_614);
    expect(report?.evidence.some((entry) => /not linked to an account/u.test(entry.text))).toBe(
      true,
    );
  });

  it("tests a downgrade of one account's subscription without touching the others", () => {
    const analysis = analyzeStack({ currentStack: linked, rulesAsOf, workload: work });
    const result = analyzeScenario({
      current: linked,
      proposed: linked.map((entry) =>
        entry.id === "smax" ? { ...entry, plan: "plan:anthropic-claude-pro" as const } : entry,
      ),
      workload: work,
      rulesAsOf,
    });
    expect(result.monthlyDelta).toBe("-80");
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.title).toBe("Claude Max 5x → Claude Pro");
    const text = result.changes[0]?.findings.map((entry) => entry.text).join(" ") ?? "";
    expect(text).toMatch(/48,420 recorded calls from Claude Code account 1/u);
    expect(text).toMatch(/46 blocked attempts on 14 days/u);
    expect(text).not.toMatch(/53,614/u);
    expect(analysis.subscriptions.length).toBe(3);
  });

  it("removing one of two Pro subscriptions leaves that account's work without a plan", () => {
    const result = analyzeScenario({
      current: linked,
      proposed: linked.filter((entry) => entry.id !== "spro2"),
      workload: work,
      rulesAsOf,
    });
    expect(result.monthlyDelta).toBe("-20");
    expect(result.changes.map((change) => change.title)).toEqual(["Remove Claude Pro"]);
    expect(result.changes[0]?.findings[0]?.text).toMatch(
      /1,996 recorded calls from Claude Code account 3/u,
    );
  });
});

describe("subscriptions from a plain plan list", () => {
  it("gives plans that share a long prefix distinct ids", () => {
    const subs = subscriptionsOf([
      "plan:anthropic-claude-max-5x",
      "plan:anthropic-claude-max-20x",
    ] as TargetKey[]);
    expect(new Set(subs.map((sub) => sub.id)).size).toBe(2);
    expect(subs.every((sub) => /^[a-z0-9]{4,24}$/u.test(sub.id))).toBe(true);
  });
});
