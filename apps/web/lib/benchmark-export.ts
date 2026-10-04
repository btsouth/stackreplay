import {
  type BenchmarkData,
  type BenchmarkDataV1,
  type BenchmarkDataV2,
  type BenchmarkObservation,
  type ComparisonRow,
  evidenceLabel,
  observationId,
  resolveComparison,
} from "@stackreplay/benchmarks";
import { type BenchmarkState, benchmarkUrl } from "./benchmark-state";

/** The table and export share category filtering and the existing stable row order. */
export function resolveBenchmarkView(data: BenchmarkData | undefined, state: BenchmarkState) {
  try {
    if (!data)
      throw new Error(
        "This benchmark edition is unavailable. Choose Frontier to return to the current edition.",
      );
    if (state.error) throw new Error(state.error);
    const rows = resolveComparison(data, state.modelIds, state);
    const visible = rows.filter(
      (row) => state.category === "all" || row.definition.category === state.category,
    );
    if (!state.sourceSetId)
      visible.sort(
        (a, b) =>
          Number(b.cells.every((cell) => cell.observation)) -
          Number(a.cells.every((cell) => cell.observation)),
      );
    return { rows, visible, error: undefined };
  } catch (error) {
    return {
      rows: [] as ComparisonRow[],
      visible: [] as ComparisonRow[],
      error: error instanceof Error ? error.message : "Invalid comparison",
    };
  }
}

/** Only resolved, displayed observations can establish an evidence summary. */
export function benchmarkEvidenceSummary(data: BenchmarkData, rows: readonly ComparisonRow[]) {
  const observations = rows.flatMap((row) =>
    row.cells.flatMap((cell) => (cell.observation ? [cell.observation] : [])),
  );
  const sources = data.sourceSets.filter((source) =>
    observations.some((observation) => observation.sourceSetId === source.id),
  );
  const classes = [...new Set(observations.map((observation) => observation.evidenceClass))];
  const checkedDates = [
    ...new Set(observations.map((observation) => observation.checkedAt)),
  ].sort();
  return {
    sources,
    classes,
    observationCount: observations.length,
    checkedDates,
    line:
      classes.length === 0
        ? "No reported evidence in this view."
        : `${classes.length > 1 ? "Mixed evidence: " : ""}${classes.map(evidenceLabel).join(" · ")} · Checked against original publications; not reproduced by StackReplay.`,
  };
}

export interface BenchmarkExportModel {
  id: string;
  name: string;
}

interface BenchmarkExportView {
  edition: string;
  comparisonUrl: string;
  models: BenchmarkExportModel[];
  requested: {
    modelIds: string[];
    category: string;
    coverage: BenchmarkState["coverage"];
    sourceSetId: string | null;
    observationIds: string[];
  };
  rows: {
    definition: ComparisonRow["definition"];
    setup: ComparisonRow["setup"];
    setupLabel: string;
    highlightedModelIds: string[];
    cells: {
      modelId: string;
      status: "reported" | "unreported";
      observationId: string | null;
      value: number | null;
      displayValue: string | null;
      selectionReason: string | null;
      observation: BenchmarkObservation | null;
      alternativeObservationIds: string[];
    }[];
  }[];
}
type FullProvenance<Data> = {
  scope: "Full immutable evidence edition, including sources and alternatives outside the selected view";
  data: Data;
};
export type BenchmarkExport = BenchmarkExportView &
  (
    | { exportVersion: 1; fullProvenance: FullProvenance<BenchmarkDataV1> }
    | { exportVersion: 2; fullProvenance: FullProvenance<BenchmarkDataV2> }
  );

/** Export stored facts without rounding, inferred configuration or a blanket data license. */
export function buildBenchmarkExport({
  editions,
  models,
  state,
  origin,
}: {
  editions: Readonly<Record<string, BenchmarkData>>;
  models: readonly BenchmarkExportModel[];
  state: BenchmarkState;
  origin: string;
}): BenchmarkExport {
  const data = Object.hasOwn(editions, state.edition) ? editions[state.edition] : undefined;
  const view = resolveBenchmarkView(data, state);
  if (view.error || !data) throw new Error(view.error ?? "Invalid comparison");
  const selectedModels = state.modelIds.map((id) => {
    const model = models.find((model) => model.id === id);
    if (!model) throw new Error("Invalid model selection");
    return { id: model.id, name: model.name };
  });
  const selected: BenchmarkExportView = {
    edition: state.edition,
    comparisonUrl: new URL(benchmarkUrl(state), origin).href,
    models: selectedModels,
    requested: {
      modelIds: [...state.modelIds],
      category: state.category,
      coverage: state.coverage,
      sourceSetId: state.sourceSetId ?? null,
      observationIds: [...state.observationIds],
    },
    rows: view.visible.map((row) => ({
      definition: row.definition,
      setup: row.setup,
      setupLabel:
        row.setup === "matched" ? "Matched evaluation setup" : "Different or unreported setups",
      highlightedModelIds: [...row.highestModelIds],
      cells: row.cells.map((cell) => ({
        modelId: cell.modelId,
        status: cell.observation ? "reported" : "unreported",
        observationId: cell.observation ? observationId(cell.observation) : null,
        value: cell.observation?.value ?? null,
        displayValue: cell.observation?.displayValue ?? null,
        selectionReason: cell.observation ? cell.selectionReason : null,
        observation: cell.observation ?? null,
        alternativeObservationIds: cell.alternatives.map(observationId),
      })),
    })),
  };
  const scope =
    "Full immutable evidence edition, including sources and alternatives outside the selected view";
  return data.schemaVersion === 1
    ? { exportVersion: 1, ...selected, fullProvenance: { scope, data } }
    : { exportVersion: 2, ...selected, fullProvenance: { scope, data } };
}
