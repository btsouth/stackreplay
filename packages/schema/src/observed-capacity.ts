import { z } from "zod";
import { isoUtcTimestampV1Schema } from "./scalars.js";

/** Local observations, never catalog capacity or a reconstructed quota. No raw messages. */
export const observedCapacityEventSchema = z.strictObject({
  id: z.string().min(1).max(150),
  resourceInstanceId: z.string().min(1).max(150),
  timestamp: isoUtcTimestampV1Schema,
  eventType: z.enum(["hard_limit_reached", "usage_warning", "unknown_capacity_message"]),
  windowType: z.enum(["five_hour", "model", "unknown"]),
  modelLabel: z.enum(["Fable", "Fable 5"]).optional(),
  resetAt: isoUtcTimestampV1Schema.optional(),
  sessionId: z.string().min(1).max(150),
  evidence: z.literal("native-client"),
  code: z.enum([
    "quota_rejected",
    "quota_warning",
    "model_limit",
    "credits_exhausted",
    "api_rate_limit",
  ]),
  duplicateRows: z.number().int().nonnegative(),
});
export type ObservedCapacityEvent = z.infer<typeof observedCapacityEventSchema>;
export const capacityObservationsSchema = z.strictObject({
  methodology: z.literal("claude-native-capacity-v1"),
  events: z.array(observedCapacityEventSchema),
});
export type CapacityObservations = z.infer<typeof capacityObservationsSchema>;
