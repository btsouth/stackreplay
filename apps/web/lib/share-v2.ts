import { BUNDLED_CATALOG_VERSION } from "@stackreplay/catalog/bundled";
import { assertNoForbiddenFields, type ShareWorkloadV2, shareableToolId } from "@stackreplay/share";

/**
 * Recap -> share snapshot V2: the privacy boundary for every link. The builder
 * is a whitelist that constructs a new object from named fields. A model is
 * named by its catalog id and a tool only through the fixed list of known
 * recording tools, so a label from a hand-edited portable file cannot reach a
 * public page.
 */

/** A recap link contains only the aggregates printed on the card. Model labels resolve from catalog IDs. */
export function recapShareV2(recap: import("./recap").Recap, synthetic = false): ShareWorkloadV2 {
  const snapshot: ShareWorkloadV2 = {
    version: 2,
    kind: "workload",
    ...(synthetic ? { synthetic: true as const } : {}),
    recap: {
      totalTokens: recap.total,
      usd: recap.usd,
      usdHigh: recap.usdHigh,
      pricedRequests: recap.priced,
      rulesAsOf: recap.rulesAsOf,
      streak: recap.longestStreak,
      models: recap.models
        .filter((m) => m.family !== "other")
        .slice(0, 5)
        .map((m) => ({ id: m.id, tokenCount: m.total })),
    },
    workload: {
      calls: recap.records,
      spanDays: recap.days.length,
      activeDays: recap.days.filter((d) => d.records > 0).length,
      knownTokens: recap.total,
      sessions: recap.sessions,
      tools: recap.tools.slice(0, 8).map((t) => ({ id: shareableToolId(t.id), calls: t.records })),
    },
    facts: [],
    versions: { catalog: BUNDLED_CATALOG_VERSION },
  };
  assertNoForbiddenFields(snapshot);
  return snapshot;
}

/** Only selected card figures enter a terminal link; no local projects or labels. */
export function terminalShareV2(
  card: import("./terminal-card").PublicCard,
  synthetic = false,
): ShareWorkloadV2 {
  const snapshot: ShareWorkloadV2 = {
    version: 2,
    kind: "workload",
    ...(synthetic ? { synthetic: true as const } : {}),
    card,
    workload: { calls: 0, spanDays: 0, activeDays: 0, knownTokens: card.tokens ?? 0, tools: [] },
    facts: [],
    versions: { catalog: BUNDLED_CATALOG_VERSION },
  };
  assertNoForbiddenFields(snapshot);
  return snapshot;
}
