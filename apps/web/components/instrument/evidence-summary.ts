import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";

type EvidenceRow = ProjectedReplayV1["evidence"][number];

/**
 * What the evidence ledger's header may say about the whole set.
 *
 * Two states that look alike are kept apart: dimensions that were reported and
 * all came back established, and a result that reported none at all. Counting
 * an empty collection as a clean one is the same defect as counting an absent
 * quantity as zero, so the header words the absence instead.
 */
export function evidenceSummary(rows: readonly EvidenceRow[]): string {
  if (rows.length === 0) {
    return "no evidence dimension is recorded for this result";
  }
  const partial = rows.filter((row) => row.status === "partial").length;
  if (partial === 0) {
    return "every dimension established for this workload";
  }
  return partial === 1 ? "1 dimension partial" : `${partial} dimensions partial`;
}
