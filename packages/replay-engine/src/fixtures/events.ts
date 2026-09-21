import type {
  EventConfidenceV1,
  ModelRefV1,
  SourceRefV1,
  TextUsageEventV1,
  TextUsageV1,
  WorkloadCategoryV1,
} from "@stackreplay/schema";

/** Synthetic event builder for engine tests. */
export function makeEvent(input: {
  id: string;
  occurredAt: string;
  usage?: TextUsageV1;
  model?: ModelRefV1;
  confidence?: EventConfidenceV1;
  source?: SourceRefV1;
  workloadCategory?: WorkloadCategoryV1;
}): TextUsageEventV1 {
  return {
    schemaVersion: 1,
    id: input.id,
    occurredAt: input.occurredAt,
    source: input.source ?? { adapterId: "fixture-adapter" },
    model: input.model ?? { rawName: "fixture-small", canonicalId: "fixture-small" },
    modality: "text",
    usage: input.usage ?? {},
    confidence: input.confidence ?? { usage: "exact", model: "exact" },
    ...(input.workloadCategory !== undefined ? { workloadCategory: input.workloadCategory } : {}),
  };
}
