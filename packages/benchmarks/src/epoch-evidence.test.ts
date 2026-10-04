import { describe, expect, it } from "vitest";
import {
  benchmarkData,
  comparisonSets,
  observationId,
  resolveComparison,
  validateBenchmarkData,
} from "./index.js";

const models = Object.fromEntries(
  benchmarkData.sourceSets.flatMap((set) => set.modelIds).map((id) => [id, { id }]),
);
const data = validateBenchmarkData(benchmarkData, models);
const benchmarkId = "epoch-gpqa-diamond-revision-unreported";
const expected = [
  {
    sourceSetId: "epoch-gpqa-sonnet-5-5-max-2026-10-04",
    modelId: "claude-sonnet-5-5",
    label: "Max (Epoch source configuration label)",
    mean: "0.9558080808080808",
    stderr: "0.013710320714521202",
    percentage: "95.5808080808080800",
    runId: "QPk8jbJvo4986sbWtdte6J",
    startedAt: "2026-09-29T15:15:14.000Z",
  },
  {
    sourceSetId: "epoch-gpqa-opus-5-5-max-2026-10-04",
    modelId: "claude-opus-5-5",
    label: "Max (Epoch source configuration label)",
    mean: "0.9059343434343434",
    stderr: "0.019434397190192135",
    percentage: "90.5934343434343400",
    runId: "6gmbahPSxHf9xVhAYqpnhi",
    startedAt: "2026-09-22T18:27:39.000Z",
  },
  {
    sourceSetId: "epoch-gpqa-qwen-0902-xhigh-2026-10-04",
    modelId: "qwen-3-8-max-0902",
    label: "Xhigh (Epoch source configuration label)",
    mean: "0.922979797979798",
    stderr: "0.017249976996605708",
    percentage: "92.297979797979800",
    runId: "VzeQXKBH9maR2nDcZJ8b7S",
    startedAt: "2026-09-02T18:04:58.000Z",
  },
] as const;
const epochSourceSetIds: readonly string[] = expected.map((record) => record.sourceSetId);
const epochSets = data.sourceSets.filter((set) => epochSourceSetIds.includes(set.id));

describe("reviewed Epoch GPQA Diamond pilot", () => {
  it("stores exactly three qualified records with exact raw values and provenance", () => {
    expect(epochSets).toHaveLength(3);
    expect(new Set(epochSets.map((set) => set.id))).toEqual(new Set(epochSourceSetIds));

    const definition = data.definitions.find((entry) => entry.id === benchmarkId);
    expect(definition).toEqual({
      id: benchmarkId,
      name: "GPQA Diamond",
      version: null,
      variant: "Epoch runs; suite revision unreported",
      category: "science",
      description:
        "Graduate-level scientific question answering administered by Epoch AI. The published Diamond subset contains 198 questions; actual scored counts and run-specific suite revisions are unreported.",
      metric: "Epoch-published mean accuracy",
      taskSubset: "Diamond",
      unit: "percent",
      decimalPlaces: 1,
      higherIsBetter: true,
      methodologyUrl: "https://epoch.ai/benchmarks/gpqa-diamond",
    });

    for (const record of expected) {
      const set = epochSets.find((entry) => entry.id === record.sourceSetId);
      if (!set) throw new Error(`Missing Epoch source set ${record.sourceSetId}`);
      expect(set.kind).toBe("model_observations");
      expect(set.evaluator).toBe("Epoch AI");
      expect(set.evidenceClass).toBe("independent_evaluation");
      expect(set.publishedAt).toBe("2026-10-04");
      expect(set.sourceUrl).toBe("https://epoch.ai/data/benchmark_data.zip");
      expect(set.methodologyUrl).toBe("https://epoch.ai/benchmarks/gpqa-diamond");
      expect(set.modelIds).toEqual([record.modelId]);
      expect(set.benchmarkIds).toEqual([benchmarkId]);
      expect(set.observations).toHaveLength(1);
      expect(set.redistribution).toEqual({
        basis: "licensed_dataset",
        rationale: expect.stringContaining(
          "scoped only to these three selected Epoch-run numerical records",
        ),
        termsUrl: "https://epoch.ai/benchmarks/use-this-data",
        checkedAt: "2026-10-04",
      });
      expect(set.methodologySummary).toContain("Epoch AI, 'Capabilities & benchmarking'");
      expect(set.methodologySummary).toContain("https://epoch.ai/data/benchmark_data.zip");
      expect(set.methodologySummary).toContain("CC BY 4.0");
      expect(set.methodologySummary).toContain("https://creativecommons.org/licenses/by/4.0/");
      expect(set.methodologySummary).toContain("Diamond subset");
      expect(set.methodologySummary).toContain("no endorsement is implied");
      expect(set.limitations.join(" ")).toContain("did not reproduce");
      expect(set.limitations.join(" ")).toContain("suite revision");
      expect(set.limitations.join(" ")).toContain("Original run publication");
      expect(set.limitations.join(" ")).toContain("equal reasoning effort");
      expect(set.limitations.join(" ")).toContain("95% confidence interval");

      const observation = set.observations[0];
      if (!observation) throw new Error(`Missing Epoch observation ${record.sourceSetId}`);
      expect(observation.benchmarkId).toBe(benchmarkId);
      expect(observation.modelId).toBe(record.modelId);
      expect(observation.value).toBe(Number(record.percentage));
      expect(observation.displayValue).toBe(`${record.percentage}%`);
      expect(observation.evaluator).toBe("Epoch AI");
      expect(observation.evidenceClass).toBe("independent_evaluation");
      expect(observation.evaluationOrigin).toBe("reporter_computed");
      expect(observation.effort).toBe(record.label);
      expect(observation.notes).toContain(`accuracy fraction ${record.mean}`);
      expect(observation.notes).toContain(`stderr is ${record.stderr}`);
      expect(observation.notes).toContain(`run ID ${record.runId}`);
      expect(observation.notes).toContain(`evaluation start timestamp ${record.startedAt}`);
      expect(observation.notes).toContain(
        "ZIP SHA256 86e6667353c6c8c396feaa84eabc5d9ce160ee6fa22b2cd5abb72e26614e788c",
      );
      expect(observation.notes).toContain(
        "complete archive-member SHA256 c5fed6f394d650dada5c5d14c325a0ccbd61b742b555b95ca971d5a1fed3b4d1",
      );
      expect(set.redistribution.rationale).toContain("use-this-data terms state");
      expect(JSON.stringify(set)).not.toContain("comparisonGroup");
    }

    expect(
      epochSets.some(
        (set) =>
          set.observations[0]?.value !==
          Number(set.observations[0]?.notes?.match(/fraction ([0-9.]+)/u)?.[1]) * 100,
      ),
    ).toBe(true);
  });

  it("remains a partial model source that cannot masquerade as a complete sheet", () => {
    expect(epochSets.every((set) => set.kind === "model_observations")).toBe(true);
    expect(comparisonSets(data).some((set) => epochSourceSetIds.includes(set.id))).toBe(false);
  });

  it("resolves the three-model Science row as different or unreported", () => {
    const trio = expected.map((record) => record.modelId);
    const row = resolveComparison(data, trio, { coverage: "all" }).find(
      (entry) => entry.definition.id === benchmarkId,
    );
    expect(row?.setup).toBe("different_or_unreported");
    expect(row?.cells.map((cell) => cell.observation?.value)).toEqual([
      Number(expected[0].percentage),
      Number(expected[1].percentage),
      Number(expected[2].percentage),
    ]);
    expect(row?.highestModelIds).toEqual(["claude-sonnet-5-5"]);
    expect(
      resolveComparison(data, trio, { coverage: "shared" }).map((entry) => entry.definition.id),
    ).toEqual([benchmarkId]);
  });

  it("leaves a fourth unscored model missing under All and removes the row under Shared", () => {
    const modelIds = [...expected.map((record) => record.modelId), "gemini-4-argon"];
    const row = resolveComparison(data, modelIds, { coverage: "all" }).find(
      (entry) => entry.definition.id === benchmarkId,
    );
    expect(row?.cells.map((cell) => cell.observation?.modelId)).toEqual([
      "claude-sonnet-5-5",
      "claude-opus-5-5",
      "qwen-3-8-max-0902",
      undefined,
    ]);
    expect(
      resolveComparison(data, modelIds, { coverage: "shared" }).some(
        (entry) => entry.definition.id === benchmarkId,
      ),
    ).toBe(false);
  });

  it("supports exact observation pins for the new runs", () => {
    for (const record of expected) {
      const set = epochSets.find((entry) => entry.id === record.sourceSetId);
      const observation = set?.observations[0];
      if (!observation) throw new Error(`Missing Epoch observation ${record.sourceSetId}`);
      const row = resolveComparison(data, [record.modelId], {
        observationIds: [observationId(observation)],
      }).find((entry) => entry.definition.id === benchmarkId);
      expect(row?.cells[0]?.observation).toEqual(observation);
      expect(row?.cells[0]?.selectionReason).toContain("Explicit");
    }
  });
});
