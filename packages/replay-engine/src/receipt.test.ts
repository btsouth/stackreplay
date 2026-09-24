import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { replay, replayObservingPriceability, replayWithReceipt } from "./engine.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";
import { Decimal, ZERO } from "./money.js";

/**
 * A price receipt is the engine's own arithmetic, grouped. These tests hold it
 * to the figure it explains: the exact sum of its lines is the engine's total,
 * digit for digit, and asking for a receipt never changes the result.
 */

const catalog = loadBundledCatalog();
const context = { rulesAsOf: "2026-09-23" };

function event(
  id: string,
  model: string,
  hour: number,
  usage: Parameters<typeof completeUsage>[0],
): TextUsageEventV1 {
  return makeEvent({
    id,
    occurredAt: `2026-09-${String(1 + Math.floor(hour / 24)).padStart(2, "0")}T${String(hour % 24).padStart(2, "0")}:13:00Z`,
    model: { rawName: model, canonicalId: model },
    usage: completeUsage(usage),
  });
}

/** A mixed workload: ordinary and long-context GPT calls, Claude calls with reasoning. */
function workload(): TextUsageEventV1[] {
  const events: TextUsageEventV1[] = [];
  for (let index = 0; index < 60; index += 1) {
    events.push(
      event(`gpt-${index}`, "gpt-5-6-sol", index, {
        uncachedInputTokens: 1_233 + index * 17,
        cacheReadTokens: index % 3 === 0 ? 300_001 + index : 41_977 + index * 13,
        cacheWriteTokens: index % 5 === 0 ? 7_001 : 0,
        outputTokens: 911 + index,
        reasoningTokens: index % 2 === 0 ? 377 : 0,
      }),
    );
    events.push(
      event(`opus-${index}`, "claude-opus-5-5", index + 3, {
        uncachedInputTokens: 19 + index,
        cacheReadTokens: 88_313 + index * 101,
        cacheWriteTokens: 2_417 + index,
        outputTokens: 1_501 + index * 7,
        reasoningTokens: index % 4 === 0 ? 211 : 0,
      }),
    );
  }
  return events;
}

const sumLines = (lines: readonly { subtotal: string }[]) =>
  lines.reduce((total, line) => total.plus(new Decimal(line.subtotal)), ZERO);

describe("price receipts", () => {
  it("add up exactly to a Direct API replay's own total", () => {
    const events = workload().filter((entry) => entry.model.canonicalId === "gpt-5-6-sol");
    const input = {
      events,
      target: { type: "api" as const, providerId: "openai" },
      catalog,
      context,
    };
    const { result, receipt } = replayWithReceipt(input);
    const cost = result.economics?.targetCost.amount;
    expect(cost).toBeDefined();
    expect(receipt?.basis).toBe("api_list_price");
    expect(receipt?.total).toBe(cost);
    expect(sumLines(receipt?.lines ?? []).equals(new Decimal(cost ?? "0"))).toBe(true);
    // Long-context requests price at their own tier, on their own lines.
    expect(receipt?.lines.some((line) => line.tierId === "long-context")).toBe(true);
    // Reasoning follows the documented relationship and says so.
    const reasoning = receipt?.lines.find((line) => line.category === "reasoning");
    expect(reasoning?.billedAs).toBe("output");
    expect(receipt?.pricedEvents).toBe(events.length);
  });

  it("never changes the result it explains", () => {
    const input = {
      events: workload(),
      target: { type: "api" as const, providerId: "anthropic" },
      catalog,
      context,
    };
    expect(replayWithReceipt(input).result).toEqual(replay(input));
    const plan = {
      ...input,
      target: { type: "subscription" as const, planId: "github-copilot-pro-plus" },
    };
    expect(replayWithReceipt(plan).result).toEqual(replay(plan));
  });

  it("carries only the events the engine counted", () => {
    // GPT calls are not offered by Anthropic: the replay has no total, and the
    // receipt holds the Claude calls alone rather than inventing the rest.
    const { result, receipt } = replayWithReceipt({
      events: workload(),
      target: { type: "api", providerId: "anthropic" },
      catalog,
      context,
    });
    expect(result.economics).toBeUndefined();
    expect(receipt?.pricedEvents).toBe(60);
    expect(receipt?.lines.every((line) => line.modelId === "claude-opus-5-5")).toBe(true);
  });

  it("is a plan's credit demand before any allowance applies", () => {
    const { result, receipt } = replayWithReceipt({
      events: workload(),
      target: { type: "subscription", planId: "github-copilot-pro-plus" },
      catalog,
      context,
    });
    expect(receipt?.basis).toBe("credit_demand");
    const pools = result.constraints.filter((constraint) => constraint.unit === "usd");
    expect(pools.length).toBeGreaterThan(0);
    for (const pool of pools)
      expect(new Decimal(pool.attemptedUnits).equals(new Decimal(receipt?.total ?? "0"))).toBe(
        true,
      );
    expect(sumLines(receipt?.lines ?? []).equals(new Decimal(receipt?.total ?? "0"))).toBe(true);
  });

  it("states the cache-read counterfactual only from published input rates", () => {
    const { receipt } = replayWithReceipt({
      events: workload().filter((entry) => entry.model.canonicalId === "claude-opus-5-5"),
      target: { type: "api", providerId: "anthropic" },
      catalog,
      context,
    });
    const lines = receipt?.lines ?? [];
    const cacheRead = lines.find((line) => line.category === "cacheRead");
    expect(cacheRead).toBeDefined();
    const withoutCache = sumLines(lines.filter((line) => line.category !== "cacheRead")).plus(
      new Decimal(cacheRead?.tokens ?? 0).times("4.00").div(1_000_000),
    );
    expect(receipt?.cacheReadsAtInputRate).toBe(withoutCache.toFixed(withoutCache.decimalPlaces()));
  });
});

describe("priceability observation", () => {
  it("reports every event once, in the order the replay asks its questions", () => {
    const events = [
      ...workload().slice(0, 10),
      makeEvent({
        id: "mystery",
        occurredAt: "2026-09-02T01:00:00Z",
        model: { rawName: "mystery-model-9" },
        usage: completeUsage({ uncachedInputTokens: 10 }),
      }),
    ];
    const seen = new Map<string, string>();
    replayObservingPriceability(
      { events, target: { type: "api", providerId: "openai" }, catalog, context },
      (entry, outcome) => seen.set(entry.id, outcome),
    );
    expect(seen.size).toBe(events.length);
    expect(seen.get("mystery")).toBe("unresolved");
    expect(seen.get("opus-0")).toBe("not_offered");
    expect(seen.get("gpt-0")).toBe("priced");
  });
});

describe("undecided chronology", () => {
  const mystery = (id: string, occurredAt: string) =>
    makeEvent({
      id,
      occurredAt,
      model: { rawName: "mystery-model-9" },
      usage: completeUsage({ uncachedInputTokens: 10 }),
    });

  it("reports when each undecided event occurred, in order, without changing the result", () => {
    const events = [
      ...workload().slice(0, 10),
      mystery("late", "2026-09-20T01:00:00Z"),
      mystery("early", "2026-09-01T00:30:00Z"),
    ];
    const input = {
      events,
      target: { type: "subscription" as const, planId: "github-copilot-pro-plus" },
      catalog,
      context,
    };
    const { result, undecidedAt } = replayWithReceipt(input);
    expect(undecidedAt).toEqual(["2026-09-01T00:30:00Z", "2026-09-20T01:00:00Z"]);
    expect(undecidedAt?.length).toBe(result.semantics?.dispositions.unknown);
    expect(result).toEqual(replay(input));
  });

  it("is not reported for a Direct API target", () => {
    const { undecidedAt } = replayWithReceipt({
      events: [mystery("m", "2026-09-01T00:30:00Z")],
      target: { type: "api", providerId: "openai" },
      catalog,
      context,
    });
    expect(undecidedAt).toBeUndefined();
  });
});
