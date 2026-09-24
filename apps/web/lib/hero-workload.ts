import rawFixture from "./generated/hero-workload.json";
import { formatUsd } from "./money-display";

/**
 * The homepage hero's anonymized real workload, as the hero reads it.
 *
 * `generated/hero-workload.json` is written by `scripts/build-hero-fixture.mjs`,
 * which replays a real local history with the production engine against real
 * catalog targets and keeps aggregates only. Nothing here computes a result:
 * this module turns the engine's figures into the words and shapes the hero
 * shows, so the copy can be tested without a browser.
 */

export interface HeroDay {
  date: string;
  events: number;
}

export interface HeroCrossing {
  date: string;
  demand: string;
  included: string;
}

interface HeroTargetBase {
  id: string;
  label: string;
  catalogName: string;
  provider: string;
  kind: "subscription" | "api";
  mode: "exact" | "translated";
  price?: { amount: string; interval: string } | undefined;
  reference: string;
  served: number;
  unavailable: number;
  undecided: number;
  models: {
    recorded: number;
    translated: readonly { from: string; to: string; events: number }[];
  };
  overPerDay?: readonly number[] | undefined;
}

export type HeroTarget = HeroTargetBase &
  (
    | {
        result: {
          class: "allowance-exhausted";
          allowance: { label: string; amount: string; unit: string; window: string };
          included: number;
          above: number;
          blocked: number;
          overageCost: string;
          totalCost: string;
          crossings: readonly HeroCrossing[];
        };
      }
    | { result: { class: "capacity-unpublished"; established: boolean } }
    | { result: { class: "published-rate"; cost: string; established: boolean } }
  );

export interface HeroWorkload {
  fixtureVersion: number;
  label: string;
  source: string;
  engineVersion: string;
  methodologyVersion: string;
  catalogVersion: string;
  rulesAsOf: string;
  workload: {
    recordedEvents: number;
    replayedEvents: number;
    unresolvedEvents: number;
    sessions: number;
    projects: number;
    activeDays: number;
    from: string;
    to: string;
    rangeDays: number;
    knownTokens: number;
    cacheReadTokens: number;
    modelMix: readonly { name: string; events: number }[];
    days: readonly HeroDay[];
  };
  targets: readonly HeroTarget[];
}

export function loadHeroWorkload(): HeroWorkload {
  return rawFixture as unknown as HeroWorkload;
}

const count = new Intl.NumberFormat("en-US");
const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const yearFormat = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" });

export function formatCount(value: number): string {
  return count.format(value);
}

/** "Aug 23", read as a UTC calendar day: the fixture carries nothing finer. */
export function formatDay(date: string): string {
  return dayFormat.format(new Date(`${date}T00:00:00Z`));
}

export function formatYear(date: string): string {
  return yearFormat.format(new Date(`${date}T00:00:00Z`));
}

/** "3.12B", "840M": token magnitudes, never a false precision. */
export function formatTokens(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

/** Splits "$1,793.32" into "$1,793" and ".32" so the cents can sit smaller. */
export function splitMoney(amount: string): { whole: string; cents: string } {
  const exact = formatUsd(amount) ?? `$${amount}`;
  const [whole = "$0", cents = "00"] = exact.split(".");
  return { whole, cents: `.${cents}` };
}

export function formatMoney(amount: string): string {
  const { whole, cents } = splitMoney(amount);
  return cents === ".00" ? whole : `${whole}${cents}`;
}

export function formatPercent(part: number, whole: number, digits?: number): string {
  if (whole === 0) return "0%";
  const share = (part / whole) * 100;
  if (share > 0 && share < 1) return "<1%";
  return `${share.toFixed(digits ?? (share >= 10 ? 0 : 1))}%`;
}

export interface HeroLayer {
  key: "resolution" | "rules" | "limits";
  label: string;
  value: string;
  /** The layer's reading is a limitation, not a completed check. */
  open: boolean;
}

export interface HeroLedgerRow {
  label: string;
  value: string;
  note?: string | undefined;
}

export interface HeroTargetView {
  id: string;
  label: string;
  provider: string;
  kindLabel: string;
  priceLabel: string;
  replayClass: "Exact replay" | "Translated replay";
  mapping: readonly { from: string; to: string }[];
  layers: readonly [HeroLayer, HeroLayer, HeroLayer];
  crossed: boolean;
  result: {
    status: readonly { text: string; tone: "signal" | "open" }[];
    figure: { whole: string; cents?: string | undefined; unit?: string | undefined };
    caption: string;
    sentence: string;
    ledger: readonly HeroLedgerRow[];
  };
  tape: {
    title: string;
    text: string;
    /** What the tape can show for this target, in one line. */
    headline: string;
    legend: readonly {
      key: "load" | "above" | "crossing" | "reset" | "peak" | "priced";
      text: string;
    }[];
    /** Share of each day's events billed above the allowance, 0 to 1. */
    above: readonly number[];
    crossings: readonly { index: number; dayIndex: number; date: string }[];
    resets: readonly { dayIndex: number; date: string }[];
    peakDayIndex: number | undefined;
    detail: { kicker: string; rows: readonly HeroLedgerRow[] };
  };
  readout: string;
  announcement: string;
}

function priceLabelOf(target: HeroTarget): string {
  if (target.kind === "api") return "Published list prices";
  if (target.price === undefined) return "Price not published";
  return `${formatMoney(target.price.amount)} / ${target.price.interval}`;
}

function groupedMapping(target: HeroTarget): { from: string; to: string }[] {
  const byTarget = new Map<string, { names: string[]; events: number }>();
  for (const row of target.models.translated) {
    const entry = byTarget.get(row.to) ?? { names: [], events: 0 };
    entry.names.push(row.from);
    entry.events += row.events;
    byTarget.set(row.to, entry);
  }
  return [...byTarget.entries()]
    .sort((a, b) => b[1].events - a[1].events)
    .map(([to, entry]) => ({ from: entry.names.join(", "), to }));
}

function peakDay(days: readonly HeroDay[]): number | undefined {
  let best: number | undefined;
  days.forEach((day, index) => {
    if (day.events === 0) return;
    if (best === undefined || day.events > (days[best]?.events ?? 0)) best = index;
  });
  return best;
}

/**
 * The words and shapes for one target, from the engine's figures only. Each
 * result class says what StackReplay can determine for that kind of target and
 * nothing more: a crossing only where a numeric allowance exists, a price only
 * where the catalog publishes one, and "not published" where it does not.
 */
export function heroTargetView(hero: HeroWorkload, target: HeroTarget): HeroTargetView {
  const workload = hero.workload;
  const days = workload.days;
  const replayed = formatCount(workload.replayedEvents);
  const translated = target.mode === "translated";
  const mapping = translated ? groupedMapping(target) : [];
  const targetModels = new Set(target.models.translated.map((row) => row.to)).size;
  const recordedModels = target.models.recorded;
  const peak = peakDay(days);
  const peakDate = peak === undefined ? undefined : days[peak];
  const resolution: HeroLayer = translated
    ? {
        key: "resolution",
        label: "Model resolution",
        value: `${recordedModels} → ${targetModels} mapped`,
        open: false,
      }
    : target.kind === "api"
      ? {
          key: "resolution",
          label: "Model resolution",
          value: `${recordedModels}/${recordedModels} priced`,
          open: false,
        }
      : {
          key: "resolution",
          label: "Model resolution",
          value: `${recordedModels}/${recordedModels} run`,
          open: false,
        };
  const rules: HeroLayer =
    target.kind === "api"
      ? { key: "rules", label: "Pricing", value: "List rates", open: false }
      : { key: "rules", label: "Plan rules", value: "Applied", open: false };
  const base = {
    id: target.id,
    label: target.label,
    provider: target.provider,
    kindLabel: target.kind === "api" ? "Direct API" : "Subscription",
    priceLabel: priceLabelOf(target),
    replayClass: translated ? ("Translated replay" as const) : ("Exact replay" as const),
    mapping,
  };

  if (target.result.class === "allowance-exhausted") {
    const result = target.result;
    const first = result.crossings[0];
    const overage = splitMoney(result.overageCost);
    const allowance = formatMoney(result.allowance.amount);
    const crossings = result.crossings.map((crossing, index) => ({
      index: index + 1,
      dayIndex: days.findIndex((day) => day.date === crossing.date),
      date: crossing.date,
    }));
    const resets = days
      .map((day, dayIndex) => ({ dayIndex, date: day.date }))
      .filter((entry) => entry.dayIndex > 0 && entry.date.endsWith("-01"));
    const over = target.overPerDay ?? [];
    const firstDate = first === undefined ? "" : formatDay(first.date);
    return {
      ...base,
      layers: [
        resolution,
        rules,
        {
          key: "limits",
          label: "Limit / reset",
          value: `${result.crossings.length} crossed`,
          open: false,
        },
      ],
      crossed: result.crossings.length > 0,
      result: {
        status: [{ text: "Allowance exhausted", tone: "signal" }],
        figure: { whole: overage.whole, cents: overage.cents },
        caption: "modeled overage above the plan",
        sentence: `First crossing ${firstDate}. ${formatCount(result.included)} of ${replayed} events fit inside the monthly allowance; ${formatCount(result.above)} were billed above it.`,
        ledger: [
          {
            label: "Plan",
            value: `${base.priceLabel} · ${allowance} of AI credits`,
            note: "Included credits per calendar month (UTC), from the catalog.",
          },
          {
            label: "Binding rule",
            value: "Monthly AI credit pool",
            note: `Exhausted in ${result.crossings.length} of ${result.crossings.length} months; paid overage continues after it.`,
          },
          {
            label: "Evidence",
            value: `${recordedModels}/${recordedModels} models run · deterministic`,
            note: "Every replayed event was decided by the plan's own rules.",
          },
        ],
      },
      tape: {
        title: "Where does the allowance run out?",
        text: "Each bar is one day of recorded demand. Blue is the demand that arrived after the month's included credits were used up.",
        headline: "Blue = billed above the allowance",
        legend: [
          { key: "load", text: "Within allowance" },
          { key: "above", text: "Billed above allowance" },
          { key: "crossing", text: "Allowance crossing" },
          { key: "reset", text: "Monthly reset (UTC)" },
        ],
        above: days.map((day, index) =>
          day.events === 0 ? 0 : Math.min(1, (over[index] ?? 0) / day.events),
        ),
        crossings,
        resets,
        peakDayIndex: undefined,
        detail: {
          kicker: "Allowance crossings",
          rows: result.crossings.map((crossing, index) => ({
            label: `${String(index + 1).padStart(2, "0")} · ${formatDay(crossing.date)}`,
            value: formatMoney(crossing.demand),
            note: `credit demand that month · ${formatMoney(crossing.included)} included`,
          })),
        },
      },
      readout: `${replayed} events replayed against ${target.label}. The monthly credit pool ran out on ${firstDate}${
        result.crossings.length > 1
          ? ` and again on ${formatDay(result.crossings[result.crossings.length - 1]?.date ?? "")}`
          : ""
      }; everything after each crossing is billed as overage.`,
      announcement: `${target.label}: allowance exhausted. First crossing ${firstDate}. ${formatMoney(result.overageCost)} modeled overage.`,
    };
  }

  if (target.result.class === "published-rate") {
    const cost = splitMoney(target.result.cost);
    return {
      ...base,
      layers: [
        resolution,
        rules,
        { key: "limits", label: "Limit / reset", value: "No allowance", open: false },
      ],
      crossed: false,
      result: {
        status: [{ text: "Published-rate equivalent", tone: "signal" }],
        figure: { whole: cost.whole, cents: cost.cents },
        caption: `recorded demand · ${workload.rangeDays} days`,
        sentence: `Every one of ${replayed} events priced at ${target.provider}'s published API rates for its model. This is not what was paid.`,
        ledger: [
          {
            label: "Pricing",
            value: "Per-token list rates",
            note: "Input, cache reads, cache writes and output priced separately.",
          },
          {
            label: "Allowance",
            value: "None",
            note: "A Direct API has no plan limit to cross, so nothing is refused.",
          },
          {
            label: "Evidence",
            value: `${recordedModels}/${recordedModels} models priced · deterministic`,
            note: "Rates pinned to the catalog as of the rules date.",
          },
        ],
      },
      tape: {
        title: "What would it cost at list price?",
        text: "Each bar is one day of recorded demand. With no allowance there is nothing to run out of; every event is simply priced.",
        headline: "Every event priced at list rates",
        legend: [
          { key: "load", text: "Recorded demand" },
          { key: "priced", text: "Priced at list rates" },
        ],
        above: days.map(() => 0),
        crossings: [],
        resets: [],
        peakDayIndex: undefined,
        detail: {
          kicker: "Cost basis",
          rows: [
            {
              label: "Recorded window",
              value: `${workload.rangeDays} days`,
              note: `${formatDay(workload.from)} to ${formatDay(workload.to)}`,
            },
            {
              label: "Equivalent",
              value: formatMoney(target.result.cost),
              note: "published rates, not an invoice",
            },
          ],
        },
      },
      readout: `${replayed} events replayed against the ${target.provider} API. At published rates the recorded demand comes to ${formatMoney(target.result.cost)}.`,
      announcement: `${target.label}: published-rate equivalent ${formatMoney(target.result.cost)} for the recorded demand.`,
    };
  }

  const price = target.price === undefined ? undefined : splitMoney(target.price.amount);
  const peakRows: HeroLedgerRow[] =
    peakDate === undefined
      ? []
      : [
          {
            label: "Heaviest day",
            value: `${formatDay(peakDate.date)} · ${formatCount(peakDate.events)} events`,
            note: "demand the plan would have had to absorb",
          },
        ];
  return {
    ...base,
    layers: [
      resolution,
      rules,
      { key: "limits", label: "Limit / reset", value: "Not published", open: true },
    ],
    crossed: false,
    result: {
      status: [
        { text: translated ? "Models translated" : "Models mapped", tone: "signal" },
        { text: "Capacity not published", tone: "open" },
      ],
      figure: {
        whole: price?.whole ?? "Unknown",
        cents: price?.cents === ".00" ? undefined : price?.cents,
        unit: target.price === undefined ? undefined : `/ ${target.price.interval}`,
      },
      caption: "fixed plan price",
      sentence: translated
        ? `${target.label} does not run the recorded models. Under the mapping shown, all ${replayed} events route to ${mapping.map((row) => row.to).join(" and ")}. ${target.provider} publishes no numeric allowance, so whether this demand fits cannot be established.`
        : `All ${recordedModels} recorded models run on ${target.label}. ${target.provider} publishes no numeric allowance, so whether ${replayed} events fit cannot be established.`,
      ledger: [
        translated
          ? {
              label: "Translation",
              value: mapping.map((row) => row.to).join(" · "),
              note: "Your mapping, not a claim that the models are equivalent.",
            }
          : {
              label: "Model access",
              value: `${recordedModels} of ${recordedModels} recorded models`,
              note: "Same models, no substitution.",
            },
        {
          label: "Capacity",
          value: "Cannot be established",
          note: `${target.provider} describes limits in words, not numbers.`,
        },
        {
          label: "Evidence",
          value: "Qualitative",
          note: "Model access and price are known; capacity is not.",
        },
      ],
    },
    tape: {
      title: "No published allowance to test.",
      text: `Each bar is one day of recorded demand. ${target.provider} publishes no numeric limit for this plan, so Replay shows the load it would have carried, not where it would stop.`,
      headline: "No published limit to draw",
      legend: [
        { key: "load", text: "Recorded demand" },
        { key: "peak", text: "Heaviest day" },
      ],
      above: days.map(() => 0),
      crossings: [],
      resets: [],
      peakDayIndex: peak,
      detail: { kicker: "Pressure it would absorb", rows: peakRows },
    },
    readout: translated
      ? `${replayed} events replayed against ${target.label} under an explicit model mapping. Price is known; capacity is not published.`
      : `${replayed} events replayed against ${target.label}. Every recorded model runs there; capacity is not published.`,
    announcement: `${target.label}: ${translated ? "models translated" : "models mapped"}, capacity not published, ${price === undefined ? "price unknown" : `${formatMoney(target.price?.amount ?? "0")} per ${target.price?.interval}`}.`,
  };
}
