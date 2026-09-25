import { bundledModelIdentity, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { replay } from "@stackreplay/replay-engine";
import { addAmounts } from "@stackreplay/share";
import {
  buildArchetypeExport,
  buildDemoExport,
  WORKLOAD_ARCHETYPE_IDS,
  type WorkloadArchetypeId,
} from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { modelIdResolver } from "./workload-scope";
import { workloadValue } from "./workload-value";

const catalog = loadBundledCatalog();
const identity = bundledModelIdentity();
const RULES = "2026-09-24";

function valueFor(archetype: WorkloadArchetypeId) {
  const events = buildArchetypeExport(archetype).events;
  return { events, value: workloadValue(events, { catalog, identity, rulesAsOf: RULES }) };
}

describe("workload value at published API list prices", () => {
  it("prices every synthetic call in the primary Moderate week demo", () => {
    const events = buildDemoExport("moderate").events;
    const value = workloadValue(events, { catalog, identity, rulesAsOf: "2026-09-25" });
    expect(value.pricedCalls).toBe(events.length);
    expect(value.total).toBeDefined();
    expect(Number(value.total)).toBeGreaterThan(0);
    expect(value.excluded).toEqual([]);
    expect(value.unresolvedCalls).toBe(0);
    expect(value.priced.every((slice) => slice.receipt !== undefined)).toBe(true);
  });

  it("a single-maker workload is exactly its own Direct API replay", () => {
    const { events, value } = valueFor("claude-only");
    const direct = replay({
      events,
      target: { type: "api", providerId: "anthropic" },
      catalog,
      context: { rulesAsOf: RULES },
    });
    expect(value.total).toBe(direct.economics?.targetCost.amount);
    expect(value.pricedCalls).toBe(events.length);
    expect(value.excluded).toEqual([]);
  });

  it("a mixed workload is the exact sum of each maker's own Exact replay", () => {
    const { events, value } = valueFor("mixed");
    const modelIdOf = modelIdResolver(identity);
    const amounts: string[] = [];
    for (const slice of value.priced) {
      const own = events.filter((event) => {
        const modelId = modelIdOf(event);
        return modelId !== undefined && catalog.models[modelId]?.developerId === slice.makerId;
      });
      const direct = replay({
        events: own,
        target: { type: "api", providerId: slice.makerId },
        catalog,
        context: { rulesAsOf: RULES },
      });
      expect(direct.economics?.targetCost.amount, slice.makerName).toBe(slice.amount);
      expect(own.length).toBe(slice.calls);
      amounts.push(slice.amount);
    }
    expect(value.total).toBe(addAmounts(amounts));
    expect(value.priced.map((slice) => slice.makerName)).toEqual(["OpenAI", "Anthropic"]);
    // DeepSeek and Z.AI calls here include cache writes, a category their
    // price records give no rate for: left out and named, never estimated.
    expect(value.excluded.map((slice) => [slice.makerName, slice.calls, slice.reason])).toEqual([
      ["DeepSeek", 88, "undocumented-category"],
      ["Z.AI", 62, "undocumented-category"],
    ]);
    // Every call is priced, excluded with a reason, or counted as unresolved.
    const excluded = value.excluded.reduce((sum, slice) => sum + slice.calls, 0);
    expect(value.pricedCalls + excluded + value.unresolvedCalls).toBe(value.recordedCalls);
    expect(value.unresolvedCalls).toBe(5);
  });

  it.each(WORKLOAD_ARCHETYPE_IDS)("%s: cache reads billed as fresh input cost more", (id) => {
    const { value } = valueFor(id);
    if (value.total === undefined) return;
    expect(value.cacheReadsAtInputRate).toBeDefined();
    const difference = addAmounts([value.cacheReadsAtInputRate ?? "0", `-${value.total}`]);
    expect(difference.startsWith("-")).toBe(false);
  });

  it("never prices an unresolved call", () => {
    const { value } = valueFor("heavy-unresolved");
    expect(value.unresolvedCalls).toBe(525);
    expect(value.pricedCalls).toBe(1_800 - 525);
  });
});
