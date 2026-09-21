import type { UsageEventV1 } from "@stackreplay/schema";
import type { AdapterId, AdapterWarning } from "./types.js";

/**
 * Deduplication and overlap handling (spec point 16).
 *
 * Two different things can go wrong when several sources describe the same
 * work, and both are handled explicitly:
 *
 * 1. The same source is scanned twice, or a file is reachable through two
 *    roots. These are exact duplicates: identical adapter, identical native
 *    event identity. Only one is kept.
 * 2. Two different sources describe the same underlying provider work, for
 *    example a native Claude Code scan and a ccusage import covering the same
 *    session. These are overlaps. The higher-precision source wins, and the
 *    dropped aggregate is reported rather than silently double counted.
 */

/** Lower rank wins. Native per-call scans outrank aggregate imports. */
const PRECISION_RANK: Record<AdapterId, number> = {
  "claude-code": 10,
  codex: 10,
  opencode: 10,
  "command-code": 10,
  hermes: 10,
  ccusage: 50,
  "t3-code": 90,
};

export interface DedupResult {
  events: UsageEventV1[];
  exactDuplicates: number;
  overlaps: number;
  warnings: AdapterWarning[];
}

function tokenSignature(event: UsageEventV1): string {
  const usage = event.usage;
  // An explicit zero and an omitted category are treated as the same quantity
  // here: the signature identifies the underlying call, it does not compare
  // accounting models (one source may report a category as zero while another
  // omits it entirely).
  const part = (value: number | undefined): string =>
    value === undefined || value === 0 ? "0" : String(value);
  return [
    part(usage.inputTokens),
    part(usage.outputTokens),
    part(usage.cacheReadTokens),
    part(usage.cacheWriteTokens),
    part(usage.reasoningTokens),
  ].join("/");
}

/**
 * Overlap key: the same provider session, the same instant and the same token
 * signature describe the same underlying work regardless of which adapter
 * reported it.
 */
function overlapKey(event: UsageEventV1): string | undefined {
  const session = event.source.nativeSessionHash;
  if (session === undefined) return undefined;
  return `${session}\u0000${event.occurredAt}\u0000${tokenSignature(event)}`;
}

function precisionRank(adapterId: string): number {
  return PRECISION_RANK[adapterId as AdapterId] ?? 100;
}

export function dedupeEvents(events: readonly UsageEventV1[]): DedupResult {
  const warnings: AdapterWarning[] = [];
  const byExact = new Map<string, UsageEventV1>();
  let exactDuplicates = 0;
  for (const event of events) {
    const key = `${event.source.adapterId}\u0000${event.source.nativeEventHash ?? event.id}`;
    const existing = byExact.get(key);
    if (existing === undefined) {
      byExact.set(key, event);
      continue;
    }
    exactDuplicates += 1;
  }

  const byOverlap = new Map<string, UsageEventV1>();
  let overlaps = 0;
  for (const event of byExact.values()) {
    const key = overlapKey(event);
    if (key === undefined) {
      byOverlap.set(`${event.source.adapterId}\u0000${event.id}`, event);
      continue;
    }
    const existing = byOverlap.get(key);
    if (existing === undefined) {
      byOverlap.set(key, event);
      continue;
    }
    // Two records from the same adapter are distinct work, never an overlap:
    // identical records from one adapter are already handled as exact
    // duplicates above.
    if (existing.source.adapterId === event.source.adapterId) {
      // Same adapter, different native identity: distinct work that happens to
      // look alike. Keep it under its own key instead of dropping it.
      byOverlap.set(`${event.source.adapterId}\u0000${event.id}`, event);
      continue;
    }
    const existingRank = precisionRank(existing.source.adapterId);
    const candidateRank = precisionRank(event.source.adapterId);
    if (candidateRank < existingRank) {
      byOverlap.set(key, event);
    }
    overlaps += 1;
  }

  if (overlaps > 0) {
    warnings.push({
      code: "RECORD_UNSUPPORTED",
      message: `${overlaps} event(s) were described by more than one source; the higher-precision source was kept`,
    });
  }

  const sorted = [...byOverlap.values()].sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return { events: sorted, exactDuplicates, overlaps, warnings };
}
