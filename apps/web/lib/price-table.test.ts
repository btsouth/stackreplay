import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { replayWithReceipt } from "@stackreplay/replay-engine";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { toCents } from "./money-display";
import { formatRate, priceTableOf } from "./price-table";

const catalog = loadBundledCatalog();

function event(id: string, model: string, minute: number, cacheRead: number): TextUsageEventV1 {
  return {
    schemaVersion: 1,
    id,
    occurredAt: `2026-09-10T10:${String(minute % 60).padStart(2, "0")}:00Z`,
    source: { adapterId: "fixture" },
    model: { rawName: model, canonicalId: model },
    modality: "text",
    usage: {
      inputTokens: 1_111 + minute,
      cacheReadTokens: cacheRead,
      cacheWriteTokens: minute % 7 === 0 ? 3_333 : 0,
      outputTokens: 777 + minute * 3,
      reasoningTokens: minute % 2 === 0 ? 111 : 0,
      accounting: {
        cacheReadIncludedInInput: false,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: false,
      },
    },
    confidence: { usage: "exact", model: "exact" },
  };
}

describe("price table", () => {
  it("adds up to the engine's headline to the cent, with every rate sourced", () => {
    const events = [
      ...Array.from({ length: 50 }, (_, index) =>
        event(`s-${index}`, "gpt-5-6-sol", index, index % 4 === 0 ? 290_000 : 40_001 + index),
      ),
      ...Array.from({ length: 50 }, (_, index) =>
        event(`l-${index}`, "gpt-5-6-luna", index, 12_345 + index),
      ),
    ];
    const { result, receipt } = replayWithReceipt({
      events,
      target: { type: "api", providerId: "openai" },
      catalog,
      context: { rulesAsOf: "2026-09-23" },
    });
    expect(receipt).toBeDefined();
    if (receipt === undefined || result.economics === undefined) return;
    const table = priceTableOf(receipt, catalog);
    const rows = table.groups.flatMap((group) => group.rows);
    const sum = rows.reduce((total, row) => total + row.cents, 0n);
    expect(sum).toBe(toCents(result.economics.targetCost.amount));
    expect(table.totalCents).toBe(sum);
    for (const group of table.groups) {
      expect(group.rows.reduce((total, row) => total + row.cents, 0n)).toBe(group.cents);
      expect(group.source?.url).toMatch(/^https:\/\//u);
      expect(group.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    }
    // The long-context tier is named by its own catalog label.
    expect(rows.some((row) => row.tierLabel?.startsWith("Above 272K input tokens"))).toBe(true);
    expect(rows.find((row) => row.category === "reasoning")?.billedAsLabel).toBe(
      "billed as output",
    );
  });

  it("prints rates as published", () => {
    expect(formatRate("4.00")).toBe("$4.00");
    expect(formatRate("0.075")).toBe("$0.075");
    expect(formatRate("0.4")).toBe("$0.40");
    expect(formatRate("1250")).toBe("$1,250.00");
  });
});
