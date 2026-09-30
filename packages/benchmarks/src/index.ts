import definitions from "./data/definitions.json" with { type: "json" };
import googleArgon from "./data/google-deepmind-argon-2026-09-30.json" with { type: "json" };
import type {
  BenchmarkCategory,
  BenchmarkData,
  BenchmarkDefinition,
  BenchmarkObservation,
  BenchmarkSourceSet,
} from "./schema.js";

export * from "./schema.js";

/** Versioned evidence only. There is no catalog, price, optimizer or Replay import. */
export const benchmarkData = { schemaVersion: 1, definitions, sourceSets: [googleArgon] };

export const benchmarkCategories: readonly { id: BenchmarkCategory; label: string }[] = [
  { id: "coding", label: "Coding" },
  { id: "knowledge-work", label: "Knowledge work" },
  { id: "science", label: "Science" },
  { id: "long-context", label: "Long context" },
  { id: "multimodal", label: "Multimodal" },
  { id: "security", label: "Security" },
];

export const evidenceLabel = (evidence: BenchmarkSourceSet["evidenceClass"]) =>
  evidence === "developer_reported" ? "Developer reported" : "Independent evaluation";
export const benchmarkName = (definition: BenchmarkDefinition) =>
  [definition.name, definition.version, definition.variant].filter(Boolean).join(" ");
export const formatScore = (value: number, definition: BenchmarkDefinition) => {
  if (!Number.isFinite(value) || (definition.unit === "percent" && (value < 0 || value > 100)))
    throw new Error("Invalid benchmark score");
  return `${value.toFixed(definition.decimalPlaces)}${definition.unit === "percent" ? "%" : definition.unit === "seconds" ? " s" : ""}`;
};

export function comparisonSets(data: BenchmarkData): BenchmarkSourceSet[] {
  return data.sourceSets.filter((set) => set.kind === "complete_comparison");
}

export function observationFor(
  set: BenchmarkSourceSet,
  benchmarkId: string,
  modelId: string,
): BenchmarkObservation {
  const observation = set.observations.find(
    (o) => o.benchmarkId === benchmarkId && o.modelId === modelId,
  );
  if (!observation)
    throw new Error(`Missing benchmark observation: ${set.id}/${benchmarkId}/${modelId}`);
  return observation;
}

/** Local to one declared source set and one exact definition. Returns all ties. */
export function highlightedModels(
  set: BenchmarkSourceSet,
  definition: BenchmarkDefinition,
): string[] {
  if (set.kind !== "complete_comparison") return [];
  const observations = set.modelIds.map((modelId) => observationFor(set, definition.id, modelId));
  const extreme = (definition.higherIsBetter ? Math.max : Math.min)(
    ...observations.map((o) => o.value),
  );
  return observations.filter((o) => o.value === extreme).map((o) => o.modelId);
}
