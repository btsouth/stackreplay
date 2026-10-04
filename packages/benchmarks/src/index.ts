import definitions from "./data/definitions.json" with { type: "json" };
import epochDefinitions from "./data/epoch-gpqa-definitions.json" with { type: "json" };
import epochPilot from "./data/epoch-gpqa-pilot-2026-10-04.json" with { type: "json" };
import googleArgon from "./data/google-deepmind-argon-2026-09-30.json" with { type: "json" };
import kimiTerminal from "./data/kimi-terminal-checked-2026-10-04.json" with { type: "json" };
import openaiSol from "./data/openai-sol-2026-09-29.json" with { type: "json" };
import openaiDefinitions from "./data/openai-sol-definitions.json" with { type: "json" };
import openaiSelections from "./data/openai-sol-primary-selections.json" with { type: "json" };
import providerObservations from "./data/provider-observations-2026-09-30.json" with {
  type: "json",
};
import providerTerminalPilot from "./data/provider-terminal-pilot-2026-10-04.json" with {
  type: "json",
};
import type {
  BenchmarkCategory,
  BenchmarkData,
  BenchmarkDefinition,
  BenchmarkObservation,
  BenchmarkSourceSet,
} from "./schema.js";
import { benchmarkDataV1Schema, benchmarkDataV2Schema } from "./schema.js";

export * from "./comparison.js";
export * from "./schema.js";

/** Versioned evidence only. There is no catalog, price, optimizer or Replay import. */
const firstEdition = benchmarkDataV1Schema.parse({
  schemaVersion: 1,
  definitions,
  sourceSets: [googleArgon, ...providerObservations],
  primarySelections: [
    {
      benchmarkId: "terminal-bench-4-0",
      modelId: "claude-opus-5-5",
      observationId: "google-deepmind-argon-2026-09-30.terminal-bench-4-0.claude-opus-5-5",
      reason:
        "Retain Google's reviewed launch snapshot for continuity with its four-model sheet. Anthropic's separately reported Xhigh result remains available. The choice is not based on score magnitude.",
    },
    {
      benchmarkId: "chartography",
      modelId: "claude-opus-5-5",
      observationId: "google-deepmind-argon-2026-09-30.chartography.claude-opus-5-5",
      reason:
        "Retain Google's reviewed launch snapshot for continuity with its four-model sheet. Anthropic's separately reported result remains available. The choice is not based on score magnitude.",
    },
  ],
});

const secondEdition = benchmarkDataV1Schema.parse({
  ...firstEdition,
  definitions: [...definitions, ...openaiDefinitions],
  sourceSets: [...firstEdition.sourceSets, ...openaiSol],
  primarySelections: [...firstEdition.primarySelections, ...openaiSelections],
});

const thirdEdition = benchmarkDataV1Schema.parse({
  ...secondEdition,
  definitions: [...secondEdition.definitions, ...epochDefinitions],
  sourceSets: [...secondEdition.sourceSets, ...epochPilot],
  primarySelections: [...secondEdition.primarySelections],
});

const fourthEdition = benchmarkDataV1Schema.parse({
  ...thirdEdition,
  sourceSets: [...thirdEdition.sourceSets, ...providerTerminalPilot],
});

export const benchmarkData = benchmarkDataV2Schema.parse({
  ...fourthEdition,
  schemaVersion: 2,
  sourceSets: [...fourthEdition.sourceSets, kimiTerminal],
});

/** Published editions remain available so shared links retain their exact evidence. */
export const benchmarkEditions = {
  "2026-09-30-v1": firstEdition,
  "2026-09-30-v2": secondEdition,
  "2026-10-04-v3": thirdEdition,
  "2026-10-04-v4": fourthEdition,
  "2026-10-04-v5": benchmarkData,
};
export function benchmarkDataForEdition(edition: string) {
  return Object.hasOwn(benchmarkEditions, edition)
    ? benchmarkEditions[edition as keyof typeof benchmarkEditions]
    : undefined;
}

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
