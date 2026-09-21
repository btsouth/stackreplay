import { tokenAccountingOf } from "@stackreplay/replay-engine";
import type { StackReplayExportV1 } from "@stackreplay/schema";
import type {
  ModelSummary,
  OrchestrationSummary,
  SourceSummary,
  WorkloadSummary,
} from "./worker-protocol";

/**
 * Workload summary (M3 brief).
 *
 * Token totals use the replay engine's own disjoint-bucket derivation, so the
 * numbers shown after import are the numbers a replay will use. Unknown stays
 * unknown: events whose token set is incomplete are counted, never estimated
 * or rounded into the known total.
 *
 * Usage sources and orchestration are separate concepts (decision 27). A
 * control surface such as T3 Code is never presented as a usage source with
 * zero events; it is presented as orchestration, with a session count derived
 * from structured event metadata (the harness reference), never from prose.
 */

/** Fallback for exports written before detected sources carried a role. */
const ATTRIBUTION_ADAPTERS = new Set(["t3-code"]);
const IMPORT_ADAPTERS = new Set(["ccusage"]);

export function sourceRole(adapterId: string, role?: string): "usage" | "attribution" | "import" {
  if (role === "usage" || role === "attribution" || role === "import") return role;
  if (ATTRIBUTION_ADAPTERS.has(adapterId)) return "attribution";
  if (IMPORT_ADAPTERS.has(adapterId)) return "import";
  return "usage";
}

export function summarizeExport(
  exported: StackReplayExportV1,
  catalogVersion: string,
): WorkloadSummary {
  const sessions = new Set<string>();
  const projects = new Set<string>();
  const eventsByAdapter = new Map<string, number>();
  const sessionsByAdapter = new Map<string, Set<string>>();
  const sessionsByHarness = new Map<string, Set<string>>();
  const eventsByHarness = new Map<string, number>();
  const models = new Map<string, ModelSummary>();
  const buckets = {
    uncachedInputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
  };
  let known = 0;
  let lowerBound = 0;
  let unknownEvents = 0;
  let first: string | undefined;
  let last: string | undefined;

  for (const event of exported.events) {
    const sessionHash = event.source.nativeSessionHash;
    if (sessionHash !== undefined) {
      sessions.add(sessionHash);
      const perAdapter = sessionsByAdapter.get(event.source.adapterId) ?? new Set<string>();
      perAdapter.add(sessionHash);
      sessionsByAdapter.set(event.source.adapterId, perAdapter);
    }
    if (event.projectHash !== undefined) projects.add(event.projectHash);
    eventsByAdapter.set(
      event.source.adapterId,
      (eventsByAdapter.get(event.source.adapterId) ?? 0) + 1,
    );

    const harnessId = event.harness?.id;
    if (harnessId !== undefined) {
      eventsByHarness.set(harnessId, (eventsByHarness.get(harnessId) ?? 0) + 1);
      if (sessionHash !== undefined) {
        const perHarness = sessionsByHarness.get(harnessId) ?? new Set<string>();
        perHarness.add(sessionHash);
        sessionsByHarness.set(harnessId, perHarness);
      }
    }

    const accounting = tokenAccountingOf(event.usage);
    if (accounting.known) {
      known += accounting.total;
      buckets.uncachedInputTokens += accounting.buckets.uncachedInputTokens;
      buckets.cacheReadTokens += accounting.buckets.cacheReadTokens;
      buckets.cacheWriteTokens += accounting.buckets.cacheWriteTokens;
      buckets.outputTokens += accounting.buckets.outputTokens;
      buckets.reasoningTokens += accounting.buckets.reasoningTokens;
    } else {
      unknownEvents += 1;
      lowerBound += accounting.knownSubtotal;
    }

    const existing = models.get(event.model.rawName);
    if (existing === undefined) {
      models.set(event.model.rawName, {
        rawName: event.model.rawName,
        ...(event.model.canonicalId !== undefined ? { canonicalId: event.model.canonicalId } : {}),
        events: 1,
        mapped: event.model.canonicalId !== undefined,
      });
    } else {
      existing.events += 1;
    }

    if (first === undefined || event.occurredAt < first) first = event.occurredAt;
    if (last === undefined || event.occurredAt > last) last = event.occurredAt;
  }

  const usageSources: SourceSummary[] = [];
  const otherSources: SourceSummary[] = [];
  const orchestration: OrchestrationSummary[] = [];
  const seenOrchestration = new Set<string>();

  for (const source of exported.detectedSources) {
    const role = sourceRole(source.adapterId, source.role);
    const events = eventsByAdapter.get(source.adapterId) ?? 0;
    const adapterSessions = sessionsByAdapter.get(source.adapterId)?.size;
    if (role === "attribution") {
      const harnessSessions = sessionsByHarness.get(source.adapterId)?.size ?? 0;
      const harnessEvents = eventsByHarness.get(source.adapterId) ?? 0;
      seenOrchestration.add(source.adapterId);
      orchestration.push({
        harnessId: source.adapterId,
        name: source.name,
        sessions: harnessSessions,
        events: harnessEvents,
        precise: harnessSessions > 0,
      });
      continue;
    }
    const summary: SourceSummary = {
      adapterId: source.adapterId,
      name: source.name,
      role,
      events,
      ...(adapterSessions !== undefined ? { sessions: adapterSessions } : {}),
      ...(source.note !== undefined ? { note: source.note } : {}),
    };
    if (events > 0) usageSources.push(summary);
    else otherSources.push(summary);
  }

  // A harness can be observed in event metadata even when the export did not
  // list it as a source (older exports). Report it rather than hiding it.
  for (const [harnessId, harnessSessions] of sessionsByHarness) {
    if (seenOrchestration.has(harnessId)) continue;
    if (harnessId === "t3-code") {
      orchestration.push({
        harnessId,
        name: "T3 Code",
        sessions: harnessSessions.size,
        events: eventsByHarness.get(harnessId) ?? 0,
        precise: true,
      });
    }
  }

  usageSources.sort((a, b) => b.events - a.events || (a.name < b.name ? -1 : 1));
  orchestration.sort((a, b) => b.sessions - a.sessions || (a.name < b.name ? -1 : 1));

  return {
    eventCount: exported.events.length,
    sessionCount: sessions.size,
    projectCount: projects.size,
    ...(first !== undefined ? { firstEventAt: first } : {}),
    ...(last !== undefined ? { lastEventAt: last } : {}),
    tokens: { known, lowerBound, unknownEvents, buckets },
    models: [...models.values()].sort(
      (a, b) => b.events - a.events || (a.rawName < b.rawName ? -1 : 1),
    ),
    usageSources,
    orchestration,
    otherSources,
    redaction: exported.redactionReport,
    catalogVersion,
  };
}
