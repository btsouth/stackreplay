import { describe, expect, it } from "vitest";
import { loadPublicBenchmarks } from "./public-benchmarks";
import { loadPublicCatalog } from "./public-catalog";
import {
  apiPriceModels,
  benchmarkCoverage,
  blendedPrice,
  chartModels,
  planLeaders,
  visualModelData,
} from "./visual-model-data";

const evidence = loadPublicBenchmarks();
const catalog = loadPublicCatalog("2026-10-04");
const data = visualModelData(catalog, evidence);

describe("visual chart selection", () => {
  it("chooses the benchmark with the most distinct scored catalog models", () => {
    const ids = new Set(data.models.map((model) => model.id));
    const coverage = evidence.definitions.map((definition) => ({
      id: definition.id,
      count: new Set(
        evidence.sourceSets
          .flatMap((set) => set.observations)
          .filter(
            (observation) =>
              observation.benchmarkId === definition.id && ids.has(observation.modelId),
          )
          .map((observation) => observation.modelId),
      ).size,
    }));
    expect(data.benchmarks[0]?.coverage).toBe(Math.max(...coverage.map((item) => item.count)));
    for (const benchmark of data.benchmarks)
      expect(benchmark.coverage).toBe(coverage.find((item) => item.id === benchmark.id)?.count);
  });
  it("does not count duplicate observations as extra model coverage", () => {
    const benchmark = data.benchmarks.find(
      (item) =>
        item.scores["claude-opus-5-5"] &&
        evidence.sourceSets
          .flatMap((set) => set.observations)
          .filter((score) => score.benchmarkId === item.id && score.modelId === "claude-opus-5-5")
          .length > 1,
    );
    expect(benchmark).toBeDefined();
    const result = benchmarkCoverage(evidence, ["claude-opus-5-5"]);
    expect(result.find((item) => item.id === benchmark?.id)?.coverage).toBe(1);
  });
  it("blends decimal prices exactly at three input tokens per output token", () => {
    expect(blendedPrice("2", "12")).toBe("4.5");
    expect(blendedPrice("0.1", "0.2")).toBe("0.125");
    expect(blendedPrice("0.0028", "0.001")).toBe("0.00235");
    expect(blendedPrice("0", "0")).toBe("0");
    expect(blendedPrice("3.00", "15")).toBe("6");
  });
  it("excludes absent, invalid and zero logarithmic prices and absent scores", () => {
    const benchmark = data.benchmarks[0];
    const valid = benchmark && chartModels(data.models, benchmark)[0];
    expect(valid).toBeDefined();
    if (!valid || !benchmark) throw new Error("Expected a chart point");
    const candidates = [
      valid,
      { ...valid, blended: undefined },
      { ...valid, blended: "0" },
      { ...valid, blended: "NaN" },
      { ...valid, id: "missing-score" },
    ];
    expect(chartModels(candidates, benchmark)).toEqual([valid]);
    expect(blendedPrice(undefined, "1")).toBeUndefined();
    expect(blendedPrice("1", undefined)).toBeUndefined();
    expect(blendedPrice("-1", "1")).toBeUndefined();
    expect(blendedPrice("NaN", "1")).toBeUndefined();
  });
  it("includes every valid priced model independently of scores and filters by developer", () => {
    const priced = apiPriceModels(data.models);
    expect(priced.length).toBe(60);
    expect(priced.map((model) => model.id).sort()).toEqual(
      data.models
        .filter((model) => model.input !== undefined && model.output !== undefined)
        .map((model) => model.id)
        .sort(),
    );
    expect(
      priced.some((model) => !data.benchmarks.some((benchmark) => benchmark.scores[model.id])),
    ).toBe(true);
    expect(apiPriceModels(data.models, "openai")).toEqual(
      priced.filter((model) => model.lab === "openai"),
    );
    const valid = priced[0];
    if (!valid) throw new Error("Expected a priced model");
    expect(
      apiPriceModels([
        { ...valid, input: "0", output: "0" },
        { ...valid, input: undefined },
        { ...valid, input: "NaN" },
        { ...valid, output: "-1" },
      ]),
    ).toEqual([{ ...valid, input: "0", output: "0" }]);
    for (let i = 1; i < priced.length; i++)
      expect(Number(priced[i]?.input)).toBeGreaterThanOrEqual(Number(priced[i - 1]?.input));
  });
  it("ranks distinct coding plan inclusion, without counting duplicate plan records", () => {
    const model = data.models[0];
    if (!model) throw new Error("Expected a model");
    const plan = { id: "one", name: "One", price: "" };
    const two = { ...model, id: "two", plans: [plan, { ...plan, id: "two" }] };
    const one = { ...model, id: "one", plans: [plan, plan, plan] };
    expect(planLeaders([one, { ...model, plans: [] }, two])).toEqual([two, one]);
    const counts = planLeaders(data.models).map(
      (model) => new Set(model.plans.map((plan) => plan.id)).size,
    );
    expect(new Set(counts).size).toBeGreaterThan(1);
  });
  it("selects DeepSWE as the current default and plots only its seven priced models", () => {
    const benchmark = data.benchmarks[0];
    expect(benchmark?.id).toBe("deep-swe-v1-1");
    expect(benchmark?.coverage).toBe(8);
    if (!benchmark) throw new Error("Expected a default benchmark");
    expect(chartModels(data.models, benchmark)).toHaveLength(7);
  });
});
