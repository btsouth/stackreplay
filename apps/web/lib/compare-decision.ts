import { type BundledPlanSummary, bundledPlansAt } from "@stackreplay/catalog/bundled";
import { addAmounts, isSyntheticCatalogId } from "@stackreplay/share";
import { supportedModelsFor, type TargetKey } from "./routes";
import type { SourceDemand } from "./workload-profile";

export type CompareDecision = "claude" | "codex" | "stack" | "migration";

export const PURCHASE_DECISIONS = {
  claude: {
    source: "claude-code",
    label: "Claude Code work",
    api: "anthropic",
    defaultPlan: "anthropic-claude-max-20x",
    plans: ["anthropic-claude-pro", "anthropic-claude-max-5x", "anthropic-claude-max-20x"],
  },
  codex: {
    source: "codex",
    label: "Codex work",
    api: "openai",
    defaultPlan: "openai-chatgpt-pro",
    plans: ["openai-chatgpt-plus", "openai-chatgpt-pro", "openai-chatgpt-pro-20x"],
  },
} as const;

export type PurchaseDecision = keyof typeof PURCHASE_DECISIONS;

export function eligiblePlans(decision: PurchaseDecision, rulesAsOf: string): BundledPlanSummary[] {
  const allowed = new Set<string>(PURCHASE_DECISIONS[decision].plans);
  return bundledPlansAt(rulesAsOf).filter((plan) => allowed.has(plan.id));
}

export function selectedPlan(
  decision: PurchaseDecision,
  current: readonly TargetKey[],
  rulesAsOf: string,
): string | undefined {
  const plans = eligiblePlans(decision, rulesAsOf);
  const configured = plans.find((plan) => current.includes(`plan:${plan.id}`));
  return (
    configured?.id ??
    plans.find((plan) => plan.id === PURCHASE_DECISIONS[decision].defaultPlan)?.id ??
    plans[0]?.id
  );
}

export interface StackToolSupport {
  id: string;
  calls: number;
  supported: number;
  unavailable: number;
  unresolved: number;
}

export interface StackSupport {
  calls: number;
  supported: number;
  unavailable: number;
  unresolved: number;
  tools: StackToolSupport[];
}

/** Union by canonical model, so a call supported by two plans is counted once. */
export function configuredStackSupport(
  sources: readonly SourceDemand[],
  current: readonly TargetKey[],
  rulesAsOf: string,
): StackSupport {
  const offered = new Set<string>();
  for (const key of current) {
    if (!key.startsWith("plan:")) continue;
    for (const model of supportedModelsFor(key, rulesAsOf)) offered.add(model);
  }
  const tools = sources.map((source) => {
    const supported = source.models.reduce(
      (sum, model) => sum + (offered.has(model.modelId) ? model.events : 0),
      0,
    );
    return {
      id: source.id,
      calls: source.events,
      supported,
      unavailable: source.events - supported - source.unresolvedEvents,
      unresolved: source.unresolvedEvents,
    };
  });
  return {
    calls: tools.reduce((sum, tool) => sum + tool.calls, 0),
    supported: tools.reduce((sum, tool) => sum + tool.supported, 0),
    unavailable: tools.reduce((sum, tool) => sum + tool.unavailable, 0),
    unresolved: tools.reduce((sum, tool) => sum + tool.unresolved, 0),
    tools,
  };
}

export function configuredPlans(current: readonly TargetKey[], rulesAsOf: string) {
  const selected = new Set(
    current.filter((key) => key.startsWith("plan:")).map((key) => key.slice(5)),
  );
  return bundledPlansAt(rulesAsOf).filter((plan) => selected.has(plan.id));
}

/** A total exists only when every selected plan has the same monthly billing basis. */
export function configuredMonthlyPrice(plans: readonly BundledPlanSummary[]): string | undefined {
  if (plans.length === 0 || plans.some((plan) => plan.price.interval !== "month")) return undefined;
  return addAmounts(plans.map((plan) => plan.price.amount));
}

/** Plan configuration remains explicit; the catalog is only a picker. */
export function configurablePlans(rulesAsOf: string, synthetic: boolean) {
  return bundledPlansAt(rulesAsOf).filter((plan) => isSyntheticCatalogId(plan.id) === synthetic);
}
