import { describe, expect, it } from "vitest";
import {
  benchmarkData,
  benchmarkDataForEdition,
  comparisonSets,
  observationId,
  resolveComparison,
} from "./index.js";

// Selected first-party table facts checked October 4. Expectations are not generated from data.
const expected = [
  [
    "qwen-max-terminal-2026-08-03",
    "qwen-3-8-max",
    86.6,
    "86.6%",
    "2026-08-03",
    "https://www.qwencloud.com/news/qwen-3-8-max",
  ],
  [
    "zai-glm-5-3-terminal-2026-08-14",
    "glm-5-3",
    88.2,
    "88.2%",
    "2026-08-14",
    "https://z.ai/blog/glm-5.3",
  ],
  [
    "minimax-m3-terminal-2026-06-01",
    "minimax-m3",
    66.0,
    "66.0%",
    "2026-06-01",
    "https://www.minimax.io/blog/minimax-m3",
  ],
] as const;
const sets = benchmarkData.sourceSets.slice(12);
const benchmarkId = "terminal-bench-2-1";

describe("dated first-party Terminal-Bench 2.1 facts", () => {
  it("admits exactly the three own-model facts with exact precision and attribution", () => {
    expect(sets).toHaveLength(3);
    expect(benchmarkData.definitions.find((d) => d.id === benchmarkId)).toMatchObject({
      name: "Terminal-Bench",
      version: "2.1",
      category: "coding",
      metric: "Reported benchmark score",
      taskSubset: null,
      unit: "percent",
    });
    for (const [id, modelId, value, displayValue, publishedAt, sourceUrl] of expected) {
      const set = sets.find((s) => s.id === id);
      expect(set).toMatchObject({
        kind: "model_observations",
        modelIds: [modelId],
        benchmarkIds: [benchmarkId],
        publishedAt,
        sourceUrl,
        methodologyUrl: sourceUrl,
        evidenceClass: "developer_reported",
        redistribution: {
          basis: "official_provider_facts",
          termsUrl: sourceUrl,
          checkedAt: "2026-10-04",
        },
      });
      expect(set?.observations).toHaveLength(1);
      expect(set?.observations[0]).toMatchObject({
        modelId,
        benchmarkId,
        value,
        displayValue,
        sourceSetId: id,
        sourceUrl,
        evidenceClass: "developer_reported",
        evaluationOrigin: "reporter_computed",
        checkedAt: "2026-10-04",
      });
      expect(set?.observations[0]?.evaluator).toBe(set?.evaluator);
      expect(set?.observations[0]?.notes).toContain(set?.limitations[2]);
      expect(set?.observations[0]).not.toHaveProperty("comparisonGroup");
      expect(set?.observations[0]).not.toHaveProperty("effort");
      expect(set?.observations[0]).not.toHaveProperty("tools");
      expect(set?.limitations.join(" ")).toContain("did not reproduce");
      expect(set?.limitations.join(" ")).toContain(
        "Publication dates identify the source articles",
      );
      expect(set?.limitations.join(" ")).toContain("task subset");
      expect(set?.redistribution.rationale).toContain(
        "No explicit benchmark dataset redistribution grant",
      );
      expect(set?.redistribution.rationale).toContain("does not cover publisher charts");
    }
  });

  it("retains source date conflicts and only each benchmark's stated setup", () => {
    const [qwen, glm, minimax] = sets;
    expect(qwen?.limitations.join(" ")).toContain("2026-07-20 15:56:48");
    expect(qwen?.observations[0]?.harness).toBe("Claude Code (version unreported; avg@10)");
    expect(qwen?.methodologySummary).toContain("5-hour timeout and max_tokens=131,072");
    expect(qwen?.observations[0]?.notes).toContain("unsuffixed release");
    for (const [set, raw] of [
      [qwen, "86.6"],
      [glm, "88.2"],
    ] as const) {
      expect(set?.observations[0]?.notes).toContain(`raw table score is ${raw}`);
      expect(set?.observations[0]?.notes).toContain(`raw notation ${raw}`);
      expect(set?.observations[0]?.notes).toContain("provider source omits the unit marker");
      expect(set?.observations[0]?.notes).toContain(
        "https://www.tbench.ai/news/terminal-bench-2-1",
      );
      expect(set?.observations[0]?.notes).toContain("no arithmetic rescaling");
      expect(set?.observations[0]?.notes).toContain("not provider-explicit notation");
    }
    expect(minimax?.observations[0]?.notes).toContain("explicitly reports 66.0%");
    expect(glm?.limitations.join(" ")).toContain("dateModified 2026-09-18");
    expect(glm?.observations[0]?.harness).toBe("Claude Code 2.1.207");
    expect(glm?.methodologySummary).toContain(
      "temperature=1.0, top_p=1, max_new_tokens=65,536 and a 6-hour timeout",
    );
    expect(glm?.observations[0]?.notes).not.toMatch(/avg@3|400K|128K|effort=max/);
    expect(minimax?.limitations.join(" ")).toContain("2026-05-31T17:31:18.000Z");
    expect(minimax?.methodologySummary).toContain("8C16G sandbox, a 2-hour timeout and 128K");
    expect(minimax?.observations[0]?.provider).toBe(
      "MiniMax official API (exact endpoint/version unreported)",
    );
    expect(minimax?.observations[0]?.harness).toBe("Terminus 2");
  });

  it("compares the three facts without a matched setup and leaves Kimi missing", () => {
    const models = expected.map((r) => r[1]);
    const row = resolveComparison(benchmarkData, [...models, "kimi-k3"], { coverage: "all" })[0];
    expect(row?.definition.id).toBe(benchmarkId);
    expect(row?.setup).toBe("different_or_unreported");
    expect(row?.cells.map((c) => c.observation?.displayValue)).toEqual([
      "86.6%",
      "88.2%",
      "66.0%",
      undefined,
    ]);
    expect(
      resolveComparison(benchmarkData, [...models, "kimi-k3"], { coverage: "shared" }),
    ).toEqual([]);
    expect(resolveComparison(benchmarkData, models, { coverage: "shared" })).toHaveLength(1);
    expect(comparisonSets(benchmarkData).some((s) => sets.includes(s))).toBe(false);
    for (const set of sets) {
      const o = set.observations[0];
      if (!o) throw new Error("Missing admitted fact");
      expect(
        resolveComparison(benchmarkData, [o.modelId], { observationIds: [observationId(o)] })[0]
          ?.cells[0]?.selectionReason,
      ).toContain("Explicit");
      expect(() => resolveComparison(benchmarkData, [o.modelId], { sourceSetId: set.id })).toThrow(
        /complete source sheet/,
      );
    }
  });

  it("preserves the v3 Qwen 0902 Epoch record and admits no new Kimi fact", () => {
    const old = benchmarkDataForEdition("2026-10-04-v3");
    if (!old) throw new Error("Missing immutable v3 edition");
    expect(
      resolveComparison(
        old,
        expected.map((r) => r[1]),
      ),
    ).toEqual([]);
    const epoch = benchmarkData.sourceSets
      .flatMap((s) => s.observations)
      .filter((o) => o.modelId === "qwen-3-8-max-0902");
    expect(epoch).toEqual(
      old?.sourceSets
        .flatMap((s) => s.observations)
        .filter((o) => o.modelId === "qwen-3-8-max-0902"),
    );
    expect(epoch).toHaveLength(1);
    expect(epoch[0]?.displayValue).toBe("92.297979797979800%");
    expect(sets.flatMap((s) => s.modelIds)).not.toContain("kimi-k3");
  });
});
