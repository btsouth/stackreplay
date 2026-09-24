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
     * resolves. `source`: the calls one or more recording tools made ("your
     * Claude Code work"), possibly without their unrecognized calls.
     */
    kind: z.enum(["all", "resolved", "source"]),
    /** The tool slice, e.g. "Claude Code". */
    label: z.string().min(1).max(60).optional(),
    /** Every recorded call in the workload. */
    recordedCalls: count,
    /** Calls in the tool slice, before any are left out. */
    sourceCalls: count.optional(),
    /** Calls left out because their model IDs are unrecognized. */
    unrecognizedLeftOut: count.optional(),
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
      /**
       * Distinct calendar dates the allowance ran out on, with the day index.
       * `undecidedBefore` counts the undecided calls recorded before that
       * run-out: when it is above zero the date is what the recognized calls
       * establish, and the undecided calls could bring it earlier. Absent when
       * the chronology of undecided calls is not known.
       */
      dates: z
        .array(
          z.strictObject({ date: isoDateV1Schema, day: count, undecidedBefore: count.optional() }),
        )
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

/**
 * A part of a whole as a percentage that can never round an incomplete part
 * to 100% or a nonzero part to 0%: the precision widens until it cannot
 * ("99.97%"). 100% and 0% are printed only when they are exact.
 */
export function partOfWhole(part: number, whole: number): string {
  if (whole <= 0 || part <= 0) return "0%";
  if (part >= whole) return "100%";
  const percent = (part / whole) * 100;
  for (const digits of [1, 2, 3, 4]) {
    const text = percent.toFixed(digits);
    const value = Number(text);
    if (value > 0 && value < 100) return `${text}%`;
  }
  return percent < 50 ? "under 0.0001%" : "over 99.9999%";
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

type RunOut = NonNullable<VerdictFactsV1["runOut"]>;

/**
 * Undecided calls recorded before a run-out. Any of them could be demand on
 * the plan, and demand only brings a run-out earlier, so a date with some
 * before it is the latest the recognized calls establish. When the chronology
 * was not recorded, every undecided call counts as before.
 */
function undecidedBefore(facts: VerdictFactsV1, date: RunOut["dates"][number]): number {
  return date.undecidedBefore ?? facts.calls.undecided;
}

/** "on Aug 23 (day 3) and again by Sep 1": "by" where undecided calls came first. */
function runOutDates(facts: VerdictFactsV1, runOut: RunOut): string {
  const [first, second, ...rest] = runOut.dates;
  if (first === undefined) return "";
  const at = (date: RunOut["dates"][number]) => (undecidedBefore(facts, date) > 0 ? "by" : "on");
  const lead = `${at(first)} ${verdictDay(first.date)} (day ${n(first.day)})`;
  if (second === undefined) return lead;
  if (rest.length === 0) return `${lead} and again ${at(second)} ${verdictDay(second.date)}`;
  return `${lead}, again ${at(second)} ${verdictDay(second.date)} and ${rest.length === 1 ? "once more" : `${n(rest.length)} more times`} after that`;
}

function undecidedCalls(facts: VerdictFactsV1, count: number): string {
  const kind = facts.calls.unrecognized === facts.calls.undecided ? "unresolved" : "undecided";
  return `${n(count)} ${kind} ${count === 1 ? "call" : "calls"}`;
}

/**
 * What undecided calls could still change about a run-out, said right after
 * it: nothing is guessed about them, so the sentence says only which way they
 * could move the result.
 */
function openRunOutSentence(facts: VerdictFactsV1, runOut: RunOut): string | undefined {
  const undecided = facts.calls.undecided;
  const first = runOut.dates[0];
  if (undecided === 0 || first === undefined) return undefined;
  const effect =
    runOut.behaviour === "overage"
      ? "add to the overage"
      : runOut.behaviour === "refused"
        ? "leave more calls refused"
        : runOut.behaviour === "held"
          ? "leave more calls held"
          : "add to what the plan records";
  const before = undecidedBefore(facts, first);
  const day = verdictDay(first.date);
  const all = undecidedCalls(facts, undecided);
  const lead = `${all.charAt(0).toUpperCase()}${all.slice(1)}`;
  if (before === 0)
    return `${lead}, ${undecided === 1 ? "" : "all "}recorded after ${day}, could ${effect} but not move that run-out.`;
  if (first.undecidedBefore === undefined)
    return `${lead} could move the run-out earlier and ${effect}.`;
  if (before === undecided)
    return `${lead}, recorded before ${day}, could move the run-out earlier and ${effect}.`;
  return `${lead} could move the run-out earlier and ${effect}: ${n(before)} of them ${before === 1 ? "was" : "were"} recorded before ${day}.`;
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

/** The tool slice's name, when the replay is scoped to one. */
function sliceOf(facts: VerdictFactsV1): string | undefined {
  return facts.scope.kind === "source" ? facts.scope.label : undefined;
}

/** Calls left out of the replay because their model IDs are unrecognized. */
function leftOut(facts: VerdictFactsV1): number {
  const { scope } = facts;
  if (scope.unrecognizedLeftOut !== undefined) return scope.unrecognizedLeftOut;
  return scope.kind === "resolved" ? Math.max(0, scope.recordedCalls - facts.calls.total) : 0;
}

function scopeSentence(facts: VerdictFactsV1): string | undefined {
  const { scope, calls: counts } = facts;
  const unrecognized = leftOut(facts);
  const slice = sliceOf(facts);
  if (slice !== undefined) {
    const inSlice = scope.sourceCalls ?? counts.total + unrecognized;
    const others = scope.recordedCalls - inSlice;
    return [
      `Scope: your ${slice} work, ${n(inSlice)} of ${calls(scope.recordedCalls)}.`,
      unrecognized === 0
        ? undefined
        : `${n(unrecognized)} of them ${unrecognized === 1 ? "uses a model ID" : "use model IDs"} StackReplay couldn't resolve and ${unrecognized === 1 ? "is" : "are"} left out.`,
      others <= 0 ? undefined : `The other ${n(others)} are not part of this result.`,
    ]
      .filter((part) => part !== undefined)
      .join(" ");
  }
  if (unrecognized === 0) return undefined;
  return `Scope: the ${calls(counts.total)} with recognized models. ${n(unrecognized)} ${unrecognized === 1 ? "call" : "calls"} with unrecognized model IDs ${unrecognized === 1 ? "is" : "are"} left out${facts.target.kind === "api" ? " and not priced" : ""}.`;
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
  const slice = sliceOf(facts);
  // A tool slice is named in the first words of the verdict, like a
  // substitution is: the answer is about that work, not the whole workload.
  const translatedLead = translated ? "Under your model substitution, " : "";
  const under =
    slice === undefined
      ? translatedLead
      : `For your ${slice} work${translated ? " under your model substitution" : ""}, `;
  const the = under === "" ? "The" : "the";
  const workNoun = slice === undefined ? "this workload" : `your ${slice} work`;
  const ofCalls = slice === undefined ? "of recorded calls" : `of your ${slice} calls`;
  const tag = (text: string) => (slice === undefined ? text : `${slice}: ${text}`);
  /** A sentence start after any substitution or slice lead. */
  const start = (text: string) =>
    under === "" ? text : `${under}${text.charAt(0).toLowerCase()}${text.slice(1)}`;
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
      const resolved = leftOut(facts) > 0;
      const noun = resolved
        ? `your ${n(total)} ${slice === undefined ? "" : `${slice} `}${total === 1 ? "call" : "calls"} with recognized models`
        : slice === undefined
          ? "this recorded demand"
          : `your ${slice} work`;
      const verb = translated ? "would be worth" : resolved ? "are worth" : "is worth";
      const subject = translated
        ? `${translatedLead}${noun} ${verb}`
        : `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${verb}`;
      const headline = `${subject} ${cost} at ${possessive(provider)} published API rates${over}.`;
      push("That's a list-price equivalent, not what you paid.");
      push(scopeSentence(facts));
      push(undecidedSentence(facts));
      push(substitutionSentence(facts));
      const [whole, cents] = cost.split(".");
      // A scoped price names its scope wherever the figure travels alone.
      const recorded = facts.scope.recordedCalls;
      const scopeTag =
        slice !== undefined
          ? `${slice}, ${n(total)} of ${calls(recorded)}`
          : resolved && recorded > total
            ? `${n(total)} of ${calls(recorded)}`
            : undefined;
      return {
        modeLabel,
        headline,
        support: tail,
        figure: {
          value: whole ?? cost,
          ...(cents === undefined ? {} : { minor: `.${cents}` }),
          caption: `${scopeTag === undefined ? "" : `${scopeTag} · `}at ${possessive(provider)} published API rates · not what you paid`,
          kind: "money",
        },
        bound: undefined,
        short: `${cost} at list prices${scopeTag === undefined ? "" : ` · ${scopeTag}`}`,
      };
    }
    const headline =
      runnable === 0
        ? `${under}${the} ${provider} API doesn't offer the models behind any of your ${calls(total)}${c.undecided > 0 ? " with recognized models" : ""}.`
        : `${under}${the} ${provider} API offers the models behind ${n(runnable)} of your ${calls(total)} (${shareShown}).`;
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
        caption: `${ofCalls} on models ${provider} offers`,
        kind: "share",
      },
      bound,
      short: tag(
        runnable === 0 ? "Offers none of these models" : `Offers ${shareShown} of calls' models`,
      ),
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
      headline: `${translatedLead}${plan} can't run ${workNoun}: none of your ${calls(total)}${c.undecided > 0 ? " with recognized models" : ""} use models it offers.`,
      support: tail,
      figure: { value: shareShown, caption: `${ofCalls} run on ${plan}`, kind: "share" },
      bound,
      short: tag("Can't run this workload"),
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
      headline: `${translatedLead}${plan} can't run most of ${workNoun}: only ${n(runnable)} of ${calls(total)} use models available on the plan.`,
      support: tail,
      figure: { value: shareShown, caption: `${ofCalls} run on ${plan}`, kind: "share" },
      bound,
      short: tag(`Runs only ${shareShown} of calls`),
    };
  }

  // A numeric allowance that ran out.
  const runOut = facts.runOut;
  if (runOut !== undefined) {
    const noun = limitNoun(runOut.limit);
    const when = runOutDates(facts, runOut);
    const first = runOut.dates[0];
    // With undecided calls before the first run-out, the date is what the
    // recognized calls alone establish, and the headline says so.
    const firstOpen = first !== undefined && undecidedBefore(facts, first) > 0;
    const overageOpen = c.undecided > 0;
    let headline: string;
    if (runOut.behaviour === "overage") {
      const overage = facts.money.overage;
      const overageText = overage === undefined ? undefined : formatUsdWhole(overage);
      const generated =
        overageText === undefined || overageText === "$0"
          ? ""
          : firstOpen
            ? ` They would generate about ${overageText} in modeled overage${over} on top of the ${price === undefined ? "plan price" : `${price} subscription`}.`
            : ` ${overageOpen ? "Recognized calls alone" : slice === undefined ? "This workload" : `Your ${slice} work`} would have generated about ${overageText} in modeled overage${over} on top of the ${price === undefined ? "plan price" : `${price} subscription`}.`;
      headline = firstOpen
        ? `${start("Recognized calls alone would exhaust ")}${plan} ${noun} ${when}.${generated}`
        : `${under}${plan} ${noun} would have run out ${when}.${generated}`;
    } else if (runOut.behaviour === "recorded") {
      headline = firstOpen
        ? `${start("Recognized calls alone would exceed ")}${possessive(plan)} ${noun} ${when}, which the plan records without refusing or billing anything.`
        : `${under}${possessive(plan)} ${noun} would have been exceeded ${when}, which the plan records without refusing or billing anything.`;
    } else {
      const stopped = runOut.behaviour === "held" ? "held until the window reset" : "refused";
      headline = firstOpen
        ? `${start("Recognized calls alone would use up ")}${possessive(plan)} ${noun} ${when}; ${calls(c.blocked)} of them would have been ${stopped}.`
        : `${under}${possessive(plan)} ${noun} would have run out ${when}; ${calls(c.blocked)} would have been ${stopped}.`;
    }
    push(openRunOutSentence(facts, runOut));
    if (c.unavailable > 0)
      push(
        `${n(c.unavailable)} ${c.unavailable === 1 ? "call uses" : "calls use"} ${notRun(facts, "the plan")}.`,
      );
    push(scopeSentence(facts));
    push(undecidedSentence(facts));
    push(substitutionSentence(facts));
    const overage = facts.money.overage;
    const overageWhole = overage === undefined ? undefined : formatUsdWhole(overage);
    const showOverage =
      runOut.behaviour === "overage" && overageWhole !== undefined && overageWhole !== "$0";
    return {
      modeLabel,
      headline,
      support: tail,
      figure: {
        value: first === undefined ? "—" : verdictDay(first.date),
        caption: firstOpen
          ? `recognized calls · ${noun} run out by day ${n(first?.day ?? 0)}`
          : `${noun} run out · day ${n(first?.day ?? 0)}`,
        kind: "date",
      },
      secondary: showOverage
        ? {
            value: overageWhole,
            caption: overageOpen
              ? `modeled overage from recognized calls${over}`
              : `modeled overage${over}`,
          }
        : runOut.behaviour === "refused" || runOut.behaviour === "held"
          ? {
              value: n(c.blocked),
              caption: runOut.behaviour === "held" ? "calls held" : "calls refused",
            }
          : undefined,
      bound,
      short: tag(
        `Runs out ${first === undefined ? "" : `${firstOpen ? "by " : ""}${verdictDay(first.date)} (day ${n(first.day)})`}${
          showOverage ? ` · ${overageOpen ? "at least " : ""}${overageWhole} overage` : ""
        }`,
      ),
    };
  }

  // Numeric limits never reached.
  if (target.capacity === "numeric") {
    // Undecided calls could still use the allowance: only the recognized calls
    // are established to fit.
    const open = c.undecided > 0;
    const headline = open
      ? c.unavailable === 0
        ? `${start("Recognized calls stay within ")}${possessive(plan)} published limits: all ${calls(runnable)}${over}.`
        : `${start("Recognized calls stay within ")}${possessive(plan)} published limits: the ${calls(runnable)} it can run (${shareShown}). The other ${n(c.unavailable)} use ${notRun(facts, "it")}.`
      : c.unavailable === 0
        ? `${under}${plan} would have served ${runnable === total ? "all " : ""}${calls(runnable)} within its published limits${over}.`
        : `${under}${plan} would have served the ${calls(runnable)} it can run (${shareShown}) within its published limits; the other ${n(c.unavailable)} use ${notRun(facts, "it")}.`;
    if (open) {
      const undecided = undecidedCalls(facts, c.undecided);
      push(
        `${undecided.charAt(0).toUpperCase()}${undecided.slice(1)} could still use the allowance, so whether ${slice === undefined ? "the full workload" : `your ${slice} work`} fits can't be determined.`,
      );
    }
    push(
      price === undefined
        ? undefined
        : open
          ? `No overage from recognized calls: the ${price} price covers them.`
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
        caption: open
          ? `${ofCalls} within ${possessive(plan)} limits on recognized calls`
          : `${ofCalls} served within ${possessive(plan)} limits`,
        kind: "share",
      },
      bound,
      short: tag(
        open
          ? `Recognized calls within limits · ${shareShown}`
          : `Within limits · ${shareShown} of calls`,
      ),
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
    figure: { value: shareShown, caption: `${ofCalls} run on ${plan}`, kind: "share" },
    bound,
    short: tag(`Runs ${shareShown} of calls · limits unpublished`),
  };
}
