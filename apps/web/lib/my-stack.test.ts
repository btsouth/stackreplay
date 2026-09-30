import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { expect, it } from "vitest";
import { buildMyStack } from "./my-stack";
import type { TargetKey } from "./routes";
import { type DiscoveryPlan, discoveryPlansAt } from "./stack-discovery";

const rulesAsOf = DECISION_MARKET.rulesAt;

it("works without history and shows selected facts, never invented activity or confirmed plans", () => {
  const model = buildMyStack({ currentStack: [], rulesAsOf });
  expect(model.targets).toEqual([]);
  expect(model.activity).toEqual([]);
  expect(model.totals).toEqual([]);
  expect(model.families.map((group) => group.groupId)).toEqual([
    "claude",
    "chatgpt",
    "command-code",
    "opencode",
  ]);
  expect(
    model.families.every(
      (group) =>
        group.sourceState === "unknown" &&
        group.state === "unknown" &&
        group.currentTargets.length === 0,
    ),
  ).toBe(true);
});

it("preserves multiple personal, organization, unrelated, API and unknown selections without a cap", () => {
  const currentStack: TargetKey[] = [
    "plan:anthropic-claude-pro",
    "plan:anthropic-claude-max-5x",
    "plan:openai-chatgpt-business",
    "plan:command-code-goat",
    "plan:cursor-ultra",
    "api:openai",
    "plan:retired-unlisted",
    "api:unknown",
  ];
  const model = buildMyStack({ currentStack, rulesAsOf });
  expect(model.targets.map((target) => target.key)).toEqual(currentStack);
  expect(model.targets.find((target) => target.id === "command-code-goat")).toMatchObject({
    available: true,
    publishedPrice: discoveryPlansAt(rulesAsOf).find((plan) => plan.id === "command-code-goat")
      ?.price,
  });
  expect(model.targets.find((target) => target.id === "retired-unlisted")).toMatchObject({
    available: false,
    publishedPrice: undefined,
  });
  expect(model.unpricedPlans).toBe(1);
  expect(model.apiTargets).toBe(2);
  expect(model.families.find((group) => group.groupId === "claude")?.currentTargets).toHaveLength(
    2,
  );
});

it("adds decimal sticker prices exactly, grouped by currency AND interval; unknown/API entries are excluded", () => {
  const plans: DiscoveryPlan[] = [
    { id: "a", name: "A", price: { amount: "0.1", currency: "USD", interval: "month" } },
    { id: "b", name: "B", price: { amount: "0.2", currency: "USD", interval: "month" } },
    { id: "c", name: "C", price: { amount: "12", currency: "USD", interval: "year" } },
    { id: "d", name: "D", price: { amount: "20", currency: "EUR", interval: "month" } },
  ];
  const model = buildMyStack({
    currentStack: ["plan:a", "plan:b", "plan:b", "plan:c", "plan:d", "plan:missing", "api:openai"],
    plans,
    rulesAsOf,
  });
  expect(model.totals).toEqual([
    { amount: "0.3", currency: "USD", interval: "month" },
    { amount: "12", currency: "USD", interval: "year" },
    { amount: "20", currency: "EUR", interval: "month" },
  ]);
  expect(model.unpricedPlans).toBe(1);
});

it("keeps one historical workload's sources/models separate from today's plan selections", () => {
  const model = buildMyStack({
    currentStack: ["plan:anthropic-claude-pro"],
    rulesAsOf,
    workload: {
      recordedCalls: 10,
      sourceNames: [
        { adapterId: "hermes", name: "Hermes", role: "usage" },
        { adapterId: "t3-code", name: "T3 Code", role: "attribution" },
      ],
      sources: [
        {
          id: "claude-code",
          events: 6,
          models: [{ modelId: "claude-opus-5-5", events: 4 }],
          unresolvedEvents: 2,
        },
        { id: "hermes", events: 4, models: [], unresolvedEvents: 4 },
      ],
    },
  });
  expect(model.activity.map((source) => source.shareOfWorkload)).toEqual([0.6, 0.4]);
  expect(model.activity[1]).toMatchObject({
    name: "Hermes",
    observedModelIds: [],
    unresolvedCalls: 4,
  });
  expect(model.families.find((group) => group.groupId === "claude")).toMatchObject({
    currentTargets: ["plan:anthropic-claude-pro"],
    unresolvedCalls: 2,
  });
  expect(model.targets.map((target) => target.key)).toEqual(["plan:anthropic-claude-pro"]);
  expect(JSON.stringify(model)).not.toMatch(
    /prompt|sessionId|projectHash|rawName|nativeSessionHash/u,
  );
});

it("date-valid choices and facts do not borrow current prices at an older accepted date", () => {
  const model = buildMyStack({
    currentStack: ["plan:command-code-goat"],
    rulesAsOf: "2020-01-01T00:00:00Z",
  });
  expect(model.targets[0]).toMatchObject({ available: false, publishedPrice: undefined });
  expect(model.totals).toEqual([]);
  expect(model.families.every((group) => group.candidates.length === 0)).toBe(true);
});
