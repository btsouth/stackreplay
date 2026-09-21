import { z } from "zod";
import { moneyV1Schema } from "./money.js";
import { isoUtcTimestampV1Schema } from "./scalars.js";

/**
 * Canonical usage event (spec point 9), with the extensibility decisions from
 * docs/ARCHITECTURE_DECISIONS.md (decisions 5, 9):
 *
 * - The event describes execution facts. Plan/billing attribution does NOT
 *   live here; subscription context is separate.
 * - Technical modality and workload/use-case category are distinct concepts.
 * - Text/LLM token usage is strongly typed and first-class. Future modalities
 *   add their own strongly typed usage structures to the union below; the
 *   extensibility mechanism is NOT an opaque key/value metric bag.
 */

/** Technical modality. Only text/LLM exists today. */
export const modalityV1Schema = z.literal("text");
export type ModalityV1 = z.infer<typeof modalityV1Schema>;

/** Workload/use-case category, orthogonal to technical modality. */
export const workloadCategoryV1Schema = z.enum([
  "coding",
  "agent",
  "chat",
  "research",
  "api-application",
  "image-generation",
  "video-generation",
  "speech",
  "other",
]);
export type WorkloadCategoryV1 = z.infer<typeof workloadCategoryV1Schema>;

/** Strongly typed text/LLM usage. All categories are optional: a source may
 * not expose every category, and missing data must remain visible rather than
 * being invented. */
export const textUsageV1Schema = z.strictObject({
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  cacheReadTokens: z.number().int().nonnegative().optional(),
  cacheWriteTokens: z.number().int().nonnegative().optional(),
  reasoningTokens: z.number().int().nonnegative().optional(),
});
export type TextUsageV1 = z.infer<typeof textUsageV1Schema>;

/** Usage for the text/LLM modality. Future modalities extend this union. */
export type UsageV1 = TextUsageV1;

export const sourceRefV1Schema = z.strictObject({
  adapterId: z.string().min(1),
  nativeEventHash: z.string().min(1).optional(),
  nativeSessionHash: z.string().min(1).optional(),
});
export type SourceRefV1 = z.infer<typeof sourceRefV1Schema>;

export const attributionV1Schema = z.enum(["exact", "inferred"]);
export type AttributionV1 = z.infer<typeof attributionV1Schema>;

export const entityRefV1Schema = z.strictObject({
  id: z.string().min(1),
  attribution: attributionV1Schema,
});
export type EntityRefV1 = z.infer<typeof entityRefV1Schema>;

export const modelRefV1Schema = z.strictObject({
  rawName: z.string().min(1),
  canonicalId: z.string().min(1).optional(),
});
export type ModelRefV1 = z.infer<typeof modelRefV1Schema>;

export const eventConfidenceV1Schema = z.strictObject({
  usage: z.enum(["exact", "estimated"]),
  model: z.enum(["exact", "mapped", "unknown"]),
});
export type EventConfidenceV1 = z.infer<typeof eventConfidenceV1Schema>;

export const textUsageEventV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  occurredAt: isoUtcTimestampV1Schema,
  source: sourceRefV1Schema,
  harness: entityRefV1Schema.optional(),
  provider: entityRefV1Schema.optional(),
  model: modelRefV1Schema,
  modality: z.literal("text"),
  workloadCategory: workloadCategoryV1Schema.optional(),
  usage: textUsageV1Schema,
  nativeCost: moneyV1Schema.optional(),
  requestStartedAt: isoUtcTimestampV1Schema.optional(),
  requestEndedAt: isoUtcTimestampV1Schema.optional(),
  durationMs: z.number().int().nonnegative().optional(),
  projectHash: z.string().min(1).optional(),
  confidence: eventConfidenceV1Schema,
});
export type TextUsageEventV1 = z.infer<typeof textUsageEventV1Schema>;

/**
 * The canonical event union. Future modality variants (image, video, audio,
 * multimodal) are added here without redefining the event's identity or the
 * meaning of existing fields.
 */
export const usageEventV1Schema = z.discriminatedUnion("modality", [textUsageEventV1Schema]);
export type UsageEventV1 = z.infer<typeof usageEventV1Schema>;
