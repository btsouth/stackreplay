import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseBenchmarkState } from "@/lib/benchmark-state";
import { loadPublicBenchmarks } from "@/lib/public-benchmarks";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { BenchmarkExplorer, reportedModelIds, reportedScoresSelection } from "./benchmark-explorer";

const data = loadPublicBenchmarks();
const models = loadPublicCatalog().models.map((model) => ({
  id: model.id,
  name: model.name,
  developer: model.developerName ?? "Unknown",
}));

describe("benchmark empty selection", () => {
  it("names unscored models and offers an explicit selection change", () => {
    const initial = parseBenchmarkState(
      new URLSearchParams("models=qwen-3-8-max,kimi-k3&coverage=all"),
      models.map((m) => m.id),
    );
    const html = renderToStaticMarkup(
      createElement(BenchmarkExplorer, {
        data,
        editions: { [initial.edition]: data },
        models,
        initial,
      }),
    );
    expect(initial.modelIds).toEqual(["qwen-3-8-max", "kimi-k3"]);
    expect(html).toContain("Qwen 3.8 Max, Kimi K3: no reported scores in this edition.");
    expect(html).toContain("Your models stay selected until you choose another selection.");
    expect(html).toContain("Show models with reported scores");
  });

  it("explicit recovery loads scored models and clears source and observation pins", () => {
    const patch = reportedScoresSelection(data, models);
    expect(patch).toMatchObject({
      category: "all",
      coverage: "all",
      sourceSetId: undefined,
      observationIds: [],
    });
    expect(patch.modelIds?.length).toBeGreaterThan(0);
    expect(patch.modelIds?.length).toBeLessThanOrEqual(6);
    expect(patch.modelIds).not.toContain("kimi-k3");
    expect(patch.modelIds).not.toContain("qwen-3-8-max");
    expect(patch.modelIds?.every((id) => reportedModelIds(data, models).includes(id))).toBe(true);
  });
});
