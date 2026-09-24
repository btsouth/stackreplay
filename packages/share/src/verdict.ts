import { isoDateV1Schema } from "@stackreplay/schema";
import { z } from "zod";
import { formatUsd, formatUsdWhole } from "./money.js";

/**
 * Replay verdicts: the one sentence a result leads with.
 *
 * A replay result used to open with the engine's state ("full coverage ruled
 * out", "capacity not quantified"), so the biggest thing on screen was what
 * StackReplay could not say. A verdict leads with what it can: a date, a dollar
 * amount, a count of the person's own calls, or a bounded share, and then says
 * plainly what stays open.
 *
 * Three rules keep it honest:
 *
 * - A verdict is composed only from `VerdictFactsV1`, a small aggregate record
 *   the application derives from the engine's own projection and a share link
 *   carries as it is. The in-app result, the public page and the social image
 *   therefore print the same sentence for the same replay.
 * - Templates are deterministic. Nothing is generated, ranked or inferred: a
 *   count the facts do not carry is never stated, and an undecided call is
 *   never assigned to an outcome. Where undecided calls leave a share open, the
 *   verdict gives both ends of the range.
 * - Exact and Translated stay unmistakable. A translated verdict names its
 *   substitution and never implies the substitute models are equivalent.
 */

export const VERDICT_FACTS_VERSION = 1;

const count = z.number().int().nonnegative();
/** An exact decimal amount of US dollars, as the engine wrote it. */
const amount = z.string().regex(/^\d{1,24}(\.\d{1,40})?$/u);

export const verdictFactsV1Schema = z.strictObject({
  version: z.literal(VERDICT_FACTS_VERSION),
  target: z.strictObject({
    kind: z.enum(["subscription", "api"]),
    /** "Copilot Pro+", or "Anthropic API". */
    name: z.string().min(1).max(80),
    /** "GitHub", "Anthropic". */
    providerName: z.string().min(1).max(60),
    price: z.strictObject({ amount, interval: z.enum(["month", "year"]) }).optional(),
    /**
     * `numeric`: the plan publishes numeric limits the replay simulated.
     * `unpublished`: the plan states its limits only qualitatively.
     * `not-applicable`: a Direct API target has no allowance.
     */
    capacity: z.enum(["numeric", "unpublished", "not-applicable"]),
  }),
  mode: z.enum(["exact", "translated"]),
  /** Model display names, source to substitute, with the calls each moved. */
  substitutions: z
    .array(
      z.strictObject({
        from: z.string().min(1).max(80),
        to: z.string().min(1).max(80),
        calls: count,
      }),
    )
    .max(16),
  scope: z.strictObject({
    /**
     * `all`: every recorded call. `resolved`: the calls whose model identity
     * resolves. `source`: one tool's calls. `target-models`: the calls on
     * models the target runs.
     */
    kind: z.enum(["all", "resolved", "source", "target-models"]),
    /** A short noun phrase for a source slice, e.g. "Claude Code". */
    label: z.string().min(1).max(60).optional(),
    recordedCalls: count,
  }),
  calls: z.strictObject({
    /** Calls replayed, the denominator of every other count here. */
    total: count,
    withinAllowance: count,
    overage: count,
    blocked: count,
    unavailable: count,
    undecided: count,
    /** Of the undecided: calls whose model ID is not recognized. */
    unrecognized: count,
  }),
  /** Makers of the models the target runs, by display name. */
  servedMakers: z.array(z.string().min(1).max(60)).max(12),
  /** Makers (or model names) of the models it does not run. */
  unavailableMakers: z.array(z.string().min(1).max(60)).max(12),
  /**
   * How the two lists above name things: by maker, or by model when one maker
   * is on both sides and naming makers would say nothing.
   */
  namedBy: z.enum(["maker", "model"]).default("maker"),
  /** Calendar days from the first to the last replayed call, inclusive. */
  periodDays: count.optional(),
  runOut: z
    .strictObject({
      limit: z.enum(["credits", "tokens", "requests"]),
      behaviour: z.enum(["overage", "refused", "held", "recorded"]),
      /** Distinct calendar dates the allowance ran out on, with the day index. */
      dates: z
        .array(z.strictObject({ date: isoDateV1Schema, day: count }))
        .min(1)
        .max(12),
      windows: count,
    })
    .optional(),
  money: z.strictObject({
    planPrice: amount.optional(),
    overage: amount.optional(),
    /** A Direct API list-price equivalent for the whole replayed scope. */
    apiCost: amount.optional(),
  }),
});

export type VerdictFactsV1 = z.infer<typeof verdictFactsV1Schema>;

export interface VerdictV1 {
  /** Replay mode, in the words every surface uses. */
  modeLabel: "Exact replay" | "Translated replay";
  /** The first sentence (sometimes two): the answer. */
  headline: string;
  /** What follows: context, scope, what stays open. Each ends in one stop. */
  support: string[];
  /** The one figure a surface sets large, with its caption. */
  figure: { value: string; minor?: string; caption: string; kind: "money" | "date" | "share" };
  /** A second figure beside it, when the verdict has one. */
  secondary?: { value: string; caption: string } | undefined;
  /** Both ends of the served share when undecided calls leave it open. */
  bound?: { low: number; high: number } | undefined;
  /** A compact form for a Compare column heading or a social card. */
  short: string;
}

const NUMBER = new Intl.NumberFormat("en-US");
const n = (value: number): string => NUMBER.format(value);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-08-23` -> `Aug 23`. */
export function verdictDay(date: string): string {
  const [, month, day] = date.split("-");
  return `${MONTHS[Number(month) - 1] ?? month} ${Number(day)}`;
}

function calls(value: number): string {
  return `${n(value)} ${value === 1 ? "call" : "calls"}`;
}

/** A share of calls, precise enough to be different from its neighbour. */
export function shareText(share: number): string {
  const percent = share * 100;
  if (percent === 0) return "0%";
  if (percent === 100) return "100%";
  if (percent < 1) return `${percent.toFixed(2)}%`;
  if (percent > 99 && percent < 100) return `${Math.min(percent, 99.9).toFixed(1)}%`;
  return `${percent.toFixed(1)}%`;
}

/** "53.0–53.1%", widening the precision until the two ends differ. */
export function boundText(low: number, high: number): string {
  if (low === high) return shareText(low);
  for (const digits of [1, 2, 3]) {
    const a = (low * 100).toFixed(digits);
    const b = (high * 100).toFixed(digits);
    if (a !== b) return `${a}–${b}%`;
  }
  return `${(low * 100).toFixed(3)}–${(high * 100).toFixed(3)}%`;
}

function list(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** At most three names; the rest are counted. */
function capped(names: readonly string[]): string {
  if (names.length <= 3) return list(names);
  return `${names.slice(0, 2).join(", ")} and ${n(names.length - 2)} other models`;
}

/** "Anthropic models", or model names as they are when models name the list. */
function runPhrase(facts: VerdictFactsV1): string {
  return facts.namedBy === "maker"
    ? `${list(facts.servedMakers)} models`
    : capped(facts.servedMakers);
}

/**
 * The models a target does not run: "OpenAI and DeepSeek models it doesn't
 * offer" when makers name them, "Claude Opus 4.8, which it doesn't offer" when
 * models do. Without a subject, the phrase says they aren't available there.
 */
function notRun(facts: VerdictFactsV1, subject?: string): string {
  const names = facts.unavailableMakers;
  const tail =
    subject === undefined
      ? "models that aren't available there"
      : `models ${subject} doesn't offer`;
  if (names.length === 0) return tail;
  if (facts.namedBy === "maker") return `${list(names)} ${tail}`;
  if (subject !== undefined) return `${capped(names)}, which ${subject} doesn't offer`;
  return `${capped(names)}, which ${names.length === 1 ? "isn't" : "aren't"} available there`;
}

function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function priceText(facts: VerdictFactsV1): string | undefined {
  const price = facts.target.price;
  if (price === undefined) return undefined;
  const whole = formatUsdWhole(price.amount);
  const exact = formatUsd(price.amount);
  const shown = exact?.endsWith(".00") === true ? whole : exact;
  return shown === undefined ? undefined : `${shown}/${price.interval}`;
}

function limitNoun(limit: NonNullable<VerdictFactsV1["runOut"]>["limit"]): string {
  return limit === "credits"
    ? "credits"
    : limit === "tokens"
      ? "token allowance"
      : "request allowance";
}

function runOutDates(runOut: NonNullable<VerdictFactsV1["runOut"]>): string {
  const [first, second, ...rest] = runOut.dates;
  if (first === undefined) return "";
  const lead = `${verdictDay(first.date)} (day ${n(first.day)})`;
  if (second === undefined) return lead;
  if (rest.length === 0) return `${lead} and again on ${verdictDay(second.date)}`;
  return `${lead}, again on ${verdictDay(second.date)} and ${rest.length === 1 ? "once more" : `${n(rest.length)} more times`} after that`;
}

/** Undecided calls, said once, with the reason when it is known. */
function undecidedSentence(facts: VerdictFactsV1): string | undefined {
  const { undecided, unrecognized, total } = facts.calls;
  if (undecided === 0) return undefined;
  const share = shareText(total === 0 ? 0 : undecided / total);
  if (unrecognized === undecided)
    return `${n(undecided)} of ${calls(total)} (${share}) use model IDs StackReplay couldn't resolve, so they are left undecided rather than guessed.`;
  return `${n(undecided)} of ${calls(total)} (${share}) stayed undecided${unrecognized > 0 ? `, ${n(unrecognized)} of them on model IDs StackReplay couldn't resolve` : ""}. They are counted, not guessed.`;
}

function scopeSentence(facts: VerdictFactsV1): string | undefined {
  const { scope, calls: counts } = facts;
  const left = scope.recordedCalls - counts.total;
  if (scope.kind === "all" || left <= 0) return undefined;
  if (scope.kind === "resolved")
    return `Scope: the ${calls(counts.total)} with recognized models. ${n(left)} ${left === 1 ? "call" : "calls"} with unrecognized model IDs ${left === 1 ? "is" : "are"} left out and not priced.`;
  if (scope.kind === "source")
    return `Scope: your ${scope.label ?? "selected"} work, ${n(counts.total)} of ${calls(scope.recordedCalls)}. The other ${n(left)} are not part of this result.`;
  return `Scope: the ${calls(counts.total)} on models this target runs. The other ${n(left)} are not part of this result.`;
}

function substitutionSentence(facts: VerdictFactsV1): string | undefined {
  if (facts.mode !== "translated" || facts.substitutions.length === 0) return undefined;
  const shown = facts.substitutions.slice(0, 3).map((rule) => `${rule.from} → ${rule.to}`);
  const more = facts.substitutions.length - shown.length;
  return `Substitution you chose: ${shown.join(", ")}${more > 0 ? ` and ${n(more)} more` : ""}. Recorded token amounts carry over unchanged; the substitute models could use more or fewer, and nothing here says they would do the same work.`;
}

function capacitySentence(facts: VerdictFactsV1): string | undefined {
  if (facts.target.capacity !== "unpublished") return undefined;
  return `${facts.target.providerName} doesn't publish numeric limits for ${facts.target.name}, so whether your heaviest windows fit can't be tested.`;
}

/**
 * Composes the verdict. Pure and deterministic: the same facts always give the
 * same words.
 */
export function composeVerdict(facts: VerdictFactsV1): VerdictV1 {
  const { target, calls: c } = facts;
  const total = c.total;
  const translated = facts.mode === "translated";
  const modeLabel = translated ? "Translated replay" : "Exact replay";
  const runnable = c.withinAllowance + c.overage + c.blocked;
  const low = total === 0 ? 0 : runnable / total;
  const high = total === 0 ? 0 : (runnable + c.undecided) / total;
  const bound = c.undecided > 0 ? { low, high } : undefined;
  const shareShown = bound === undefined ? shareText(low) : boundText(low, high);
  const days = facts.periodDays;
  const over = days === undefined ? "" : ` over ${n(days)} ${days === 1 ? "day" : "days"}`;
  const under = translated ? "Under your model substitution, " : "";
  const unavailableMakers = list(facts.unavailableMakers);
  const tail: string[] = [];
  const push = (sentence: string | undefined) => {
    if (sentence !== undefined) tail.push(sentence);
  };

  // Direct API: a price for the scope, or how much of the workload it serves.
  if (target.kind === "api") {
    const provider = target.providerName;
    if (facts.money.apiCost !== undefined) {
      const cost = formatUsd(facts.money.apiCost) ?? `$${facts.money.apiCost}`;
      const resolved = facts.scope.kind === "resolved";
      const subject = translated
        ? resolved
          ? `Under your model substitution, your ${calls(total)} with recognized models would be worth`
          : "Under your model substitution, this recorded demand would be worth"
        : resolved
          ? `Your ${calls(total)} with recognized models are worth`
          : "This recorded demand is worth";
      const headline = `${subject} ${cost} at ${possessive(provider)} published API rates${over}.`;
      push("That's a list-price equivalent, not what you paid.");
      push(scopeSentence(facts));
      push(undecidedSentence(facts));
      push(substitutionSentence(facts));
      const [whole, cents] = cost.split(".");
      // A scoped price names its scope wherever the figure travels alone.
      const scoped =
        facts.scope.kind === "all" || facts.scope.recordedCalls <= total
          ? ""
          : `${n(total)} of ${calls(facts.scope.recordedCalls)} · `;
      return {
        modeLabel,
        headline,
        support: tail,
        figure: {
          value: whole ?? cost,
          ...(cents === undefined ? {} : { minor: `.${cents}` }),
          caption: `${scoped}at ${possessive(provider)} published API rates · not what you paid`,
          kind: "money",
        },
        bound: undefined,
        short: `${cost} at list prices${scoped === "" ? "" : ` · ${n(total)} of ${calls(facts.scope.recordedCalls)}`}`,
      };
    }
    const headline =
      runnable === 0
        ? `${under}The ${provider} API doesn't offer the models behind any of your ${calls(total)}${c.undecided > 0 ? " with recognized models" : ""}.`
        : `${under}The ${provider} API offers the models behind ${n(runnable)} of your ${calls(total)} (${shareShown}).`;
    if (c.unavailable > 0 && runnable > 0)
      push(
        `The other ${n(c.unavailable)} use ${notRun(facts, "it")}, so there's no single API price for the whole workload.`,
      );
    push(scopeSentence(facts));
    push(undecidedSentence(facts));
    push(substitutionSentence(facts));
    return {
      modeLabel,
      headline,
      support: tail,
      figure: {
        value: shareShown,
        caption: `of recorded calls on models ${provider} offers`,
        kind: "share",
      },
      bound,
      short:
        runnable === 0 ? "Offers none of these models" : `Offers ${shareShown} of calls' models`,
    };
  }

  const plan = target.name;
  const price = priceText(facts);

  // A plan that runs none, or almost none, of the recorded demand.
  if (runnable === 0) {
    push(unavailableMakers === "" ? undefined : `Your calls use ${notRun(facts, "it")}.`);
    push(scopeSentence(facts));
    push(undecidedSentence(facts));
    push(substitutionSentence(facts));
    return {
      modeLabel,
      headline: `${under}${plan} can't run this workload: none of your ${calls(total)}${c.undecided > 0 ? " with recognized models" : ""} use models it offers.`,
      support: tail,
      figure: { value: shareShown, caption: `of recorded calls run on ${plan}`, kind: "share" },
      bound,
      short: "Can't run this workload",
    };
  }
  if (high < 0.5) {
    push(
      unavailableMakers === ""
        ? undefined
        : `The other ${n(c.unavailable)} use ${notRun(facts, "it")}.`,
    );
    push(scopeSentence(facts));
    push(undecidedSentence(facts));
    push(substitutionSentence(facts));
    return {
      modeLabel,
      headline: `${under}${plan} can't run most of this workload: only ${n(runnable)} of ${calls(total)} use models available on the plan.`,
      support: tail,
      figure: { value: shareShown, caption: `of recorded calls run on ${plan}`, kind: "share" },
      bound,
      short: `Runs only ${shareShown} of calls`,
    };
  }

  // A numeric allowance that ran out.
  const runOut = facts.runOut;
  if (runOut !== undefined) {
    const noun = limitNoun(runOut.limit);
    const when = runOutDates(runOut);
    const first = runOut.dates[0];
    let headline: string;
    if (runOut.behaviour === "overage") {
      const overage = facts.money.overage;
      const overageText = overage === undefined ? undefined : formatUsdWhole(overage);
      headline = `${under}${plan} ${noun} would have run out on ${when}.${
        overageText === undefined || overageText === "$0"
          ? ""
          : ` This workload would have generated about ${overageText} in modeled overage${over} on top of the ${price === undefined ? "plan price" : `${price} subscription`}.`
      }`;
    } else if (runOut.behaviour === "recorded") {
      headline = `${under}${possessive(plan)} ${noun} would have been exceeded on ${when}, which the plan records without refusing or billing anything.`;
    } else {
      headline = `${under}${possessive(plan)} ${noun} would have run out on ${when}; ${calls(c.blocked)} would have been ${runOut.behaviour === "held" ? "held until the window reset" : "refused"}.`;
    }
    if (c.unavailable > 0)
      push(
        `${n(c.unavailable)} ${c.unavailable === 1 ? "call uses" : "calls use"} ${notRun(facts, "the plan")}.`,
      );
    push(scopeSentence(facts));
    push(undecidedSentence(facts));
    if (runOut.behaviour === "overage" && c.undecided > 0 && facts.money.overage !== undefined)
      push(
        `That overage covers the ${calls(total - c.undecided)} with recognized models; the undecided ones could only add to it.`,
      );
    push(substitutionSentence(facts));
    const overage = facts.money.overage;
    const overageWhole = overage === undefined ? undefined : formatUsdWhole(overage);
    return {
      modeLabel,
      headline,
      support: tail,
      figure: {
        value: first === undefined ? "—" : verdictDay(first.date),
        caption: `${noun} run out · day ${n(first?.day ?? 0)}`,
        kind: "date",
      },
      secondary:
        runOut.behaviour === "overage" && overageWhole !== undefined && overageWhole !== "$0"
          ? { value: overageWhole, caption: `modeled overage${over}` }
          : runOut.behaviour === "refused" || runOut.behaviour === "held"
            ? {
                value: n(c.blocked),
                caption: runOut.behaviour === "held" ? "calls held" : "calls refused",
              }
            : undefined,
      bound,
      short: `Runs out ${first === undefined ? "" : `${verdictDay(first.date)} (day ${n(first.day)})`}${
        runOut.behaviour === "overage" && overageWhole !== undefined && overageWhole !== "$0"
          ? ` · ${overageWhole} overage`
          : ""
      }`,
    };
  }

  // Numeric limits never reached.
  if (target.capacity === "numeric") {
    const headline =
      c.unavailable === 0
        ? `${under}${plan} would have served ${runnable === total ? "all " : ""}${calls(runnable)} within its published limits${over}.`
        : `${under}${plan} would have served the ${calls(runnable)} it can run (${shareShown}) within its published limits; the other ${n(c.unavailable)} use ${notRun(facts, "it")}.`;
    push(
      price === undefined
        ? undefined
        : `No overage: the ${price} price covers this recorded demand.`,
    );
    push(scopeSentence(facts));
    push(undecidedSentence(facts));
    push(substitutionSentence(facts));
    return {
      modeLabel,
      headline,
      support: tail,
      figure: {
        value: shareShown,
        caption: `of recorded calls served within ${possessive(plan)} limits`,
        kind: "share",
      },
      bound,
      short: `Within limits · ${shareShown} of calls`,
    };
  }

  // Qualitative limits: model support is known, capacity cannot be tested.
  const servedMakers = list(facts.servedMakers);
  const headline =
    c.unavailable === 0
      ? `${under}${plan} ${translated ? "would run" : "runs"} every model in your ${calls(runnable)}${c.undecided > 0 ? " with recognized models" : ""}.`
      : `${under}${plan} can run ${n(runnable)} of your ${calls(total)} (${shareShown})${servedMakers === "" || translated ? "" : `, the ones on ${runPhrase(facts)}`}. The other ${n(c.unavailable)} use ${notRun(facts)}.`;
  push(capacitySentence(facts));
  push(scopeSentence(facts));
  push(undecidedSentence(facts));
  push(substitutionSentence(facts));
  return {
    modeLabel,
    headline,
    support: tail,
    figure: { value: shareShown, caption: `of recorded calls run on ${plan}`, kind: "share" },
    bound,
    short: `Runs ${shareShown} of calls · limits unpublished`,
  };
}
