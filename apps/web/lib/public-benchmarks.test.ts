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

describe("dated provider public catalog mapping", () => {
  it("maps only the three admitted releases and preserves historical coverage", () => {
    const data = loadPublicBenchmarks("2026-10-04-v4");
    const added = data.sourceSets.slice(12);
    expect(added.flatMap((s) => s.modelIds)).toEqual(["qwen-3-8-max", "glm-5-3", "minimax-m3"]);
    expect(added.map((s) => s.observations[0]?.displayValue)).toEqual(["86.6%", "88.2%", "66.0%"]);
    expect(data.sourceSets.flatMap((s) => s.modelIds)).not.toContain("kimi-k3");
    const old = loadPublicBenchmarks("2026-10-04-v3");
    expect(old.sourceSets).toHaveLength(12);
    expect(old.sourceSets.flatMap((s) => s.observations)).toHaveLength(205);
    expect(data.sourceSets.slice(0, 12)).toEqual(old.sourceSets);
  });
});
