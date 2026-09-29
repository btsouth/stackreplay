import { z } from "zod";
import type { ReviewPeriod } from "./review-period";
import { REVIEW_STORAGE_KEY } from "./review-storage";

export const manualCapacityEventSchema = z.strictObject({
  id: z.string().min(1),
  timestamp: z.iso.datetime(),
  resetAt: z.iso.datetime().optional(),
  note: z.string().max(500),
  recordedAt: z.iso.datetime(),
  evidence: z.literal("local-user"),
});
export type ManualCapacityEvent = z.infer<typeof manualCapacityEventSchema>;
const stateSchema = z.strictObject({
  version: z.literal(1),
  scopes: z.record(z.string(), z.array(manualCapacityEventSchema).max(500)),
});
export const capacityKey = (importId: string) => `${REVIEW_STORAGE_KEY}.capacity.${importId}`;
export function capacityBinding(input: {
  resourceInstanceId: string;
  planId: string;
  period: ReviewPeriod;
  workloadDigest: string;
  capacityDigest: string;
}): string {
  return JSON.stringify({ methodology: "claude-native-capacity-v1", ...input });
}
export function readManualCapacity(importId: string, binding: string): ManualCapacityEvent[] {
  try {
    const state = stateSchema.safeParse(
      JSON.parse(window.localStorage.getItem(capacityKey(importId)) ?? "null"),
    );
    return state.success ? (state.data.scopes[binding] ?? []) : [];
  } catch {
    return [];
  }
}
export function saveManualCapacity(
  importId: string,
  binding: string,
  events: ManualCapacityEvent[],
): boolean {
  try {
    const previous = stateSchema.safeParse(
      JSON.parse(window.localStorage.getItem(capacityKey(importId)) ?? "null"),
    );
    const scopes = previous.success ? previous.data.scopes : {};
    scopes[binding] = events;
    window.localStorage.setItem(
      capacityKey(importId),
      JSON.stringify(stateSchema.parse({ version: 1, scopes })),
    );
    return true;
  } catch {
    return false;
  }
}
