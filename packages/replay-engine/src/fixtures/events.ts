import type {
  EventConfidenceV1,
  ModelRefV1,
  SourceRefV1,
  TextUsageEventV1,
  TextUsageV1,
  WorkloadCategoryV1,
} from "@stackreplay/schema";

/** Synthetic event builders for engine tests. */

export interface DisjointUsageInput {
  /** Input tokens that were not served from cache. */
  uncachedInputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
}

/**
 * Complete canonical usage: every bucket is reported explicitly and declared
 * disjoint, so replay can establish consumption without guessing (decision 15).
 */
export function completeUsage(input: DisjointUsageInput = {}): TextUsageV1 {
  return {
    inputTokens: input.uncachedInputTokens ?? 0,
    outputTokens: input.outputTokens ?? 0,
    cacheReadTokens: input.cacheReadTokens ?? 0,
    cacheWriteTokens: input.cacheWriteTokens ?? 0,
    reasoningTokens: input.reasoningTokens ?? 0,
    accounting: {
      cacheReadIncludedInInput: false,
      cacheWriteIncludedInInput: false,
      reasoningIncludedInOutput: false,
    },
  };
}

/**
 * Usage where cache and reasoning are subsets of their base categories, as some
 * sources report them: input 1,000,000 with 1,000,000 cache reads means the
 * input was entirely cache reads.
 */
export function overlappingUsage(input: {
  inputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
}): TextUsageV1 {
  return {
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens ?? 0,
    cacheReadTokens: input.cacheReadTokens ?? 0,
    cacheWriteTokens: input.cacheWriteTokens ?? 0,
    reasoningTokens: input.reasoningTokens ?? 0,
    accounting: {
      cacheReadIncludedInInput: input.cacheReadTokens !== undefined,
      cacheWriteIncludedInInput: input.cacheWriteTokens !== undefined,
      reasoningIncludedInOutput: input.reasoningTokens !== undefined,
    },
  };
}

export function makeEvent(input: {
  id: string;
  occurredAt: string;
  usage?: TextUsageV1;
  model?: ModelRefV1;
  confidence?: EventConfidenceV1;
  source?: SourceRefV1;
  workloadCategory?: WorkloadCategoryV1;
  /** Harness attribution, when the fixture needs one for alias scoping. */
  harnessId?: string;
}): TextUsageEventV1 {
  return {
    schemaVersion: 1,
    id: input.id,
    occurredAt: input.occurredAt,
    source: input.source ?? { adapterId: "fixture-adapter" },
    model: input.model ?? { rawName: "fixture-small", canonicalId: "fixture-small" },
    modality: "text",
    usage: input.usage ?? completeUsage(),
    confidence: input.confidence ?? { usage: "exact", model: "exact" },
    ...(input.workloadCategory !== undefined ? { workloadCategory: input.workloadCategory } : {}),
    ...(input.harnessId !== undefined
      ? { harness: { id: input.harnessId, attribution: "exact" as const } }
      : {}),
  };
}
