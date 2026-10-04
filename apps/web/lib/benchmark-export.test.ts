import {
  type BenchmarkData,
  benchmarkEdition,
  benchmarkEditions,
  observationId,
  resolveComparison,
} from "@stackreplay/benchmarks";
import { describe, expect, it } from "vitest";
import {
  benchmarkEvidenceSummary,
  buildBenchmarkExport,
  resolveBenchmarkView,
} from "./benchmark-export";
import { benchmarkUrl, parseBenchmarkState } from "./benchmark-state";
import { loadPublicCatalog } from "./public-catalog";

const models = loadPublicCatalog().models;
const data = benchmarkEditions[benchmarkEdition];
const stateFor = (query: string) =>
  parseBenchmarkState(
    new URLSearchParams(query),
    models.map((model) => model.id),
  );
const exportFor = (query: string) => {
  const state = stateFor(query);
  return buildBenchmarkExport({
    editions: benchmarkEditions,
    models,
    state,
    origin: "https://stackreplay.com",
  });
};

describe("selected benchmark JSON", () => {
  it("retains an explicit alternative, exact decimals, model order and canonical URL", () => {
    const pin = "openai-sol-2026-09-29-high.deep-swe-v1-1.gpt-6-1-sol";
    const query = `models=gpt-6-1-sol,gemini-4-argon&category=coding&observation=${pin}`;
    const payload = exportFor(query);
    expect(payload.exportVersion).toBe(1);
    expect(payload.comparisonUrl).toBe(
      new URL(benchmarkUrl(stateFor(query)), "https://stackreplay.com").href,
    );
    expect(payload.models).toEqual([
      { id: "gpt-6-1-sol", name: "GPT-6.1 Sol" },
      { id: "gemini-4-argon", name: "Gemini 4 Argon" },
    ]);
    expect(payload.requested).toMatchObject({
      modelIds: ["gpt-6-1-sol", "gemini-4-argon"],
      category: "coding",
      coverage: "all",
      sourceSetId: null,
      observationIds: [pin],
    });
    const row = payload.rows.find((row) => row.definition.id === "deep-swe-v1-1");
    expect(row).toMatchObject({
      setup: "different_or_unreported",
      setupLabel: "Different or unreported setups",
    });
    expect(row?.cells[0]).toMatchObject({
      status: "reported",
      observationId: pin,
      value: 75.22,
      displayValue: "75.22%",
      selectionReason: "Explicit observation selected in this comparison URL.",
      observation: { effort: "High", checkedAt: "2026-09-30" },
    });
    expect(row?.cells[0]?.alternativeObservationIds).toContain(
      "openai-sol-2026-09-29-max.deep-swe-v1-1.gpt-6-1-sol",
    );
    expect(payload.rows.every((row) => row.definition.category === "coding")).toBe(true);
  });

  it("exports old editions and full provenance without slicing sources or alternatives", () => {
    const payload = exportFor(
      "edition=2026-09-30-v1&models=gemini-4-argon,gpt-6-astra&category=security&source=google-deepmind-argon-2026-09-30",
    );
    expect(payload.edition).toBe("2026-09-30-v1");
    expect(payload.requested.sourceSetId).toBe("google-deepmind-argon-2026-09-30");
    const appendix = JSON.parse(JSON.stringify(payload.fullProvenance));
    expect(appendix.scope).toContain("Full immutable evidence edition");
    expect(appendix.data).toEqual(benchmarkEditions["2026-09-30-v1"]);
    expect(appendix.data.sourceSets).toHaveLength(4);
    expect(appendix.data.sourceSets[0].observations).toHaveLength(68);
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0]?.definition.id).toBe("cwe-bench-v1");
    expect(appendix.data.sourceSets[0].redistribution).toEqual(data.sourceSets[0]?.redistribution);
    expect(appendix.data.primarySelections).toEqual(
      benchmarkEditions["2026-09-30-v1"].primarySelections,
    );
    const historical = exportFor("edition=2026-09-30-v2&models=gpt-6-1-sol&category=coding");
    expect(historical.fullProvenance.data).toEqual(benchmarkEditions["2026-09-30-v2"]);
    expect(
      historical.fullProvenance.data.sourceSets.flatMap((source) => source.observations),
    ).toHaveLength(202);
    const current = exportFor("models=gpt-6-1-sol&category=coding");
    expect(current.fullProvenance.data).toEqual(data);
    expect(
      current.fullProvenance.data.sourceSets.flatMap((source) => source.observations),
    ).toHaveLength(208);
  });

  it("preserves displayed row order, explicit null gaps and exact definitions", () => {
    const state = stateFor("models=gpt-6-1-sol,gemini-4-argon");
    const payload = exportFor("models=gpt-6-1-sol,gemini-4-argon");
    const view = resolveBenchmarkView(data, state);
    expect(payload.rows.map((row) => row.definition)).toEqual(
      view.visible.map((row) => row.definition),
    );
    expect(payload.rows[0]?.cells.every((cell) => cell.status === "reported")).toBe(true);
    const gap = payload.rows.find((row) => row.definition.id === "vals-index")?.cells[0];
    expect(JSON.parse(JSON.stringify(gap))).toEqual({
      modelId: "gpt-6-1-sol",
      status: "unreported",
      observationId: null,
      value: null,
      displayValue: null,
      selectionReason: null,
      observation: null,
      alternativeObservationIds: [],
    });
  });

  it("preserves every tie and the lower-is-better highlight", () => {
    const payload = exportFor("models=gemini-4-argon,gpt-6-astra,gpt-6-1-sol");
    expect(
      payload.rows.find((row) => row.definition.id === "cwe-bench-v1")?.highlightedModelIds,
    ).toEqual(["gemini-4-argon", "gpt-6-astra"]);
    const lower = payload.rows.find(
      (row) => row.definition.id === "openai-factuality-difficult-prompts-2026-09",
    );
    expect(lower?.definition.higherIsBetter).toBe(false);
    expect(lower?.highlightedModelIds).toEqual(["gpt-6-astra"]);
    expect(lower?.cells.find((cell) => cell.modelId === "gpt-6-astra")?.value).toBe(3.91);
    expect(lower?.cells.find((cell) => cell.modelId === "gpt-6-1-sol")?.value).toBe(4.61);
    const resolved = resolveComparison(data, ["gemini-4-argon", "gpt-6-astra", "gpt-6-1-sol"]);
    expect(payload.rows.map((row) => [row.definition.id, row.highlightedModelIds])).toEqual(
      resolveBenchmarkView(
        data,
        stateFor("models=gemini-4-argon,gpt-6-astra,gpt-6-1-sol"),
      ).visible.map((row) => [row.definition.id, row.highestModelIds]),
    );
    expect(
      resolved.find((row) => row.definition.id === lower?.definition.id)?.highestModelIds,
    ).toEqual(lower?.highlightedModelIds);
  });

  it("retains an explicitly documented comparison group and matched setup", () => {
    const fixture = structuredClone(data);
    for (const source of fixture.sourceSets) {
      for (const observation of source.observations) {
        if (
          observation.benchmarkId === "deep-swe-v1-1" &&
          ["gemini-4-argon", "gpt-6-1-sol"].includes(observation.modelId)
        ) {
          observation.comparisonGroup = "documented-test-group";
        }
      }
    }
    const payload = buildBenchmarkExport({
      editions: { [benchmarkEdition]: fixture },
      models,
      state: stateFor("models=gemini-4-argon,gpt-6-1-sol&category=coding"),
      origin: "https://stackreplay.com",
    });
    const row = payload.rows.find((row) => row.definition.id === "deep-swe-v1-1");
    expect(row?.setup).toBe("matched");
    expect(row?.setupLabel).toBe("Matched evaluation setup");
    expect(row?.cells.map((cell) => cell.observation?.comparisonGroup)).toEqual([
      "documented-test-group",
      "documented-test-group",
    ]);
  });

  it.each([
    "models=qwen-3-8-max,kimi-k3&coverage=shared",
    "models=gpt-6-1-sol&category=security",
    "models=gpt-6-1-sol&category=security&observation=openai-sol-2026-09-29-high.deep-swe-v1-1.gpt-6-1-sol",
  ])("allows a valid empty view: %s", (query) => {
    const payload = exportFor(query);
    expect(payload.rows).toEqual([]);
    expect(payload.requested.modelIds).toEqual(stateFor(query).modelIds);
    expect(payload.requested.observationIds).toEqual(stateFor(query).observationIds);
    expect(payload.fullProvenance.data).toEqual(data);
  });

  it.each([
    ["edition=unavailable", "edition is unavailable"],
    ["edition=__proto__", "edition is unavailable"],
    ["source=unavailable", "Unknown source sheet"],
    [
      "source=google-deepmind-argon-2026-09-30&models=gpt-6-1-sol",
      "does not include every selected model",
    ],
    ["observation=unavailable", "Unknown or out-of-scope"],
    [
      "edition=2026-09-30-v1&models=gpt-6-1-sol&observation=openai-sol-2026-09-29-high.deep-swe-v1-1.gpt-6-1-sol",
      "Unknown or out-of-scope",
    ],
    [
      "models=gemini-4-argon&observation=openai-sol-2026-09-29-high.deep-swe-v1-1.gpt-6-1-sol",
      "Unknown or out-of-scope",
    ],
    [
      "models=gpt-6-1-sol&observation=openai-sol-2026-09-29-max.deep-swe-v1-1.gpt-6-1-sol&observation=openai-sol-2026-09-29-high.deep-swe-v1-1.gpt-6-1-sol",
      "More than one observation",
    ],
    ["models=unknown", "Invalid model selection"],
  ])("rejects invalid selections instead of exporting fallback evidence: %s", (query, message) => {
    expect(() => exportFor(query)).toThrow(message);
    const state = stateFor(query);
    const view = resolveBenchmarkView(
      Object.hasOwn(benchmarkEditions, state.edition)
        ? benchmarkEditions[state.edition as keyof typeof benchmarkEditions]
        : undefined,
      state,
    );
    expect(view.error).toContain(message);
    expect(view.visible).toEqual([]);
  });
});

describe("visible evidence summary", () => {
  it("uses only visible resolved observations for classes, sources and check dates", () => {
    const fixture: BenchmarkData = structuredClone(data);
    const openai = fixture.sourceSets.find((source) => source.id === "openai-sol-2026-09-29-high");
    if (!openai) throw new Error("Missing fixture source");
    openai.evidenceClass = "independent_evaluation";
    openai.redistribution.basis = "licensed_dataset";
    for (const observation of openai.observations) {
      observation.evidenceClass = "independent_evaluation";
      observation.checkedAt = "2026-10-01";
    }
    const pinned = openai.observations.find(
      (o) => o.benchmarkId === "deep-swe-v1-1" && o.modelId === "gpt-6-1-sol",
    );
    if (!pinned) throw new Error("Missing fixture observation");
    const state = stateFor(
      `models=gemini-4-argon,gpt-6-1-sol&category=security&observation=${observationId(pinned)}`,
    );
    const summary = benchmarkEvidenceSummary(fixture, resolveBenchmarkView(fixture, state).visible);
    expect(summary.classes).toEqual(["developer_reported"]);
    expect(summary.sources.map((source) => source.id)).toEqual([
      "google-deepmind-argon-2026-09-30",
    ]);
    expect(summary.observationCount).toBe(1);
    expect(summary.checkedDates).toEqual(["2026-09-30"]);
    expect(summary.line).toBe(
      "Developer reported · Checked against original publications; not reproduced by StackReplay.",
    );
    const mixed = benchmarkEvidenceSummary(
      fixture,
      resolveBenchmarkView(fixture, { ...state, category: "coding" }).visible,
    );
    expect(mixed.classes).toHaveLength(2);
    expect(mixed.line).toContain("Mixed evidence:");
    expect(mixed.line).toContain("Independent evaluation");
    expect(mixed.checkedDates).toEqual(["2026-09-30", "2026-10-01"]);
    const independent = benchmarkEvidenceSummary(
      fixture,
      resolveBenchmarkView(fixture, {
        ...state,
        modelIds: ["gpt-6-1-sol"],
        category: "coding",
        sourceSetId: undefined,
      }).visible.filter((row) => row.definition.id === "deep-swe-v1-1"),
    );
    expect(independent.line).toContain("Independent evaluation ·");
    expect(independent.line).not.toContain("Mixed");
    expect(benchmarkEvidenceSummary(fixture, []).line).toBe("No reported evidence in this view.");
  });
});

describe("admitted Epoch evidence in the selected export", () => {
  const trio = "claude-sonnet-5-5,claude-opus-5-5,qwen-3-8-max-0902";
  const benchmarkId = "epoch-gpqa-diamond-revision-unreported";
  const pin = `epoch-gpqa-sonnet-5-5-max-2026-10-04.${benchmarkId}.claude-sonnet-5-5`;

  it("changes the real evidence summary with the visible category and coverage", () => {
    const summary = (query: string) =>
      benchmarkEvidenceSummary(data, resolveBenchmarkView(data, stateFor(query)).visible);
    const mixed = summary(`models=${trio}`);
    expect(mixed.line).toContain("Mixed evidence:");
    expect(mixed.classes).toEqual(
      expect.arrayContaining(["developer_reported", "independent_evaluation"]),
    );
    expect(mixed.checkedDates).toEqual(["2026-09-30", "2026-10-04"]);
    const coding = summary(`models=${trio}&category=coding`);
    expect(coding.classes).toEqual(["developer_reported"]);
    expect(coding.checkedDates).toEqual(["2026-09-30"]);
    expect(coding.sources.some((source) => source.evaluator === "Epoch AI")).toBe(false);
    const science = summary(`models=${trio}&category=science&coverage=shared`);
    expect(science.classes).toEqual(["independent_evaluation"]);
    expect(science.sources.map((source) => source.evaluator)).toEqual([
      "Epoch AI",
      "Epoch AI",
      "Epoch AI",
    ]);
    expect(science.checkedDates).toEqual(["2026-10-04"]);
  });

  it("keeps exact real values, pins and scoped source permissions in full-edition provenance", () => {
    const payload = exportFor(`models=${trio},gpt-6-1-sol&category=science&observation=${pin}`);
    const row = payload.rows.find((row) => row.definition.id === benchmarkId);
    expect(row?.definition).toMatchObject({
      version: null,
      category: "science",
      taskSubset: "Diamond",
    });
    expect(row?.setup).toBe("different_or_unreported");
    expect(row?.cells.map((cell) => [cell.value, cell.displayValue])).toEqual([
      [95.58080808080808, "95.5808080808080800%"],
      [90.59343434343434, "90.5934343434343400%"],
      [92.2979797979798, "92.297979797979800%"],
      [null, null],
    ]);
    expect(row?.cells[0]?.observationId).toBe(pin);
    expect(row?.cells[0]?.selectionReason).toBe(
      "Explicit observation selected in this comparison URL.",
    );
    expect(row?.cells[3]).toEqual({
      modelId: "gpt-6-1-sol",
      status: "unreported",
      observationId: null,
      value: null,
      displayValue: null,
      selectionReason: null,
      observation: null,
      alternativeObservationIds: [],
    });
    expect(payload.requested.observationIds).toEqual([pin]);
    expect(payload.fullProvenance.data).toEqual(data);
    const sources = payload.fullProvenance.data.sourceSets.filter(
      (source) => source.evaluator === "Epoch AI",
    );
    expect(sources).toHaveLength(3);
    for (const source of sources) {
      expect(source.kind).toBe("model_observations");
      expect(source.redistribution).toMatchObject({
        basis: "licensed_dataset",
        termsUrl: "https://epoch.ai/benchmarks/use-this-data",
        checkedAt: "2026-10-04",
      });
      expect(source.redistribution.rationale).toContain("does not license the mixed archive");
      expect(source.observations[0]?.evaluationOrigin).toBe("reporter_computed");
      expect(source.observations[0]?.comparisonGroup).toBeUndefined();
    }
    expect(payload.fullProvenance.data.sourceSets[0]?.redistribution.basis).toBe(
      "official_provider_facts",
    );
    expect(
      exportFor(`models=${trio}&category=science&coverage=shared`).rows.map(
        (row) => row.definition.id,
      ),
    ).toEqual([benchmarkId]);
    expect(exportFor(`models=${trio},gpt-6-1-sol&category=science&coverage=shared`).rows).toEqual(
      [],
    );
  });
});

describe("dated provider selected evidence export", () => {
  it("retains raw notation, metric interpretation and missing Kimi without changing v3", () => {
    const payload = exportFor("models=qwen-3-8-max,glm-5-3,minimax-m3,kimi-k3");
    expect(payload.edition).toBe("2026-10-04-v4");
    expect(payload.rows).toHaveLength(1);
    const row = payload.rows[0];
    expect(row?.setup).toBe("different_or_unreported");
    expect(row?.cells.map((c) => c.displayValue)).toEqual(["86.6%", "88.2%", "66.0%", null]);
    expect(row?.cells.map((c) => c.value)).toEqual([86.6, 88.2, 66, null]);
    for (const [index, raw] of ["86.6", "88.2"].entries()) {
      expect(row?.cells[index]?.observation?.notes).toContain(`raw notation ${raw}`);
      expect(row?.cells[index]?.observation?.notes).toContain(
        "https://www.tbench.ai/news/terminal-bench-2-1",
      );
      expect(row?.cells[index]?.observation?.notes).toContain("no arithmetic rescaling");
    }
    expect(row?.cells[3]).toMatchObject({ status: "unreported", value: null, observation: null });
    const old = exportFor("edition=2026-10-04-v3&models=qwen-3-8-max,glm-5-3,minimax-m3,kimi-k3");
    expect(old.rows).toEqual([]);
    expect(old.fullProvenance.data.sourceSets).toHaveLength(12);
  });
});
