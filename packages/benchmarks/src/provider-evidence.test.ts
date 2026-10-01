import { describe, expect, it } from "vitest";
import { benchmarkData, validateBenchmarkData } from "./index.js";

// Independent transcription of the live official release summaries checked on 2026-09-30.
// Google has its own full DOM-table fixture. These expected values are never generated from the data files.
const expected: Record<string, [string, string, number][]> = {
  "deepseek-flash-2026-09-10": [
    ["deep-swe-v1-1", "deepseek-v4-1-flash", 74.2],
    ["terminal-bench-4-0", "deepseek-v4-1-flash", 31.2],
    ["gpqa-diamond", "deepseek-v4-1-flash", 90.9],
    ["hle-no-tools", "deepseek-v4-1-flash", 36.8],
    ["hle-text-subset", "deepseek-v4-1-flash", 39.1],
    ["codeforces-rating", "deepseek-v4-1-flash", 3471],
    ["matharena-apex", "deepseek-v4-1-flash", 65.6],
    ["terminal-bench-2-1", "deepseek-v4-1-flash", 90.6],
    ["terminal-bench-3-0", "deepseek-v4-1-flash", 30],
    ["programbench", "deepseek-v4-1-flash", 20.3],
    ["nl2repo-bench", "deepseek-v4-1-flash", 65.4],
    ["cybergym", "deepseek-v4-1-flash", 88.1],
    ["sec-bench-pro", "deepseek-v4-1-flash", 62.8],
    ["exploitgym", "deepseek-v4-1-flash", 15.3],
    ["hle-with-tools", "deepseek-v4-1-flash", 63.9],
    ["deepseek-automation-bench", "deepseek-v4-1-flash", 54.8],
    ["agents-last-exam", "deepseek-v4-1-flash", 31.8],
    ["babyvision-tools", "deepseek-v4-1-flash", 89.6],
    ["zerobench-main-tools", "deepseek-v4-1-flash", 49],
    ["chartography", "deepseek-v4-1-flash", 78.9],
  ],
  "spacexai-grok-2026-09-21": [
    ["deep-swe-v1-1", "grok-4-7", 71],
    ["terminal-bench-4-0", "grok-4-7", 37.6],
    ["cursorbench-4-0", "grok-4-7", 46.3],
    ["eebench", "grok-4-7", 64],
    ["healthbench-professional", "grok-4-7", 56.7],
  ],
  "anthropic-sonnet-2026-09-28": [
    ["terminal-bench-4-0", "claude-sonnet-5-5", 70.6],
    ["chartography", "claude-sonnet-5-5", 61.6],
    ["terminal-bench-4-0", "claude-opus-5-5", 66.4],
    ["chartography", "claude-opus-5-5", 64.4],
    ["frontiercode-1-1-main", "claude-sonnet-5-5", 46.2],
    ["cursorbench-4-0", "claude-sonnet-5-5", 55.5],
    ["osworld-2-1-partial", "claude-sonnet-5-5", 80.1],
  ],
};
describe("official provider source transcriptions", () => {
  for (const [sourceId, rows] of Object.entries(expected))
    it(`verifies every stored observation from ${sourceId}`, () => {
      const data = validateBenchmarkData(
        benchmarkData,
        Object.fromEntries(
          benchmarkData.sourceSets.flatMap((s) => s.modelIds).map((id) => [id, { id }]),
        ),
      );
      const source = data.sourceSets.find((s) => s.id === sourceId);
      expect(source?.observations).toHaveLength(rows.length);
      for (const [benchmarkId, modelId, value] of rows)
        expect(
          source?.observations.find((o) => o.benchmarkId === benchmarkId && o.modelId === modelId)
            ?.value,
        ).toBe(value);
      expect(source?.redistribution.basis).toBe("official_provider_facts");
    });
  it("does not import independent restricted datasets or mistake Sol 6 for Sol 6.1", () => {
    expect(benchmarkData.sourceSets.flatMap((s) => s.observations)).toHaveLength(202);
    expect(
      benchmarkData.sourceSets.every((s) => s.redistribution.basis === "official_provider_facts"),
    ).toBe(true);
    const science = benchmarkData.definitions.filter((d) => d.name === "Humanity’s Last Exam");
    expect(science.map((d) => d.taskSubset)).toEqual([
      "Without tools",
      "Pure-text subset",
      "With tools",
    ]);
  });
});
