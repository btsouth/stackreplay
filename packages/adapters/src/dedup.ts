import { compareUtcTimestamps, type UsageEventV1 } from "@stackreplay/schema";
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
 *    dropped aggregate is reported rather than silently double counted. An
 *    aggregate row is recognised by the session it names, not only by an
 *    identical instant and token signature: an aggregate covering many calls
 *    can never match a single call's fingerprint, so session identity is what
 *    decides that case.
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

/**
 * Rank at which a source stops being a per-call record of the work it names.
 * A source at or above this rank describes aggregates, so it yields to any
 * native scan of the same session even when the per-event fields do not line
 * up (an aggregate covering many calls cannot match any single call's instant
 * and token signature).
 */
const AGGREGATE_RANK = 50;

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
    if (candidateRank === existingRank) {
      // Equal precision: two independent records of the same work cannot be
      // told apart from two distinct calls that happen to share every
      // observable field, so both native identities are kept.
      byOverlap.set(`${event.source.adapterId}\u0000${event.id}`, event);
      continue;
    }
    if (candidateRank < existingRank) {
      byOverlap.set(key, event);
    }
    overlaps += 1;
  }

  // Session-level overlap. An aggregate import describes a whole session
  // (or a whole day), so its instant and token signature cannot match any
  // single native call even though both describe the same work. Once a native
  // per-call scan of a session is present, that session's aggregate rows yield
  // to it and are reported as dropped instead of being added on top.
  const nativeSessions = new Set<string>();
  for (const event of byOverlap.values()) {
    const session = event.source.nativeSessionHash;
    if (session === undefined) continue;
    if (precisionRank(event.source.adapterId) < AGGREGATE_RANK) nativeSessions.add(session);
  }
  if (nativeSessions.size > 0) {
    for (const [key, event] of [...byOverlap.entries()]) {
      const session = event.source.nativeSessionHash;
      if (session === undefined || !nativeSessions.has(session)) continue;
      if (precisionRank(event.source.adapterId) < AGGREGATE_RANK) continue;
      byOverlap.delete(key);
      overlaps += 1;
    }
  }

  if (overlaps > 0) {
    warnings.push({
      code: "RECORD_UNSUPPORTED",
      message: `${overlaps} event(s) were described by more than one source; the higher-precision source was kept`,
    });
  }

  const sorted = [...byOverlap.values()].sort((a, b) => {
    // Instant comparison, never a raw string comparison: ISO-8601 timestamps
    // that differ in fractional precision order wrongly as strings
    // (benchmark finding F034), and the export's order is this order.
    const byTime = compareUtcTimestamps(a.occurredAt, b.occurredAt);
    if (byTime !== 0) return byTime;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return { events: sorted, exactDuplicates, overlaps, warnings };
}
