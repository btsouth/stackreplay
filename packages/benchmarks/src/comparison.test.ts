import { describe, expect, it } from "vitest";
import {
  benchmarkData,
  benchmarkEdition,
  frontierModelIds,
  observationId,
  resolveComparison,
  validateBenchmarkData,
} from "./index.js";

const models = Object.fromEntries(
  benchmarkData.sourceSets.flatMap((s) => s.modelIds).map((id) => [id, { id }]),
);
const data = validateBenchmarkData(benchmarkData, models);
describe("model-first comparison evidence", () => {
  it("keeps Sol selected with explicit absent observations and never substitutes another release", () => {
    const rows = resolveComparison(data, frontierModelIds, { coverage: "all" });
    expect(rows.length).toBeGreaterThanOrEqual(17);
    expect(
      rows.every(
        (r) =>
          r.cells.length === 5 &&
          r.cells[2]?.modelId === "gpt-6-1-sol" &&
          r.cells[2]?.observation === undefined,
      ),
    ).toBe(true);
    expect(resolveComparison(data, frontierModelIds, { coverage: "shared" })).toEqual([]);
    expect(benchmarkEdition).toBe("2026-09-30-v1");
  });
  it("compares DeepSeek and Sonnet using exact shared benchmark versions across providers", () => {
    const rows = resolveComparison(data, ["deepseek-v4-1-flash", "claude-sonnet-5-5"], {
      coverage: "shared",
    });
    expect(rows.map((r) => r.definition.id)).toEqual(["terminal-bench-4-0", "chartography"]);
    expect(rows[0]?.cells.map((c) => c.observation?.value)).toEqual([31.2, 70.6]);
    expect(rows[0]?.setup).toBe("different_or_unreported");
    expect(rows[0]?.highestModelIds).toEqual([]);
  });
  it("documents its primary choice rather than selecting the largest score and pins alternatives", () => {
    const rows = resolveComparison(data, ["claude-opus-5-5"]);
    const chart = rows.find((r) => r.definition.id === "chartography");
    expect(chart?.cells[0]?.alternatives).toHaveLength(2);
    const alternative = chart?.cells[0]?.alternatives.find((o) =>
      o.sourceSetId.startsWith("anthropic"),
    );
    if (!alternative) throw new Error("Missing verified alternative");
    const selected = resolveComparison(data, ["claude-opus-5-5"], {
      observationIds: [observationId(alternative)],
    }).find((r) => r.definition.id === "chartography");
    expect(selected?.cells[0]?.observation?.value).toBe(64.4);
    expect(selected?.cells[0]?.selectionReason).toContain("Explicit");
    expect(() =>
      resolveComparison(data, ["claude-opus-5-5"], { observationIds: ["fake"] }),
    ).toThrow();
    expect(() =>
      resolveComparison(data, ["claude-opus-5-5"], {
        observationIds: [observationId(alternative), observationId(alternative)],
      }),
    ).toThrow();
  });
  it("never treats one reporting source as proof of matching setups; documented ties highlight equally", () => {
    const original = resolveComparison(data, data.sourceSets[0]?.modelIds ?? [], {
      sourceSetId: data.sourceSets[0]?.id,
    });
    expect(original.every((r) => r.highestModelIds.length === 0)).toBe(true);
    const matched = structuredClone(data);
    for (const o of matched.sourceSets[0]?.observations ?? [])
      if (o.benchmarkId === "cwe-bench-v1") o.comparisonGroup = "synthetic-matched-test";
    expect(
      resolveComparison(matched, matched.sourceSets[0]?.modelIds ?? []).find(
        (r) => r.definition.id === "cwe-bench-v1",
      )?.highestModelIds,
    ).toEqual(["gemini-4-argon", "gpt-6-astra"]);
  });
  it("rejects duplicate selections, unknown sheets and ambiguous unpublished defaults", () => {
    expect(() => resolveComparison(data, ["gpt-6-astra", "gpt-6-astra"])).toThrow();
    expect(() => resolveComparison(data, ["gpt-6-astra"], { sourceSetId: "unknown" })).toThrow();
    expect(() =>
      resolveComparison(data, ["gpt-6-1-sol"], { sourceSetId: "google-deepmind-argon-2026-09-30" }),
    ).toThrow(/does not include/);
  });
});
