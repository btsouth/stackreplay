import type { Recap } from "./recap";

export const FAMILIES: Record<string, string> = {
  anthropic: "#e8956b",
  openai: "#4fd6c4",
  deepseek: "#6f9dff",
  "z-ai": "#b7e05a",
  xiaomi: "#f4c44e",
  alibaba: "#ff7aa8",
  meta: "#9aa7b8",
  other: "#7d8790",
  google: "#f4c44e",
  xai: "#9aa7b8",
};
export const familyColor = (family: string) => FAMILIES[family] ?? FAMILIES.other;
export const modelName = (name: string) => name.replace(" (legacy name, model retired)", "");
export const integer = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
/** Three significant figures, with rollover after rounding. */
export function compact(n: number): string {
  for (const [unit, suffix] of [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ] as const) {
    if (n >= unit) {
      const value = Number((n / unit).toPrecision(3));
      if (value >= 1000) return compact(value * unit);
      return `${value}${suffix}`;
    }
  }
  return integer(n);
}
export function dollars(n: string | number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n));
}
export function dateLabel(date: string, year = false): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(year ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}
export function presentation(r: Recap) {
  const models = r.models
    .filter((m) => m.total > 0)
    .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
  const resolved = models.filter((m) => m.family !== "other" && m.name !== "Other / Unresolved");
  const top = resolved.slice(0, 12);
  const ids = new Set(top.map((m) => m.id));
  const tail = models.filter((m) => !ids.has(m.id));
  const speeds = [...(r.deep?.speeds ?? [])].sort((a, b) => b.median - a.median);
  const fastest = speeds[0],
    slowest = speeds.at(-1),
    workhorse = [...speeds].sort((a, b) => b.n - a.n)[0];
  const speedAxis = Math.max(40, Math.ceil(Math.max(0, ...speeds.map((s) => s.p75)) / 40) * 40);
  const names = new Map(r.models.map((m) => [m.id, modelName(m.name)]));
  const colors = new Map(r.models.map((m) => [m.id, familyColor(m.family)]));
  for (const m of r.deep?.firstSeen ?? []) if (m.name) names.set(m.id, modelName(m.name));
  const days = r.explorer?.days ?? r.days.map((d) => ({ ...d, total: 0, usd: undefined }));
  const costs = new Map(r.deep?.costDays.map((d) => [d.date, Number(d.usd)]) ?? []);
  const costDays = days.map((d) => ({ date: d.date, value: costs.get(d.date) ?? 0 }));
  const peakCost = [...costDays].sort((a, b) => b.value - a.value)[0];
  const topCost = [...models]
    .filter((m) => m.priced)
    .sort((a, b) => Number(b.usd) - Number(a.usd))[0];
  const peakHour = r.deep
    ? Array.from({ length: 24 }, (_, h) =>
        r.deep!.hours.reduce((sum, d) => sum + (d[h] ?? 0), 0),
      ).reduce((best, n, h, all) => (n > (all[best] ?? 0) ? h : best), 0)
    : r.busiestHour;
  return {
    models,
    top,
    tail,
    speeds,
    fastest,
    slowest,
    workhorse,
    speedAxis,
    names,
    colors,
    days,
    costDays,
    peakCost,
    topCost,
    peakHour,
  };
}
