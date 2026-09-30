import { z } from "zod";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const text = z.string().trim().min(1);
const url = z.url().startsWith("https://");
const ids = z
  .array(id)
  .min(1)
  .refine((values) => new Set(values).size === values.length, "Duplicate IDs");

export const benchmarkCategorySchema = z.enum([
  "coding",
  "knowledge-work",
  "science",
  "long-context",
  "multimodal",
  "security",
]);
export type BenchmarkCategory = z.infer<typeof benchmarkCategorySchema>;
export const evidenceClassSchema = z.enum(["developer_reported", "independent_evaluation"]);

export const benchmarkDefinitionSchema = z.strictObject({
  id,
  name: text,
  /** Null means the reporting source does not specify a version. Never guess v1. */
  version: text.nullable(),
  variant: text.optional(),
  category: benchmarkCategorySchema,
  description: text,
  unit: z.enum(["percent", "points", "seconds"]),
  decimalPlaces: z.number().int().min(0).max(6),
  higherIsBetter: z.boolean(),
  methodologyUrl: url.optional(),
});
export type BenchmarkDefinition = z.infer<typeof benchmarkDefinitionSchema>;

export const benchmarkObservationSchema = z.strictObject({
  benchmarkId: id,
  modelId: id,
  value: z.number().finite(),
  /** Exact numeric display from the source, validated against value and unit. */
  displayValue: text,
  evaluator: text,
  evidenceClass: evidenceClassSchema,
  sourceSetId: id,
  sourceUrl: url,
  checkedAt: z.iso.date(),
  /** Who originally ran it, as described by the reporter, not inferred from model developer. */
  evaluationOrigin: z.enum(["reporter_computed", "external_result_reported"]),
  originLabel: text,
  effort: text.optional(),
  harness: text.optional(),
  tools: text.optional(),
  fallback: text.optional(),
  provider: text.optional(),
  notes: text.optional(),
  uncertainty: text.optional(),
});
export type BenchmarkObservation = z.infer<typeof benchmarkObservationSchema>;

export const benchmarkSourceSetSchema = z
  .strictObject({
    id,
    /** Only complete_comparison sets can become sheets. Individual observations stay separate. */
    kind: z.enum(["complete_comparison", "model_observations"]),
    title: text,
    evaluator: text,
    publishedAt: z.iso.date(),
    sourceUrl: url,
    announcementUrl: url.optional(),
    methodologyUrl: url,
    evidenceClass: evidenceClassSchema,
    methodologySummary: text,
    limitations: z.array(text).min(1),
    redistribution: z.strictObject({
      basis: z.enum(["official_provider_facts", "licensed_dataset", "permission"]),
      rationale: text,
      termsUrl: url,
      checkedAt: z.iso.date(),
    }),
    modelIds: ids,
    benchmarkIds: ids,
    observations: z.array(benchmarkObservationSchema).min(1),
  })
  .superRefine((set, ctx) => {
    if (
      set.evidenceClass === "independent_evaluation" &&
      set.redistribution.basis === "official_provider_facts"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["redistribution", "basis"],
        message: "Independent datasets require a documented license or permission",
      });
    }
    const cells = new Set<string>();
    for (const [i, observation] of set.observations.entries()) {
      const key = `${observation.benchmarkId}/${observation.modelId}`;
      const issue = (message: string) =>
        ctx.addIssue({ code: "custom", path: ["observations", i], message });
      if (cells.has(key)) issue(`Duplicate observation in source set: ${key}`);
      cells.add(key);
      if (observation.sourceSetId !== set.id) issue("Observation source set does not exist here");
      if (!set.modelIds.includes(observation.modelId)) issue("Undeclared source-set model");
      if (!set.benchmarkIds.includes(observation.benchmarkId))
        issue("Undeclared source-set benchmark");
      if (
        observation.evaluator !== set.evaluator ||
        observation.evidenceClass !== set.evidenceClass
      ) {
        issue("Observation reporter and evidence must match the source set");
      }
      if (observation.checkedAt < set.publishedAt) issue("Checked date precedes publication");
    }
    if (set.kind === "complete_comparison") {
      for (const benchmarkId of set.benchmarkIds) {
        for (const modelId of set.modelIds) {
          if (!cells.has(`${benchmarkId}/${modelId}`)) {
            ctx.addIssue({
              code: "custom",
              path: ["observations"],
              message: `Missing comparison cell: ${benchmarkId}/${modelId}`,
            });
          }
        }
      }
      if (set.observations.length !== set.modelIds.length * set.benchmarkIds.length) {
        ctx.addIssue({
          code: "custom",
          path: ["observations"],
          message: "Complete matrix must contain exactly models × benchmarks observations",
        });
      }
    }
  });
export type BenchmarkSourceSet = z.infer<typeof benchmarkSourceSetSchema>;

export const benchmarkDataSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    definitions: z.array(benchmarkDefinitionSchema).min(1),
    sourceSets: z.array(benchmarkSourceSetSchema).min(1),
  })
  .superRefine((data, ctx) => {
    for (const field of ["definitions", "sourceSets"] as const) {
      const seen = new Set<string>();
      for (const [i, entry] of data[field].entries()) {
        if (seen.has(entry.id))
          ctx.addIssue({ code: "custom", path: [field, i, "id"], message: "Duplicate ID" });
        seen.add(entry.id);
      }
    }
    const definitions = new Map(data.definitions.map((definition) => [definition.id, definition]));
    for (const [s, set] of data.sourceSets.entries()) {
      for (const benchmarkId of set.benchmarkIds) {
        if (!definitions.has(benchmarkId))
          ctx.addIssue({
            code: "custom",
            path: ["sourceSets", s, "benchmarkIds"],
            message: `Unknown benchmark: ${benchmarkId}`,
          });
      }
      for (const [i, observation] of set.observations.entries()) {
        const definition = definitions.get(observation.benchmarkId);
        if (!definition) continue;
        const issue = (message: string) =>
          ctx.addIssue({ code: "custom", path: ["sourceSets", s, "observations", i], message });
        if (definition.unit === "percent" && (observation.value < 0 || observation.value > 100)) {
          issue("Percent scores must be within 0–100");
        }
        const pattern =
          definition.unit === "percent" ? /^(\d+(?:\.\d+)?)%$/ : /^(-?\d+(?:\.\d+)?)$/;
        const match = pattern.exec(observation.displayValue);
        if (!match || Number(match[1]) !== observation.value)
          issue("Display score must match value and unit");
      }
    }
  });
export type BenchmarkData = z.infer<typeof benchmarkDataSchema>;

/** Catalog identity is injected at the public boundary. This package never loads or changes it. */
export function validateBenchmarkData(
  raw: unknown,
  models: Readonly<Record<string, { id: string; kind?: string }>>,
): BenchmarkData {
  const data = benchmarkDataSchema.parse(raw);
  for (const set of data.sourceSets) {
    for (const modelId of set.modelIds) {
      if (
        !Object.hasOwn(models, modelId) ||
        models[modelId]?.id !== modelId ||
        models[modelId]?.kind === "family"
      ) {
        throw new Error(`Unknown canonical model release: ${modelId}`);
      }
    }
  }
  return data;
}
