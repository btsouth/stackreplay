import { Decimal } from "@stackreplay/replay-engine";
import type { TargetKey } from "./routes";
import {
  allowanceChange,
  type Evidence,
  type EvidenceLevel,
  type Opportunity,
  priceMoney,
  publishedAllowanceIsSmaller,
  rangeText,
  type StackAnalysis,
  type StackWorkload,
  type SubscriptionReport,
  shareText,
  stackPeriodLabel,
  subscriptionPriceText,
} from "./stack-analysis";

/**
 * My Stack's first screen: what you pay, what workload is loaded, what
 * StackReplay can analyze, and at most three things worth investigating.
 *
 * Pure presentation over `analyzeStack`'s results. Nothing here prices
 * events or models capacity: a finding states recorded evidence and published
 * facts beside each other, and whether a plan would carry the work stays
 * "cannot be proven" unless the provider publishes a quota the engine can
 * replay. Subscription leverage is deliberately absent from this layer.
 */

const count = (value: number) => value.toLocaleString("en-US");
const plural = (value: number, one: string, many = `${one}s`) =>
  `${count(value)} ${value === 1 ? one : many}`;

/** One figure on the summary strip or inside a finding. */
export interface InvestigationRow {
  id: string;
  label: string;
  value: string;
  detail?: string | undefined;
  /** How much the figure can be trusted; printed as the evidence word. */
  evidence?: EvidenceLevel | undefined;
  tone?: "warning" | "positive" | "muted" | undefined;
}

export interface Investigation {
  id: string;
  kind: "tier-review" | "coverage-gap" | Exclude<Opportunity["kind"], "leverage" | "downgrade">;
  /** The question the person would ask. */
  question: string;
  subject: string;
  rows: InvestigationRow[];
  /** Secondary evidence lines, already worded with their evidence level. */
  evidence: Evidence[];
  /** Signed change in published monthly subscription spend. */
  monthlyDelta?: string | undefined;
  /** Published monthly spend this finding cannot evaluate. */
  atStake?: string | undefined;
  action?:
    | { kind: "test"; label: string; proposed: TargetKey[] }
    | { kind: "link"; label: string; href: string }
    | undefined;
}

/* ---------- summary: coverage ---------- */

export type CoverageState =
  | "loaded"
  | "no-activity"
  | "not-loaded"
  | "not-readable"
  | "no-workload";

export interface CoverageLine {
  key: TargetKey;
  plan: string;
  /** The recording tool StackReplay reads for this plan, if any. */
  tool?: string | undefined;
  state: CoverageState;
  text: string;
  monthlyUsd?: string | undefined;
}

export interface StackCoverage {
  lines: CoverageLine[];
  /** Recording tools with any history in the selected workload. */
  loadedTools: string[];
  analyzed: number;
  total: number;
  /** Published monthly USD of selected plans whose use cannot be analyzed from this workload. */
  unanalyzedMonthly?: string | undefined;
  /** One sentence that says plainly what is and is not being evaluated. */
  headline: string;
}

export function stackCoverage(
  analysis: StackAnalysis,
  workload: StackWorkload | undefined,
): StackCoverage {
  const loadedTools = (workload?.importSources ?? [])
    .filter((source) => source.events > 0)
    .map((source) => source.name);
  const lines = analysis.subscriptions.map((report): CoverageLine => {
    const tool = report.family?.tool;
    const base = { key: report.key, plan: report.name, tool, monthlyUsd: report.monthlyUsd };
    switch (report.visibility) {
      case "visible":
        return report.activity && report.activity.facts.calls === 0
          ? {
              ...base,
              state: "no-activity",
              text: `${tool} history loaded · no calls in this period`,
            }
          : { ...base, state: "loaded", text: `${tool} history loaded` };
      case "not-imported":
        return { ...base, state: "not-loaded", text: `No ${tool} history in this workload` };
      case "not-readable":
        return {
          ...base,
          state: "not-readable",
          text: "StackReplay cannot read this plan's history",
        };
      default:
        return {
          ...base,
          state: "no-workload",
          text: tool ? `Reads ${tool} history` : "No readable history",
        };
    }
  });
  const analyzed = lines.filter(
    (line) => line.state === "loaded" || line.state === "no-activity",
  ).length;
  const missing = lines.filter(
    (line) => line.state === "not-loaded" || line.state === "not-readable",
  );
  const unanalyzedMonthly =
    missing.length > 0 && missing.every((line) => line.monthlyUsd !== undefined)
      ? missing.reduce((sum, line) => sum.add(line.monthlyUsd ?? "0"), new Decimal(0)).toString()
      : undefined;
  const headline = !workload
    ? "Select a workload to see which subscriptions StackReplay can evaluate."
    : lines.length === 0
      ? `${loadedTools.length > 0 ? `${loadedTools.join(" and ")} history loaded` : "No history loaded"}. Add the subscriptions you pay for to evaluate them.`
      : analyzed === lines.length
        ? `Every subscription in your stack has its history loaded.`
        : analyzed === 0
          ? `None of your ${plural(lines.length, "subscription")} can be evaluated from this workload.`
          : `Only ${loadedTools.join(" and ")} history is loaded, so ${plural(analyzed, "subscription")} of ${lines.length} can be evaluated.${
              missing.length > 0
                ? ` ${missing.map((line) => line.plan).join(" and ")}${unanalyzedMonthly ? ` (${priceMoney(unanalyzedMonthly)}/mo)` : ""} ${missing.length === 1 ? "is" : "are"} not evaluated.`
                : ""
            }`;
  return {
    lines,
    loadedTools,
    analyzed,
    total: lines.length,
    unanalyzedMonthly,
    headline,
  };
}

/* ---------- findings ---------- */

function activityRow(report: SubscriptionReport, workload: StackWorkload): InvestigationRow {
  const facts = report.activity?.facts;
  if (!facts) return { id: "activity", label: "Recorded activity", value: "Not visible" };
  const unit = facts.distinctResponses ? "response" : "call";
  const days =
    workload.period.kind !== "unbounded"
      ? `${facts.activeDays} of ${workload.period.days} days active`
      : `${plural(facts.activeDays, "active day")}`;
  return {
    id: "activity",
    label: "Recorded activity",
    value: plural(facts.calls, unit),
    detail: `${days} · ${plural(facts.models.length, "model")} · ${report.family?.tool ?? "recorded"} history`,
    evidence: report.activity?.confirmed ? "measured" : "estimated",
  };
}

function pressureRow(report: SubscriptionReport): InvestigationRow {
  const facts = report.activity?.facts;
  const blocked = facts?.blocked;
  if (blocked === undefined)
    return {
      id: "pressure",
      label: "Capacity pressure",
      value: "Not recorded",
      detail: `${report.family?.tool ?? "This tool"} history does not record limit events`,
      evidence: "unknown",
      tone: "muted",
    };
  if (blocked.attempts > 0)
    return {
      id: "pressure",
      label: "Capacity pressure",
      value: `${plural(blocked.attempts, "blocked attempt")} across ${plural(blocked.days, "day")}`,
      detail: `Limit events recorded on ${report.name} in this period`,
      evidence: "measured",
      tone: "warning",
    };
  return {
    id: "pressure",
    label: "Capacity pressure",
    value: "No limit events recorded",
    detail: `In ${report.family?.tool ?? "recorded"} history for this period`,
    evidence: report.activity?.confirmed ? "measured" : "estimated",
    tone: "positive",
  };
}

/**
 * "Could you move to a cheaper tier?" for one subscription whose history is
 * loaded: the recorded activity, the recorded capacity pressure, whether the
 * cheaper tier lists the recorded models, the exact published spend change,
 * and the fit question stated as what it is: not provable from published
 * limits. Recorded blocked attempts make an interruption likely, never certain.
 */
function tierReview(
  report: SubscriptionReport,
  workload: StackWorkload,
  currentStack: readonly TargetKey[],
): Investigation | undefined {
  const facts = report.activity?.facts;
  if (report.visibility !== "visible" || !facts || facts.calls === 0 || !report.monthlyUsd)
    return undefined;
  if (report.sharedWith.length > 0) return undefined;
  const lower = report.tiers.filter((tier) => tier.direction === "lower").at(-1);
  if (!lower?.monthlyUsd) return undefined;
  const delta = new Decimal(lower.monthlyUsd).minus(report.monthlyUsd).toString();
  const models = report.activity?.models ?? [];
  const resolved = models.reduce((sum, model) => sum + model.calls, 0);
  const missing = lower.missing;
  const missingCalls = missing.reduce((sum, model) => sum + model.calls, 0);
  const unresolved = facts.calls - resolved;
  const coverage: InvestigationRow =
    models.length === 0
      ? {
          id: "lineup",
          label: `${lower.name} model coverage`,
          value: "Cannot be checked",
          detail: "No recorded call resolved to a catalog model",
          evidence: "unknown",
          tone: "muted",
        }
      : missing.length === 0
        ? {
            id: "lineup",
            label: `${lower.name} model coverage`,
            value: `Lists all ${plural(models.length, "recorded model")}`,
            detail:
              unresolved > 0
                ? `${plural(unresolved, "call")} with unresolved models not checked`
                : "Every recorded call used a model it lists",
            evidence: "published",
            tone: "positive",
          }
        : {
            id: "lineup",
            label: `${lower.name} model coverage`,
            value: `${shareText((resolved - missingCalls) / facts.calls)} of recorded calls`,
            detail: `Not listed: ${missing
              .slice(0, 3)
              .map((model) => `${model.name} (${count(model.calls)})`)
              .join(
                ", ",
              )}${unresolved > 0 ? ` · ${plural(unresolved, "call")} with unresolved models not checked` : ""}`,
            evidence: "published",
            tone: "warning",
          };
  const blocked = facts.blocked?.attempts ?? 0;
  const evidence: Evidence[] = [];
  if (report.allowance && lower.allowance)
    evidence.push({ level: "published", text: allowanceChange(report.allowance, lower.allowance) });
  if (blocked > 0)
    evidence.push(
      report.allowance !== undefined &&
        lower.allowance !== undefined &&
        publishedAllowanceIsSmaller(report.allowance, lower.allowance)
        ? {
            level: "likely",
            text: `Limits were already hit on ${report.name}. ${lower.name} publishes a smaller allowance, so the same work is likely to be interrupted more often.`,
          }
        : {
            level: "unknown",
            text: `Limits were already hit on ${report.name}. Whether ${lower.name} allows more or less usage is not established by published terms.`,
          },
    );
  evidence.push({
    level: "unknown",
    text: `Whether every recorded request would fit ${lower.name} cannot be proven: its published allowance is not a fixed quota StackReplay can replay.`,
  });
  return {
    id: `tier-review:${report.id}`,
    kind: "tier-review",
    question: `Could you move to a cheaper ${report.family?.name ?? ""} tier?`.replace("  ", " "),
    subject: `${report.name} → ${lower.name}`,
    rows: [
      {
        id: "current",
        label: "Current",
        value: `${report.name} · ${subscriptionPriceText(report)}`,
        evidence: "published",
      },
      activityRow(report, workload),
      pressureRow(report),
      coverage,
      {
        id: "spend",
        label: "Published spend change",
        value: `${new Decimal(delta).isNegative() ? "−" : "+"}${priceMoney(new Decimal(delta).abs().toString())}/mo`,
        detail: `${subscriptionPriceText(report)} → ${priceMoney(lower.monthlyUsd)}/mo`,
        evidence: "published",
      },
      {
        id: "fit",
        label: "Exact fit",
        value: "Cannot be proven",
        detail: "From provider-published limits",
        evidence: "unknown",
        tone: "muted",
      },
    ],
    evidence,
    monthlyDelta: delta,
    action: {
      kind: "test",
      label: "Analyze downgrade",
      proposed: currentStack.map((key) => (key === report.key ? lower.key : key)),
    },
  };
}

/** Subscriptions whose use this workload cannot show, with the spend that leaves unexamined. */
function coverageGap(analysis: StackAnalysis, workload: StackWorkload): Investigation | undefined {
  const missing = analysis.subscriptions.filter(
    (report) => report.visibility === "not-imported" || report.visibility === "not-readable",
  );
  if (missing.length === 0) return undefined;
  const readable = missing.filter((report) => report.visibility === "not-imported");
  const tools = [...new Set(readable.map((report) => report.family?.tool ?? ""))].filter(Boolean);
  const loaded = workload.importSources.filter((source) => source.events > 0).map((s) => s.name);
  const prices = missing.map((report) => report.monthlyUsd);
  const atStake = prices.every((price) => price !== undefined)
    ? prices.reduce((sum, price) => sum.add(price ?? "0"), new Decimal(0)).toString()
    : undefined;
  return {
    id: "coverage-gap",
    kind: "coverage-gap",
    question:
      missing.length === 1
        ? "Which subscription can't this workload evaluate?"
        : "Which subscriptions can't this workload evaluate?",
    subject: missing.map((report) => report.name).join(" · "),
    rows: [
      ...(atStake
        ? [
            {
              id: "at-stake",
              label: "Spend not evaluated",
              value: `${priceMoney(atStake)}/mo`,
              detail: `${plural(missing.length, "subscription")} at published prices`,
              evidence: "published" as const,
            },
          ]
        : []),
      {
        id: "loaded",
        label: "History loaded",
        value: loaded.length > 0 ? loaded.join(", ") : "None",
        evidence: "measured",
      },
      ...missing.map(
        (report): InvestigationRow => ({
          id: `missing:${report.id}`,
          label: report.name,
          value:
            report.visibility === "not-imported"
              ? `No ${report.family?.tool} history loaded`
              : "History not readable by StackReplay",
          evidence: "unknown",
          tone: "muted",
        }),
      ),
    ],
    evidence: [
      {
        level: "unknown",
        text: "StackReplay sees only the histories in this workload. Use on another machine or in a web app is not visible here.",
      },
    ],
    atStake,
    action:
      tools.length > 0
        ? { kind: "link", label: `Scan ${tools.join(" and ")} history`, href: "/app/import" }
        : undefined,
  };
}

function fromOpportunity(opportunity: Opportunity): Investigation | undefined {
  if (opportunity.kind === "leverage" || opportunity.kind === "downgrade") return undefined;
  return {
    id: opportunity.id,
    kind: opportunity.kind,
    question: opportunity.question,
    subject: opportunity.subject,
    rows: [
      { id: "statement", label: "Finding", value: opportunity.statement },
      ...opportunity.figures.map((figure, index) => ({
        id: `figure-${index}`,
        label: figure.label,
        value: figure.value,
      })),
    ],
    evidence: opportunity.evidence,
    monthlyDelta: opportunity.monthlyDelta,
    action: opportunity.test
      ? { kind: "test", label: opportunity.test.label, proposed: opportunity.test.proposed }
      : undefined,
  };
}

export const MAX_INVESTIGATIONS = 3;

/**
 * At most three findings, most decision-relevant first: the cheaper-tier
 * review for the subscription with the most recorded pressure and use, then
 * removals the recorded work supports, then subscriptions this workload
 * cannot see, then further tier reviews and remaining findings. Nothing is
 * added to fill space.
 */
export function investigations(input: {
  analysis: StackAnalysis;
  workload: StackWorkload | undefined;
  currentStack: readonly TargetKey[];
}): Investigation[] {
  const { analysis, workload, currentStack } = input;
  if (!workload || workload.overall.calls === 0) return [];
  const reviews = analysis.subscriptions
    .map((report) => ({ report, review: tierReview(report, workload, currentStack) }))
    .filter((entry): entry is { report: SubscriptionReport; review: Investigation } =>
      Boolean(entry.review),
    )
    .sort(
      (a, b) =>
        (b.report.activity?.facts.blocked?.attempts ?? 0) -
          (a.report.activity?.facts.blocked?.attempts ?? 0) ||
        (b.report.activity?.facts.calls ?? 0) - (a.report.activity?.facts.calls ?? 0),
    )
    .map((entry) => entry.review);
  const opportunities = analysis.opportunities
    .map(fromOpportunity)
    .filter((entry): entry is Investigation => entry !== undefined);
  const removals = opportunities.filter(
    (entry) => entry.kind === "unused" || entry.kind === "off-lineup",
  );
  const rest = opportunities.filter(
    (entry) => entry.kind !== "unused" && entry.kind !== "off-lineup",
  );
  const gap = coverageGap(analysis, workload);
  // A subscription already covered by a removal finding is not also reviewed for a cheaper tier.
  const removed = new Set(removals.map((entry) => entry.id.split(":")[1]));
  const tiers = reviews.filter((entry) => !removed.has(entry.id.split(":")[1]));
  // The heaviest-used subscription's tier question leads; removals and the
  // coverage gap outrank a second or third tier question.
  const ordered = [
    ...tiers.slice(0, 1),
    ...removals,
    ...(gap ? [gap] : []),
    ...tiers.slice(1),
    ...rest,
  ];
  return ordered.slice(0, MAX_INVESTIGATIONS);
}

/** The workload strip's period words ("Aug 24 – Sep 23, 2026 · 31 days"). */
export function workloadPeriodText(workload: StackWorkload): string {
  const period = workload.period;
  return period.kind === "unbounded"
    ? stackPeriodLabel(period)
    : `${stackPeriodLabel(period)} · ${plural(period.days, "day")}`;
}

export { rangeText };
