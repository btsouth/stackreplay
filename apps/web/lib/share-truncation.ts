import type { ShareReplaySnapshotV1 } from "@stackreplay/share";

/**
 * Human wording for a truncated share snapshot (benchmark finding F009).
 *
 * The bounds are the schema's maxima; a snapshot that had to cut a list records
 * how many entries the sharer's result held. Both the share card and the public
 * share page describe that the same way, from one place, so the two surfaces
 * cannot drift into describing the same artifact differently.
 */

const LIST_NAMES: Record<string, string> = {
  sources: "plan sources",
  constraints: "documented limits",
  violations: "exceeded windows",
  confidenceFactors: "confidence notes",
  attributionSources: "usage sources",
  ratios: "computed ratios",
};

export function describeShareTruncation(truncation: ShareReplaySnapshotV1["truncation"]): string[] {
  if (truncation === undefined) return [];
  const notes: string[] = [];
  for (const [key, total] of Object.entries(truncation)) {
    if (total === undefined) continue;
    notes.push(`${LIST_NAMES[key] ?? key}: ${total} in the result, the first shown here`);
  }
  return notes;
}
