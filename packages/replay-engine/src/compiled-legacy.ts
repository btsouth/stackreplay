import type { LimitWindowV1 } from "@stackreplay/catalog";
import type { ExecutionObservation, ExecutionWindow } from "@stackreplay/schema";
import type { InitialCapacityEntry } from "./initial-capacity.js";
import { durationToMs } from "./time.js";
/** Only catalog-v1 `rolling` means first-use anchored. No unversioned coercion. */
export function migrateLegacyWindow(
  version: "catalog-v1",
  id: string,
  window: LimitWindowV1,
  models: string[],
): ExecutionWindow {
  if (version !== "catalog-v1") throw new Error("Unknown legacy window contract");
  return window.type === "rolling"
    ? {
        id,
        kind: "first_use_anchored",
        durationMs: durationToMs(window.duration),
        activationModels: models,
        trigger: "first_eligible_offer",
      }
    : { id, kind: "calendar", unit: window.unit, timezone: window.timezone };
}
/** Explicit binder mappings are required: legacy IDs cannot establish compiled identity. */
export function migrateLegacyObservation(
  entry: InitialCapacityEntry,
  target: Pick<
    ExecutionObservation,
    "resourceInstanceId" | "artifactHash" | "poolId" | "constraintId" | "asOf" | "observationRef"
  > & { windowInstanceId: string },
): ExecutionObservation {
  return {
    resourceInstanceId: target.resourceInstanceId,
    artifactHash: target.artifactHash,
    poolId: target.poolId,
    constraintId: target.constraintId,
    asOf: target.asOf,
    observationRef: target.observationRef,
    window: { id: target.windowInstanceId, start: entry.windowStart, end: entry.windowEnd },
    consumedUnits: entry.consumedUnits,
    latched: entry.latched ?? false,
  };
}
