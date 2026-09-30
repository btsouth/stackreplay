import { describe, expect, it } from "vitest";
import verified from "./data/google-deepmind-argon-2026-09-30.verified-table.json" with {
  type: "json",
};
import {
  benchmarkCategories,
  benchmarkData,
  benchmarkName,
  comparisonSets,
  formatScore,
  highlightedModels,
  observationFor,
} from "./index.js";
import {
  benchmarkDataSchema,
  benchmarkObservationSchema,
  validateBenchmarkData,
} from "./schema.js";

const firstSet = benchmarkData.sourceSets[0];
if (!firstSet) throw new Error("Missing checked-in source set");
const models = Object.fromEntries(firstSet.modelIds.map((id) => [id, { id }]));
const valid = () => validateBenchmarkData(structuredClone(benchmarkData), models);

describe("reviewed Google Argon evidence", () => {
  it("matches every cell independently captured from the live official table", () => {
    const data = valid();
    const set = data.sourceSets[0];
    if (!set) throw new Error("Missing Google set");
    expect(set.modelIds).toEqual([
      "gemini-4-argon",
      "gpt-6-astra",
      "claude-fable-5-1",
      "claude-opus-5-5",
    ]);
    expect(data.definitions).toHaveLength(17);
    expect(set.benchmarkIds).toHaveLength(17);
    expect(set.observations).toHaveLength(68);
    expect(verified.rows).toHaveLength(17);
    for (const row of verified.rows) {
      for (const [i, modelId] of set.modelIds.entries()) {
        const observation = observationFor(set, row.benchmarkId, modelId);
        expect(observation.displayValue).toBe(row.displayValues[i]);
        expect(observation.value).toBe(Number(row.displayValues[i]?.replace("%", "")));
      }
    }
    expect(set.benchmarkIds.join(" ")).not.toMatch(/osworld|agents-last-exam/);
  });

  it("preserves the methodology's computed versus republished results", () => {
    const set = valid().sourceSets[0];
    if (!set) throw new Error("Missing Google set");
    expect(observationFor(set, "deep-swe-v1-1", "gemini-4-argon")).toMatchObject({
      harness: "mini-swe",
      evaluationOrigin: "reporter_computed",
    });
    expect(observationFor(set, "terminal-bench-4-0", "claude-opus-5-5")).toMatchObject({
      evaluator: "Google DeepMind",
      evaluationOrigin: "external_result_reported",
    });
    expect(observationFor(set, "posttrainbench-v1-1", "gpt-6-astra")).toMatchObject({
      harness: "OpenCode",
      evaluationOrigin: "reporter_computed",
    });
    expect(observationFor(set, "lvbench", "gemini-4-argon").notes).toContain("800 frames");
  });

  it("keeps versions, subsets and navigation categories explicit", () => {
    const definitions = valid().definitions;
    expect(benchmarkCategories.map((c) => c.id)).toEqual([
      "coding",
      "knowledge-work",
      "science",
      "long-context",
      "multimodal",
      "security",
    ]);
    expect(definitions.filter((d) => d.category === "coding")).toHaveLength(5);
    const graphwalks = definitions.filter((d) => d.name === "GraphWalks");
    expect(new Set(graphwalks.map(benchmarkName)).size).toBe(2);
    expect(definitions.find((d) => d.id === "posttrainbench-v1-1")?.version).toBe("v1.1");
    expect(definitions.find((d) => d.id === "vals-index")?.version).toBeNull();
  });

  it("highlights every equal extreme only inside its own source set", () => {
    const data = valid();
    const set = data.sourceSets[0];
    const definition = data.definitions.find((d) => d.id === "cwe-bench-v1");
    if (!set || !definition) throw new Error("Missing fixture");
    expect(highlightedModels(set, definition)).toEqual(["gemini-4-argon", "gpt-6-astra"]);
    expect(highlightedModels(set, { ...definition, higherIsBetter: false })).toEqual([
      "claude-fable-5-1",
    ]);
    expect(highlightedModels({ ...set, kind: "model_observations" }, definition)).toEqual([]);
    expect(formatScore(68, definition)).toBe("68.0%");
    expect(() => formatScore(Number.NaN, definition)).toThrow();
    expect(() => formatScore(101, definition)).toThrow();
  });
});

describe("benchmark validation boundary", () => {
  it("rejects unknown models, family identities, benchmarks and source sets", () => {
    expect(() => validateBenchmarkData(benchmarkData, {})).toThrow(/Unknown canonical model/);
    expect(() =>
      validateBenchmarkData(benchmarkData, {
        ...models,
        "gemini-4-argon": { id: "gemini-4-argon", kind: "family" },
      }),
    ).toThrow(/Unknown canonical model/);
    const data = valid();
    const set = data.sourceSets[0];
    const observation = set?.observations[0];
    if (!set || !observation) throw new Error("Missing fixture");
    observation.sourceSetId = "unknown-set";
    expect(benchmarkDataSchema.safeParse(data).success).toBe(false);
    observation.sourceSetId = set.id;
    observation.benchmarkId = "unknown-benchmark";
    set.benchmarkIds[0] = "unknown-benchmark";
    expect(benchmarkDataSchema.safeParse(data).success).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 101])(
    "rejects invalid percent score %s",
    (value) => {
      const data = valid();
      const observation = data.sourceSets[0]?.observations[0];
      if (!observation) throw new Error("Missing fixture");
      observation.value = value;
      observation.displayValue = `${value}%`;
      expect(benchmarkDataSchema.safeParse(data).success).toBe(false);
    },
  );

  it("requires an explicit value and never converts missing data to zero", () => {
    const observation = valid().sourceSets[0]?.observations[0];
    if (!observation) throw new Error("Missing fixture");
    const { value: _value, ...missing } = observation;
    expect(benchmarkObservationSchema.safeParse(missing).success).toBe(false);
    expect(benchmarkObservationSchema.safeParse({ ...observation, value: null }).success).toBe(
      false,
    );
    expect(benchmarkObservationSchema.safeParse({ ...observation, value: "68.9" }).success).toBe(
      false,
    );
    expect(
      benchmarkObservationSchema.safeParse({ ...observation, value: 0, displayValue: "0.0%" })
        .success,
    ).toBe(true);
  });

  it("rejects incomplete matrices and duplicates, including one replacing a missing cell", () => {
    const data = valid();
    const set = data.sourceSets[0];
    if (!set?.observations[0]) throw new Error("Missing fixture");
    set.observations.pop();
    expect(benchmarkDataSchema.safeParse(data).success).toBe(false);
    set.observations.push({ ...set.observations[0] });
    expect(set.observations).toHaveLength(68);
    expect(benchmarkDataSchema.safeParse(data).success).toBe(false);
    set.kind = "model_observations";
    expect(benchmarkDataSchema.safeParse(data).success).toBe(false);
  });

  it("accepts individual evidence without letting it become a partial sheet", () => {
    const data = valid();
    const set = data.sourceSets[0];
    if (!set) throw new Error("Missing fixture");
    set.kind = "model_observations";
    set.observations = set.observations.slice(0, 1);
    expect(benchmarkDataSchema.safeParse(data).success).toBe(true);
    expect(comparisonSets(data)).toEqual([]);
    expect(() => observationFor(set, "cwe-bench-v1", "gemini-4-argon")).toThrow(
      /Missing benchmark observation/,
    );
  });

  it("allows different scores for one model/benchmark across different source sets", () => {
    const data = valid();
    const second = structuredClone(data.sourceSets[0]);
    if (!second?.observations[0]) throw new Error("Missing fixture");
    second.id = "another-reviewed-provider-evaluation";
    for (const o of second.observations) o.sourceSetId = second.id;
    second.observations[0].value = 61.6;
    second.observations[0].displayValue = "61.6%";
    data.sourceSets.push(second);
    expect(benchmarkDataSchema.parse(data).sourceSets).toHaveLength(2);
  });

  it("preserves distinct versions instead of merging by benchmark name", () => {
    const data = valid();
    const definition = data.definitions.find((d) => d.id === "terminal-bench-4-0");
    if (!definition) throw new Error("Missing fixture");
    data.definitions.push({ ...definition, id: "terminal-bench-3-0", version: "3.0" });
    expect(
      benchmarkDataSchema.parse(data).definitions.filter((d) => d.name === "Terminal-Bench"),
    ).toHaveLength(2);
  });

  it("rejects mismatched display values, reporter labels and unsupported fields", () => {
    const data = valid();
    const observation = data.sourceSets[0]?.observations[0];
    if (!observation) throw new Error("Missing fixture");
    observation.displayValue = "0.0%";
    expect(benchmarkDataSchema.safeParse(data).success).toBe(false);
    observation.displayValue = "68.9%";
    observation.evaluator = "Model developer inferred incorrectly";
    expect(benchmarkDataSchema.safeParse(data).success).toBe(false);
    expect(
      benchmarkObservationSchema.safeParse({ ...observation, stackreplayScore: 99 }).success,
    ).toBe(false);
  });

  it("requires licensed redistribution or permission for independent datasets", () => {
    const data = valid();
    const set = data.sourceSets[0];
    if (!set) throw new Error("Missing fixture");
    set.evidenceClass = "independent_evaluation";
    for (const o of set.observations) o.evidenceClass = set.evidenceClass;
    expect(benchmarkDataSchema.safeParse(data).success).toBe(false);
    set.redistribution.basis = "permission";
    expect(benchmarkDataSchema.safeParse(data).success).toBe(true);
  });
});
