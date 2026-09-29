import type { LoadedPlanVersionV1, PlanLimitV1 } from "@stackreplay/catalog";
import { z } from "zod";
import { ReplayEngineError } from "./errors.js";
import { parseAmount } from "./money.js";
import { calendarBucketBoundsMs, durationToMs, parseInstant } from "./time.js";
import { sliceRollingWindows, sliceWindows, type TimedEvent, type WindowSlice } from "./windows.js";

export const initialCapacityEntrySchema = z.strictObject({
  limitId: z.string().min(1),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  consumedUnits: z.string().regex(/^\d+(?:\.\d+)?$/),
  evidence: z.string().min(1),
  /** A previously triggered latch need not imply a numerically full pool. */
  latched: z.boolean().optional(),
});
export type InitialCapacityEntry = z.infer<typeof initialCapacityEntrySchema>;
export interface SubscriptionInitialCapacity {
  at: string;
  unlistedPools: "fresh";
  entries: readonly InitialCapacityEntry[];
}
function invalid(message: string): never {
  throw new ReplayEngineError("IMPORT_SCHEMA_INVALID", message);
}
/** Validate once against authoritative limit units/windows. No synthetic historical calls. */
export function validateInitialCapacity(
  state: SubscriptionInitialCapacity | undefined,
  plan: LoadedPlanVersionV1,
): SubscriptionInitialCapacity | undefined {
  if (state === undefined) return undefined;
  const parsed = z
    .strictObject({
      at: z.string().datetime(),
      unlistedPools: z.literal("fresh"),
      entries: z.array(initialCapacityEntrySchema),
    })
    .parse(state);
  const at = parseInstant(parsed.at);
  const seen = new Set<string>();
  for (const entry of parsed.entries) {
    if (seen.has(entry.limitId)) invalid("Initial capacity contains duplicate limit state.");
    seen.add(entry.limitId);
    const limit = plan.limits.find((limit) => limit.id === entry.limitId);
    if (!limit) invalid("Initial capacity references an unknown limit.");
    if (!["reject_request", "latch_until_reset"].includes(limit.exceed))
      invalid("Initial capacity currently supports hard admission policies only.");
    if (entry.latched && limit.exceed !== "latch_until_reset")
      invalid("Only a latching policy can have an initial latch.");
    const start = parseInstant(entry.windowStart),
      end = parseInstant(entry.windowEnd);
    if (start.epochNanoseconds > at.epochNanoseconds || end.epochNanoseconds <= at.epochNanoseconds)
      invalid("Initial window must contain the observation start.");
    const consumed = parseAmount(entry.consumedUnits);
    if (consumed.gt(limit.amount) || (limit.type === "request_limit" && !consumed.isInteger()))
      invalid("Initial consumption must fit capacity and its units.");
    if (limit.window.type === "calendar") {
      const bounds = calendarBucketBoundsMs(
        at.epochMilliseconds,
        limit.window.unit,
        limit.window.timezone,
      );
      if (
        start.epochNanoseconds !== BigInt(bounds.startMs) * 1000000n ||
        end.epochNanoseconds !== BigInt(bounds.endMs) * 1000000n
      )
        invalid("Initial window does not match the calendar policy.");
    } else if (
      end.epochNanoseconds - start.epochNanoseconds !==
      BigInt(durationToMs(limit.window.duration)) * 1000000n
    )
      invalid("Initial window duration does not match the first-use policy.");
  }
  return parsed;
}
export function initialSlices(
  events: readonly TimedEvent[],
  limit: PlanLimitV1,
  entry?: InitialCapacityEntry,
): WindowSlice[] {
  if (entry === undefined || limit.window.type === "calendar")
    return sliceWindows(events, limit.window).slices;
  const start = parseInstant(entry.windowStart),
    end = parseInstant(entry.windowEnd);
  const subMs = Number((start.epochNanoseconds % 1000000n) + 1000000n) % 1000000;
  const within: TimedEvent[] = [],
    after: TimedEvent[] = [];
  for (const event of events)
    (BigInt(event.atMs) * 1000000n + BigInt(event.subMs) < end.epochNanoseconds
      ? within
      : after
    ).push(event);
  return [
    { startMs: start.epochMilliseconds, endMs: end.epochMilliseconds, subMs, events: within },
    ...sliceRollingWindows(after, durationToMs(limit.window.duration)),
  ];
}
export function sliceHasInitial(
  slice: WindowSlice,
  entry: InitialCapacityEntry | undefined,
): boolean {
  return (
    entry !== undefined &&
    BigInt(slice.startMs) * 1000000n + BigInt(slice.subMs) ===
      parseInstant(entry.windowStart).epochNanoseconds
  );
}
