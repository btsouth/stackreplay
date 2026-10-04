import { describe, expect, it } from "vitest";
import {
  benchmarkData,
  benchmarkDataForEdition,
  comparisonSets,
  observationId,
  resolveComparison,
} from "./index.js";
import {
  benchmarkDataSchema,
  benchmarkSourceSetSchema,
  benchmarkSourceSetV2Schema,
  validateBenchmarkData,
} from "./schema.js";

const kimi = benchmarkData.sourceSets.at(-1);
if (!kimi) throw new Error("Missing Kimi source");
const models = Object.fromEntries(
  benchmarkData.sourceSets.flatMap((s) => s.modelIds).map((id) => [id, { id }]),
);

describe("explicit unknown publication in schema 2", () => {
  it("accepts explicit null only in schema 2 and keeps both known-date generations strict", () => {
    expect(benchmarkDataSchema.parse(benchmarkData).schemaVersion).toBe(2);
    expect(benchmarkSourceSetV2Schema.safeParse(kimi).success).toBe(true);
    expect(benchmarkSourceSetSchema.safeParse(kimi).success).toBe(false);
    expect(benchmarkDataSchema.safeParse({ ...benchmarkData, schemaVersion: 1 }).success).toBe(
      false,
    );
    for (const schemaVersion of [1, 2]) {
      const known = { ...benchmarkDataForEdition("2026-10-04-v4"), schemaVersion };
      expect(benchmarkDataSchema.safeParse(known).success).toBe(true);
    }
    expect(benchmarkDataSchema.safeParse({ ...benchmarkData, schemaVersion: 3 }).success).toBe(
      false,
    );
  });

  it.each([undefined, "", "null", "2026-02-30", "2026-10-04T00:00:00Z", 0])(
    "rejects omitted or invalid publication %s",
    (publishedAt) => {
      expect(benchmarkSourceSetV2Schema.safeParse({ ...kimi, publishedAt }).success).toBe(false);
      const { publishedAt: _publishedAt, ...missing } = kimi;
      expect(benchmarkSourceSetV2Schema.safeParse(missing).success).toBe(false);
    },
  );

  it.each([null, undefined, "", "2026-02-30", "2026-10-04T00:00:00Z"])(
    "requires both valid checked dates even with unknown publication: %s",
    (checkedAt) => {
      const source = structuredClone(kimi);
      const observation = source.observations[0];
      if (!observation) throw new Error("Missing observation");
      expect(
        benchmarkSourceSetV2Schema.safeParse({
          ...source,
          observations: [{ ...observation, checkedAt }],
        }).success,
      ).toBe(false);
      expect(
        benchmarkSourceSetV2Schema.safeParse({
          ...source,
          redistribution: { ...source.redistribution, checkedAt },
        }).success,
      ).toBe(false);
    },
  );

  it("compares observation checks only against known publication, in both schemas", () => {
    const source = { ...kimi, publishedAt: "2026-10-05" };
    for (const schema of [benchmarkSourceSetSchema, benchmarkSourceSetV2Schema]) {
      expect(schema.safeParse(source).success).toBe(false);
      expect(schema.safeParse({ ...source, publishedAt: "2026-10-04" }).success).toBe(true);
    }
    expect(benchmarkSourceSetV2Schema.safeParse(kimi).success).toBe(true);
  });

  it("shares strict rights, matrix, identity, score and optional-field rules across versions", () => {
    const legacy = benchmarkDataForEdition("2026-10-04-v4");
    if (!legacy) throw new Error("Missing legacy edition");
    for (const schemaVersion of [1, 2] as const) {
      const fixture = { ...structuredClone(legacy), schemaVersion };
      const set = fixture.sourceSets[0];
      const observation = set?.observations[0];
      if (!set || !observation) throw new Error("Missing complete matrix");
      expect(benchmarkDataSchema.safeParse({ ...fixture, extra: true }).success).toBe(false);
      expect(
        benchmarkDataSchema.safeParse({ ...fixture, sourceSets: [{ ...set, extra: true }] })
          .success,
      ).toBe(false);
      expect(
        benchmarkSourceSetV2Schema.safeParse({
          ...set,
          publishedAt: null,
          snapshotAt: "2026-10-04",
        }).success,
      ).toBe(false);
      set.observations.pop();
      expect(benchmarkDataSchema.safeParse(fixture).success).toBe(false);
      set.kind = "model_observations";
      set.evidenceClass = "independent_evaluation";
      for (const o of set.observations) o.evidenceClass = "independent_evaluation";
      expect(benchmarkDataSchema.safeParse(fixture).success).toBe(false);
      set.evidenceClass = "developer_reported";
      for (const o of set.observations) o.evidenceClass = "developer_reported";
      observation.value = 101;
      observation.displayValue = "101%";
      expect(benchmarkDataSchema.safeParse(fixture).success).toBe(false);
    }
    const observation = kimi.observations[0];
    expect(
      benchmarkSourceSetV2Schema.safeParse({
        ...kimi,
        observations: [{ ...observation, comparisonGroup: null }],
      }).success,
    ).toBe(false);
    expect(() =>
      validateBenchmarkData(benchmarkData, {
        ...models,
        "kimi-k3": { id: "kimi-k3", kind: "family" },
      }),
    ).toThrow(/Unknown canonical model/);
    expect(() =>
      validateBenchmarkData(benchmarkData, { ...models, "kimi-k3": { id: "another-release" } }),
    ).toThrow(/Unknown canonical model/);
  });
});

describe("one first-party Kimi K3 fact", () => {
  it("retains raw notation, declared setup, unknowns and narrow attribution", () => {
    expect(benchmarkData.sourceSets.slice(15)).toHaveLength(1);
    expect(kimi).toMatchObject({
      id: "kimi-k3-terminal-checked-2026-10-04",
      kind: "model_observations",
      evaluator: "Moonshot AI",
      publishedAt: null,
      sourceUrl: "https://www.kimi.com/blog/kimi-k3",
      modelIds: ["kimi-k3"],
      benchmarkIds: ["terminal-bench-2-1"],
      evidenceClass: "developer_reported",
      redistribution: { basis: "official_provider_facts", checkedAt: "2026-10-04" },
    });
    expect(kimi.observations).toHaveLength(1);
    const o = kimi.observations[0];
    expect(o).toMatchObject({
      value: 88.3,
      displayValue: "88.3%",
      checkedAt: "2026-10-04",
      evaluationOrigin: "reporter_computed",
      effort: "max",
      harness: "Kimi Code (version unreported)",
    });
    expect(o?.notes).toContain("raw notation 88.3");
    expect(o?.notes).toContain("https://www.tbench.ai/news/terminal-bench-2-1");
    expect(o?.notes).toContain("no arithmetic rescaling");
    expect(o?.notes).toContain("not provider-explicit notation or leaderboard admission");
    expect(o?.notes).toContain("Temperature = 1.0; top-p = 1.0");
    expect(kimi.redistribution.rationale).toContain(
      "No explicit benchmark dataset redistribution grant",
    );
    expect(kimi.redistribution.rationale).toContain("does not cover publisher charts");
    for (const field of ["comparisonGroup", "tools", "provider"])
      expect(o).not.toHaveProperty(field);
    for (const missing of [
      "version",
      "trial count",
      "task count",
      "completion",
      "timeout",
      "output tokens",
      "tools",
      "endpoint",
    ])
      expect(o?.uncertainty).toContain(missing);
    expect(comparisonSets(benchmarkData)).not.toContain(kimi);
  });

  it("retains pins, setup differences, definition order and publication-independent selection", () => {
    const o = kimi.observations[0];
    if (!o) throw new Error("Missing observation");
    const ids = ["qwen-3-8-max", "glm-5-3", "minimax-m3", "kimi-k3"];
    const row = resolveComparison(benchmarkData, ids, { coverage: "shared" })[0];
    expect(row?.cells.map((c) => c.observation?.value)).toEqual([86.6, 88.2, 66, 88.3]);
    expect(row?.setup).toBe("different_or_unreported");
    expect(
      resolveComparison(benchmarkData, ["kimi-k3"], { observationIds: [observationId(o)] })[0]
        ?.cells[0]?.selectionReason,
    ).toContain("Explicit");
    expect(() => resolveComparison(benchmarkData, ["kimi-k3"], { sourceSetId: kimi.id })).toThrow(
      /complete source sheet/,
    );
    const changedDates = structuredClone(benchmarkData);
    for (const set of changedDates.sourceSets) set.publishedAt = null;
    expect(resolveComparison(changedDates, ids)).toEqual(resolveComparison(benchmarkData, ids));
    const rows = resolveComparison(benchmarkData, ["deepseek-v4-1-flash", "kimi-k3"]);
    expect(rows.map((r) => r.definition.id)).toEqual(
      benchmarkData.definitions
        .filter((d) => rows.some((r) => r.definition.id === d.id))
        .map((d) => d.id),
    );
  });
});
