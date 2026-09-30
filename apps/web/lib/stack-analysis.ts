import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import { formatUsd } from "@stackreplay/share";
import { marketRange } from "./decision-presentation";
import type { MarketDecision } from "./market-decision";
import { buildMyStack } from "./my-stack";
import {
  catalogPlansAt,
  loadPublicCatalog,
  type PublicCatalog,
  planIncludesModel,
} from "./public-catalog";
import { marketModelCosts } from "./replay-strategies";
import {
  type BillingFact,
  daysInPeriod,
  nextDate,
  periodKey,
  periodLabel,
  periodSchema,
  type ReviewChoice,
  type ReviewPeriod,
  resolveReviewPeriod,
} from "./review-period";
import type { TargetKey } from "./routes";
import { DISCOVERY_FAMILIES, type DiscoveryGroupId, type NonPlanResponse } from "./stack-discovery";
import { subscriptionPublishedTerms } from "./subscription-published-terms";

/**
 * My Stack's decision layer: recorded workload + confirmed subscriptions +
 * accepted catalog facts + a billing period → findings a person can act on.
 *
 * Every figure here is arithmetic over results the Worker already computed
 * (the accepted API market calculation, scoped to a period and, per recording
 * tool, to that tool's calls) and over reviewed catalog facts. Nothing prices
 * events, assigns a call to a subscription, or models subscription capacity:
 * published allowances are relative statements, never token quotas, so plan
 * fit stays "cannot determine" unless recorded limit events say more.
 *
 * Association, not attribution: a recording tool's calls are associated with
 * the subscription family the reviewed discovery mapping names for that tool
 * (Claude Code → Claude plans). That is where the work was recorded, not proof
 * of which account paid for it.
 */

/** Trust vocabulary shared by every finding. The word is always shown. */
export type EvidenceLevel = "measured" | "published" | "likely" | "estimated" | "unknown";
export interface Evidence {
  level: EvidenceLevel;
  text: string;
}
export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  measured: "Measured",
  published: "Published",
  likely: "Likely",
  estimated: "Estimated",
  unknown: "Cannot determine",
};

export interface Range {
  low: string;
  high: string;
}

/** One scope's recorded facts, read from a market result. Aggregates only. */
export interface WorkloadFacts {
  calls: number;
  knownTokens: number;
  activeDays: number;
  firstDate?: string | undefined;
  lastDate?: string | undefined;
  recognized: number;
  priced: number;
  /** API-equivalent range when every call in scope is priced. */
  value?: Range | undefined;
  /** A separately priced subset when some calls cannot be priced; never a whole total. */
  pricedValue?: (Range & { calls: number }) | undefined;
  /** Resolved canonical models only, by recorded calls, with their priced API-equivalent. */
  models: { id: string; calls: number; priced: number; value?: Range | undefined }[];
  unresolvedCalls: number;
  /** Directly observed hard-limit records; absent when the history carries no capacity evidence. */
  blocked?: { attempts: number; days: number } | undefined;
  distinctResponses: boolean;
}

export function workloadFacts(decision: MarketDecision): WorkloadFacts {
  const history = decision.history;
  const calls = history?.calls ?? decision.coverage?.recorded ?? 0;
  const range = marketRange(decision);
  const value = range && calls > 0 && range.priced === calls ? range : undefined;
  const subset = value ? undefined : marketRange(decision.pricedScope);
  const coverage = decision.coverage;
  const modelValues = new Map(marketModelCosts(decision).map((row) => [row.model, row.cost]));
  return {
    calls,
    knownTokens: history?.knownTokens ?? coverage?.knownTokens ?? 0,
    activeDays: history?.activeDays ?? 0,
    firstDate: history?.firstDate,
    lastDate: history?.lastDate,
    recognized: coverage?.recognized ?? 0,
    priced: coverage?.priced ?? (value ? calls : 0),
    value: value ? { low: value.low, high: value.high } : undefined,
    pricedValue: subset ? { low: subset.low, high: subset.high, calls: subset.priced } : undefined,
    models: (coverage?.models ?? [])
      .filter((row) => row.model !== "Unresolved model")
      .map((row) => ({
        id: row.model,
        calls: row.calls,
        priced: row.priced,
        value: modelValues.get(row.model),
      })),
    unresolvedCalls: coverage ? coverage.recorded - coverage.recognized : 0,
    blocked: decision.capacitySignal
      ? { attempts: decision.capacitySignal.blockedAttempts, days: decision.capacitySignal.days }
      : undefined,
    distinctResponses: history?.nativeResponses === calls && calls > 0,
  };
}

/**
 * The period the stack is analyzed over. A billing period chosen in the
 * billing-period review wins; otherwise a recorded span of up to 31 days is
 * used and labeled as such; a longer history is never cut to "the last 30
 * days", it asks for a period instead.
 */
export type StackPeriod =
  | {
      kind: "billing";
      source: "cycle" | "custom";
      period: ReviewPeriod;
      days: number;
      ended: boolean;
      cyclePlan?: string | undefined;
    }
  | { kind: "recorded"; period: ReviewPeriod; days: number }
  | { kind: "unbounded"; firstDate?: string | undefined; lastDate?: string | undefined };

export function resolveStackPeriod(input: {
  choice: ReviewChoice;
  billing: Readonly<Record<string, BillingFact>>;
  firstEventAt?: string | undefined;
  lastEventAt?: string | undefined;
  asOf: string;
}): StackPeriod {
  const chosen = resolveReviewPeriod(input.choice, { ...input.billing });
  if (chosen && input.choice.mode !== "history" && periodSchema.safeParse(chosen).success)
    return {
      kind: "billing",
      source: input.choice.mode === "cycle" ? "cycle" : "custom",
      period: chosen,
      days: daysInPeriod(chosen),
      ended: chosen.end <= input.asOf.slice(0, 10),
      ...(input.choice.mode === "cycle" && input.choice.subscription
        ? { cyclePlan: input.choice.subscription }
        : {}),
    };
  const first = input.firstEventAt?.slice(0, 10);
  const last = input.lastEventAt?.slice(0, 10);
  if (!first || !last) return { kind: "unbounded" };
  const period = { start: first, end: nextDate(last) };
  const days = daysInPeriod(period);
  return days <= 31
    ? { kind: "recorded", period, days }
    : { kind: "unbounded", firstDate: first, lastDate: last };
}

export function stackPeriodLabel(period: StackPeriod): string {
  if (period.kind === "unbounded")
    return period.firstDate && period.lastDate
      ? periodLabel({ start: period.firstDate, end: nextDate(period.lastDate) })
      : "No recorded dates";
  return period.period.end === nextDate(period.period.start)
    ? (periodLabel(period.period).split(" – ")[0] ?? periodLabel(period.period))
    : periodLabel(period.period);
}

/**
 * Whose history the person has confirmed for this period. A confirmation made
 * for one local account covers that account's recording tool only.
 */
export type StackConfirmation =
  | { scope: "all" }
  | { scope: "account"; sourceId: string; calls: number; label?: string | undefined };

export interface StackWorkload {
  period: StackPeriod;
  overall: WorkloadFacts;
  /** Recording tools with any calls in the whole import, by adapter id. */
  importSources: readonly { id: string; name: string; events: number }[];
  /** Per recording tool, inside the analysis period. */
  sources: Readonly<Record<string, WorkloadFacts>>;
  confirmation?: StackConfirmation | undefined;
  /** Locally entered amounts paid for exactly this period, by plan key. */
  paid?: Readonly<Record<string, string>> | undefined;
}

type Family = (typeof DISCOVERY_FAMILIES)[number];

export function familyOfPlan(planId: string): Family | undefined {
  return DISCOVERY_FAMILIES.find(
    (family) =>
      (family.planIds as readonly string[]).includes(planId) ||
      (family.otherPlanIds as readonly string[]).includes(planId),
  );
}

function familyOfSource(sourceId: string): Family | undefined {
  return DISCOVERY_FAMILIES.find((family) =>
    (family.sourceIds as readonly string[]).includes(sourceId),
  );
}

const catalogs = new Map<string, PublicCatalog>();
function publicCatalog(asOf: string): PublicCatalog {
  const date = asOf.slice(0, 10);
  let catalog = catalogs.get(date);
  if (!catalog) {
    catalog = loadPublicCatalog(date);
    catalogs.set(date, catalog);
  }
  return catalog;
}

const planLists = new Map<string, ReturnType<typeof catalogPlansAt>>();
function plansAt(rulesAsOf: string): ReturnType<typeof catalogPlansAt> {
  let plans = planLists.get(rulesAsOf);
  if (!plans) {
    plans = catalogPlansAt(rulesAsOf);
    planLists.set(rulesAsOf, plans);
  }
  return plans;
}

function monthlyUsd(
  price: { amount: string; currency: string; interval: string } | undefined,
): string | undefined {
  return price?.currency === "USD" && price.interval === "month" ? price.amount : undefined;
}

/** A published price: whole dollars when there are no cents ("$20", "$9.99"). */
export function priceMoney(amount: string): string {
  return money(amount).replace(/\.00$/u, "");
}
export function money(amount: string): string {
  return formatUsd(amount) ?? `$${amount}`;
}
export function rangeText(range: Range): string {
  const low = money(range.low);
  const high = money(range.high);
  return low === high ? low : `${low}–${high}`;
}
function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}
function percentText(share: number): string {
  const value = share * 100;
  if (value > 0 && value < 1) return "<1%";
  return `${value >= 10 ? Math.round(value) : Number(value.toFixed(1))}%`;
}

export { percentText as shareText };

export function ratioText(value: string): string {
  const ratio = new Decimal(value);
  return `${ratio.lt(100) ? ratio.toFixed(1) : ratio.toFixed(0)}×`;
}
export function leverageText(leverage: Pick<Leverage, "low" | "high" | "subset">): string {
  const low = ratioText(leverage.low);
  const high = ratioText(leverage.high);
  return `${leverage.subset ? "≥ " : ""}${low === high ? low : `${low}–${high}`}`;
}

function sumRanges(ranges: readonly Range[]): Range {
  return {
    low: ranges.reduce((sum, r) => sum.add(r.low), new Decimal(0)).toString(),
    high: ranges.reduce((sum, r) => sum.add(r.high), new Decimal(0)).toString(),
  };
}

export interface Leverage {
  /** API-equivalent recorded value ÷ price, low and high cache scenarios. */
  low: string;
  high: string;
  value: Range;
  price: string;
  priceBasis: "published" | "paid";
  /** True when only a priced subset is valued: the ratio is then a floor. */
  subset: boolean;
  pricedCalls: number;
  calls: number;
  /** Associated calls left out because the plan's published lineup does not list their model. */
  excludedCalls: number;
  level: "measured" | "estimated";
  note: string;
}

interface LeverageInput {
  facts: WorkloadFacts;
  price: string | undefined;
  priceBasis: "published" | "paid";
  period: StackPeriod;
  confirmed: boolean;
}

/** Recorded API-equivalent value per dollar of one monthly price, when a month is analyzed. */
export function computeLeverage(input: LeverageInput): { leverage?: Leverage; note?: string } {
  const { facts, period } = input;
  if (period.kind === "unbounded")
    return {
      note: "Choose a billing period of up to 31 days to compare recorded value with a monthly price.",
    };
  if (period.days < 28)
    return {
      note: `This period covers ${plural(period.days, "day")}. Leverage compares recorded value with one full monthly billing period.`,
    };
  if (!input.price || !new Decimal(input.price).gt(0))
    return { note: "No positive monthly price to compare with." };
  if (facts.calls === 0) return { note: "No associated recorded calls in this period." };
  const value = facts.value ?? facts.pricedValue;
  if (!value)
    return { note: "The associated recorded work could not be priced at accepted API rates." };
  const subset = facts.value === undefined;
  const price = new Decimal(input.price);
  const complete = !subset && input.confirmed && period.kind === "billing" && period.ended;
  const notes = [
    subset
      ? `Priced calls only: ${facts.pricedValue?.calls.toLocaleString("en-US")} of ${facts.calls.toLocaleString("en-US")}. Unpriced calls are not estimated, so this is a floor.`
      : undefined,
    period.kind === "recorded"
      ? "Recorded history span, not a confirmed billing cycle."
      : !period.ended
        ? "This billing cycle has not ended; recorded value so far."
        : undefined,
    !input.confirmed ? "History coverage for this period is not confirmed." : undefined,
  ].filter((note): note is string => note !== undefined);
  return {
    leverage: {
      low: new Decimal(value.low).div(price).toString(),
      high: new Decimal(value.high).div(price).toString(),
      value: { low: value.low, high: value.high },
      price: input.price,
      priceBasis: input.priceBasis,
      subset,
      pricedCalls: subset ? (facts.pricedValue?.calls ?? 0) : facts.calls,
      calls: facts.calls,
      excludedCalls: 0,
      level: complete ? "measured" : "estimated",
      note:
        notes.join(" ") ||
        "Confirmed billing period, every associated call priced at accepted API rates.",
    },
  };
}

export interface TierOption {
  key: TargetKey;
  id: string;
  name: string;
  monthlyUsd?: string | undefined;
  direction: "lower" | "higher";
  allowance?: string | undefined;
  /** Recorded models this plan's published lineup does not include. */
  missing: { id: string; name: string; calls: number }[];
}

export interface SubscriptionReport {
  key: TargetKey;
  id: string;
  name: string;
  available: boolean;
  price?: { amount: string; currency: string; interval: string } | undefined;
  monthlyUsd?: string | undefined;
  family?: { groupId: DiscoveryGroupId; name: string; sourceIds: string[]; tool: string };
  /** Other selected plans associated with the same recording tool. */
  sharedWith: string[];
  /**
   * visible: its recording tool is in the imported history.
   * not-imported: StackReplay reads this tool, but the workload has none of its history.
   * not-readable: StackReplay has no history adapter for this plan's tools.
   * no-workload: nothing is selected to analyze.
   */
  visibility: "visible" | "not-imported" | "not-readable" | "no-workload";
  activity?: {
    facts: WorkloadFacts;
    share: number;
    models: { id: string; name: string; calls: number; listed: boolean }[];
    confirmed: boolean;
  };
  leverage?: Leverage | undefined;
  leverageNote?: string | undefined;
  /** Associated calls on models this plan's published lineup lists. */
  relevantCalls?: number | undefined;
  /** Monthly price of every selected plan associated with the same tool. */
  familyPrice?: { amount: string; basis: "published" | "paid" } | undefined;
  tiers: TierOption[];
  allowance?: string | undefined;
  otherApps?: string | undefined;
  evidence: Evidence[];
}

export interface Opportunity {
  id: string;
  kind:
    | "unused"
    | "off-lineup"
    | "low-use"
    | "consolidate"
    | "downgrade"
    | "uncovered"
    | "leverage";
  question: string;
  subject: string;
  statement: string;
  figures: { label: string; value: string }[];
  evidence: Evidence[];
  /** Signed change in published monthly USD subscription spend. */
  monthlyDelta?: string | undefined;
  test?: { label: string; proposed: TargetKey[] } | undefined;
  inspect?: { label: string; anchor: string } | undefined;
}

export interface OutsideWork {
  sourceId: string;
  name: string;
  facts: WorkloadFacts;
  share: number;
  familyName?: string | undefined;
}

export interface StackAnalysis {
  model: ReturnType<typeof buildMyStack>;
  subscriptions: SubscriptionReport[];
  planCount: number;
  /** Published USD monthly total of selected plans with a monthly USD price. */
  monthly?: string | undefined;
  /** Stack leverage over the subscriptions whose tools StackReplay can read. */
  leverage?: Leverage | undefined;
  leverageNote?: string | undefined;
  leveragePlans: string[];
  notReadable: string[];
  outside: OutsideWork[];
  opportunities: Opportunity[];
}

function modelName(catalog: PublicCatalog, id: string): string {
  return catalog.modelById(id)?.name ?? id;
}

/** Published included access for a plan, per recorded model. Undefined when unknown. */
function listedModels(
  catalog: PublicCatalog,
  planId: string,
  models: readonly { id: string; calls: number }[],
): { id: string; name: string; calls: number; listed: boolean }[] | undefined {
  const plan = catalog.planById(planId);
  if (!plan) return undefined;
  return models.map((model) => ({
    id: model.id,
    name: modelName(catalog, model.id),
    calls: model.calls,
    listed: planIncludesModel(plan, model.id),
  }));
}

function familyConfirmed(
  family: Family,
  facts: WorkloadFacts,
  confirmation: StackConfirmation | undefined,
): boolean {
  if (!confirmation) return false;
  if (confirmation.scope === "all") return true;
  return (
    family.sourceIds.length === 1 &&
    family.sourceIds[0] === confirmation.sourceId &&
    facts.calls === confirmation.calls
  );
}

function tierOptions(
  catalog: PublicCatalog,
  planId: string,
  family: Family,
  models: readonly { id: string; calls: number }[],
  asOf: string,
): TierOption[] {
  const plans = plansAt(asOf);
  const current = plans.find((plan) => plan.id === planId);
  const currentPrice = monthlyUsd(current?.price);
  if (!currentPrice) return [];
  return (family.planIds as readonly string[])
    .filter((id) => id !== planId)
    .flatMap((id): TierOption[] => {
      const plan = plans.find((entry) => entry.id === id);
      const price = monthlyUsd(plan?.price);
      if (!plan || !price || new Decimal(price).eq(currentPrice)) return [];
      const listed = listedModels(catalog, id, models) ?? [];
      return [
        {
          key: `plan:${id}`,
          id,
          name: plan.name,
          monthlyUsd: price,
          direction: new Decimal(price).lt(currentPrice) ? "lower" : "higher",
          allowance: subscriptionPublishedTerms(id, asOf.slice(0, 10))?.allowanceSummary,
          missing: listed
            .filter((model) => !model.listed)
            .map(({ id: modelId, name, calls }) => ({ id: modelId, name, calls })),
        },
      ];
    })
    .sort((a, b) => new Decimal(a.monthlyUsd ?? 0).cmp(b.monthlyUsd ?? 0));
}

function toolName(family: Family, workload: StackWorkload | undefined): string {
  const id = family.sourceIds[0] ?? family.groupId;
  return workload?.importSources.find((source) => source.id === id)?.name ?? SOURCE_NAMES[id] ?? id;
}
const SOURCE_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  "command-code": "Command Code",
  opencode: "OpenCode",
  hermes: "Hermes",
};

/** Facts for a family's recording tools inside the period (one tool per reviewed family). */
function familyFacts(family: Family, workload: StackWorkload): WorkloadFacts | undefined {
  const id = family.sourceIds[0];
  return id === undefined ? undefined : workload.sources[id];
}

function inImport(family: Family, workload: StackWorkload): boolean {
  return workload.importSources.some(
    (source) => (family.sourceIds as readonly string[]).includes(source.id) && source.events > 0,
  );
}

/**
 * The part of a tool's recorded work a plan's published lineup could have
 * served. When every resolved model is listed, the tool's own facts are used
 * unchanged; otherwise only calls on listed models count, valued from the same
 * receipts, and the rest are reported as excluded, never estimated.
 */
function lineupScope(
  facts: WorkloadFacts,
  models: readonly { id: string; listed: boolean }[],
): { facts: WorkloadFacts; excludedCalls: number } {
  if (models.every((model) => model.listed)) return { facts, excludedCalls: 0 };
  const listedIds = new Set(models.filter((model) => model.listed).map((model) => model.id));
  const listed = facts.models.filter((model) => listedIds.has(model.id));
  const calls = listed.reduce((sum, model) => sum + model.calls, 0);
  const valued = listed.filter((model) => model.value !== undefined);
  const priced = valued.reduce((sum, model) => sum + model.priced, 0);
  const value = valued.length
    ? sumRanges(valued.map((model) => model.value ?? { low: "0", high: "0" }))
    : undefined;
  const complete = calls > 0 && priced === calls && valued.length === listed.length;
  return {
    facts: {
      ...facts,
      calls,
      priced,
      recognized: calls,
      unresolvedCalls: 0,
      models: listed,
      value: complete ? value : undefined,
      pricedValue: !complete && value && priced > 0 ? { ...value, calls: priced } : undefined,
    },
    excludedCalls: facts.calls - calls,
  };
}

export function analyzeStack(input: {
  currentStack: readonly TargetKey[];
  rulesAsOf?: string | undefined;
  workload?: StackWorkload | undefined;
  /** Non-plan answers from stack discovery ("API / other billing"), by family. */
  familyResponses?: Partial<Record<DiscoveryGroupId, NonPlanResponse>> | undefined;
}): StackAnalysis {
  const rulesAsOf = input.rulesAsOf ?? DECISION_MARKET.rulesAt;
  const asOf = rulesAsOf.slice(0, 10);
  const catalog = publicCatalog(asOf);
  const model = buildMyStack({ currentStack: input.currentStack, rulesAsOf });
  const workload = input.workload;
  const period = workload?.period;
  const plans = model.targets.filter((target) => target.kind === "plan");
  const overallCalls = workload?.overall.calls ?? 0;

  const subscriptions = plans.map((target): SubscriptionReport => {
    const family = familyOfPlan(target.id);
    const terms = subscriptionPublishedTerms(target.id, asOf);
    const siblings = family
      ? plans.filter((other) => other.key !== target.key && familyOfPlan(other.id) === family)
      : [];
    const base: SubscriptionReport = {
      key: target.key,
      id: target.id,
      name: target.name,
      available: target.available,
      price: target.publishedPrice,
      monthlyUsd: monthlyUsd(target.publishedPrice),
      ...(family && family.sourceIds.length > 0
        ? {
            family: {
              groupId: family.groupId,
              name: family.name,
              sourceIds: [...family.sourceIds],
              tool: toolName(family, workload),
            },
          }
        : {}),
      sharedWith: siblings.map((other) => other.name),
      visibility: !workload
        ? "no-workload"
        : !family
          ? "not-readable"
          : inImport(family, workload)
            ? "visible"
            : "not-imported",
      tiers: [],
      allowance: terms?.allowanceSummary,
      otherApps: terms?.otherApps,
      evidence: [],
    };
    if (!family) {
      base.evidence.push({
        level: "unknown",
        text: `StackReplay cannot read ${target.name} usage history, so its use cannot be determined from your workload.`,
      });
      return base;
    }
    if (!workload || !period) return base;
    const tool = toolName(family, workload);
    if (base.visibility === "not-imported") {
      base.evidence.push({
        level: "unknown",
        text: `No ${tool} history is in this workload. Scan it to see how ${target.name} is used.`,
      });
      return base;
    }
    const facts = familyFacts(family, workload);
    if (!facts) return base;
    const confirmed = familyConfirmed(family, facts, workload.confirmation);
    const models = listedModels(catalog, target.id, facts.models) ?? [];
    base.activity = {
      facts,
      share: overallCalls > 0 ? facts.calls / overallCalls : 0,
      models,
      confirmed,
    };
    base.tiers = tierOptions(catalog, target.id, family, facts.models, rulesAsOf);
    const familyPlans = [target, ...siblings];
    const paid = familyPlans.map((plan) => workload.paid?.[plan.key]);
    const allPaid = paid.every((amount) => amount !== undefined);
    const prices = familyPlans.map((plan) => monthlyUsd(plan.publishedPrice));
    const price = allPaid
      ? paid.reduce((sum, amount) => sum.add(amount ?? "0"), new Decimal(0)).toString()
      : prices.every((amount) => amount !== undefined)
        ? prices.reduce((sum, amount) => sum.add(amount ?? "0"), new Decimal(0)).toString()
        : undefined;
    const scope = lineupScope(facts, models);
    base.relevantCalls = scope.facts.calls;
    const lever =
      facts.calls > 0 && scope.facts.calls === 0
        ? {
            note: `None of the ${plural(facts.calls, "associated call")} used a model in ${target.name}'s published lineup.`,
          }
        : computeLeverage({
            facts: scope.facts,
            price,
            priceBasis: allPaid ? "paid" : "published",
            period,
            confirmed,
          });
    if (lever.leverage && scope.excludedCalls > 0) {
      lever.leverage.excludedCalls = scope.excludedCalls;
      lever.leverage.note = `Counts the ${plural(scope.facts.calls, "call")} on models ${target.name} lists; ${plural(scope.excludedCalls, "other associated call")} (unlisted or unresolved models) are excluded. ${lever.leverage.note}`;
    }
    base.leverage = lever.leverage;
    base.leverageNote = lever.note;
    if (price) base.familyPrice = { amount: price, basis: allPaid ? "paid" : "published" };
    const scopeText = confirmed
      ? "confirmed history"
      : "imported histories; coverage not confirmed";
    if (facts.calls === 0)
      base.evidence.push({
        level: confirmed ? "measured" : "estimated",
        text: `No ${tool} activity was found in the imported histories for ${stackPeriodLabel(period)}.`,
      });
    else
      base.evidence.push({
        level: confirmed ? "measured" : "estimated",
        text: `${plural(facts.calls, "recorded call")} from ${tool} (${percentText(base.activity.share)} of this period's calls) · ${scopeText}.`,
      });
    const unlisted = models.filter((model) => !model.listed);
    if (unlisted.length > 0)
      base.evidence.push({
        level: "published",
        text: `${target.name}'s published lineup does not include ${unlisted.map((model) => model.name).join(", ")} (${plural(
          unlisted.reduce((sum, model) => sum + model.calls, 0),
          "call",
        )}).`,
      });
    if (facts.blocked)
      base.evidence.push({
        level: "measured",
        text:
          facts.blocked.attempts > 0
            ? `${plural(facts.blocked.attempts, "blocked attempt")} on ${plural(facts.blocked.days, "day")} recorded in ${tool} history in this period.`
            : `No limit events were recorded in ${tool} history in this period.`,
      });
    base.evidence.push({
      level: "unknown",
      text: `Plan fit cannot be determined: ${terms?.allowanceSummary ? `"${terms.allowanceSummary}" is` : "its published allowance is"} not a fixed token quota StackReplay can replay.`,
    });
    if (siblings.length > 0)
      base.evidence.push({
        level: "unknown",
        text: `${tool} calls cannot be split between ${[target.name, ...siblings.map((s) => s.name)].join(" and ")}; they are shown for the group.`,
      });
    return base;
  });

  const monthlyPrices = plans
    .map((target) => monthlyUsd(target.publishedPrice))
    .filter((amount): amount is string => amount !== undefined);
  const monthly = monthlyPrices.length
    ? monthlyPrices.reduce((sum, amount) => sum.add(amount), new Decimal(0)).toString()
    : undefined;

  // Stack leverage over readable subscriptions: each associated tool's value
  // counted once. A readable plan with no recorded calls keeps its price in the
  // denominator; work that cannot be valued is excluded from both sides, by name.
  const seen = new Set<string>();
  const valued: Leverage[] = [];
  const unusedPrices: string[] = [];
  const leveragePlans: string[] = [];
  const excluded: string[] = [];
  const unusedNames: string[] = [];
  const offLineupNames: string[] = [];
  const periodUsable = !!period && period.kind !== "unbounded" && period.days >= 28;
  for (const report of subscriptions) {
    if (report.visibility !== "visible" || !report.family) continue;
    if (seen.has(report.family.groupId)) continue;
    seen.add(report.family.groupId);
    const names = [report.name, ...report.sharedWith];
    if (report.leverage) {
      valued.push(report.leverage);
      leveragePlans.push(...names);
    } else if (report.activity?.facts.calls === 0 && report.familyPrice && periodUsable) {
      unusedPrices.push(report.familyPrice.amount);
      unusedNames.push(...names);
      leveragePlans.push(...names);
    } else if (
      report.activity &&
      report.relevantCalls === 0 &&
      report.familyPrice &&
      periodUsable
    ) {
      unusedPrices.push(report.familyPrice.amount);
      offLineupNames.push(...names);
      leveragePlans.push(...names);
    } else if (report.activity?.facts.calls) excluded.push(...names);
  }
  let leverage: Leverage | undefined;
  let leverageNote: string | undefined;
  if (!workload || !period) leverageNote = undefined;
  else if (!periodUsable)
    leverageNote =
      period.kind === "unbounded"
        ? "Choose a billing period of up to 31 days to compare recorded value with a monthly price."
        : `This period covers ${plural(period.days, "day")}. Leverage compares recorded value with one full monthly billing period.`;
  else if (valued.length === 0)
    leverageNote = excluded.length
      ? "The recorded work associated with your subscriptions could not be priced at accepted API rates."
      : undefined;
  else {
    const value = sumRanges(valued.map((part) => part.value));
    const price = [...valued.map((part) => part.price), ...unusedPrices].reduce(
      (sum, amount) => sum.add(amount),
      new Decimal(0),
    );
    const notes = [
      ...new Set(valued.map((part) => part.note)),
      unusedNames.length
        ? `Includes ${unusedNames.join(", ")} with no recorded activity in this period.`
        : undefined,
      offLineupNames.length
        ? `Includes ${offLineupNames.join(", ")}, whose associated calls used no model in its published lineup.`
        : undefined,
      excluded.length
        ? `Excludes ${excluded.join(", ")}: associated recorded work could not be priced.`
        : undefined,
    ].filter((note): note is string => note !== undefined);
    leverage = {
      low: new Decimal(value.low).div(price).toString(),
      high: new Decimal(value.high).div(price).toString(),
      value,
      price: price.toString(),
      priceBasis:
        valued.every((part) => part.priceBasis === "paid") && !unusedPrices.length
          ? "paid"
          : "published",
      subset: valued.some((part) => part.subset),
      pricedCalls: valued.reduce((sum, part) => sum + part.pricedCalls, 0),
      calls: valued.reduce((sum, part) => sum + part.calls, 0),
      excludedCalls: valued.reduce((sum, part) => sum + part.excludedCalls, 0),
      level:
        valued.every((part) => part.level === "measured") && !excluded.length
          ? "measured"
          : "estimated",
      note: notes.join(" "),
    };
  }

  const outside: OutsideWork[] = workload
    ? Object.entries(workload.sources)
        .filter(([sourceId, facts]) => {
          if (facts.calls === 0) return false;
          const family = familyOfSource(sourceId);
          return !family || !plans.some((plan) => familyOfPlan(plan.id) === family);
        })
        .map(([sourceId, facts]) => {
          const family = familyOfSource(sourceId);
          return {
            sourceId,
            name:
              workload.importSources.find((source) => source.id === sourceId)?.name ??
              SOURCE_NAMES[sourceId] ??
              sourceId,
            facts,
            share: overallCalls > 0 ? facts.calls / overallCalls : 0,
            familyName: family?.question ? family.name : undefined,
          };
        })
        .sort((a, b) => b.facts.calls - a.facts.calls)
    : [];

  return {
    model,
    subscriptions,
    planCount: plans.length,
    monthly,
    leverage,
    leverageNote,
    leveragePlans,
    notReadable: subscriptions
      .filter((report) => report.visibility === "not-readable")
      .map((report) => report.name),
    outside,
    opportunities: findOpportunities({
      subscriptions,
      outside,
      workload,
      catalog,
      rulesAsOf,
      currentStack: input.currentStack,
      familyResponses: input.familyResponses ?? {},
    }),
  };
}

const LOW_SHARE = 0.05;
const CONSOLIDATE_SHARE = 0.9;

function without(stack: readonly TargetKey[], remove: readonly TargetKey[]): TargetKey[] {
  return stack.filter((key) => !remove.includes(key));
}

function findOpportunities(context: {
  subscriptions: SubscriptionReport[];
  outside: OutsideWork[];
  workload: StackWorkload | undefined;
  catalog: PublicCatalog;
  rulesAsOf: string;
  currentStack: readonly TargetKey[];
  familyResponses: Partial<Record<DiscoveryGroupId, NonPlanResponse>>;
}): Opportunity[] {
  const { subscriptions, workload, currentStack } = context;
  if (!workload || workload.overall.calls === 0 || subscriptions.length === 0) return [];
  const periodText = stackPeriodLabel(workload.period);
  const actions: Opportunity[] = [];
  const reported = new Set<string>();

  // 1. Selected, readable, imported, and no associated calls in this period.
  for (const report of subscriptions) {
    const facts = report.activity?.facts;
    if (report.visibility !== "visible" || !facts || facts.calls !== 0 || !report.family) continue;
    reported.add(report.key);
    actions.push({
      id: `unused:${report.id}`,
      kind: "unused",
      question: "Do you still need this subscription?",
      subject: report.name,
      statement: `No compatible ${report.family.tool} activity was found in the imported histories for ${periodText}.`,
      figures: [
        { label: "Published price", value: priceText(report) },
        { label: `${report.family.tool} calls this period`, value: "0" },
      ],
      evidence: [
        report.evidence[0] ?? { level: "estimated", text: "Imported histories only." },
        {
          level: "unknown",
          text: "Use outside the histories StackReplay imported (another machine, the web app) is not visible here.",
        },
      ],
      monthlyDelta: report.monthlyUsd ? new Decimal(report.monthlyUsd).neg().toString() : undefined,
      test: { label: "Test removing it", proposed: without(currentStack, [report.key]) },
    });
  }

  // 2. Associated calls exist, but none used a model the plan's published lineup includes.
  for (const report of subscriptions) {
    const activity = report.activity;
    if (report.visibility !== "visible" || !activity || !report.family) continue;
    if (reported.has(report.key) || activity.facts.calls === 0 || activity.models.length === 0)
      continue;
    const resolved = activity.models.reduce((sum, model) => sum + model.calls, 0);
    const listed = activity.models.filter((model) => model.listed);
    if (listed.length > 0 || resolved < activity.facts.calls * 0.8) continue;
    reported.add(report.key);
    const tool = report.family.tool;
    actions.push({
      id: `off-lineup:${report.id}`,
      kind: "off-lineup",
      question: "Do you still need this subscription?",
      subject: report.name,
      statement: `None of the ${plural(activity.facts.calls, "recorded call")} from ${tool} used a model in ${report.name}'s reviewed published lineup. That work may have run on another sign-in or API keys.`,
      figures: [
        { label: "Published price", value: priceText(report) },
        { label: `${tool} calls`, value: activity.facts.calls.toLocaleString("en-US") },
        {
          label: "Recorded models",
          value: activity.models
            .slice(0, 3)
            .map((model) => model.name)
            .join(", "),
        },
      ],
      evidence: [
        {
          level: "published",
          text: `${report.name}'s reviewed lineup lists none of the ${plural(activity.models.length, "model")} recorded from ${tool}. A reviewed lineup can omit a model the provider added later.`,
        },
        report.evidence[0] ?? { level: "estimated", text: "Imported histories only." },
      ],
      monthlyDelta: report.monthlyUsd ? new Decimal(report.monthlyUsd).neg().toString() : undefined,
      test: { label: "Test removing it", proposed: without(currentStack, [report.key]) },
    });
  }

  // 3. A small share of this period's calls, or recorded value below its price.
  for (const report of subscriptions) {
    const activity = report.activity;
    if (report.visibility !== "visible" || !activity || activity.facts.calls === 0) continue;
    if (reported.has(report.key) || !report.family) continue;
    const belowPrice =
      report.leverage && !report.leverage.subset && new Decimal(report.leverage.high).lt(1);
    if (activity.share >= LOW_SHARE && !belowPrice) continue;
    reported.add(report.key);
    const value = activity.facts.value ?? activity.facts.pricedValue;
    actions.push({
      id: `low-use:${report.id}`,
      kind: "low-use",
      question: "Do you still need this subscription?",
      subject: report.name,
      statement: belowPrice
        ? `Its associated recorded work is valued at ${rangeText(report.leverage?.value ?? { low: "0", high: "0" })} at direct API rates, below its ${priceMoney(report.leverage?.price ?? "0")} ${report.leverage?.priceBasis === "paid" ? "paid amount" : "monthly price"}.`
        : `Only ${percentText(activity.share)} of this period's recorded calls came from ${report.family.tool}.`,
      figures: [
        { label: "Published price", value: priceText(report) },
        {
          label: `${report.family.tool} calls`,
          value: `${activity.facts.calls.toLocaleString("en-US")} · ${percentText(activity.share)}`,
        },
        ...(value
          ? [
              {
                label: activity.facts.value ? "API-equivalent" : "API-equivalent, priced calls",
                value: rangeText(value),
              },
            ]
          : []),
      ],
      evidence: [
        report.evidence[0] ?? { level: "estimated", text: "Imported histories only." },
        {
          level: "unknown",
          text: "API-equivalent value is not what API use would feel like or cost you in practice; it prices the same recorded tokens.",
        },
      ],
      monthlyDelta: report.monthlyUsd ? new Decimal(report.monthlyUsd).neg().toString() : undefined,
      test: { label: "Replay without it", proposed: without(currentStack, [report.key]) },
    });
  }

  // 4. Work another selected subscription's published lineup already covers.
  const byFamily = new Map<string, SubscriptionReport[]>();
  for (const report of subscriptions)
    if (report.family && report.visibility === "visible")
      byFamily.set(report.family.groupId, [...(byFamily.get(report.family.groupId) ?? []), report]);
  for (const [, reports] of byFamily) {
    const first = reports[0];
    const facts = first?.activity?.facts;
    if (!first || !facts || facts.calls === 0 || reports.some((r) => reported.has(r.key))) continue;
    const resolved = facts.models.reduce((sum, model) => sum + model.calls, 0);
    if (resolved === 0 || resolved < facts.calls * 0.8) continue;
    // Fold a smaller tool's work into a subscription that already carries more
    // of this workload, never the other way round.
    const receivers = subscriptions
      .filter(
        (other) =>
          other.family?.groupId !== first.family?.groupId &&
          other.available &&
          (other.activity?.facts.calls ?? 0) > facts.calls,
      )
      .map((other) => {
        const listed = listedModels(context.catalog, other.id, facts.models) ?? [];
        const calls = listed.filter((m) => m.listed).reduce((sum, m) => sum + m.calls, 0);
        return { other, share: calls / resolved };
      })
      .filter((entry) => entry.share >= CONSOLIDATE_SHARE)
      .sort((a, b) => b.share - a.share);
    const receiver = receivers[0];
    if (!receiver) continue;
    const keys = reports.map((r) => r.key);
    const delta = reports.every((r) => r.monthlyUsd)
      ? reports
          .reduce((sum, r) => sum.add(r.monthlyUsd ?? "0"), new Decimal(0))
          .neg()
          .toString()
      : undefined;
    keys.forEach((key) => {
      reported.add(key);
    });
    const tool = first.family?.tool ?? "this tool";
    actions.push({
      id: `consolidate:${first.family?.groupId}`,
      kind: "consolidate",
      question: "Could you consolidate?",
      subject: `${reports.map((r) => r.name).join(" + ")} → ${receiver.other.name}`,
      statement: `${percentText(receiver.share)} of recorded ${tool} calls with a resolved model used models that ${receiver.other.name}'s published lineup includes.`,
      figures: [
        { label: `${tool} calls`, value: facts.calls.toLocaleString("en-US") },
        ...((facts.value ?? facts.pricedValue)
          ? [
              {
                label: "API-equivalent",
                value: rangeText(facts.value ?? facts.pricedValue ?? { low: "0", high: "0" }),
              },
            ]
          : []),
        { label: `Covered by ${receiver.other.name}`, value: percentText(receiver.share) },
      ],
      evidence: [
        {
          level: "estimated",
          text: `Published model access only.${receiver.other.otherApps ? ` ${receiver.other.otherApps}` : ""}`,
        },
        {
          level: "unknown",
          text: `Cannot determine whether ${receiver.other.name} could absorb this work: its published allowance is not a fixed token quota.`,
        },
      ],
      monthlyDelta: delta,
      test: { label: "Test consolidation", proposed: without(currentStack, keys) },
    });
  }

  // 5. A cheaper tier in the same family that lists every recorded model.
  const downgrades: Opportunity[] = [];
  for (const report of subscriptions) {
    const facts = report.activity?.facts;
    if (report.visibility !== "visible" || !facts || facts.calls === 0 || !report.monthlyUsd)
      continue;
    if (reported.has(report.key) || report.sharedWith.length > 0 || !report.family) continue;
    if (facts.blocked && facts.blocked.attempts > 0) continue;
    const lower = report.tiers
      .filter((tier) => tier.direction === "lower" && tier.missing.length === 0)
      .at(-1);
    if (!lower?.monthlyUsd) continue;
    const delta = new Decimal(lower.monthlyUsd).minus(report.monthlyUsd).toString();
    downgrades.push({
      id: `downgrade:${report.id}`,
      kind: "downgrade",
      question: "Could you downgrade?",
      subject: `${report.name} → ${lower.name}`,
      statement: `${lower.name} lists every model recorded from ${report.family.tool} in this period, for ${priceMoney(new Decimal(delta).neg().toString())} less per month.`,
      figures: [
        { label: "Current", value: `${report.name} · ${priceText(report)}` },
        {
          label: "Alternative",
          value: `${lower.name} · ${priceMoney(lower.monthlyUsd)}/mo`,
        },
      ],
      evidence: [
        ...(report.allowance && lower.allowance
          ? [
              {
                level: "published" as const,
                text: allowanceChange(report.allowance, lower.allowance),
              },
            ]
          : []),
        ...(facts.blocked
          ? [
              {
                level: "measured" as const,
                text: `No limit events were recorded in ${report.family.tool} history in this period.`,
              },
            ]
          : []),
        {
          level: "unknown",
          text: `Cannot determine whether every recorded request would fit ${lower.name}: its published allowance is not a fixed token quota.`,
        },
      ],
      monthlyDelta: delta,
      test: {
        label: `Test ${priceMoney(lower.monthlyUsd)} plan`,
        proposed: currentStack.map((key) => (key === report.key ? lower.key : key)),
      },
    });
  }
  downgrades.sort((a, b) => new Decimal(a.monthlyDelta ?? 0).cmp(b.monthlyDelta ?? 0));
  actions.push(...downgrades);

  // 6. Recorded work in a family with plans, but no plan of that family selected.
  for (const work of context.outside) {
    const family = familyOfSource(work.sourceId);
    if (!family?.question || context.familyResponses[family.groupId]) continue;
    const value = work.facts.value ?? work.facts.pricedValue;
    const plans = plansAt(context.rulesAsOf);
    const candidate = (family.planIds as readonly string[])
      .map((id) => plans.find((plan) => plan.id === id))
      .filter((plan) => plan !== undefined && monthlyUsd(plan.price) !== undefined)
      .find((plan) =>
        (listedModels(context.catalog, plan?.id ?? "", work.facts.models) ?? []).every(
          (model) => model.listed,
        ),
      );
    if (!candidate || !value) continue;
    const price = monthlyUsd(candidate.price) ?? "0";
    if (new Decimal(value.low).lt(price)) continue;
    actions.push({
      id: `uncovered:${work.sourceId}`,
      kind: "uncovered",
      question: "Is this work outside your stack?",
      subject: `${work.name} · no ${family.name} plan selected`,
      statement: `${plural(work.facts.calls, "recorded call")} from ${work.name} are not associated with any subscription in your stack. ${candidate.name} lists every recorded model.`,
      figures: [
        { label: `${work.name} calls`, value: work.facts.calls.toLocaleString("en-US") },
        {
          label: work.facts.value ? "API-equivalent" : "API-equivalent, priced calls",
          value: rangeText(value),
        },
        { label: candidate.name, value: `${priceMoney(price)}/mo` },
      ],
      evidence: [
        {
          level: "measured",
          text: `API-equivalent of the recorded ${work.name} calls at accepted API rates.`,
        },
        {
          level: "unknown",
          text: `Cannot determine whether ${candidate.name} could carry this work: its published allowance is not a fixed token quota.`,
        },
      ],
      monthlyDelta: price,
      test: {
        label: `Test adding ${candidate.name}`,
        proposed: [...currentStack, `plan:${candidate.id}`],
      },
    });
  }

  // A factual leverage highlight, never a value judgement.
  const highlights = subscriptions
    .filter(
      (report) =>
        report.leverage &&
        !report.leverage.subset &&
        new Decimal(report.leverage.low).gte(2) &&
        report.sharedWith.length === 0,
    )
    .sort((a, b) => new Decimal(b.leverage?.low ?? 0).cmp(a.leverage?.low ?? 0))
    .slice(0, 1)
    .map((report): Opportunity => {
      const leverage = report.leverage as Leverage;
      return {
        id: `leverage:${report.id}`,
        kind: "leverage",
        question: "Subscription leverage",
        subject: report.name,
        statement: `${report.name} is associated with ${rangeText(leverage.value)} of API-equivalent recorded work, ${leverageText(leverage)} its ${priceMoney(leverage.price)} ${leverage.priceBasis === "paid" ? "paid amount" : "monthly price"}.`,
        figures: [
          {
            label: leverage.priceBasis === "paid" ? "Paid" : "Published price",
            value: priceMoney(leverage.price),
          },
          { label: "API-equivalent recorded work", value: rangeText(leverage.value) },
          { label: "Leverage", value: leverageText(leverage) },
        ],
        evidence: [
          { level: leverage.level, text: leverage.note },
          {
            level: "unknown",
            text: "Not money saved: it values the same recorded tokens at today's direct API rates.",
          },
        ],
        inspect: { label: "Inspect the calculation", anchor: `report-${report.id}` },
      };
    });

  const chosen = actions.slice(0, highlights.length ? 3 : 4);
  return [...chosen, ...highlights, ...actions.slice(chosen.length)].slice(0, 4);
}

/** "20× Pro session allowance → 5× Pro session allowance; five-hour and weekly limits." */
function allowanceChange(from: string, to: string): string {
  const [head = from, ...fromRest] = from.split("; ");
  const [next = to, ...toRest] = to.split("; ");
  const shared = fromRest.join("; ");
  return shared && shared === toRest.join("; ")
    ? `Published allowance: ${head} → ${next}; ${shared}.`
    : `Published allowance: ${from} → ${to}.`;
}

function priceText(report: Pick<SubscriptionReport, "monthlyUsd" | "price">): string {
  if (report.monthlyUsd) return `${priceMoney(report.monthlyUsd)}/mo`;
  if (report.price)
    return `${report.price.amount} ${report.price.currency}/${report.price.interval}`;
  return "Price unavailable";
}

export { priceText as subscriptionPriceText };

export interface ScenarioChange {
  id: string;
  kind: "removed" | "added" | "tier";
  title: string;
  monthlyDelta?: string | undefined;
  findings: Evidence[];
}

export interface ScenarioResult {
  unchanged: boolean;
  currentMonthly?: string | undefined;
  proposedMonthly?: string | undefined;
  monthlyDelta?: string | undefined;
  changes: ScenarioChange[];
  /** Recorded work whose associated subscriptions are all removed and not re-homed. */
  uncovered?:
    | { calls: number; tools: string[]; value?: Range | undefined; pricedCalls: number }
    | undefined;
}

function planSummary(key: TargetKey, rulesAsOf: string) {
  const id = key.slice(5);
  const plan = plansAt(rulesAsOf).find((entry) => entry.id === id);
  return { key, id, name: plan?.name ?? id, monthlyUsd: monthlyUsd(plan?.price) };
}

function totalMonthly(keys: readonly TargetKey[], rulesAsOf: string): string | undefined {
  const plans = keys
    .filter((key) => key.startsWith("plan:"))
    .map((key) => planSummary(key, rulesAsOf));
  if (plans.length === 0) return "0";
  if (plans.some((plan) => plan.monthlyUsd === undefined)) return undefined;
  return plans.reduce((sum, plan) => sum.add(plan.monthlyUsd ?? "0"), new Decimal(0)).toString();
}

/**
 * What changing the stack means for this recorded workload. Published price
 * arithmetic is exact; workload effects are the associated recorded facts;
 * capacity effects stay undetermined unless recorded limit events apply.
 */
export function analyzeScenario(input: {
  current: readonly TargetKey[];
  proposed: readonly TargetKey[];
  workload?: StackWorkload | undefined;
  rulesAsOf?: string | undefined;
}): ScenarioResult {
  const rulesAsOf = input.rulesAsOf ?? DECISION_MARKET.rulesAt;
  const asOf = rulesAsOf.slice(0, 10);
  const catalog = publicCatalog(asOf);
  const current = [...new Set(input.current.filter((key) => key.startsWith("plan:")))];
  const proposed = [...new Set(input.proposed.filter((key) => key.startsWith("plan:")))];
  const currentMonthly = totalMonthly(current, rulesAsOf);
  const proposedMonthly = totalMonthly(proposed, rulesAsOf);
  const monthlyDelta =
    currentMonthly !== undefined && proposedMonthly !== undefined
      ? new Decimal(proposedMonthly).minus(currentMonthly).toString()
      : undefined;
  const workload = input.workload;
  const periodText = workload ? stackPeriodLabel(workload.period) : undefined;
  const overallCalls = workload?.overall.calls ?? 0;
  const groupOf = (key: TargetKey) => familyOfPlan(key.slice(5))?.groupId ?? key;
  const groups = [...new Set([...current, ...proposed].map(groupOf))];
  const changes: ScenarioChange[] = [];
  const uncoveredFacts: { tool: string; facts: WorkloadFacts }[] = [];

  for (const group of groups) {
    const before = current
      .filter((key) => groupOf(key) === group)
      .map((k) => planSummary(k, rulesAsOf));
    const after = proposed
      .filter((key) => groupOf(key) === group)
      .map((k) => planSummary(k, rulesAsOf));
    const same =
      before.length === after.length &&
      before.every((plan) => after.some((p) => p.key === plan.key));
    if (same) continue;
    const family = familyOfPlan((before[0] ?? after[0])?.id ?? "");
    const facts = family && workload ? familyFacts(family, workload) : undefined;
    const tool = family ? toolName(family, workload) : undefined;
    const confirmed =
      family && facts ? familyConfirmed(family, facts, workload?.confirmation) : false;
    const level = confirmed ? ("measured" as const) : ("estimated" as const);
    const sum = (plans: typeof before) =>
      plans.every((plan) => plan.monthlyUsd !== undefined)
        ? plans.reduce((total, plan) => total.add(plan.monthlyUsd ?? "0"), new Decimal(0))
        : undefined;
    const beforeSum = sum(before);
    const afterSum = sum(after);
    const delta =
      beforeSum !== undefined && afterSum !== undefined
        ? afterSum.minus(beforeSum).toString()
        : undefined;
    const names = (plans: typeof before) => plans.map((plan) => plan.name).join(" + ");
    const findings: Evidence[] = [];
    const visible = !!family && !!workload && inImport(family, workload);
    const value = facts?.value ?? facts?.pricedValue;
    const workText = (f: WorkloadFacts) =>
      `${plural(f.calls, "recorded call")} from ${tool} (${percentText(overallCalls ? f.calls / overallCalls : 0)} of this period)${
        f.value
          ? ` · ${rangeText(f.value)} API-equivalent`
          : f.pricedValue
            ? ` · ${rangeText(f.pricedValue)} API-equivalent for ${plural(f.pricedValue.calls, "priced call")}`
            : ""
      }.`;

    if (before.length > 0 && after.length === 0) {
      if (!family?.sourceIds.length)
        findings.push({
          level: "unknown",
          text: `StackReplay cannot read ${names(before)} usage history, so the effect on your work cannot be determined.`,
        });
      else if (!workload)
        findings.push({
          level: "unknown",
          text: "Select a workload to see the recorded work this affects.",
        });
      else if (!visible)
        findings.push({
          level: "unknown",
          text: `No ${tool} history is in this workload, so its use cannot be determined. Scan it to check.`,
        });
      else if (!facts || facts.calls === 0)
        findings.push({
          level,
          text: `No ${tool} activity was found in the imported histories for ${periodText}. No recorded work in this period changes.`,
        });
      else {
        findings.push({ level, text: `Affects ${workText(facts)}` });
        const resolved = facts.models.reduce((total, model) => total + model.calls, 0);
        const receivers = proposed
          .filter((key) => groupOf(key) !== group)
          .map((key) => {
            const listed = listedModels(catalog, key.slice(5), facts.models) ?? [];
            const calls = listed.filter((m) => m.listed).reduce((total, m) => total + m.calls, 0);
            return { plan: planSummary(key, rulesAsOf), share: resolved ? calls / resolved : 0 };
          })
          .sort((a, b) => b.share - a.share);
        const best = receivers[0];
        if (best && best.share >= 0.5) {
          const otherApps = subscriptionPublishedTerms(best.plan.id, asOf)?.otherApps;
          findings.push({
            level: "estimated",
            text: `${best.plan.name} lists the models for ${percentText(best.share)} of these calls.${otherApps ? ` ${otherApps}` : ""}`,
          });
        } else {
          findings.push({
            level,
            text: `No plan in the proposed stack lists these models.${value ? ` At current direct API rates this recorded work is valued at ${rangeText(value)}.` : ""}`,
          });
          uncoveredFacts.push({ tool: tool ?? "", facts });
        }
        findings.push({
          level: "unknown",
          text: "Cannot determine whether other subscriptions could absorb this work: published allowances are not fixed token quotas.",
        });
      }
    } else if (before.length === 0 && after.length > 0) {
      const plan = after[0];
      if (!family?.sourceIds.length || !plan)
        findings.push({
          level: "unknown",
          text: `StackReplay cannot read ${names(after)} usage history, so its fit for your work cannot be determined.`,
        });
      else if (facts && facts.calls > 0) {
        findings.push({
          level,
          text: `${workText(facts)} This work has no associated subscription in your current stack.`,
        });
        const listed = listedModels(catalog, plan.id, facts.models) ?? [];
        const missing = listed.filter((m) => !m.listed);
        findings.push({
          level: "published",
          text:
            missing.length === 0
              ? `${plan.name} lists every model recorded from ${tool}.`
              : `${plan.name}'s published lineup does not include ${missing.map((m) => m.name).join(", ")}.`,
        });
        findings.push({
          level: "unknown",
          text: `Cannot determine whether ${plan.name} could carry this work: its published allowance is not a fixed token quota.`,
        });
      } else
        findings.push({
          level: visible ? level : "unknown",
          text: visible
            ? `No ${tool} activity was found in the imported histories for ${periodText}.`
            : `No ${tool} history is in this workload.`,
        });
    } else {
      const from = before[0];
      const to = after[0];
      if (before.length === 1 && after.length === 1 && from && to) {
        const fromTerms = subscriptionPublishedTerms(from.id, asOf)?.allowanceSummary;
        const toTerms = subscriptionPublishedTerms(to.id, asOf)?.allowanceSummary;
        const lower =
          from.monthlyUsd && to.monthlyUsd ? new Decimal(to.monthlyUsd).lt(from.monthlyUsd) : false;
        if (fromTerms && toTerms)
          findings.push({ level: "published", text: allowanceChange(fromTerms, toTerms) });
        if (facts && facts.calls > 0) {
          findings.push({ level, text: `Affects ${workText(facts)}` });
          const listed = listedModels(catalog, to.id, facts.models) ?? [];
          const missing = listed.filter((m) => !m.listed);
          findings.push({
            level: "published",
            text:
              missing.length === 0
                ? `${to.name} lists ${listed.length === 1 ? "the model" : listed.length === 2 ? "both models" : `all ${listed.length} models`} recorded from ${tool} in this period.`
                : `${to.name}'s published lineup does not include ${missing.map((m) => m.name).join(", ")} (${plural(
                    missing.reduce((n, m) => n + m.calls, 0),
                    "call",
                  )}).`,
          });
          if (facts.blocked) {
            findings.push({
              level: "measured",
              text:
                facts.blocked.attempts > 0
                  ? `${plural(facts.blocked.attempts, "blocked attempt")} on ${plural(facts.blocked.days, "day")} were recorded in ${tool} history in this period.`
                  : `No limit events were recorded in ${tool} history in this period.`,
            });
            if (lower && facts.blocked.attempts > 0)
              findings.push({
                level: "likely",
                text: `Limits were already recorded in this period, so a smaller published allowance is likely to interrupt more of this work.`,
              });
          }
        } else if (visible)
          findings.push({
            level,
            text: `No ${tool} activity was found in the imported histories for ${periodText}.`,
          });
        findings.push({
          level: "unknown",
          text: `Cannot determine whether every recorded request would fit ${to.name}: its published allowance is not a fixed token quota StackReplay can replay.`,
        });
      } else {
        findings.push({
          level: "unknown",
          text: `Recorded calls cannot be split between ${names(before)}, so the effect of this change cannot be determined per plan.`,
        });
      }
    }
    changes.push({
      id: String(group),
      kind: before.length && !after.length ? "removed" : !before.length ? "added" : "tier",
      title:
        before.length && !after.length
          ? `Remove ${names(before)}`
          : !before.length
            ? `Add ${names(after)}`
            : `${names(before)} → ${names(after)}`,
      monthlyDelta: delta,
      findings,
    });
  }

  const complete = uncoveredFacts.every((entry) => entry.facts.value);
  const uncovered = uncoveredFacts.length
    ? {
        calls: uncoveredFacts.reduce((sum, entry) => sum + entry.facts.calls, 0),
        tools: uncoveredFacts.map((entry) => entry.tool),
        pricedCalls: uncoveredFacts.reduce(
          (sum, entry) =>
            sum + (entry.facts.value ? entry.facts.calls : (entry.facts.pricedValue?.calls ?? 0)),
          0,
        ),
        value:
          complete || uncoveredFacts.every((entry) => entry.facts.value ?? entry.facts.pricedValue)
            ? sumRanges(
                uncoveredFacts.map(
                  (entry) =>
                    entry.facts.value ?? entry.facts.pricedValue ?? { low: "0", high: "0" },
                ),
              )
            : undefined,
      }
    : undefined;

  return {
    unchanged: changes.length === 0,
    currentMonthly,
    proposedMonthly,
    monthlyDelta,
    changes,
    uncovered,
  };
}

/** The same stack serialized for a Replay link: catalog ids only. */
export function stackParam(keys: readonly TargetKey[]): string {
  return keys
    .filter((key) => key.startsWith("plan:"))
    .map((key) => key.slice(5))
    .join(",");
}
export function parseStackParam(value: string | undefined): TargetKey[] | undefined {
  if (value === undefined) return undefined;
  const ids = value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[a-z0-9][a-z0-9-]{0,80}$/u.test(id));
  return [...new Set(ids)].slice(0, 20).map((id): TargetKey => `plan:${id}`);
}

/** Paid amounts entered for exactly this period, keyed by plan target. */
export function paidForPeriod(
  billing: Readonly<Record<string, BillingFact>>,
  period: StackPeriod,
): Record<string, string> {
  if (period.kind !== "billing") return {};
  const paid: Record<string, string> = {};
  for (const [key, fact] of Object.entries(billing))
    if (fact.paid !== undefined && fact.cycle && periodKey(fact.cycle) === periodKey(period.period))
      paid[key] = fact.paid;
  return paid;
}

function signedMonthly(delta: string): string {
  const value = new Decimal(delta);
  if (value.isZero()) return "$0/mo";
  return `${value.isNegative() ? "−" : "+"}${priceMoney(value.abs().toString())}/mo`;
}

function bounded(text: string): string {
  return text.length > 250 ? `${text.slice(0, 249)}…` : text;
}

/** A saved stack assessment's title: the proposed plans and the published spend change. */
export function stackAssessmentTitle(
  result: ScenarioResult,
  proposed: readonly TargetKey[],
  rulesAsOf: string = DECISION_MARKET.rulesAt,
): string {
  const names = proposed
    .filter((key) => key.startsWith("plan:"))
    .map((key) => planSummary(key, rulesAsOf).name);
  return bounded(
    `Stack scenario: ${names.join(" + ") || "no subscriptions"}${
      result.monthlyDelta !== undefined ? ` (${signedMonthly(result.monthlyDelta)})` : ""
    }`,
  );
}

/** Bounded aggregate lines for Compare: findings with their evidence words, no events. */
export function stackAssessmentLines(result: ScenarioResult, workload: StackWorkload): string[] {
  const findings = result.changes.flatMap((change) =>
    change.findings.map(
      (finding) => `${change.title} · ${EVIDENCE_LABELS[finding.level]}: ${finding.text}`,
    ),
  );
  const lines = [
    `${stackPeriodLabel(workload.period)} · ${workload.overall.calls.toLocaleString("en-US")} recorded calls.`,
    result.currentMonthly !== undefined && result.proposedMonthly !== undefined
      ? `Published subscription spend: ${priceMoney(result.currentMonthly)}/mo → ${priceMoney(result.proposedMonthly)}/mo.`
      : "Published subscription spend could not be compared: a selected plan has no monthly USD price.",
    ...(result.unchanged ? ["No change from your current stack."] : findings),
    ...(result.uncovered?.value
      ? [
          `Recorded work left without an associated subscription: ${result.uncovered.calls.toLocaleString("en-US")} calls, ${rangeText(result.uncovered.value)} at current direct API rates.`,
        ]
      : []),
  ].map(bounded);
  return [
    ...lines.slice(0, 19),
    "No selected subscription publishes a fixed token quota; plan fit is not claimed.",
  ];
}
