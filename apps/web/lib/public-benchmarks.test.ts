import { describe, expect, it } from "vitest";
import { loadPublicBenchmarks } from "./public-benchmarks";

describe("public benchmark edition validation", () => {
  it("maps the three Epoch records to exact public catalog releases", () => {
    const data = loadPublicBenchmarks();
    const benchmarkId = "epoch-gpqa-diamond-revision-unreported";
    const expected = new Map([
      ["epoch-gpqa-sonnet-5-5-max-2026-10-04", "claude-sonnet-5-5"],
      ["epoch-gpqa-opus-5-5-max-2026-10-04", "claude-opus-5-5"],
      ["epoch-gpqa-qwen-0902-xhigh-2026-10-04", "qwen-3-8-max-0902"],
    ]);
    const sets = data.sourceSets.filter((set) => expected.has(set.id));

    expect(sets).toHaveLength(3);
    for (const set of sets) {
      expect(set.kind).toBe("model_observations");
      expect(set.modelIds).toEqual([expected.get(set.id)]);
      expect(set.benchmarkIds).toEqual([benchmarkId]);
      expect(set.observations).toHaveLength(1);
    }
    expect(data.definitions.find((definition) => definition.id === benchmarkId)?.category).toBe(
      "science",
    );
  });
});
