import { tokenAccountingOf } from "@stackreplay/replay-engine";
import type {
  CapacityObservations,
  ObservedCapacityEvent,
  TextUsageEventV1,
} from "@stackreplay/schema";
import type { ReviewPeriod } from "./review-period";

export interface CapacityContext {
  hours: number;
  responses: number;
  knownTokens: number;
  unknownTokenResponses: number;
  models: Record<string, number>;
}
export interface CapacitySessionContext {
  sessionId: string;
  projects: { hash: string; label: string }[];
  firstResponseAt: string;
  lastResponseAt: string;
  responses: number;
  precedingResponse?: { at: string; model: string; projectLabel?: string };
}
export interface CapacitySummary {
  methodology: "claude-native-capacity-v1";
  historyInspected: boolean;
  digest: string;
  events: (ObservedCapacityEvent & {
    before: CapacityContext[];
    sessionContext?: CapacitySessionContext;
  })[];
  directHardLimits: number;
  warnings: number;
  sessions: number;
  days: number;
  scheduledResets: number;
  duplicateRows: number;
  daily: { date: string; responses: number; hardLimits: number }[];
}

/** One bounded worker pass, cached alongside economics. No usage events enter React state. */
export function summarizeCapacity(
  observations: CapacityObservations | undefined,
  workload: readonly TextUsageEventV1[],
  period: ReviewPeriod | undefined,
  resourceInstanceId: string | undefined,
  projectLabels: ReadonlyMap<string, string> = new Map(),
): CapacitySummary {
  const start = period ? Date.parse(`${period.start}T00:00:00Z`) : -Infinity;
  const end = period ? Date.parse(`${period.end}T00:00:00Z`) : Infinity;
  const events = resourceInstanceId
    ? (observations?.events ?? []).filter(
        (e) =>
          e.resourceInstanceId === resourceInstanceId &&
          Date.parse(e.timestamp) >= start &&
          Date.parse(e.timestamp) < end,
      )
    : [];
  const rows = workload
    .filter((e) => e.source.resourceInstanceId === resourceInstanceId)
    .map((e) => ({ event: e, at: Date.parse(e.occurredAt), tokens: tokenAccountingOf(e.usage) }));
  // Only native session identity within this exact account establishes attribution.
  const sessions = new Map<string, typeof rows>();
  const labels = new Map(projectLabels);
  for (const row of rows) {
    const project = row.event.projectHash;
    if (project && !labels.has(project))
      labels.set(project, `Project ${project.replace(/^ph_/, "").slice(0, 8)}`);
    const session = row.event.source.nativeSessionHash;
    if (!session) continue;
    const group = sessions.get(session) ?? [];
    group.push(row);
    sessions.set(session, group);
  }
  for (const group of sessions.values()) group.sort((a, b) => a.at - b.at);
  const sessionContext = (event: ObservedCapacityEvent): CapacitySessionContext | undefined => {
    const group = sessions.get(event.sessionId);
    const first = group?.[0],
      last = group?.at(-1);
    if (!group || !first || !last) return;
    const preceding = group.findLast((row) => row.at < Date.parse(event.timestamp));
    const projects = [
      ...new Set(group.flatMap((row) => (row.event.projectHash ? [row.event.projectHash] : []))),
    ];
    return {
      sessionId: event.sessionId,
      projects: projects.map((hash) => ({ hash, label: labels.get(hash) ?? hash })),
      firstResponseAt: first.event.occurredAt,
      lastResponseAt: last.event.occurredAt,
      responses: group.length,
      ...(preceding
        ? {
            precedingResponse: {
              at: preceding.event.occurredAt,
              model:
                preceding.event.model.rawName ??
                preceding.event.model.canonicalId ??
                "Unknown model",
              ...(preceding.event.projectHash
                ? {
                    projectLabel:
                      labels.get(preceding.event.projectHash) ?? preceding.event.projectHash,
                  }
                : {}),
            },
          }
        : {}),
    };
  };
  const daily = new Map<string, { date: string; responses: number; hardLimits: number }>();
  const day = (date: string) => {
    let value = daily.get(date);
    if (!value) {
      value = { date, responses: 0, hardLimits: 0 };
      daily.set(date, value);
    }
    return value;
  };
  for (const row of rows) day(row.event.occurredAt.slice(0, 10)).responses++;
  const hard = events.filter((e) => e.eventType === "hard_limit_reached");
  for (const event of hard) day(event.timestamp.slice(0, 10)).hardLimits++;
  // Digest includes complete normalized evidence, not merely its event count.
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(JSON.stringify(observations ?? null)))
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return {
    methodology: "claude-native-capacity-v1",
    historyInspected: observations !== undefined,
    digest: `capacity-v1:${hash.toString(16)}`,
    directHardLimits: hard.length,
    warnings: events.filter((e) => e.eventType === "usage_warning").length,
    sessions: new Set(hard.map((e) => e.sessionId)).size,
    days: new Set(hard.map((e) => e.timestamp.slice(0, 10))).size,
    scheduledResets: new Set(events.flatMap((e) => (e.resetAt ? [e.resetAt] : []))).size,
    duplicateRows: events.reduce((n, e) => n + e.duplicateRows, 0),
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    events: events.map((e) => {
      const context = sessionContext(e);
      return {
        ...e,
        ...(context ? { sessionContext: context } : {}),
        before:
          e.eventType === "hard_limit_reached"
            ? [5, 24, 168].map((hours) => {
                const at = Date.parse(e.timestamp);
                const context: CapacityContext = {
                  hours,
                  responses: 0,
                  knownTokens: 0,
                  unknownTokenResponses: 0,
                  models: {},
                };
                for (const row of rows) {
                  if (row.at < at - hours * 3600000 || row.at >= at) continue;
                  context.responses++;
                  if (row.tokens.known) context.knownTokens += row.tokens.total;
                  else context.unknownTokenResponses++;
                  const model =
                    row.event.model.canonicalId ?? row.event.model.rawName ?? "Unknown model";
                  context.models[model] = (context.models[model] ?? 0) + 1;
                }
                return context;
              })
            : [],
      };
    }),
  };
}
