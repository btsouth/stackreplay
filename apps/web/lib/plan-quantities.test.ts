import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { afterEach, expect, it, vi } from "vitest";
import { configuredMonthlyPrice, configuredPlans } from "./compare-decision";
import {
  applyPlanList,
  readStackSubscriptions,
  stackCounts,
  subscriptionQuantity,
  writeStackSubscriptions,
} from "./current-stack";
import { buildMyStack } from "./my-stack";
import { paidMultiplier } from "./recap-plans";
import { analyzeScenario, analyzeStack, parseStackParam, stackParam } from "./stack-analysis";
import { discoverStack, discoveryPlansAt } from "./stack-discovery";
import { confirmDiscovery } from "./stack-discovery-storage";

const max = "plan:anthropic-claude-max-5x" as const;
const pro = "plan:anthropic-claude-pro" as const;
const rulesAsOf = DECISION_MARKET.rulesAt;
function storage() {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
    dispatchEvent: vi.fn(),
  });
  return values;
}
afterEach(() => vi.unstubAllGlobals());

it("reads legacy stacks as quantity one and preserves quantity and account links through writes", () => {
  storage();
  const legacy = { id: "submax", plan: max, account: "claude-code:sr_max" };
  expect(writeStackSubscriptions([legacy])).toBe(true);
  expect(subscriptionQuantity(readStackSubscriptions()[0] ?? {})).toBe(1);
  expect(writeStackSubscriptions([{ ...legacy, quantity: 2 }])).toBe(true);
  expect(readStackSubscriptions()).toEqual([{ ...legacy, quantity: 2 }]);
  expect(applyPlanList(readStackSubscriptions(), [max, pro])[0]).toEqual({
    ...legacy,
    quantity: 2,
  });
  for (const quantity of [0, -1, 11, 1.5, NaN]) expect(subscriptionQuantity({ quantity })).toBe(1);
});

it("confirms two Max accounts plus Pro without replacing linked subscription identities", () => {
  storage();
  writeStackSubscriptions([{ id: "submax", plan: max, account: "claude-code:sr_max" }]);
  const groups = discoverStack({
    recordedCalls: 0,
    sources: [],
    sourceNames: [],
    currentStack: [max],
    rulesAsOf,
    plans: discoveryPlansAt(rulesAsOf),
    includeUnobserved: true,
  });
  expect(
    confirmDiscovery(
      undefined,
      groups,
      { claude: { planTargets: [max, pro], quantities: { [max]: 2, [pro]: 1 } } },
      1,
    ),
  ).toEqual({ stackSaved: true, preferencesSaved: true });
  expect(readStackSubscriptions()[0]).toEqual({
    id: "submax",
    plan: max,
    account: "claude-code:sr_max",
    quantity: 2,
  });
  expect(stackCounts(readStackSubscriptions())).toEqual({ [max]: 2, [pro]: 1 });
});

it("uses exact multiplied prices in stack, Compare, replay assessments and recap proration", () => {
  const stack = [
    { id: "submax", plan: max, quantity: 2 },
    { id: "subpro", plan: pro },
  ];
  const counts = stackCounts(stack);
  expect(buildMyStack({ currentStack: [max, pro], counts, rulesAsOf }).totals[0]?.amount).toBe(
    "220",
  );
  expect(configuredMonthlyPrice(configuredPlans([max, pro], rulesAsOf), counts)).toBe("220");
  expect(analyzeStack({ currentStack: stack, rulesAsOf }).monthly).toBe("220");
  const scenario = analyzeScenario({
    current: stack,
    proposed: [
      { id: "submax", plan: max, quantity: 1 },
      { id: "subpro", plan: pro },
    ],
    rulesAsOf,
  });
  expect(scenario.currentMonthly).toBe("220");
  expect(scenario.proposedMonthly).toBe("120");
  expect(scenario.monthlyDelta).toBe("-100");
  expect(
    paidMultiplier(
      "1000",
      buildMyStack({ currentStack: [max], counts, rulesAsOf }).totals[0]?.amount ?? "0",
      30,
    ),
  ).toBe(5);
  expect(paidMultiplier("1000", "100", 30)).toBe(10);
  const parsed = parseStackParam(stackParam(stack));
  expect(parsed?.map(subscriptionQuantity)).toEqual([2, 1]);
});

it("carries multiplied replay prices into public share card facts", async () => {
  const { loadBundledCatalog, bundledModelIdentity } = await import("@stackreplay/catalog/bundled");
  const { buildArchetypeExport } = await import("@stackreplay/test-fixtures");
  const { runScopedReplay } = await import("./scoped-replay");
  const { verdictOfOutcome } = await import("./verdict-facts");
  const { replayShareV2 } = await import("./share-v2");
  const catalog = loadBundledCatalog();
  const outcome = runScopedReplay({
    events: buildArchetypeExport("claude-only").events,
    target: { type: "subscription", planId: max.slice(5), quantity: 2 },
    catalog,
    identity: bundledModelIdentity(),
    rulesAsOf: rulesAsOf.slice(0, 10),
    timeZone: "UTC",
  });
  const composed = verdictOfOutcome(outcome, "Claude Max 5x ×2", { catalog, timeZone: "UTC" });
  if (!composed) throw new Error("Missing fixture verdict");
  const snapshot = replayShareV2(
    {
      facts: composed.facts,
      projection: outcome.projection,
      catalog,
      target: { verificationStatus: "estimated", sources: [] },
    },
    { includePeriod: false },
  );
  expect(snapshot.verdict.target.price?.amount).toBe("200");
  expect(snapshot.verdict.target.name).toBe("Claude Max 5x ×2");
});
