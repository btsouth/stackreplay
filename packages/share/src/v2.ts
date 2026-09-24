import { isoDateV1Schema, verificationStatusV1Schema } from "@stackreplay/schema";
import { z } from "zod";
import { shareSourceV1Schema } from "./schema.js";
import { verdictFactsV1Schema } from "./verdict.js";
import { workloadFactV1Schema } from "./workload-facts.js";

/**
 * Share snapshot V2 (decision 61): a replay of any kind, or a workload card.
 *
 * V1 carries one exact subscription replay as engine state (constraints,
 * violations, confidence), so API, translated and scoped replays could not be
 * shared, and the public page read like engine output. V2 carries what a
 * result says, in the same aggregate records the application composes its own
 * words from:
 *
 * - a replay carries its `VerdictFactsV1`, so the public page, its image and
 *   the application print the same verdict for the same replay, including a
 *   translated replay's substitution and a scoped replay's scope;
 * - a workload carries counts, the tool split, the published-rate value and up
 *   to three comparative facts.
 *
 * Never in V2, as in V1: events, sessions, project names or hashes, paths,
 * prompts, responses, code or file names. Tool names are an enum of known
 * recording tools, so a label from a hand-edited file cannot reach a link.
 * Times of day are absent unless the sharer chose to publish them.
 */

export const SHARE_SNAPSHOT_V2 = 2;

const count = z.number().int().nonnegative();
const amount = z.string().regex(/^\d{1,24}(\.\d{1,40})?$/u);

/** Recording tools a workload link can name, with their display names. */
export const SHAREABLE_TOOLS = {
  "claude-code": "Claude Code",
  codex: "Codex",
  "command-code": "Command Code",
  opencode: "OpenCode",
  hermes: "Hermes",
  "t3-code": "T3 Code",
  ccusage: "ccusage",
  other: "Other tools",
} as const;

export type ShareableToolId = keyof typeof SHAREABLE_TOOLS;

export function shareableToolId(adapterId: string): ShareableToolId {
  return adapterId in SHAREABLE_TOOLS ? (adapterId as ShareableToolId) : "other";
}

const versionsSchema = z.strictObject({
  engine: z.string().min(1).max(40),
  catalog: z.string().min(1).max(80),
  methodology: z.string().min(1).max(40),
  rulesAsOf: isoDateV1Schema,
});

const periodSchema = z.strictObject({ from: isoDateV1Schema, to: isoDateV1Schema });

export const shareReplayV2Schema = z.strictObject({
  version: z.literal(SHARE_SNAPSHOT_V2),
  kind: z.literal("replay"),
  /** Present only for a synthetic `example-` target; the page labels it as demo data. */
  synthetic: z.literal(true).optional(),
  verdict: verdictFactsV1Schema,
  target: z.strictObject({
    type: z.enum(["subscription", "api"]),
    /** The catalog id: a plan id, or a Direct API provider id. */
    id: z.string().min(1).max(80),
    /** The plan version replayed against, for a subscription. */
    versionId: z.string().min(1).max(120).optional(),
    verificationStatus: verificationStatusV1Schema,
    lastVerifiedAt: isoDateV1Schema.optional(),
    sources: z.array(shareSourceV1Schema).max(4),
  }),
  /** The recorded date range, only when the sharer chose to publish it. */
  period: periodSchema.optional(),
  versions: versionsSchema,
});

export const shareWorkloadV2Schema = z.strictObject({
  version: z.literal(SHARE_SNAPSHOT_V2),
  kind: z.literal("workload"),
  /** Present only for a synthetic demo workload. */
  synthetic: z.literal(true).optional(),
  workload: z.strictObject({
    calls: count,
    spanDays: count,
    activeDays: count,
    knownTokens: count,
    /** Only when the sharer chose to publish it. */
    sessions: count.optional(),
    tools: z
      .array(
        z.strictObject({
          id: z.enum(Object.keys(SHAREABLE_TOOLS) as [ShareableToolId, ...ShareableToolId[]]),
          calls: count,
        }),
      )
      .max(8),
    /** Only when the sharer chose to publish it. */
    period: periodSchema.optional(),
  }),
  value: z
    .strictObject({
      rulesAsOf: isoDateV1Schema,
      recordedCalls: count,
      pricedCalls: count,
      total: amount.optional(),
      makers: z
        .array(z.strictObject({ name: z.string().min(1).max(40), calls: count, amount }))
        .max(8),
      excluded: z
        .array(
          z.strictObject({
            maker: z.string().min(1).max(40).optional(),
            calls: count,
            reason: z.enum(["undocumented-category", "no-rate", "no-maker"]),
          }),
        )
        .max(8),
      unresolvedCalls: count,
    })
    .optional(),
  facts: z.array(workloadFactV1Schema).max(3),
  versions: z.strictObject({ catalog: z.string().min(1).max(80) }),
});

export const shareSnapshotV2Schema = z.discriminatedUnion("kind", [
  shareReplayV2Schema,
  shareWorkloadV2Schema,
]);

export type ShareReplayV2 = z.infer<typeof shareReplayV2Schema>;
export type ShareWorkloadV2 = z.infer<typeof shareWorkloadV2Schema>;
export type ShareSnapshotV2 = z.infer<typeof shareSnapshotV2Schema>;
