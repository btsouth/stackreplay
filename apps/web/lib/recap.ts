import type { CatalogV1 } from "@stackreplay/catalog";
import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { Decimal, moneyUnitsForUsage, replayObservingQuotes } from "@stackreplay/replay-engine";
import type { TextUsageEventV1 } from "@stackreplay/schema";

import { deepRecap, type RecapDeep } from "./recap-deep";

export type RecapPeriod = "30" | "90" | "all";
export interface RecapModel {
  id: string;
  name: string;
  family: string;
  output: number;
  total: number;
  records: number;
  priced: number;
  usd: string;
  usdHigh: string;
  cacheScenarioRecords: number;
}
export interface Recap {
  deep?: RecapDeep;
  sourceCoverage?: { name: string; role: string; status: string }[];
  start: string;
  end: string;
  timeZone: string;
  days: { date: string; records: number; output: number }[];
  models: RecapModel[];
  weeks: { date: string; families: Record<string, number> }[];
  tools: { id: string; records: number; output: number; total: number }[];
  records: number;
  output: number;
  total: number;
  outputKnown: number;
  totalKnown: number;
  sessions: number;
  sessionKnown: number;
  streak: number;
  longestStreak: number;
  busiestHour: number;
  busiestDay: string;
  lateNightShare: number;
  priced: number;
  usd: string;
  usdHigh: string;
  cacheScenarioRecords: number;
  rulesAsOf: string;
}
export const familyColors: Record<string, string> = {
  anthropic: "var(--developer-anthropic)",
  openai: "var(--developer-openai)",
  google: "var(--developer-google)",
  deepseek: "var(--developer-deepseek)",
  xai: "var(--developer-xai)",
  other: "var(--developer-other)",
};
/** Named, resolved models with logged tokens in this recap period. Ties use stable model IDs. */
export function topRecapModels(models: readonly RecapModel[], limit = 5): RecapModel[] {
  return models
    .filter(
      (model) => model.total > 0 && model.family !== "other" && model.name !== "Other / Unresolved",
    )
    .sort((a, b) => b.total - a.total || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, Math.max(0, limit));
}
export function outputOf(event: TextUsageEventV1): number | undefined {
  const u = event.usage;
  if (u.outputTokens === undefined) return undefined;
  return (
    u.outputTokens +
    (u.accounting?.reasoningIncludedInOutput === false ? (u.reasoningTokens ?? 0) : 0)
  );
}
/** Sum reported categories only, honoring the schema's subset declarations. Missing is not zero coverage. */
export function totalTokensOf(event: TextUsageEventV1): number | undefined {
  const u = event.usage;
  if (
    [u.inputTokens, u.outputTokens, u.cacheReadTokens, u.cacheWriteTokens, u.reasoningTokens].every(
      (n) => n === undefined,
    )
  )
    return undefined;
  return (
    (u.inputTokens ?? 0) +
    (u.outputTokens ?? 0) +
    (u.accounting?.cacheReadIncludedInInput === false ? (u.cacheReadTokens ?? 0) : 0) +
    (u.accounting?.cacheWriteIncludedInInput === false ? (u.cacheWriteTokens ?? 0) : 0) +
    (u.accounting?.reasoningIncludedInOutput === false ? (u.reasoningTokens ?? 0) : 0)
  );
}
const dayMs = 86400000;
function nextDay(date: string, offset = 1) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + offset * dayMs).toISOString().slice(0, 10);
}
/** Calendar-day periods, local dates and hours; engine quotes at pinned current list prices. No content is read. */
export function buildRecap(
  events: readonly TextUsageEventV1[],
  period: RecapPeriod,
  now: string,
  timeZone: string,
  catalog: CatalogV1 = loadBundledCatalog(),
): Recap {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const local = (at: string) => {
    const p = Object.fromEntries(
      formatter.formatToParts(new Date(at)).map((x) => [x.type, x.value]),
    );
    return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
  };
  const end = local(now).date;
  const first = events.reduce((a, e) => {
    const d = local(e.occurredAt).date;
    return d < a ? d : a;
  }, end);
  const start = period === "all" ? first : nextDay(end, -(Number(period) - 1));
  const selected = events.filter((e) => {
    const d = local(e.occurredAt).date;
    return d >= start && d <= end && Date.parse(e.occurredAt) <= Date.parse(now);
  });
  const days = new Map<string, { date: string; records: number; output: number }>();
  for (let d = start; d <= end; d = nextDay(d)) days.set(d, { date: d, records: 0, output: 0 });
  const models = new Map<string, RecapModel>();
  const tools = new Map<string, { id: string; records: number; output: number; total: number }>();
  const weeks = new Map<string, Record<string, number>>();
  for (const date of days.keys()) {
    const week = nextDay(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
    weeks.set(week, {});
  }
  const hours = Array<number>(24).fill(0);
  const sessions = new Set<string>();
  let output = 0;
  let total = 0;
  let totalKnown = 0;
  let outputKnown = 0;
  let sessionKnown = 0;
  let priced = 0;
  let usd = new Decimal(0);
  let usdHigh = new Decimal(0);
  let cacheScenarioRecords = 0;
  for (const e of selected) {
    const { date, hour } = local(e.occurredAt);
    const tokens = outputOf(e);
    const n = tokens ?? 0;
    const allTokens = totalTokensOf(e);
    const t = allTokens ?? 0;
    total += t;
    if (allTokens !== undefined) totalKnown++;
    output += n;
    if (tokens !== undefined) outputKnown++;
    hours[hour] = (hours[hour] ?? 0) + 1;
    const session = e.source.nativeSessionHash;
    if (session) {
      sessions.add(`${e.source.adapterId}:${session}`);
      sessionKnown++;
    }
    const day = days.get(date);
    if (day) {
      day.records++;
      day.output += n;
    }
    const id = e.model.canonicalId ?? e.model.rawName;
    const model = e.model.canonicalId ? catalog.models[e.model.canonicalId] : undefined;
    const family = model?.developerId ?? "other";
    const row = models.get(id) ?? {
      id,
      name: model?.name ?? e.model.rawName,
      family,
      output: 0,
      total: 0,
      records: 0,
      priced: 0,
      usd: "0",
      usdHigh: "0",
      cacheScenarioRecords: 0,
    };
    row.output += n;
    row.total += t;
    row.records++;
    models.set(id, row);
    const tool = tools.get(e.source.adapterId) ?? {
      id: e.source.adapterId,
      records: 0,
      output: 0,
      total: 0,
    };
    tool.records++;
    tool.output += n;
    tool.total += t;
    tools.set(tool.id, tool);
    const week = nextDay(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
    const mix = weeks.get(week) ?? {};
    mix[family] = (mix[family] ?? 0) + t;
    weeks.set(week, mix);
  }
  const deep = deepRecap(selected, events, local, now);
  const costDays = new Map<string, Decimal>();
  const months = new Map<string, { date: string; usd: string; priced: number }>();
  let cacheSavings = new Decimal(0);
  // Price each model at its developer's published direct API route, never a cheapest-provider comparison.
  for (const [id, row] of models) {
    const model = catalog.models[id];
    const provider = model?.developerId;
    if (!provider) continue;
    replayObservingQuotes(
      {
        events: selected.filter((e) => e.model.canonicalId === id),
        catalog,
        target: { type: "api", providerId: provider },
        context: { rulesAsOf: now.slice(0, 10) },
      },
      (event, outcome, quote) => {
        let low = quote.amount;
        let high = quote.amount;
        let scenario = false;
        let chosenPrice = quote.pricingId ? catalog.pricing[quote.pricingId] : undefined;
        // Claude logs do not retain cache TTL. Both documented TTL rates form a range,
        // rather than treating an unreported TTL as a known 5-minute write.
        if (
          outcome === "price_category_undocumented" &&
          provider === "anthropic" &&
          (event.usage.cacheWriteTokens ?? 0) > 0 &&
          quote.pricingId
        ) {
          const base = catalog.pricing[quote.pricingId];
          const variants = ["cache-write-5m", "cache-write-1h"].map((variant) =>
            Object.values(catalog.pricing).find(
              (price) =>
                price.modelId === id &&
                price.variantId === variant &&
                price.basis === "api_list_price" &&
                price.effectiveFrom === base?.effectiveFrom &&
                Date.parse(price.effectiveFrom) <= Date.parse(now) &&
                (!price.effectiveTo || now.slice(0, 10) < price.effectiveTo),
            ),
          );
          if (variants.every((price) => price !== undefined)) {
            const amounts = variants.map((price) =>
              moneyUnitsForUsage(event.usage, price!, { atMs: Date.parse(event.occurredAt) }),
            );
            if (amounts.every((amount) => amount.known)) {
              const sorted = amounts.map((amount) => amount.units).sort((a, b) => a.comparedTo(b));
              low = sorted[0]?.toString();
              high = sorted[1]?.toString();
              scenario = true;
              chosenPrice = variants[0];
            }
          }
        }
        if (low === undefined || high === undefined || (outcome !== "priced" && !scenario)) return;
        priced++;
        const date = local(event.occurredAt).date;
        costDays.set(date, (costDays.get(date) ?? new Decimal(0)).add(low));
        const month = date.slice(0, 7);
        const monthly = months.get(month) ?? { date: month, usd: "0", priced: 0 };
        monthly.usd = new Decimal(monthly.usd).add(low).toString();
        monthly.priced++;
        months.set(month, monthly);
        if (chosenPrice && (event.usage.cacheReadTokens ?? 0) > 0) {
          const u = event.usage;
          const uncached = {
            ...u,
            inputTokens:
              (u.inputTokens ?? 0) +
              (u.accounting?.cacheReadIncludedInInput === true ? 0 : (u.cacheReadTokens ?? 0)),
            cacheReadTokens: 0,
          };
          const actual = moneyUnitsForUsage(u, chosenPrice, { atMs: Date.parse(event.occurredAt) });
          const without = moneyUnitsForUsage(uncached, chosenPrice, {
            atMs: Date.parse(event.occurredAt),
          });
          if (actual.known && without.known && without.units.greaterThanOrEqualTo(actual.units)) {
            cacheSavings = cacheSavings.add(without.units.sub(actual.units));
            deep.cacheSavingsRecords++;
          }
        }
        row.priced++;
        if (scenario) {
          cacheScenarioRecords++;
          row.cacheScenarioRecords++;
        }
        usd = usd.add(new Decimal(low));
        usdHigh = usdHigh.add(new Decimal(high));
        row.usd = new Decimal(row.usd).add(new Decimal(low)).toString();
        row.usdHigh = new Decimal(row.usdHigh).add(new Decimal(high)).toString();
      },
    );
  }
  deep.costDays = [...costDays]
    .map(([date, usd]) => ({ date, usd: usd.toString() }))
    .sort((a, b) => a.date.localeCompare(b.date));
  deep.months = [...months.values()].sort((a, b) => a.date.localeCompare(b.date));
  deep.cacheSavings = cacheSavings.toString();
  const daily = [...days.values()];
  let run = 0;
  let longestStreak = 0;
  for (const d of daily) {
    run = d.records ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }
  let streak = 0;
  let i = daily.length - 1;
  if (!daily[i]?.records) i--;
  for (; i >= 0 && daily[i]?.records; i--) streak++;
  return {
    deep,
    start,
    end,
    timeZone,
    days: daily,
    models: [...models.values()].sort((a, b) => b.total - a.total),
    weeks: [...weeks]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, families]) => ({ date, families })),
    tools: [...tools.values()].sort((a, b) => b.records - a.records),
    records: selected.length,
    output,
    outputKnown,
    total,
    totalKnown,
    sessions: sessions.size,
    sessionKnown,
    streak,
    longestStreak,
    busiestHour: hours.indexOf(Math.max(...hours)),
    busiestDay:
      [...daily].sort((a, b) => b.records - a.records || a.date.localeCompare(b.date))[0]?.date ??
      end,
    lateNightShare: selected.length
      ? hours.slice(0, 5).reduce((a, b) => a + b, 0) / selected.length
      : 0,
    priced,
    usd: usd.toString(),
    usdHigh: usdHigh.toString(),
    cacheScenarioRecords,
    rulesAsOf: now.slice(0, 10),
  };
}
