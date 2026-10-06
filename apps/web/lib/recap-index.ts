import type { CatalogV1 } from "@stackreplay/catalog";
import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { Decimal } from "@stackreplay/replay-engine";
import type { StackReplayExportV1, TextUsageEventV1 } from "@stackreplay/schema";
import {
  outputOf,
  priceRecapEvents,
  type Recap,
  type RecapModel,
  recapActivity,
  resolveRecapModels,
  totalTokensOf,
} from "./recap";
import { localCalendar } from "./recap-calendar";
import { deepRecap, type RecapDeep, recapRoutes, recapSpeedSample } from "./recap-deep";

import { RECAP_INDEX_VERSION } from "./recap-index-version";

export { RECAP_INDEX_VERSION } from "./recap-index-version";

type Ordered<T> = T & { order: number };
export interface RecapIndexDay {
  date: string;
  records: number;
  output: number;
  total: number;
  outputKnown: number;
  totalKnown: number;
  sessionKnown: number;
  sessions: string[];
  models: Ordered<RecapModel & { sessions: string[] }>[];
  tools: Ordered<Recap["tools"][number]>[];
  deep: Omit<RecapDeep, "firstSeen" | "speeds" | "weekendShare" | "months" | "costDays">;
  // Earliest input ordinal keeps stable ties identical even with unsorted exports.
  order: {
    harnesses: Record<string, number>;
    providers: Record<string, number>;
    projects: Record<string, number>;
  };
  speeds: { id: string; order: number; rates: number[]; waits: number[] }[];
  priced: number;
  usd: string;
  usdHigh: string;
  cacheScenarioRecords: number;
}
/** Derived data only: no portable event objects, paths, prompts or responses. */
export interface RecapIndex {
  version: typeof RECAP_INDEX_VERSION;
  timeZone: string;
  catalogVersion: string;
  asOf: string;
  date: string;
  // A future event or aggregate endpoint can invalidate a same-day index.
  validUntil?: string;
  days: RecapIndexDay[];
  activity: [string, number][];
  firstSeen: { id: string; date: string; name?: string }[];
  sources?: StackReplayExportV1["detectedSources"];
}
const addMoney = (a: string, b: string) => new Decimal(a).add(b).toString();

export function buildRecapIndex(
  input: readonly TextUsageEventV1[],
  now: string,
  timeZone: string,
  catalog: CatalogV1 = loadBundledCatalog(),
): RecapIndex {
  const events = resolveRecapModels(input, catalog);
  const local = localCalendar(timeZone);
  const nowMs = Date.parse(now);
  const groups = new Map<string, { events: TextUsageEventV1[]; ordinals: number[] }>();
  const first = new Map<string, string>();
  let validUntil = Infinity;
  events.forEach((e, order) => {
    for (const at of [e.occurredAt, e.requestStartedAt, e.requestEndedAt]) {
      const ms = at ? Date.parse(at) : NaN;
      if (ms > nowMs) validUntil = Math.min(validUntil, ms);
    }
    const id = e.model.canonicalId ?? e.model.rawName;
    // Match the original first-seen comparison, including its offset-bearing ISO semantics.
    if (e.occurredAt <= now && (!first.has(id) || e.occurredAt < first.get(id)!))
      first.set(id, e.occurredAt);
    if (Date.parse(e.occurredAt) > nowMs) return;
    const date = local(e.occurredAt).date;
    const group = groups.get(date) ?? { events: [], ordinals: [] };
    group.events.push(e);
    group.ordinals.push(order);
    groups.set(date, group);
  });
  const days = new Map<string, RecapIndexDay>();
  for (const [date, group] of groups) {
    const deep = deepRecap(group.events, [], local, now);
    const models = new Map<string, Ordered<RecapModel & { sessions: string[] }>>();
    const tools = new Map<string, Ordered<Recap["tools"][number]>>();
    const modelSessions = new Map<string, Set<string>>();
    const sessions = new Set<string>();
    const speeds = new Map<string, RecapIndexDay["speeds"][number]>();
    const order: RecapIndexDay["order"] = { harnesses: {}, providers: {}, projects: {} };
    let total = 0,
      output = 0,
      outputKnown = 0,
      totalKnown = 0,
      sessionKnown = 0;
    group.events.forEach((e, i) => {
      const ordinal = group.ordinals[i]!;
      const n = outputOf(e),
        t = totalTokensOf(e);
      output += n ?? 0;
      total += t ?? 0;
      if (n !== undefined) outputKnown++;
      if (t !== undefined) totalKnown++;
      const id = e.model.canonicalId ?? e.model.rawName;
      const model = e.model.canonicalId ? catalog.models[id] : undefined;
      const row = models.get(id) ?? {
        id,
        name: model?.name ?? e.model.rawName,
        family: model?.developerId ?? "other",
        records: 0,
        output: 0,
        total: 0,
        priced: 0,
        usd: "0",
        usdHigh: "0",
        cacheScenarioRecords: 0,
        order: ordinal,
        sessions: [],
      };
      row.records++;
      row.output += n ?? 0;
      row.total += t ?? 0;
      models.set(id, row);
      const tool = tools.get(e.source.adapterId) ?? {
        id: e.source.adapterId,
        records: 0,
        output: 0,
        total: 0,
        order: ordinal,
      };
      tool.records++;
      tool.output += n ?? 0;
      tool.total += t ?? 0;
      tools.set(tool.id, tool);
      if (e.source.nativeSessionHash) {
        const key = `${e.source.adapterId}:${e.source.nativeSessionHash}`;
        sessions.add(key);
        sessionKnown++;
        const set = modelSessions.get(id) ?? new Set<string>();
        set.add(key);
        modelSessions.set(id, set);
      }
      const routes = recapRoutes(e);
      order.harnesses[routes.harness] ??= ordinal;
      order.providers[routes.provider] ??= ordinal;
      if (e.projectHash) order.projects[e.projectHash] ??= ordinal;
      const timing = recapSpeedSample(e);
      if (timing) {
        const sample = speeds.get(id) ?? { id, order: ordinal, rates: [], waits: [] };
        sample.rates.push(timing.rate);
        sample.waits.push(timing.wait);
        speeds.set(id, sample);
      }
    });
    for (const [id, row] of models) row.sessions = [...(modelSessions.get(id) ?? [])];
    const {
      firstSeen: _first,
      speeds: _speeds,
      weekendShare: _weekend,
      months: _months,
      costDays: _costDays,
      ...metrics
    } = deep;
    days.set(date, {
      date,
      records: group.events.length,
      total,
      output,
      totalKnown,
      outputKnown,
      sessionKnown,
      sessions: [...sessions],
      models: [...models.values()],
      tools: [...tools.values()],
      deep: metrics,
      order,
      speeds: [...speeds.values()],
      priced: 0,
      usd: "0",
      usdHigh: "0",
      cacheScenarioRecords: 0,
    });
  }
  const selected = [...groups.values()].flatMap((g) => g.events);
  priceRecapEvents(selected, catalog, now, (e, cost) => {
    const day = days.get(local(e.occurredAt).date)!;
    const model = day.models.find((m) => m.id === e.model.canonicalId)!;
    day.priced++;
    model.priced++;
    day.usd = addMoney(day.usd, cost.low);
    day.usdHigh = addMoney(day.usdHigh, cost.high);
    model.usd = addMoney(model.usd, cost.low);
    model.usdHigh = addMoney(model.usdHigh, cost.high);
    if (cost.scenario) {
      day.cacheScenarioRecords++;
      model.cacheScenarioRecords++;
    }
    if (cost.savings !== undefined) {
      day.deep.cacheSavings = addMoney(day.deep.cacheSavings, cost.savings);
      day.deep.cacheSavingsRecords++;
    }
  });
  return {
    version: RECAP_INDEX_VERSION,
    timeZone,
    catalogVersion: catalog.catalogVersion,
    asOf: now,
    date: local(now).date,
    ...(Number.isFinite(validUntil) ? { validUntil: new Date(validUntil).toISOString() } : {}),
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    activity: [...recapActivity(events, now, local).days].sort(([a], [b]) => a.localeCompare(b)),
    firstSeen: [...first].map(([id, at]) => ({
      id,
      date: local(at).date,
      ...(catalog.models[id] ? { name: catalog.models[id]!.name } : {}),
    })),
  };
}

export { buildRecapFromIndex } from "./recap-index-read";
