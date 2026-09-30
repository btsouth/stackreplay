import { benchmarkEdition, frontierModelIds } from "@stackreplay/benchmarks";
import { describe, expect, it } from "vitest";
import { benchmarkUrl, parseBenchmarkState } from "./benchmark-state";

describe("bookmarkable benchmark selection", () => {
  it("defaults to honest Frontier coverage including Sol", () => {
    const state = parseBenchmarkState(new URLSearchParams(), frontierModelIds);
    expect(state.modelIds).toEqual(frontierModelIds);
    expect(state.coverage).toBe("all");
    expect(state.edition).toBe(benchmarkEdition);
  });
  it("round trips exact models, category, coverage and observation alternatives", () => {
    const state = {
      modelIds: ["claude-opus-5-5"],
      category: "coding",
      coverage: "shared" as const,
      observationIds: ["source.benchmark.claude-opus-5-5"],
      edition: benchmarkEdition,
    };
    const restored = parseBenchmarkState(
      new URL(benchmarkUrl(state), "https://stackreplay.com").searchParams,
      frontierModelIds,
    );
    expect(restored).toMatchObject(state);
  });
  it("reports unknown models and rejects accidental duplicate model columns", () => {
    expect(
      parseBenchmarkState(new URLSearchParams("models=unknown"), frontierModelIds).error,
    ).toBeDefined();
    expect(
      parseBenchmarkState(new URLSearchParams("models=gpt-6-astra,gpt-6-astra"), frontierModelIds)
        .error,
    ).toBeDefined();
  });
});
