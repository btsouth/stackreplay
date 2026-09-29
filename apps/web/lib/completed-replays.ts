import { Decimal } from "@stackreplay/replay-engine";
import { serviceTierV1Schema } from "@stackreplay/schema";
import { z } from "zod";

const amount = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/)
  .max(100);
const range = z.object({ low: amount, high: amount }).refine((r) => new Decimal(r.low).lte(r.high));
const count = z.number().int().nonnegative().safe();
const text = z.string().max(250);
export const completedReplaySchema = z
  .object({
    version: z.literal(1),
    id: text,
    importId: text,
    scopeDigest: text,
    catalogHash: text,
    rulesAt: text,
    title: text,
    mode: z.enum(["exact", "translated", "assessment"]),
    createdAt: z.string().datetime(),
    calls: count,
    tokens: count,
    priced: count,
    translatedCalls: count,
    cost: range.optional(),
    baseline: range.optional(),
    difference: range.optional(),
    policy: z.object({ id: text, version: text }).optional(),
    mappings: z
      .array(z.object({ source: text, target: text, calls: count, tokens: count.optional() }))
      .max(500),
    contributions: z.array(z.object({ model: text, cost: range })).max(500),
    limitations: z.array(text).max(20),
    /**
     * The single target a saved replay ran against, pinned to what the engine
     * resolved: a plan and the exact plan version, or a provider and the
     * processing tier. Optional and additive: results saved before it existed
     * stay readable and are shown as not recording their plan terms, never
     * assigned a version after the fact. Multi-provider scenarios carry none.
     */
    target: z
      .discriminatedUnion("type", [
        z.object({ type: z.literal("subscription"), planId: text, planVersionId: text }),
        z.object({
          type: z.literal("api"),
          providerId: text,
          serviceTier: serviceTierV1Schema.optional(),
        }),
      ])
      .optional(),
  })
  .refine(
    (r) =>
      r.priced <= r.calls &&
      r.translatedCalls <= r.calls &&
      (!r.difference || (r.priced === r.calls && !!r.cost && !!r.baseline)),
  );
export type CompletedReplay = z.infer<typeof completedReplaySchema>;
export const COMPLETED_REPLAYS_KEY = "stackreplay.completed-replays.v1";
/** Bounded aggregate results only. No events, dates of activity, paid facts or session IDs. */
export function readCompletedReplays(): CompletedReplay[] {
  try {
    const raw = localStorage.getItem(COMPLETED_REPLAYS_KEY);
    if (!raw || raw.length > 2_000_000) return [];
    const parsed = z.array(completedReplaySchema).max(20).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
export function saveCompletedReplay(result: CompletedReplay): boolean {
  try {
    const safe = completedReplaySchema.parse(result);
    const next = [safe, ...readCompletedReplays().filter((r) => r.id !== safe.id)].slice(0, 20);
    localStorage.setItem(COMPLETED_REPLAYS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("stackreplay-completed-replays"));
    return true;
  } catch {
    return false;
  }
}
export function removeCompletedReplay(id: string) {
  try {
    localStorage.setItem(
      COMPLETED_REPLAYS_KEY,
      JSON.stringify(readCompletedReplays().filter((r) => r.id !== id)),
    );
    window.dispatchEvent(new Event("stackreplay-completed-replays"));
    return true;
  } catch {
    return false;
  }
}
export function comparableReplays(a: CompletedReplay, b: CompletedReplay): boolean {
  return (
    a.importId === b.importId &&
    a.scopeDigest === b.scopeDigest &&
    a.calls === b.calls &&
    a.catalogHash === b.catalogHash &&
    a.rulesAt === b.rulesAt
  );
}
