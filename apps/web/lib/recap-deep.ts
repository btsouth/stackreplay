import type { TextUsageEventV1 } from "@stackreplay/schema";
import { totalTokensOf } from "./recap";
export const harnessNames: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex CLI",
  opencode: "OpenCode",
  "command-code": "Command Code CLI",
  hermes: "Hermes",
  "t3-code": "T3 Code",
  ccusage: "ccusage import",
  unattributed: "Unattributed",
};
export const providerNames: Record<string, string> = {
  openrouter: "OpenRouter",
  meta: "Meta",
  anthropic: "Anthropic",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  "z-ai": "Z.ai",
  zai: "Z.ai",
  opencode: "OpenCode hosted",
  "opencode-go": "OpenCode hosted",
  "opencode-zen": "OpenCode hosted",
  commandcode: "Command Code",
  "command-code": "Command Code",
  cline: "Cline",
  clinepass: "Cline",
  ollama: "Ollama Cloud",
  "ollama-cloud": "Ollama Cloud",
  google: "Google",
  unattributed: "Unattributed",
};
export const developerNames: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  "z-ai": "Z.ai",
  google: "Google",
  xai: "xAI",
  xiaomi: "Xiaomi",
  other: "Unresolved",
};
export function servingRouteId(id: string): string {
  const aliases: Record<string, string> = {
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
  return aliases[id] ?? id;
}
export interface RecapDeep {
  buckets: { input: number; output: number; read: number; write: number };
  harnesses: { id: string; total: number; records: number }[];
  providers: { id: string; total: number; records: number }[];
  projects: { hash: string; total: number }[];
  firstSeen: { id: string; date: string }[];
  speeds: { id: string; n: number; median: number; p25: number; p75: number; wait: number }[];
  hours: number[][];
  weekendShare: number;
  longestSessionHours?: number;
  months: { date: string; usd: string; priced: number }[];
  costDays: { date: string; usd: string }[];
  cacheSavings: string;
  cacheSavingsRecords: number;
}
export function quantile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (sorted.length - 1) * p;
  const lo = Math.floor(at);
  return (sorted[lo] ?? 0) + ((sorted[Math.ceil(at)] ?? 0) - (sorted[lo] ?? 0)) * (at - lo);
}
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
  const spans = new Map<string, number[]>();
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
    const harness =
      e.harness?.id ?? (e.source.adapterId === "ccusage" ? "ccusage" : "unattributed");
    // An inferred model-provider is developer evidence, not a recorded serving route.
    const rawProvider =
      e.billing?.attribution === "exact" && e.billing.providerId
        ? e.billing.providerId
        : e.provider?.attribution === "exact"
          ? e.provider.id
          : "unattributed";
    const provider = servingRouteId(rawProvider);
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
    if (e.source.nativeSessionHash) {
      const key = e.source.adapterId + ":" + e.source.nativeSessionHash;
      const span = spans.get(key) ?? [];
      span.push(Date.parse(e.occurredAt));
      spans.set(key, span);
    }
    if (
      !["claude-code", "codex"].includes(e.source.adapterId) ||
      !e.requestStartedAt ||
      !e.requestEndedAt
    )
      continue;
    const seconds = (Date.parse(e.requestEndedAt) - Date.parse(e.requestStartedAt)) / 1000;
    const output = u.outputTokens;
    if (
      output === undefined ||
      output <= 0 ||
      seconds < 0.25 ||
      seconds > 600 ||
      output / seconds > 500
    )
      continue;
    const id = e.model.canonicalId ?? e.model.rawName;
    const sample = timings.get(id) ?? { rates: [], waits: [] };
    sample.rates.push(output / seconds);
    sample.waits.push(seconds);
    timings.set(id, sample);
  }
  const selectedIds = new Set(events.map((e) => e.model.canonicalId ?? e.model.rawName));
  const durations = [...spans.values()]
    .filter((x) => x.length > 1)
    .map((x) => (Math.max(...x) - Math.min(...x)) / 3600000);
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
    ...(durations.length ? { longestSessionHours: Math.max(...durations) } : {}),
    months: [],
    costDays: [],
    cacheSavings: "0",
    cacheSavingsRecords: 0,
  };
}
