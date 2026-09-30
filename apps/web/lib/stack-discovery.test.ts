import {
  BUNDLED_CATALOG_VERSION,
  bundledModelIdentity,
  loadBundledCatalog,
} from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import type { TargetKey } from "./routes";
import {
  applyDiscoveryAnswers,
  DISCOVERY_FAMILIES,
  discoverStack,
  discoveryPlansAt,
} from "./stack-discovery";
import { buildWorkloadProfile, type SourceDemand } from "./workload-profile";
import { summarizeExport } from "./workload-summary";

const rulesAsOf = DECISION_MARKET.rulesAt;
const plans = discoveryPlansAt(rulesAsOf);
function source(
  id: string,
  events = 10,
  modelIds = ["gpt-6-sol"],
  unresolvedEvents = 0,
): SourceDemand {
  return {
    id,
    events,
    tokens: 0,
    models: modelIds.map((modelId) => ({ modelId, events: 1 })),
    unresolvedEvents,
  };
}
function discover(sources: SourceDemand[], currentStack: TargetKey[] = [], date = rulesAsOf) {
  return discoverStack({
    recordedCalls: sources.reduce((sum, row) => sum + row.events, 0),
    sources,
    sourceNames: sources.map((row) => ({
      adapterId: row.id,
      name: row.id,
      role: "usage" as const,
    })),
    currentStack,
    rulesAsOf: date,
    plans: date === rulesAsOf ? plans : discoveryPlansAt(date),
  });
}
const candidateIds = (sourceId: string) =>
  discover([source(sourceId)])[0]
    ?.candidates.map((plan) => plan.planId)
    .sort();

describe("source → reviewed commercial questions", () => {
  it("Claude Code narrows to three personal choices without selecting a plan, even for Opus", () => {
    const [group] = discover([source("claude-code", 18420, ["claude-opus-5-5"])]);
    expect(group).toMatchObject({
      sourceState: "observed",
      state: "narrowed",
      groupId: "claude",
      recordedCalls: 18420,
      shareOfWorkload: 1,
      currentTargets: [],
    });
    expect(candidateIds("claude-code")).toEqual([
      "anthropic-claude-max-20x",
      "anthropic-claude-max-5x",
      "anthropic-claude-pro",
    ]);
  });
  it("Codex uses the ChatGPT personal family and current Pro names", () => {
    const [group] = discover([source("codex")]);
    expect(group?.candidates.map((plan) => [plan.planName, plan.publishedPrice.amount])).toEqual([
      ["ChatGPT Plus", "20"],
      ["ChatGPT Pro 100", "100"],
      ["ChatGPT Pro 200", "200"],
      ["ChatGPT Pro 500", "500"],
    ]);
    expect(group?.currentTargets).toEqual([]);
    expect(group?.candidates.some((plan) => plan.planId === "openai-chatgpt-business")).toBe(false);
    // GPT identity alone (in another harness) doesn't discover ChatGPT.
    expect(discover([source("hermes")])[0]).toMatchObject({ state: "unknown", candidates: [] });
  });
  it("Command Code offers all five accepted individual tiers, including execution-only GOAT", () => {
    expect(candidateIds("command-code")).toEqual([
      "command-code-go",
      "command-code-goat",
      "command-code-max-10x",
      "command-code-max-20x",
      "command-code-pro",
    ]);
    const [small] = discover([source("command-code", 1, ["claude-sonnet-5-5"])]);
    const [large] = discover([
      { ...source("command-code", 1000000, ["claude-sonnet-5-5"]), tokens: 1e12 },
    ]);
    expect(large?.candidates).toEqual(small?.candidates);
    expect(large?.currentTargets).toEqual([]);
    expect(small?.candidates[0]?.access.listedModelIds).toEqual(["claude-sonnet-5-5"]);
    expect(small?.candidates.at(-1)?.access.listedModelIds).toEqual([]);
  });
  it("OpenCode never confirms Go, irrespective of model developer or access", () => {
    const [group] = discover([source("opencode")]);
    expect(group).toMatchObject({
      state: "narrowed",
      currentTargets: [],
      question: "Do you currently pay for an OpenCode plan?",
    });
    expect(candidateIds("opencode")).toEqual(["opencode-go", "opencode-go-plus"]);
  });
  it("Hermes remains unknown, and T3 attribution creates no commercial group", () => {
    expect(discover([source("hermes")])[0]).toMatchObject({
      state: "unknown",
      candidates: [],
      sourceState: "observed",
    });
    expect(discover([source("t3-code")])).toEqual([]);
  });
  it("mixed sources have independent groups and exact recorded-call shares", () => {
    const groups = discover([
      source("claude-code", 61),
      source("codex", 24),
      source("command-code", 10),
      source("opencode", 3),
      source("hermes", 2),
    ]);
    expect(groups.map((group) => group.shareOfWorkload)).toEqual([0.61, 0.24, 0.1, 0.03, 0.02]);
    expect(groups.reduce((sum, group) => sum + group.recordedCalls, 0)).toBe(100);
    expect(groups.every((group) => group.currentTargets.length === 0)).toBe(true);
  });
  it("unresolved model identities still allow a source question and don't enter access coverage", () => {
    const [group] = discover([source("claude-code", 10, [], 10)]);
    expect(group).toMatchObject({ state: "narrowed", unresolvedCalls: 10, observedModelIds: [] });
    expect(group?.candidates).toHaveLength(3);
    expect(
      group?.candidates.every(
        (plan) => plan.access.observedModelCount === 0 && plan.access.listedModelIds.length === 0,
      ),
    ).toBe(true);
  });
  it("uses date-valid current choices rather than rewriting historical source/model facts", () => {
    const [group] = discover([source("opencode")], [], "2026-09-20");
    expect(group).toMatchObject({
      state: "unknown",
      candidates: [],
      observedModelIds: ["gpt-6-sol"],
      recordedCalls: 10,
    });
    const [current] = discover([source("opencode")]);
    expect(current?.candidates).toHaveLength(2);
    const [expiredGoat] = discover([source("command-code")], [], "2026-10-28");
    expect(expiredGoat?.candidates.some((plan) => plan.planId === "command-code-goat")).toBe(false);
  });
  it("has one reviewed mapping, whose exact choices all exist in the accepted catalog", () => {
    const catalog = loadBundledCatalog();
    expect(new Set(DISCOVERY_FAMILIES.flatMap((family) => family.sourceIds)).size).toBe(5);
    for (const family of DISCOVERY_FAMILIES)
      for (const id of family.planIds) {
        expect(catalog.plans[id], id).toBeDefined();
        expect(
          plans.find((plan) => plan.id === id),
          id,
        ).toBeDefined();
      }
  });
  it("respects future exact billing aggregates but never treats past billing as current confirmation", () => {
    const base = {
      recordedCalls: 10,
      sources: [source("claude-code")],
      sourceNames: [],
      rulesAsOf,
      currentStack: [],
      plans,
    };
    const evidence = {
      sourceId: "claude-code",
      recordedCalls: 2,
      planId: "anthropic-claude-max-5x",
      kind: "subscription" as const,
      attribution: "exact" as const,
    };
    const [exact] = discoverStack({ ...base, billingEvidence: [evidence] });
    expect(exact).toMatchObject({
      state: "observed",
      currentTargets: [],
      billingEvidence: [evidence],
    });
    expect(
      discoverStack({ ...base, billingEvidence: [{ ...evidence, attribution: "inferred" }] })[0]
        ?.state,
    ).toBe("narrowed");
  });
});

describe("explicit Current Stack edits", () => {
  const existing: TargetKey[] = [
    "plan:command-code-goat",
    "plan:anthropic-claude-pro",
    "plan:openai-chatgpt-business",
    "plan:cursor-ultra",
    "api:anthropic",
  ];
  const groups = discover([source("claude-code"), source("codex")], existing);
  it("pre-respects personal and manually chosen organization plans", () => {
    expect(groups.map((group) => group.state)).toEqual(["confirmed", "confirmed"]);
    expect(groups[1]?.currentTargets).toEqual(["plan:openai-chatgpt-business"]);
    expect(applyDiscoveryAnswers(existing, groups, {})).toEqual(existing);
  });
  it("changing Claude replaces only that family's selections, keeping unrelated plans and API targets", () => {
    expect(
      applyDiscoveryAnswers(existing, groups, { claude: "plan:anthropic-claude-max-5x" }),
    ).toEqual([
      "plan:command-code-goat",
      "plan:openai-chatgpt-business",
      "plan:cursor-ultra",
      "api:anthropic",
      "plan:anthropic-claude-max-5x",
    ]);
  });
  it("non-plan responses remove only the answered family and never manufacture API identity", () => {
    for (const answer of ["work", "api-other", "none", "not-sure"] as const)
      expect(applyDiscoveryAnswers(existing, groups, { claude: answer })).toEqual(
        existing.filter((key) => key !== "plan:anthropic-claude-pro"),
      );
  });
  it("keeps multiple manual plans until explicitly changed and rejects another family's candidate", () => {
    const multiple: TargetKey[] = [...existing, "plan:anthropic-claude-max-5x"];
    expect(applyDiscoveryAnswers(multiple, groups, { claude: "keep-current" })).toEqual(multiple);
    expect(applyDiscoveryAnswers(existing, groups, { claude: "plan:openai-chatgpt-plus" })).toEqual(
      existing,
    );
    expect(applyDiscoveryAnswers(existing, groups, { claude: "api:openai" })).toEqual(existing);
  });
});

it("integrates the existing import summary and profile without consuming raw events in discovery", () => {
  const exported = buildDemoExport("moderate");
  const identity = bundledModelIdentity();
  const summary = summarizeExport(exported, BUNDLED_CATALOG_VERSION, identity);
  const profile = buildWorkloadProfile(exported.events, {
    identity,
    catalog: loadBundledCatalog(),
    timeZone: "UTC",
  });
  const groups = discoverStack({
    recordedCalls: summary.eventCount,
    sources: profile.sources,
    sourceNames: summary.usageSources,
    rulesAsOf,
    currentStack: [],
    plans,
  });
  for (const group of groups) {
    const sourceCalls = profile.sources
      .filter((source) => group.sourceIds.includes(source.id))
      .reduce((sum, source) => sum + source.events, 0);
    expect(group.recordedCalls).toBe(sourceCalls);
    expect(group.shareOfWorkload).toBe(sourceCalls / summary.eventCount);
  }
  expect(JSON.stringify(groups)).not.toMatch(
    /nativeSessionHash|projectHash|rawName|prompt|response/u,
  );
});
