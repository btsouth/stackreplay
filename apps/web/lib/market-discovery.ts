import type { PricingV1 } from "@stackreplay/catalog";
import { limitSentence } from "./catalog-copy";
import { buildCompareFacts } from "./compare-facts";
import { loadCatalog, loadPublicCatalog, type PublicPlanSummary } from "./public-catalog";

export type ModelPrices = Pick<
  PricingV1,
  "id" | "rates" | "tiers" | "sources" | "lastVerifiedAt" | "variantId" | "endpointId"
>;

/** Read existing accepted rates. No blended price or workload estimate is made here. */
export function modelPrices(modelId: string, date: string): ModelPrices[] {
  const records = Object.values(loadCatalog().pricing).filter(
    (rate) =>
      rate.modelId === modelId &&
      rate.basis === "api_list_price" &&
      rate.verificationStatus === "verified" &&
      rate.effectiveFrom <= date &&
      (!rate.effectiveFromInstant || rate.effectiveFromInstant <= `${date}T23:59:59Z`) &&
      (!rate.effectiveTo || rate.effectiveTo >= date),
  );
  const latest = new Map<string, PricingV1>();
  for (const rate of records.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))) {
    const key = `${rate.endpointId ?? "direct"}:${rate.variantId ?? "base"}`;
    if (!latest.has(key)) latest.set(key, rate);
  }
  // Explicit direct-route records supersede old unscoped snapshots for the same model.
  const hasEndpoint = [...latest.values()].some((rate) => rate.endpointId && !rate.variantId);
  return [...latest.values()]
    .filter((rate) => !hasEndpoint || rate.endpointId)
    .map(({ id, rates, tiers, sources, lastVerifiedAt, variantId, endpointId }) => ({
      id,
      rates,
      tiers,
      sources,
      lastVerifiedAt,
      variantId,
      endpointId,
    }));
}
export { basePrice, priceNumber } from "./market-prices";

const HARNESS_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  "command-code": "Command Code",
  opencode: "OpenCode",
  ollama: "Ollama",
  "kiro-ide": "Kiro",
  "kiro-cli": "Kiro",
};
export function planTools(plan: PublicPlanSummary): string[] {
  const explicit = plan.qualitativeLimits.find((limit) => limit.label === "Compatible tools");
  if (explicit) return explicit.statement.split(" · ");
  const catalog = loadCatalog();
  const routes =
    catalog.plans[plan.id]?.executionVersions?.find((version) => version.id === plan.versionId)
      ?.routes ?? [];
  const native = routes.flatMap((route) => route.harnessIds ?? []);
  const tools = native.flatMap((id) => (HARNESS_NAMES[id] ? [HARNESS_NAMES[id]] : []));
  // The protocol establishes an Ollama client route, not arbitrary tool support.
  if (routes.some((route) => route.protocol === "ollama-cloud")) tools.push("Ollama");
  return [...new Set([...tools, ...buildCompareFacts(plan, () => undefined).codingTools])];
}
export function planUsage(plan: PublicPlanSummary): string {
  return (
    plan.qualitativeLimits.find((limit) => limit.label === "Included usage")?.statement ??
    (plan.limits.length > 0
      ? plan.limits.map((limit) => limitSentence(limit)).join(" · ")
      : "Included model access. Usage varies with your work.")
  );
}
export function marketDiscovery(date?: string) {
  const catalog = loadPublicCatalog(date);
  return {
    catalog,
    prices: Object.fromEntries(
      catalog.models.map((model) => [model.id, modelPrices(model.id, catalog.asOf)]),
    ),
    tools: Object.fromEntries(catalog.plans.map((plan) => [plan.id, planTools(plan)])),
  };
}
