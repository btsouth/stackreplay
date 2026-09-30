import type { BillingContextV1 } from "@stackreplay/schema";
import { catalogPlansAt } from "./public-catalog";
import type { TargetKey } from "./routes";
import { includedAccessModels, subscriptionAccess } from "./subscription-access";
import type { SourceSummary } from "./worker-protocol";
import type { SourceDemand } from "./workload-profile";

/** Reviewed commercial questions, never a harness → billing attribution rule. */
export const DISCOVERY_FAMILIES = [
  {
    groupId: "claude",
    sourceIds: ["claude-code"],
    question: "Which Claude plan do you currently pay for?",
    planIds: ["anthropic-claude-pro", "anthropic-claude-max-5x", "anthropic-claude-max-20x"],
    otherPlanIds: [],
  },
  {
    groupId: "chatgpt",
    sourceIds: ["codex"],
    question: "Which ChatGPT plan do you currently pay for?",
    planIds: [
      "openai-chatgpt-plus",
      "openai-chatgpt-pro",
      "openai-chatgpt-pro-20x",
      "openai-chatgpt-pro-500",
    ],
    // Respect an existing manual organization selection; don't offer it as personal setup.
    otherPlanIds: ["openai-chatgpt-business"],
  },
  {
    groupId: "command-code",
    sourceIds: ["command-code"],
    question: "Which Command Code plan do you currently pay for?",
    planIds: [
      "command-code-go",
      "command-code-goat",
      "command-code-pro",
      "command-code-max-10x",
      "command-code-max-20x",
    ],
    otherPlanIds: [],
  },
  {
    groupId: "opencode",
    sourceIds: ["opencode"],
    question: "Do you currently pay for an OpenCode plan?",
    planIds: ["opencode-go", "opencode-go-plus"],
    otherPlanIds: [],
  },
  {
    groupId: "hermes",
    sourceIds: ["hermes"],
    question: undefined,
    planIds: [],
    otherPlanIds: [],
  },
] as const;

export type DiscoveryGroupId = (typeof DISCOVERY_FAMILIES)[number]["groupId"];
export type DiscoveryState = "observed" | "narrowed" | "confirmed" | "unknown";
export type NonPlanResponse = "work" | "api-other" | "none" | "not-sure";
export type DiscoveryAnswer = TargetKey | NonPlanResponse | "keep-current";

export interface DiscoveryPlan {
  id: string;
  name: string;
  price: { amount: string; currency: string; interval: string };
}

export interface DiscoveryCandidate {
  planId: string;
  planName: string;
  publishedPrice: DiscoveryPlan["price"];
  access: {
    listedModelIds: string[];
    observedModelCount: number;
    checkedAt: string | undefined;
  };
}

/** Future worker extension: aggregate explicit event.billing, without event identities. */
export interface DiscoveryBillingEvidence extends BillingContextV1 {
  sourceId: string;
  recordedCalls: number;
}

export interface DiscoveryGroup {
  groupId: DiscoveryGroupId;
  sourceIds: string[];
  sourceNames: string[];
  recordedCalls: number;
  /** Recorded call share only, never spend or subscription usage. */
  shareOfWorkload: number;
  observedModelIds: string[];
  unresolvedCalls: number;
  sourceState: "observed";
  state: DiscoveryState;
  question: string | undefined;
  candidates: DiscoveryCandidate[];
  currentTargets: TargetKey[];
  billingEvidence: DiscoveryBillingEvidence[];
}

/**
 * Names/prices stay in the accepted catalog. GOAT has only a current-market
 * execution record; the public catalog already implements that validity rule.
 */
export function discoveryPlansAt(rulesAsOf: string): DiscoveryPlan[] {
  return catalogPlansAt(rulesAsOf);
}

export function familyTargetKeys(groupId: DiscoveryGroupId): TargetKey[] {
  const family = DISCOVERY_FAMILIES.find((entry) => entry.groupId === groupId);
  return [...(family?.planIds ?? []), ...(family?.otherPlanIds ?? [])].map(
    (id): TargetKey => `plan:${id}`,
  );
}

/**
 * Pure, deterministic aggregate → question. Historical source/model facts are
 * unchanged; choices answer today's question at the CURRENT accepted rules date,
 * not the workload's dates or a replay date picked by the user.
 * No token volume, limits, throughput, developer, or raw content is an input.
 */
export function discoverStack(input: {
  recordedCalls: number;
  sources: readonly Pick<SourceDemand, "id" | "events" | "models" | "unresolvedEvents">[];
  sourceNames: readonly Pick<SourceSummary, "adapterId" | "name" | "role">[];
  rulesAsOf: string;
  currentStack: readonly TargetKey[];
  plans?: readonly DiscoveryPlan[];
  billingEvidence?: readonly DiscoveryBillingEvidence[];
}): DiscoveryGroup[] {
  const plans = input.plans ?? discoveryPlansAt(input.rulesAsOf);
  return DISCOVERY_FAMILIES.flatMap((family): DiscoveryGroup[] => {
    const sources = input.sources.filter(
      (source) => (family.sourceIds as readonly string[]).includes(source.id) && source.events > 0,
    );
    if (sources.length === 0) return [];
    const recordedCalls = sources.reduce((sum, source) => sum + source.events, 0);
    const observedModelIds = [
      ...new Set(sources.flatMap((source) => source.models.map((m) => m.modelId))),
    ].sort();
    const currentTargets = input.currentStack.filter((key) =>
      familyTargetKeys(family.groupId).includes(key),
    );
    const billingEvidence = (input.billingEvidence ?? []).filter((evidence) =>
      sources.some((source) => source.id === evidence.sourceId),
    );
    const candidates = family.planIds.flatMap((planId): DiscoveryCandidate[] => {
      const plan = plans.find((entry) => entry.id === planId);
      if (!plan) return [];
      const access = subscriptionAccess(planId, input.rulesAsOf.slice(0, 10));
      const listed = new Set(
        access ? includedAccessModels(access).flatMap((m) => (m.modelId ? [m.modelId] : [])) : [],
      );
      return [
        {
          planId,
          planName: plan.name,
          publishedPrice: plan.price,
          access: {
            listedModelIds: observedModelIds.filter((id) => listed.has(id)),
            observedModelCount: observedModelIds.length,
            checkedAt: access?.checkedAt,
          },
        },
      ];
    });
    // Coverage orders questions, never selects or removes a plausible tier.
    // Reviewed family order breaks ties; workload volume never ranks plans.
    candidates.sort((a, b) => b.access.listedModelIds.length - a.access.listedModelIds.length);
    const exactSubscription = billingEvidence.some(
      (evidence) =>
        evidence.attribution === "exact" &&
        (evidence.kind === "subscription" || evidence.kind === "subscription_credits") &&
        evidence.planId !== undefined &&
        familyTargetKeys(family.groupId).includes(`plan:${evidence.planId}`),
    );
    return [
      {
        groupId: family.groupId,
        sourceIds: sources.map((source) => source.id),
        sourceNames: sources.map(
          (source) =>
            input.sourceNames.find((name) => name.adapterId === source.id && name.role === "usage")
              ?.name ?? source.id,
        ),
        recordedCalls,
        shareOfWorkload: input.recordedCalls > 0 ? recordedCalls / input.recordedCalls : 0,
        observedModelIds,
        unresolvedCalls: sources.reduce((sum, source) => sum + source.unresolvedEvents, 0),
        sourceState: "observed",
        state:
          currentTargets.length > 0
            ? "confirmed"
            : exactSubscription
              ? "observed"
              : candidates.length > 0
                ? "narrowed"
                : "unknown",
        question: family.question,
        candidates,
        currentTargets,
        billingEvidence,
      },
    ];
  });
}

/** An explicit edit replaces this family only, including an older/manual tier. */
export function applyDiscoveryAnswers(
  currentStack: readonly TargetKey[],
  groups: readonly DiscoveryGroup[],
  answers: Readonly<Partial<Record<DiscoveryGroupId, DiscoveryAnswer>>>,
): TargetKey[] {
  let next = [...currentStack];
  for (const group of groups) {
    const answer = answers[group.groupId];
    if (!answer || answer === "keep-current") continue;
    if (
      answer.startsWith("plan:") &&
      !group.candidates.some((candidate) => `plan:${candidate.planId}` === answer)
    )
      continue;
    if (answer.startsWith("api:")) continue;
    next = next.filter((key) => !familyTargetKeys(group.groupId).includes(key));
    if (answer.startsWith("plan:")) next.push(answer as TargetKey);
  }
  return [...new Set(next)];
}
