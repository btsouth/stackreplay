import type { Recap, RecapModel, RecapPeriod } from "./recap";
import { localCalendar, nextDay } from "./recap-calendar";
import type { RecapDeep } from "./recap-deep";
import type { RecapIndex, RecapIndexDay } from "./recap-index";
import { addRecapMoney } from "./recap-money";
import { quantile } from "./recap-quantile";

type Ordered<T> = T & { order: number };
const addMoney = addRecapMoney;

/** Period reduction touches day aggregates and exact session/speed sets, never events or prices. */
export function buildRecapFromIndex(index: RecapIndex, period: RecapPeriod, now: string): Recap {
  const end = localCalendar(index.timeZone)(now).date;
  const activity = new Map(index.activity.filter(([date]) => date <= end));
  const first = [...activity.keys()].reduce((a, d) => (d < a ? d : a), end);
  const start = period === "all" ? first : nextDay(end, -(Number(period) - 1));
  const selected = index.days.filter((d) => d.date >= start && d.date <= end);
  const days: Recap["days"] = [];
  const weeks = new Map<string, Record<string, number>>();
  for (let date = start; date <= end; date = nextDay(date)) {
    days.push({ date, records: activity.get(date) ?? 0, output: 0 });
    weeks.set(nextDay(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7)), {});
  }
  const byDate = new Map(selected.map((d) => [d.date, d]));
  const models = new Map<string, Ordered<RecapModel>>();
  const tools = new Map<string, Ordered<Recap["tools"][number]>>();
  const sessions = new Set<string>();
  const modelSessions = new Map<string, Set<string>>();
  const harnesses = new Map<string, Ordered<RecapDeep["harnesses"][number]>>();
  const providers = new Map<string, Ordered<RecapDeep["providers"][number]>>();
  const projects = new Map<string, Ordered<RecapDeep["projects"][number]>>();
  const timings = new Map<string, RecapIndexDay["speeds"][number]>();
  const months = new Map<string, RecapDeep["months"][number]>();
  const deep: RecapDeep = {
    buckets: { input: 0, output: 0, read: 0, write: 0 },
    harnesses: [],
    providers: [],
    projects: [],
    firstSeen: [],
    speeds: [],
    hours: Array.from({ length: 7 }, () => Array<number>(24).fill(0)),
    weekendShare: 0,
    months: [],
    costDays: [],
    cacheSavings: "0",
    cacheSavingsRecords: 0,
  };
  let records = 0,
    aggregateRecords = 0,
    output = 0,
    total = 0,
    outputKnown = 0,
    totalKnown = 0,
    sessionKnown = 0,
    priced = 0,
    usd = "0",
    usdHigh = "0",
    cacheScenarioRecords = 0;
  for (const d of selected) {
    records += d.records;
    aggregateRecords += d.aggregateRecords;
    output += d.output;
    total += d.total;
    outputKnown += d.outputKnown;
    totalKnown += d.totalKnown;
    sessionKnown += d.sessionKnown;
    priced += d.priced;
    usd = addMoney(usd, d.usd);
    usdHigh = addMoney(usdHigh, d.usdHigh);
    cacheScenarioRecords += d.cacheScenarioRecords;
    for (const s of d.sessions) sessions.add(s);
    for (const m of d.models) {
      const set = modelSessions.get(m.id) ?? new Set<string>();
      for (const s of m.sessions) set.add(s);
      modelSessions.set(m.id, set);
      const row = models.get(m.id);
      if (!row) {
        const { sessions: _s, ...copy } = m;
        models.set(m.id, { ...copy });
      } else {
        row.order = Math.min(row.order, m.order);
        for (const key of ["output", "total", "records", "priced", "cacheScenarioRecords"] as const)
          row[key] += m[key];
        row.usd = addMoney(row.usd, m.usd);
        row.usdHigh = addMoney(row.usdHigh, m.usdHigh);
      }
    }
    for (const t of d.tools) {
      const row = tools.get(t.id);
      if (!row) tools.set(t.id, { ...t });
      else {
        row.order = Math.min(row.order, t.order);
        row.records += t.records;
        row.total += t.total;
        row.output += t.output;
      }
    }
    const week = nextDay(d.date, -((new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7));
    const mix = weeks.get(week)!;
    for (const m of d.models) mix[m.family] = (mix[m.family] ?? 0) + m.total;
    for (const key of ["input", "output", "read", "write"] as const)
      deep.buckets[key] += d.deep.buckets[key];
    for (const [map, key] of [
      [harnesses, "harnesses"],
      [providers, "providers"],
    ] as const)
      for (const r of d.deep[key]) {
        const row = map.get(r.id);
        const order = d.order[key][r.id]!;
        if (!row) map.set(r.id, { ...r, order });
        else {
          row.order = Math.min(row.order, order);
          row.total += r.total;
          row.records += r.records;
        }
      }
    for (const r of d.deep.projects) {
      const row = projects.get(r.hash),
        order = d.order.projects[r.hash]!;
      if (!row) projects.set(r.hash, { ...r, order });
      else {
        row.order = Math.min(row.order, order);
        row.total += r.total;
      }
    }
    for (let w = 0; w < 7; w++)
      for (let h = 0; h < 24; h++) deep.hours[w]![h]! += d.deep.hours[w]![h]!;
    for (const s of d.speeds) {
      const row = timings.get(s.id);
      if (!row) timings.set(s.id, { ...s, rates: [...s.rates], waits: [...s.waits] });
      else {
        row.order = Math.min(row.order, s.order);
        row.rates.push(...s.rates);
        row.waits.push(...s.waits);
      }
    }
    if (d.priced) {
      deep.costDays.push({ date: d.date, usd: d.usd });
      const key = d.date.slice(0, 7);
      const m = months.get(key) ?? { date: key, usd: "0", priced: 0 };
      m.usd = addMoney(m.usd, d.usd);
      m.priced += d.priced;
      months.set(key, m);
    }
    deep.cacheSavings = addMoney(deep.cacheSavings, d.deep.cacheSavings);
    deep.cacheSavingsRecords += d.deep.cacheSavingsRecords;
  }
  function sorted<T extends { order: number }>(rows: Iterable<T>, compare: (a: T, b: T) => number) {
    return [...rows]
      .sort((a, b) => compare(a, b) || a.order - b.order)
      .map(({ order: _o, ...r }) => r);
  }
  deep.harnesses = sorted(harnesses.values(), (a, b) => b.total - a.total);
  deep.providers = sorted(providers.values(), (a, b) => b.total - a.total);
  deep.projects = sorted(projects.values(), (a, b) => b.total - a.total);
  const firstSeen = index.firstSeen.filter((f) => models.has(f.id));
  deep.firstSeen = firstSeen
    .filter((f) => f.name !== undefined)
    .map((f) => ({ ...f }))
    .sort((a, b) => a.date.localeCompare(b.date));
  deep.omittedFirstSeen = firstSeen.length - deep.firstSeen.length;
  deep.speeds = [...timings.values()]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.rates.length >= 50)
    .map((s) => ({
      id: s.id,
      n: s.rates.length,
      median: quantile(s.rates, 0.5),
      p25: quantile(s.rates, 0.25),
      p75: quantile(s.rates, 0.75),
      wait: quantile(s.waits, 0.5),
    }))
    .sort((a, b) => b.median - a.median);
  deep.months = [...months.values()];
  const hours = Array<number>(24).fill(0);
  for (const day of deep.hours) for (let h = 0; h < 24; h++) hours[h]! += day[h]!;
  deep.weekendShare = records
    ? [...deep.hours[0]!, ...deep.hours[6]!].reduce((a, b) => a + b, 0) / records
    : 0;
  let longestStreak = 0,
    run = 0,
    previous: string | undefined;
  for (const date of [...activity.keys()].sort()) {
    run = previous && nextDay(previous) === date ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = date;
  }
  let streak = 0;
  for (
    let date = activity.has(end) ? end : nextDay(end, -1);
    activity.has(date);
    date = nextDay(date, -1)
  )
    streak++;
  for (const day of days) day.output = byDate.get(day.date)?.output ?? 0;
  const recap: Recap = {
    period,
    start,
    end,
    timeZone: index.timeZone,
    days,
    models: sorted(models.values(), (a, b) => b.total - a.total),
    tools: sorted(tools.values(), (a, b) => b.records - a.records),
    weeks: [...weeks]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, families]) => ({ date, families })),
    records,
    aggregateRecords,
    output,
    total,
    outputKnown,
    totalKnown,
    sessions: sessions.size,
    sessionKnown,
    streak,
    longestStreak,
    busiestHour: hours.indexOf(Math.max(...hours)),
    busiestDay:
      [...days].sort((a, b) => b.records - a.records || a.date.localeCompare(b.date))[0]?.date ??
      end,
    lateNightShare: records ? hours.slice(0, 5).reduce((a, b) => a + b, 0) / records : 0,
    priced,
    usd,
    usdHigh,
    cacheScenarioRecords,
    rulesAsOf: now.slice(0, 10),
    deep,
    explorer: {
      modelSessions: Object.fromEntries([...modelSessions].map(([id, s]) => [id, s.size])),
      days: days.map((d) => ({
        date: d.date,
        records: d.records,
        total: byDate.get(d.date)?.total ?? 0,
        usd: byDate.get(d.date)?.priced
          ? byDate.get(d.date)!.usd
          : d.records === 0
            ? "0"
            : undefined,
      })),
    },
  };
  if (index.sources)
    recap.sourceCoverage = index.sources
      .filter((s) => s.detected)
      .map((s) => ({
        name: s.name,
        role: s.role ?? "usage",
        status:
          s.role === "attribution"
            ? "Attribution only"
            : recap.tools.some((t) => t.id === s.adapterId && t.total > 0)
              ? "Tokens in this period"
              : s.supported
                ? "No collected tokens in this period"
                : "Detected, not collected",
      }));
  return recap;
}
