import type { BenchmarkData, BenchmarkDefinition, BenchmarkObservation } from "./schema.js";

/** Immutable reviewed edition. New evidence ships as a new edition; old URL editions stay available. */
export const benchmarkEdition = "2026-10-04-v3";
export const frontierModelIds = [
  "gemini-4-argon",
  "gpt-6-astra",
  "gpt-6-1-sol",
  "claude-opus-5-5",
  "claude-fable-5-1",
];
export const observationId = (o: BenchmarkObservation) =>
  `${o.sourceSetId}.${o.benchmarkId}.${o.modelId}`;
export const primarySelectionReason =
  "Keep the reviewed Google launch snapshot as the primary observation where available; otherwise use the sole verified provider observation. Selection is not based on score magnitude.";

export interface ComparisonRow {
  definition: BenchmarkDefinition;
  cells: {
    modelId: string;
    observation?: BenchmarkObservation | undefined;
    alternatives: BenchmarkObservation[];
    selectionReason: string;
  }[];
  setup: "matched" | "different_or_unreported";
  highestModelIds: string[];
}

export function resolveComparison(
  data: BenchmarkData,
  modelIds: readonly string[],
  options: {
    coverage?: "shared" | "all";
    sourceSetId?: string | undefined;
    observationIds?: readonly string[];
  } = {},
): ComparisonRow[] {
  if (modelIds.length < 1 || modelIds.length > 6 || new Set(modelIds).size !== modelIds.length)
    throw new Error("Choose one to six distinct models");
  const sets = options.sourceSetId
    ? data.sourceSets.filter((s) => s.id === options.sourceSetId)
    : data.sourceSets;
  if (options.sourceSetId && sets.length !== 1) throw new Error("Unknown source sheet");
  if (
    options.sourceSetId &&
    (sets[0]?.kind !== "complete_comparison" ||
      modelIds.some((modelId) => !sets[0]?.modelIds.includes(modelId)))
  ) {
    throw new Error(
      "This complete source sheet does not include every selected model. Use the model comparison view.",
    );
  }
  const all = sets.flatMap((s) => s.observations);
  const pins = new Map<string, BenchmarkObservation>();
  for (const id of options.observationIds ?? []) {
    const o = all.find((o) => observationId(o) === id);
    if (!o || !modelIds.includes(o.modelId))
      throw new Error("Unknown or out-of-scope observation selection");
    const cell = `${o.benchmarkId}.${o.modelId}`;
    if (pins.has(cell)) throw new Error("More than one observation selected for a cell");
    pins.set(cell, o);
  }
  return data.definitions.flatMap((definition) => {
    const cells = modelIds.map((modelId) => {
      const alternatives = all.filter(
        (o) => o.modelId === modelId && o.benchmarkId === definition.id,
      );
      const pinned = pins.get(`${definition.id}.${modelId}`);
      const decision = data.primarySelections.find(
        (d) => d.benchmarkId === definition.id && d.modelId === modelId,
      );
      const reviewed = decision
        ? alternatives.find((o) => observationId(o) === decision.observationId)
        : undefined;
      const observation =
        pinned ?? reviewed ?? (alternatives.length === 1 ? alternatives[0] : undefined);
      // More than one non-Google candidate requires an explicit future reviewed selection decision.
      if (!pinned && alternatives.length > 1 && !reviewed)
        throw new Error("Ambiguous primary observation requires a reviewed selection");
      return {
        modelId,
        observation,
        alternatives,
        selectionReason: pinned
          ? "Explicit observation selected in this comparison URL."
          : reviewed
            ? (decision?.reason ?? primarySelectionReason)
            : "The sole verified observation in this evidence edition; no competing score was selected.",
      };
    });
    const present = cells.flatMap((c) => (c.observation ? [c.observation] : []));
    if (!present.length || (options.coverage === "shared" && present.length !== modelIds.length))
      return [];
    const matched =
      present.length === modelIds.length &&
      present.length > 1 &&
      Boolean(present[0]?.comparisonGroup) &&
      present.every((o) => o.comparisonGroup === present[0]?.comparisonGroup);
    const extreme = (definition.higherIsBetter ? Math.max : Math.min)(
      ...present.map((o) => o.value),
    );
    return [
      {
        definition,
        cells,
        setup: matched ? ("matched" as const) : ("different_or_unreported" as const),
        // Visual numeric comparison, not a claim that evaluation configurations match.
        highestModelIds:
          present.length > 1
            ? present.filter((o) => o.value === extreme).map((o) => o.modelId)
            : [],
      },
    ];
  });
}
