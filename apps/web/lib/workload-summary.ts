import type { ModelIdentityIndex } from "@stackreplay/catalog";
import { tokenAccountingOf } from "@stackreplay/replay-engine";
import { compareUtcTimestamps, type StackReplayExportV1 } from "@stackreplay/schema";
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

/** True when the catalog still knows this canonical id. */
function catalogHasModel(identity: ModelIdentityIndex, modelId: string): boolean {
  return identity.modelIds.includes(modelId);
}

export function summarizeExport(
  exported: StackReplayExportV1,
  catalogVersion: string,
  identity: ModelIdentityIndex,
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

    // The identity is re-established against the catalog this build carries, with
    // the same shared resolution rules the engine applies: an event's recorded
    // canonicalId is honoured when the catalog still knows it, otherwise the raw
    // name is resolved (which is how a catalog alias turns a dotted provider
    // spelling into a canonical model). An identifier that resolves to nothing is
    // reported as unmapped rather than guessed at (M4A).
    const recorded = event.model.canonicalId;
    const resolution =
      recorded !== undefined && catalogHasModel(identity, recorded)
        ? ({ observed: event.model.rawName, canonicalId: recorded, basis: "canonical_id" } as const)
        : identity.resolve(
            event.model.rawName,
            event.harness === undefined ? undefined : { harness: event.harness.id },
          );
    const canonicalId = resolution.canonicalId;
    const basis = resolution.basis === "unresolved" ? undefined : resolution.basis;
    const aliasId = "aliasId" in resolution ? resolution.aliasId : undefined;

    const existing = models.get(event.model.rawName);
    if (existing === undefined) {
      models.set(event.model.rawName, {
        rawName: event.model.rawName,
        ...(canonicalId !== undefined ? { canonicalId } : {}),
        events: 1,
        mapped: canonicalId !== undefined,
        ...(basis === undefined ? {} : { basis }),
        ...(aliasId === undefined ? {} : { aliasId }),
      });
    } else {
      existing.events += 1;
    }

    // Instant comparison, not string comparison: mixed-precision ISO
    // timestamps order wrongly as strings (benchmark finding F034).
    if (first === undefined || compareUtcTimestamps(event.occurredAt, first) < 0)
      first = event.occurredAt;
    if (last === undefined || compareUtcTimestamps(event.occurredAt, last) > 0)
      last = event.occurredAt;
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
