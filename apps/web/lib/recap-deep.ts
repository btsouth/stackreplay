import { quantile } from "./recap-quantile";
import { Decimal } from "@stackreplay/replay-engine";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import { totalTokensOf } from "./recap";
import { harnessNames, providerNames, developerNames } from "./recap-names";
export { harnessNames, providerNames, developerNames } from "./recap-names";
export function servingRouteId(id: string): string {
  const aliases: Record<string, string> = {
    "opencode zen": "opencode",
    "cline-pass": "cline",
    "opencode-go": "opencode",
    "opencode-zen": "opencode",
    commandcode: "command-code",
    "openai-codex": "openai",
    "openai-api": "openai",
    zai: "z-ai",
    "zai-coding-plan": "z-ai",
    "z.ai": "z-ai",
    clinepass: "cline",
    "ollama-cloud": "ollama",
    custom: "unattributed",
    unknown: "unattributed",
    "": "unattributed",
  };
  const normalized = id.trim().toLowerCase();
  return aliases[normalized] ?? normalized;
}
const firstParty: Record<string, string> = {
  "claude-code": "anthropic",
  codex: "openai",
  "command-code": "command-code",
};
function routeFromModel(raw: string): string | undefined {
  const route = raw.split("/")[0]!;
  return raw.includes("/") &&
    [
      "cline-pass",
      "cline",
      "openrouter",
      "opencode",
      "opencode-zen",
      "opencode-go",
      "zai",
    ].includes(route)
    ? servingRouteId(route)
    : undefined;
}
export interface RecapDeep {
  buckets: { input: number; output: number; read: number; write: number };
  harnesses: { id: string; total: number; records: number }[];
  providers: { id: string; total: number; records: number }[];
  projects: { hash: string; total: number }[];
  firstSeen: { id: string; date: string; name?: string }[];
  omittedFirstSeen?: number;
  speeds: { id: string; n: number; median: number; p25: number; p75: number; wait: number }[];
  hours: number[][];
  weekendShare: number;
  months: { date: string; usd: string; priced: number }[];
  costDays: { date: string; usd: string }[];
  cacheSavings: string;
  cacheSavingsRecords: number;
}
export { quantile } from "./recap-quantile";
/** Recorder, orchestrating harness, serving route and model developer remain separate. */
export function deepRecap(
  events: readonly TextUsageEventV1[],
  allEvents: readonly TextUsageEventV1[],
  local: (at: string) => { date: string; hour: number },
  now: string,
): RecapDeep {
  const buckets = { input: 0, output: 0, read: 0, write: 0 };
  const harnesses = new Map<string, { id: string; total: number; records: number }>();
  const providers = new Map<string, { id: string; total: number; records: number }>();
  const projects = new Map<string, number>();
  const first = new Map<string, string>();
  const timings = new Map<string, { rates: number[]; waits: number[] }>();
  const hours = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  let weekend = 0;
  for (const e of allEvents) {
    if (e.occurredAt > now) continue;
    const id = e.model.canonicalId ?? e.model.rawName;
    if (!first.has(id) || e.occurredAt < first.get(id)!) first.set(id, e.occurredAt);
  }
  for (const e of events) {
    const u = e.usage,
      total = totalTokensOf(e) ?? 0;
    const read = u.cacheReadTokens ?? 0,
      write = u.cacheWriteTokens ?? 0;
    buckets.input += Math.max(
      0,
      (u.inputTokens ?? 0) -
        (u.accounting?.cacheReadIncludedInInput === true ? read : 0) -
        (u.accounting?.cacheWriteIncludedInInput === true ? write : 0),
    );
    buckets.output +=
      (u.outputTokens ?? 0) +
      (u.accounting?.reasoningIncludedInOutput === false ? (u.reasoningTokens ?? 0) : 0);
    buckets.read += u.accounting?.cacheReadIncludedInInput !== undefined ? read : 0;
    buckets.write += u.accounting?.cacheWriteIncludedInInput !== undefined ? write : 0;
    const { harness, provider } = recapRoutes(e);
    for (const [map, id] of [
      [harnesses, harness],
      [providers, provider],
    ] as const) {
      const row = map.get(id) ?? { id, total: 0, records: 0 };
      row.total += total;
      row.records++;
      map.set(id, row);
    }
    if (e.projectHash) projects.set(e.projectHash, (projects.get(e.projectHash) ?? 0) + total);
    const { date, hour } = local(e.occurredAt);
    const day = new Date(date + "T00:00:00Z").getUTCDay();
    hours[day]![hour]!++;
    if (day === 0 || day === 6) weekend++;
    const timing = recapSpeedSample(e);
    if (!timing) continue;
    const id = e.model.canonicalId ?? e.model.rawName;
    const sample = timings.get(id) ?? { rates: [], waits: [] };
    sample.rates.push(timing.rate);
    sample.waits.push(timing.wait);
    timings.set(id, sample);
  }
  const selectedIds = new Set(events.map((e) => e.model.canonicalId ?? e.model.rawName));
  return {
    buckets,
    harnesses: [...harnesses.values()].sort((a, b) => b.total - a.total),
    providers: [...providers.values()].sort((a, b) => b.total - a.total),
    projects: [...projects]
      .map(([hash, total]) => ({ hash, total }))
      .sort((a, b) => b.total - a.total),
    firstSeen: [...first]
      .filter(([id]) => selectedIds.has(id))
      .map(([id, date]) => ({ id, date: local(date).date }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    speeds: [...timings]
      .filter(([, s]) => s.rates.length >= 50)
      .map(([id, s]) => ({
        id,
        n: s.rates.length,
        median: quantile(s.rates, 0.5),
        p25: quantile(s.rates, 0.25),
        p75: quantile(s.rates, 0.75),
        wait: quantile(s.waits, 0.5),
      }))
      .sort((a, b) => b.median - a.median),
    hours,
    weekendShare: events.length ? weekend / events.length : 0,
    months: [],
    costDays: [],
    cacheSavings: "0",
    cacheSavingsRecords: 0,
  };
}

export function costTrendBuckets(
  recap: { start: string; end: string; deep?: RecapDeep },
  period: "30" | "90" | "all",
) {
  if (period === "all") return recap.deep?.months ?? [];
  const buckets = new Map<string, Decimal>();
  const key = (date: string) =>
    period === "30"
      ? date
      : new Date(
          Date.parse(date + "T00:00:00Z") -
            ((new Date(date + "T00:00:00Z").getUTCDay() + 6) % 7) * 86400000,
        )
          .toISOString()
          .slice(0, 10);
  for (
    let at = Date.parse(recap.start + "T00:00:00Z");
    at <= Date.parse(recap.end + "T00:00:00Z");
    at += 86400000
  )
    buckets.set(key(new Date(at).toISOString().slice(0, 10)), new Decimal(0));
  for (const day of recap.deep?.costDays ?? [])
    buckets.set(
      key(day.date),
      (buckets.get(key(day.date)) ?? new Decimal(0)).add(new Decimal(day.usd)),
    );
  return [...buckets].map(([date, usd]) => ({ date, usd: usd.toString() }));
}

/** Any recorder with exact per-response timing can contribute; aggregates cannot. */
export function recapSpeedSample(e: TextUsageEventV1) {
  if (e.confidence.usage === "estimated" || !e.requestStartedAt || !e.requestEndedAt) return;
  const seconds = (Date.parse(e.requestEndedAt) - Date.parse(e.requestStartedAt)) / 1000;
  const output = e.usage.outputTokens;
  if (
    output === undefined ||
    output <= 0 ||
    !Number.isFinite(seconds) ||
    seconds < 0.25 ||
    seconds > 600 ||
    output / seconds > 500
  )
    return;
  return { rate: output / seconds, wait: seconds };
}

export function recapRoutes(e: TextUsageEventV1) {
  const harness = e.harness?.id ?? (e.source.adapterId === "ccusage" ? "ccusage" : "unattributed");
  // An inferred model-provider is developer evidence, not a recorded serving route.
  const rawProvider =
    e.billing?.attribution === "exact" && e.billing.providerId
      ? e.billing.providerId
      : e.provider?.attribution === "exact"
        ? e.provider.id
        : (routeFromModel(e.model.rawName) ?? firstParty[e.source.adapterId] ?? "unattributed");
  const provider = servingRouteId(rawProvider);
  return { harness, provider };
}
