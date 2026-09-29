import {
  exceedText,
  formatCatalogDate,
  limitSentence,
  priceText,
  verificationText,
} from "./catalog-copy";
import { lifecycleRank, type PublicModelSummary, type PublicPlanSummary } from "./public-catalog";
import { includedAccessModels, type SubscriptionAccess } from "./subscription-access";
import type { SubscriptionPublishedTerms } from "./subscription-published-terms";

/**
 * Public plan comparison, in plain words (launch).
 *
 * The public /compare page answers "how do these targets differ on paper?".
 * Each fact below reads one catalog field and says it the way a person asks
 * it: what it costs, which models it includes, which coding tools it covers,
 * how much usage it allows, what StackReplay can simulate, and what happens
 * after the limit. The exact catalog detail stays available for the inspect
 * view, built from the same plan summary.
 *
 * No score, ranking or winner is computed here.
 */

export interface CompareModel {
  id: string;
  name: string;
  legacy: boolean;
  /** Developer id, or undefined when the record does not state one. */
  developerId?: string;
}

export interface CompareRule {
  id: string;
  name: string;
  /** "Model", "Legacy model" or "Family name". */
  kindLabel: string;
  excluded: boolean;
  /** Excluded from included usage, but runnable with paid usage credits. */
  usageCredits: boolean;
  multiplier?: string;
}

export interface CompareFacts {
  planId: string;
  planName: string;
  providerName: string;
  price: string;
  models: {
    /** The first few included releases: one per developer in turn, current first. */
    featured: readonly CompareModel[];
    /** The rest of the included releases. */
    more: readonly CompareModel[];
    total: number;
  };
  /** Coding tools the plan's own recorded evidence names; empty when none. */
  codingTools: readonly string[];
  usage: { numeric: boolean; lines: readonly { text: string; detail: string }[] };
  simulation: string;
  afterLimit: {
    lines: readonly string[];
    /** `excerpt` is whole sentences from the start of `text`, for the primary row. */
    quotes: readonly { text: string; excerpt: string; sourceUrl?: string }[];
  };
  evidence: string;
  effective: string;
  /** Every model rule, for the inspect view. */
  rules: readonly CompareRule[];
  modelAccess?: SubscriptionAccess;
  publishedTerms?: SubscriptionPublishedTerms;
}

export const FEATURED_MODEL_COUNT = 4;

export const NO_NUMERIC_ALLOWANCE = "No numeric allowance is recorded in this snapshot.";
export const CAPACITY_REPLAY = "Numeric capacity replay available.";
export const COMPATIBILITY_ONLY =
  "Model compatibility and workload pressure only. Exact capacity replay is not supported for this plan.";
export const NO_NAMED_MODEL =
  "No named model is recorded as selectable on this plan, so a replay cannot attribute usage to a model.";

/**
 * Coding tools a plan can cover, each tied to the provider that sells it and to
 * the product name that must appear in the plan's own recorded evidence (plan
 * name, billing text, provider statements or source titles). A tool is shown
 * only when that evidence names it, so a plan whose record does not mention a
 * tool shows none rather than an assumed one.
 */
const CODING_TOOLS: readonly { name: string; providerId: string; evidence: string }[] = [
  { name: "Claude Code", providerId: "anthropic", evidence: "claude code" },
  { name: "Codex", providerId: "openai", evidence: "codex" },
  { name: "GitHub Copilot", providerId: "github", evidence: "copilot" },
  { name: "Cursor", providerId: "cursor", evidence: "cursor" },
  { name: "Google Antigravity", providerId: "google", evidence: "antigravity" },
  { name: "Jules", providerId: "google", evidence: "jules" },
];

function planEvidenceText(plan: PublicPlanSummary): string {
  return [
    plan.name,
    plan.billingMechanics ?? "",
    ...plan.qualitativeLimits.flatMap((limit) => [limit.label, limit.statement]),
    ...plan.sources.map((source) => source.title),
  ]
    .join("\n")
    .toLowerCase();
}

export function codingToolsFor(plan: PublicPlanSummary): string[] {
  const evidence = planEvidenceText(plan);
  return CODING_TOOLS.filter(
    (tool) => tool.providerId === plan.providerId && evidence.includes(tool.evidence),
  ).map((tool) => tool.name);
}

/**
 * Whole sentences from the start of a provider statement, up to `max`
 * characters, marked with an ellipsis when shortened. The full statement stays
 * in the inspect view.
 */
export function statementExcerpt(text: string, max = 280): string {
  if (text.length <= max) return text;
  const sentences = text.split(/(?<=[.!?])\s+/u);
  let excerpt = "";
  for (const sentence of sentences) {
    const next = excerpt.length === 0 ? sentence : `${excerpt} ${sentence}`;
    if (next.length > max) break;
    excerpt = next;
  }
  return `${excerpt.length === 0 ? text.slice(0, max).trimEnd() : excerpt} …`;
}

/**
 * The first few included releases: one per developer in turn, so a plan that
 * carries several developers' models does not lead with a single developer's
 * lineup just because its records are more complete. Names without a model
 * record (stealth, preview or not yet catalogued) and legacy releases fill in
 * only after every catalogued current release.
 */
function featureModels(ranked: readonly CompareModel[], count: number): CompareModel[] {
  const groups = new Map<string, CompareModel[]>();
  for (const model of ranked.filter((entry) => !entry.legacy && entry.developerId)) {
    const key = model.developerId ?? "";
    groups.set(key, [...(groups.get(key) ?? []), model]);
  }
  const featured: CompareModel[] = [];
  const queues = [...groups.values()];
  while (featured.length < count && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next !== undefined && featured.length < count) featured.push(next);
    }
  }
  for (const model of ranked) {
    if (featured.length >= count) break;
    if (!featured.includes(model)) featured.push(model);
  }
  return featured;
}

export function buildCompareFacts(
  plan: PublicPlanSummary,
  modelById: (id: string) => PublicModelSummary | undefined,
): CompareFacts {
  const replayIncluded = plan.modelRules
    .filter((rule) => rule.excluded !== true)
    .map((rule, index) => ({ index, model: modelById(rule.model), id: rule.model }))
    .filter((entry) => entry.model?.kind !== "family")
    .sort(
      (left, right) =>
        lifecycleRank(left.model?.lifecycle) - lifecycleRank(right.model?.lifecycle) ||
        left.index - right.index,
    )
    .map(({ model, id }) => ({
      id,
      name: model?.name ?? id,
      legacy: model?.lifecycle === "legacy",
      ...(model?.developerId === undefined ? {} : { developerId: model.developerId }),
    }));
  const included = plan.modelAccess
    ? includedAccessModels(plan.modelAccess).map((entry) => ({
        id: entry.modelId ?? `published:${entry.name}`,
        name: entry.name,
        legacy: false,
        ...(entry.modelId && modelById(entry.modelId)?.developerId
          ? { developerId: modelById(entry.modelId)?.developerId as string }
          : {}),
      }))
    : replayIncluded;
  const featured = featureModels(included, FEATURED_MODEL_COUNT);

  const usageLines = plan.limits.map((limit) => ({
    text: limitSentence(limit),
    detail: limit.label,
  }));

  if (plan.publishedTerms) {
    usageLines.splice(0, usageLines.length, {
      text: plan.publishedTerms.allowanceSummary,
      detail: "Provider-published allowance terms",
    });
  }
  if (!usageLines.length) {
    const published = plan.qualitativeLimits.find((limit) => limit.label === "Included usage");
    if (published)
      usageLines.push({
        text: published.statement,
        detail: "Published terms; exact replay capacity not established",
      });
  }

  const exceedLines = [...new Set(plan.limits.map((limit) => exceedText(limit)))];
  const quotes = plan.qualitativeLimits
    .filter((limit) => limit.topic === "after_limit")
    .map((limit) => ({
      text: limit.statement,
      excerpt: statementExcerpt(limit.statement),
      ...(limit.sourceUrl === undefined ? {} : { sourceUrl: limit.sourceUrl }),
    }));

  const simulation =
    replayIncluded.length === 0
      ? NO_NAMED_MODEL
      : plan.limits.length > 0
        ? CAPACITY_REPLAY
        : COMPATIBILITY_ONLY;

  const rules: CompareRule[] = plan.modelRules.map((rule) => {
    const model = modelById(rule.model);
    return {
      id: rule.model,
      name: model?.name ?? rule.model,
      kindLabel:
        model?.kind === "family"
          ? "Family name"
          : model?.lifecycle === "legacy"
            ? "Legacy model"
            : "Model",
      excluded: rule.excluded === true,
      usageCredits: rule.excluded === true && rule.access === "usage_credits",
      ...(rule.multiplier === undefined ? {} : { multiplier: rule.multiplier }),
    };
  });

  return {
    planId: plan.id,
    planName: plan.name,
    providerName: plan.providerName,
    price: priceText(plan.price),
    models: {
      featured,
      more: included.filter((model) => !featured.includes(model)),
      total: included.length,
    },
    codingTools:
      plan.publishedTerms?.codingTools ??
      plan.qualitativeLimits
        .find((limit) => limit.label === "Compatible tools")
        ?.statement.split(" · ") ??
      codingToolsFor(plan),
    usage: { numeric: plan.limits.length > 0, lines: usageLines },
    simulation,
    afterLimit: plan.publishedTerms?.afterLimit
      ? { lines: [plan.publishedTerms.afterLimit], quotes: [] }
      : { lines: exceedLines, quotes },
    evidence: plan.publishedTerms
      ? `Published terms checked ${formatCatalogDate(plan.publishedTerms.checkedAt)}`
      : verificationText(plan.verificationStatus, plan.lastVerifiedAt),
    effective: `Rules in effect since ${formatCatalogDate(plan.effectiveFrom)}`,
    rules,
    ...(plan.modelAccess ? { modelAccess: plan.modelAccess } : {}),
    ...(plan.publishedTerms ? { publishedTerms: plan.publishedTerms } : {}),
  };
}

/** The default pair: Claude Max 20x and ChatGPT Pro when both are catalogued. */
export const DEFAULT_COMPARE_PAIR = ["anthropic-claude-max-20x", "openai-chatgpt-pro"] as const;

export function defaultComparePair(
  plans: readonly Pick<PublicPlanSummary, "id" | "providerId">[],
): [string, string] {
  const has = (id: string) => plans.some((plan) => plan.id === id);
  const first = has(DEFAULT_COMPARE_PAIR[0]) ? DEFAULT_COMPARE_PAIR[0] : (plans[0]?.id ?? "");
  const firstProvider = plans.find((plan) => plan.id === first)?.providerId;
  const second = has(DEFAULT_COMPARE_PAIR[1])
    ? DEFAULT_COMPARE_PAIR[1]
    : (plans.find((plan) => plan.providerId !== firstProvider)?.id ?? plans[1]?.id ?? first);
  return [first, second];
}

export interface CompareMatrixRow {
  /** The catalog model id, or `published:<name>` for a lineup name with no model page. */
  id: string;
  name: string;
  legacy: boolean;
  /** One entry per compared plan, in the order given. */
  included: readonly boolean[];
}

/**
 * Every model any compared plan includes, keyed the way Compare keys models
 * (`modelId ?? name`). Models more plans share come first, then by name.
 */
export function compareModelMatrix(plans: readonly CompareFacts[]): CompareMatrixRow[] {
  const rows = new Map<
    string,
    { id: string; name: string; legacy: boolean; included: boolean[] }
  >();
  plans.forEach((facts, index) => {
    for (const model of [...facts.models.featured, ...facts.models.more]) {
      const row = rows.get(model.id) ?? {
        id: model.id,
        name: model.name,
        legacy: model.legacy,
        included: plans.map(() => false),
      };
      row.included[index] = true;
      rows.set(model.id, row);
    }
  });
  const count = (row: CompareMatrixRow) => row.included.filter(Boolean).length;
  return [...rows.values()].sort(
    (left, right) =>
      count(right) - count(left) ||
      left.name.localeCompare(right.name, "en", { numeric: true, sensitivity: "base" }),
  );
}
