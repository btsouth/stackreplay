import { formatCatalogDate, limitSentence, priceText } from "../catalog-copy";
import { planUsage } from "../market-discovery";
import { type PublicPlanSummary, planDisplayName, planIncludesModel } from "../public-catalog";
import { includedAccessModels, publishedAccessModelCount } from "../subscription-access";

/**
 * Subscription intelligence cards for the homepage: what a plan actually
 * provides, known facts first, with the capacity question stated precisely.
 *
 * The plan ids are configuration; every fact comes from the accepted catalog
 * and the reviewed published terms. A missing plan is left out.
 */
export const FEATURED_PLAN_IDS = [
  "anthropic-claude-max-20x",
  "openai-chatgpt-pro",
  "github-copilot-pro-plus",
  "cursor-pro",
] as const;

/**
 * How far published terms let StackReplay answer "would my workload fit?".
 *
 * - `calculable`: the provider publishes a numeric allowance and a window the
 *   replay engine simulates (the same test `routes.ts` uses for numeric
 *   capacity), so a numeric result can be computed.
 * - `bounded`: usage structure is published (a relative multiple, windows,
 *   pools or dollar-denominated usage) but no absolute allowance the engine can
 *   replay, so fit can be bounded, not proven.
 * - `access-only`: the model lineup is known but no usage structure is.
 */
export type CapacityEvidence = "calculable" | "bounded" | "access-only";

export const CAPACITY_EVIDENCE_LABELS: Record<CapacityEvidence, string> = {
  calculable: "Calculable",
  bounded: "Bounded",
  "access-only": "Access only",
};

export const CAPACITY_EVIDENCE_MEANING: Record<CapacityEvidence, string> = {
  calculable: "A published number and window StackReplay can replay a workload against.",
  bounded: "Published structure, such as a multiple or reset windows, but no absolute allowance.",
  "access-only": "The model lineup is published; usage rules that would establish fit are not.",
};

type EvidenceInput = Pick<
  PublicPlanSummary,
  "limits" | "relativeAllowances" | "publishedTerms" | "qualitativeLimits"
>;

export function capacityEvidence(plan: EvidenceInput): CapacityEvidence {
  if (plan.limits.length > 0) return "calculable";
  const structured =
    (plan.relativeAllowances?.length ?? 0) > 0 ||
    plan.publishedTerms?.allowanceSummary !== undefined ||
    plan.qualitativeLimits.some((limit) => limit.label === "Included usage");
  return structured ? "bounded" : "access-only";
}

export interface PlanCardView {
  id: string;
  name: string;
  providerName: string;
  href: string;
  price: string;
  models?: { count: number; names: readonly string[] } | undefined;
  usage?: string | undefined;
  resets?: string | undefined;
  afterLimit?: string | undefined;
  evidence: {
    state: CapacityEvidence;
    label: string;
    /** What the evidence level means for this plan, in one sentence. */
    summary: string;
    /** The catalog's own account of what the provider does not publish. */
    gap?: string | undefined;
  };
  checkedAt: string;
  sourceCount: number;
  /** Canonical models the plan includes, for the personal lineup check. */
  includedModelIds: readonly string[];
}

/** The first sentence of a reviewed term whose label is about resets. */
function resetTerm(plan: PublicPlanSummary): string | undefined {
  const term = plan.publishedTerms?.terms.find((entry) => /reset/iu.test(entry.label));
  if (term === undefined) return undefined;
  const [first] = term.value.split(/(?<=\.)\s+/u);
  return first;
}

const NOT_PUBLISHED_STATEMENT = "what-the-provider-does-not-publish";

/** Newest release first, so a lineup is introduced by its current models. */
export type ReleaseOrder = (modelId: string | undefined) => string;

export function planCard(
  plan: PublicPlanSummary,
  modelIds: readonly string[],
  releasedOn: ReleaseOrder = () => "",
): PlanCardView {
  const state = capacityEvidence(plan);
  const access = plan.modelAccess;
  const gap = plan.qualitativeLimits.find((limit) => limit.id === NOT_PUBLISHED_STATEMENT);
  const limit = plan.limits[0];
  const summary =
    state === "calculable" && limit !== undefined
      ? `${capitalize(limitSentence(limit))} is a published number, so a workload can be replayed against it.`
      : state === "bounded"
        ? "Fit against a workload can't be proven from published limits alone."
        : "Usage limits that would establish fit are not published.";
  const checked = [plan.lastVerifiedAt, plan.publishedTerms?.checkedAt, access?.checkedAt]
    .filter((date): date is string => date !== undefined)
    .sort()
    .at(-1);
  return {
    id: plan.id,
    name: planDisplayName(plan),
    providerName: plan.providerName,
    href: `/plans/${plan.id}`,
    price: priceText(plan.price),
    models:
      access === undefined
        ? undefined
        : {
            count: publishedAccessModelCount(access),
            names: [
              ...new Set(
                includedAccessModels(access)
                  .map((model, position) => ({ model, position }))
                  .sort(
                    (a, b) =>
                      releasedOn(b.model.modelId).localeCompare(releasedOn(a.model.modelId)) ||
                      a.position - b.position,
                  )
                  .map(({ model }) => model.name),
              ),
            ].slice(0, 3),
          },
    usage:
      plan.publishedTerms !== undefined || plan.limits.length > 0 ? planUsage(plan) : undefined,
    resets: resetTerm(plan),
    afterLimit: plan.publishedTerms?.afterLimit,
    evidence: {
      state,
      label: CAPACITY_EVIDENCE_LABELS[state],
      summary,
      gap: gap?.statement,
    },
    checkedAt: formatCatalogDate(checked ?? plan.lastVerifiedAt),
    sourceCount: new Set([
      ...plan.sources.map((source) => source.url),
      ...(plan.publishedTerms?.sourceUrls ?? []),
    ]).size,
    includedModelIds: modelIds.filter((id) => planIncludesModel(plan, id)),
  };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function featuredPlanCards(
  plans: readonly PublicPlanSummary[],
  modelIds: readonly string[],
  options: { ids?: readonly string[]; releasedOn?: ReleaseOrder } = {},
): PlanCardView[] {
  return (options.ids ?? FEATURED_PLAN_IDS).flatMap((id) => {
    const plan = plans.find((entry) => entry.id === id);
    return plan === undefined ? [] : [planCard(plan, modelIds, options.releasedOn)];
  });
}
