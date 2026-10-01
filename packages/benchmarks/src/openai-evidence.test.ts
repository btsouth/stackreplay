import { describe, expect, it } from "vitest";
import transcription from "./data/openai-sol-2026-09-29.verified-charts.json" with { type: "json" };
import { benchmarkData, observationId, resolveComparison, validateBenchmarkData } from "./index.js";

const data = validateBenchmarkData(
  benchmarkData,
  Object.fromEntries(benchmarkData.sourceSets.flatMap((s) => s.modelIds).map((id) => [id, { id }])),
);
const benchmarkIds = [
  "deep-swe-v1-1",
  "gdp-pdf",
  "automationbench-1-0-6",
  "osworld-2-0-offline-2026-08-08",
  "terminal-bench-science-0-1",
  "openai-factuality-difficult-prompts-2026-09",
];
const modelIds = (name: string) =>
  name.includes("Fable")
    ? "claude-fable-5-1"
    : name.includes("Opus")
      ? "claude-opus-5-5"
      : (
          {
            "GPT-6 Astra": "gpt-6-astra",
            "GPT-6.1 Sol": "gpt-6-1-sol",
            "GPT-6 Sol": "gpt-6-sol",
          } as Record<string, string>
        )[name];

describe("OpenAI official launch charts", () => {
  it("matches all 102 observations to the independently extracted official numerical chart data", () => {
    const observations = data.sourceSets
      .filter((s) => s.id.startsWith("openai-sol-"))
      .flatMap((s) => s.observations);
    expect(observations).toHaveLength(102);
    for (const [i, chart] of transcription.charts.entries())
      for (const point of chart.values) {
        const o = observations.find(
          (o) =>
            o.benchmarkId === benchmarkIds[i] &&
            o.modelId === modelIds(point.model) &&
            o.effort === point.effort,
        );
        expect(o?.value).toBe(Number((point.score * 100).toFixed(2)));
        expect(o?.sourceUrl).toBe(transcription.sourceUrl);
        expect(o?.evaluationOrigin).toBe(
          point.model.startsWith("GPT") ? "reporter_computed" : "external_result_reported",
        );
      }
    expect(observations.filter((o) => o.modelId === "gpt-6-1-sol")).toHaveLength(30);
  });
  it("preserves effort variants and pins High instead of silently taking the largest number", () => {
    const rows = resolveComparison(data, ["gpt-6-1-sol"]);
    const swe = rows.find((r) => r.definition.id === "deep-swe-v1-1");
    expect(swe?.cells[0]?.observation?.value).toBe(71.9);
    const high = swe?.cells[0]?.alternatives.find((o) => o.effort === "High");
    if (!high) throw new Error("Missing official High-effort result");
    expect(high.value).toBe(75.22);
    expect(
      resolveComparison(data, ["gpt-6-1-sol"], { observationIds: [observationId(high)] }).find(
        (r) => r.definition.id === "deep-swe-v1-1",
      )?.cells[0]?.observation?.value,
    ).toBe(75.22);
    expect(swe?.cells[0]?.alternatives).toHaveLength(5);
  });
  it("keeps exact workflow and computer-use versions separate and factuality lower-is-better", () => {
    expect(data.definitions.find((d) => d.id === "automationbench-1-0-6")?.version).toBe("1.0.6");
    expect(data.definitions.find((d) => d.id === "automationbench")?.version).toBeNull();
    expect(data.definitions.find((d) => d.id === "osworld-2-0-offline-2026-08-08")?.metric).toBe(
      "Partial reward",
    );
    expect(
      data.definitions.find((d) => d.id === "openai-factuality-difficult-prompts-2026-09")
        ?.higherIsBetter,
    ).toBe(false);
    const google = data.sourceSets[0];
    expect(google?.modelIds).not.toContain("gpt-6-1-sol");
    expect(google?.observations).toHaveLength(68);
  });
  it("retains Google's reviewed observations when OpenAI separately reports Astra and Opus", () => {
    const rows = resolveComparison(data, ["gpt-6-astra", "claude-opus-5-5"]);
    for (const id of ["deep-swe-v1-1", "terminal-bench-science-0-1"])
      expect(rows.find((r) => r.definition.id === id)?.cells[0]?.observation?.sourceSetId).toBe(
        "google-deepmind-argon-2026-09-30",
      );
    const fallback = data.sourceSets
      .find((s) => s.id === "openai-sol-2026-09-29-max")
      ?.observations.find((o) => o.modelId === "claude-opus-5-5" && o.benchmarkId === "gdp-pdf");
    expect(fallback?.fallback).toContain("Opus 4.8");
    expect(fallback?.evaluationOrigin).toBe("external_result_reported");
  });
});
