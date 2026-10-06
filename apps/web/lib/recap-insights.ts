import type { CombinedActivity } from "./github-activity";
import type { Recap } from "./recap";
import { nextDay } from "./recap-calendar";
import {
  compact,
  dateLabel,
  dollars,
  integer,
  modelDisplayName,
  unresolvedModel,
} from "./terminal-presentation";
import type { PaidFigure } from "./use-paid-multiplier";

export interface RecapInsight {
  id: string;
  headline: string;
  figure: string;
  detail: string;
  score: number;
}
// Keep financial lower bounds exact without pulling pricing code into the overview.
function decimalRatio(value: string | undefined) {
  if (!value || !/^\d+(?:\.\d+)?$/.test(value)) return undefined;
  const [whole = "0", fraction = ""] = value.split(".");
  return { units: BigInt(whole + fraction), scale: 10n ** BigInt(fraction.length) };
}
const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Facts from the displayed period only. IDs start with a family; one winner per family. */
export function recapInsightCandidates(
  r: Recap,
  github?: CombinedActivity,
  paid?: PaidFigure,
): RecapInsight[] {
  const candidates: RecapInsight[] = [];
  const add = (id: string, headline: string, figure: string, detail: string, score: number) => {
    if (headline.length <= 90 && !/[–—]/.test(headline))
      candidates.push({ id, headline, figure, detail, score });
  };
  if (!r.records || !r.days.length) return candidates;
  const days = [...r.days]
    .filter((d) => d.date >= r.start && d.date <= r.end)
    .sort((a, b) => order(a.date, b.date));
  let run = 0,
    longest = 0,
    previous: string | undefined;
  for (const d of days) {
    run = d.records > 0 ? (previous && nextDay(previous) === d.date ? run + 1 : 1) : 0;
    longest = Math.max(longest, run);
    previous = d.date;
  }
  const active = new Set(days.filter((d) => d.records > 0).map((d) => d.date));
  let current = 0;
  for (
    let d = active.has(r.end) ? r.end : nextDay(r.end, -1);
    d >= r.start && active.has(d);
    d = nextDay(d, -1)
  )
    current++;
  const wholePeriod =
    days.length === Math.round((Date.parse(r.end) - Date.parse(r.start)) / 86400000) + 1 &&
    longest === days.length;
  if (longest >= 2)
    add(
      "streak:ai",
      wholePeriod
        ? `You used AI every day of this ${integer(longest)}-day period`
        : `${integer(longest)} days in a row with AI in this period`,
      `${integer(longest)} days`,
      wholePeriod
        ? "EVERY DAY OF THIS PERIOD"
        : current === longest
          ? "CURRENT AND LONGEST RUN THIS PERIOD"
          : `LONGEST RUN · CURRENT ${integer(current)} DAYS`,
      wholePeriod ? 100 : 95 + Math.min(longest, 30) / 10,
    );

  const models = r.models
    .filter((m) => m.records > 0 && m.family !== "other" && !unresolvedModel(m.id, m.name))
    .sort((a, b) => b.total - a.total || order(a.id, b.id));
  const top = models[0];
  if (
    top &&
    r.total > 0 &&
    top.total > 0 &&
    top.total <= r.total &&
    Number.isSafeInteger(top.total) &&
    Number.isSafeInteger(r.total)
  ) {
    // A lower bound stays true even when a rounded percentage would overstate the share.
    const share = Number((BigInt(top.total) * 100n) / BigInt(r.total));
    if (share >= 20)
      add(
        "model:leader",
        `${modelDisplayName(top.id, top.name)} accounted for ${share === 100 ? "" : "at least "}${share}% of your tokens`,
        `${share}%`,
        `${compact(top.total)} OF ${compact(r.total)} TOKENS`,
        80 + share / 10,
      );
  }
  if (models.length >= 3)
    add(
      "variety:models",
      `You used ${integer(models.length)} named models in this period`,
      integer(models.length),
      "MODELS WITH LOGGED ACTIVITY",
      55 + Math.min(models.length, 20),
    );
  const ids = new Set(models.map((m) => m.id));
  const first = new Set(
    r.deep?.firstSeen
      .filter((m) => ids.has(m.id) && m.date >= r.start && m.date <= r.end)
      .map((m) => m.id),
  );
  if (r.period !== "all" && first.size >= 2)
    add(
      "variety:new",
      `${integer(first.size)} models first appeared in your logs this period`,
      integer(first.size),
      "FIRST LOGGED USE · NOT RELEASE DATES",
      70 + Math.min(first.size, 10),
    );

  // Monday-Sunday weeks only. Empty complete weeks count toward the usual week.
  const weeks = r.weeks
    .filter((w) => w.date >= r.start && nextDay(w.date, 6) <= r.end)
    .map((w) => ({ date: w.date, total: Object.values(w.families).reduce((a, b) => a + b, 0) }));
  if (weeks.length >= 3 && weeks.every((week) => Number.isSafeInteger(week.total))) {
    const values = weeks.map((w) => w.total).sort((a, b) => a - b);
    const median =
      (values[Math.floor((values.length - 1) / 2)]! + values[Math.floor(values.length / 2)]!) / 2;
    const best = [...weeks].sort((a, b) => b.total - a.total || order(a.date, b.date))[0]!;
    const middleSum =
      BigInt(values[Math.floor((values.length - 1) / 2)]!) +
      BigInt(values[Math.floor(values.length / 2)]!);
    const tenths = middleSum > 0n ? (BigInt(best.total) * 20n) / middleSum : 0n;
    const lower = Number(tenths) / 10;
    if (median > 0 && tenths <= BigInt(Number.MAX_SAFE_INTEGER) && lower >= 1.5)
      add(
        "week:peak",
        `Your busiest full week (${dateLabel(best.date)}) used at least ${lower.toFixed(1)}x the usual tokens`,
        `${lower.toFixed(1)}×`,
        `USUAL = MEDIAN OF ${weeks.length} FULL WEEKS`,
        82,
      );
  }

  // Aggregate session timestamps cannot establish when individual calls happened.
  const timedTools = new Set(["claude-code", "codex", "opencode", "command-code", "t3-code"]);
  if (r.deep && r.tools.every((t) => t.records === 0 || timedTools.has(t.id))) {
    const totalHours = r.deep.hours.flat().reduce((a, b) => a + b, 0);
    const late = r.deep.hours.reduce((sum, d) => sum + d.slice(0, 5).reduce((a, b) => a + b, 0), 0);
    if (totalHours === r.records && late >= 10 && late / r.records >= 0.1)
      add(
        "night:calls",
        `${integer(late)} model calls landed between midnight and 5 AM`,
        integer(late),
        "LOCAL TIME · CALLS, NOT NIGHTS",
        76,
      );
  }

  // Reject a combined result from another period or with a different token history.
  if (
    github &&
    r.explorer &&
    github.days.length === days.length &&
    github.days.every(
      (d, i) =>
        d.date === days[i]?.date &&
        d.tokens === r.explorer?.days.find((a) => a.date === d.date)?.total,
    )
  ) {
    const contributions = github.days.reduce((sum, d) => sum + d.contributions, 0);
    if (contributions > 0 && r.total > 0)
      add(
        "github:alongside",
        `${integer(contributions)} GitHub contributions alongside ${compact(r.total)} AI tokens`,
        integer(contributions),
        "SAME DATES · ACTIVITY, NOT CAUSATION",
        99,
      );
    let joint = 0,
      longestJoint = 0;
    for (const d of github.days) {
      joint = d.tokens > 0 && d.contributions > 0 ? joint + 1 : 0;
      longestJoint = Math.max(joint, longestJoint);
    }
    if (longestJoint >= 7)
      add(
        "github:streak",
        `AI tokens and GitHub contributions overlapped for ${integer(longestJoint)} days in a row`,
        `${integer(longestJoint)} days`,
        "LONGEST JOINT RUN THIS PERIOD",
        88,
      );
    const best = [...github.days].sort(
      (a, b) => b.contributions - a.contributions || order(a.date, b.date),
    )[0];
    if (best && best.contributions >= 10 && best.tokens > 0)
      add(
        "github:day",
        `${integer(best.contributions)} GitHub contributions on ${dateLabel(best.date)}, with AI activity too`,
        integer(best.contributions),
        "MOST CONTRIBUTIONS IN THIS PERIOD",
        84,
      );
  }
  const savings = decimalRatio(r.deep?.cacheSavings);
  const wholeSavings = savings ? savings.units / savings.scale : 0n;
  if (
    wholeSavings >= 1n &&
    wholeSavings <= BigInt(Number.MAX_SAFE_INTEGER) &&
    r.deep?.cacheSavingsRecords
  )
    add(
      "value:cache",
      `Cache reads saved at least ${dollars(Number(wholeSavings))} at list prices`,
      dollars(Number(wholeSavings)),
      "ESTIMATE FOR MATCHED CACHE READS",
      90,
    );
  const monthly = decimalRatio(paid?.monthlyUsd);
  const value = decimalRatio(r.usd);
  const ratio =
    monthly && value && monthly.units > 0n && days.length > 0
      ? (value.units * monthly.scale * 304n) /
        (value.scale * monthly.units * BigInt(days.length) * 10n)
      : 0n;
  if (
    paid &&
    monthly &&
    monthly.units > 0n &&
    paid.days === days.length &&
    r.priced > 0 &&
    ratio <= BigInt(Number.MAX_SAFE_INTEGER) &&
    ratio >= 2n
  )
    add(
      "value:paid",
      `Your API list-price value was at least ${integer(Number(ratio))}x your plan cost`,
      `${integer(Number(ratio))}×`,
      "ESTIMATE · PLAN COST PRORATED OVER THIS PERIOD",
      92,
    );
  return candidates.sort((a, b) => b.score - a.score || order(a.id, b.id));
}

export function recapInsights(
  r: Recap,
  github?: CombinedActivity,
  paid?: PaidFigure,
): RecapInsight[] {
  const families = new Set<string>();
  return recapInsightCandidates(r, github, paid)
    .filter((insight) => {
      const family = insight.id.split(":")[0]!;
      if (families.has(family)) return false;
      families.add(family);
      return true;
    })
    .slice(0, 4);
}
