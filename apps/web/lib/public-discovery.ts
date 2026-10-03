import { isFeaturedModel } from "./model-library";
import type { PublicProviderDirectory } from "./public-providers";

/** Editorial starting points. New catalog rows never automatically join this list. */
export const FEATURED_PLAN_IDS: readonly string[] = [
  "anthropic-claude-pro",
  "anthropic-claude-max-5x",
  "anthropic-claude-max-20x",
  "openai-chatgpt-plus",
  "openai-chatgpt-pro",
  "github-copilot-pro",
  "github-copilot-pro-plus",
  "cursor-pro",
  "cursor-pro-plus",
  "cursor-ultra",
  "command-code-pro",
  "command-code-max-10x",
  "opencode-go",
  "clinepass",
  "ollama-cloud-pro",
  "kiro-pro",
];
export interface ProviderDiscoveryState {
  scope: "featured" | "all";
  query: string;
  role: "all" | "developer" | "api" | "publisher";
  tool: string;
}
export const DEFAULT_PROVIDER_DISCOVERY: ProviderDiscoveryState = {
  scope: "featured",
  query: "",
  role: "all",
  tool: "all",
};
export function readProviderDiscovery(
  search: string,
  tools: readonly string[],
): ProviderDiscoveryState {
  const params = new URLSearchParams(search);
  const role = params.get("role");
  const validRole = role === "developer" || role === "api" || role === "publisher" ? role : "all";
  const tool = params.get("tool");
  const validTool = tool !== null && tools.includes(tool) ? tool : "all";
  const rawQuery = params.get("q") ?? "";
  const query = rawQuery.trim() ? rawQuery : "";
  return {
    scope:
      params.get("scope") === "featured"
        ? "featured"
        : params.get("scope") === "all" || query || validRole !== "all" || validTool !== "all"
          ? "all"
          : "featured",
    query,
    role: validRole,
    tool: validTool,
  };
}
export function providerDiscoverySearch(state: ProviderDiscoveryState): string {
  const params = new URLSearchParams();
  if (state.scope === "all") params.set("scope", "all");
  // An explicit Featured selection with active filters survives sharing.
  else if (state.query.trim() || state.role !== "all" || state.tool !== "all")
    params.set("scope", "featured");
  if (state.query.trim()) params.set("q", state.query);
  if (state.role !== "all") params.set("role", state.role);
  if (state.tool !== "all") params.set("tool", state.tool);
  return params.size ? `?${params}` : "";
}
export interface ProviderDiscoveryRow {
  id: string;
  name: string;
  featured: boolean;
  releases: number;
  families: number;
  legacy: number;
  apiReleases: number;
  apiRecords: number;
  plans: number;
  updates: number;
  planTools: readonly { id: string; tools: readonly string[] }[];
  searchText: string;
}
export function providerDiscoveryRows(
  data: PublicProviderDirectory,
  tools: Readonly<Record<string, readonly string[]>>,
): ProviderDiscoveryRow[] {
  return data.providers.map((provider) => {
    const developed = provider.developedModelIds.flatMap((id) => {
      const model = data.directory.modelById(id);
      return model ? [model] : [];
    });
    const api = provider.apiModelIds.flatMap((id) => {
      const model = data.directory.modelById(id);
      return model ? [model] : [];
    });
    const plans = provider.planIds.flatMap((id) => {
      const plan = data.directory.planById(id);
      return plan ? [plan] : [];
    });
    return {
      id: provider.id,
      name: provider.name,
      featured:
        [...developed, ...api].some(
          (model) => model.kind === "release" && isFeaturedModel(model.id),
        ) || plans.some((plan) => FEATURED_PLAN_IDS.includes(plan.id)),
      releases: developed.filter((model) => model.kind === "release").length,
      families: developed.filter((model) => model.kind === "family").length,
      legacy: developed.filter((model) => model.kind === "release" && model.lifecycle === "legacy")
        .length,
      apiRecords: api.length,
      apiReleases: api.filter((model) => model.kind === "release").length,
      plans: plans.length,
      updates: provider.eventIds.length,
      planTools: plans.map((plan) => ({ id: plan.id, tools: tools[plan.id] ?? [] })),
      searchText: [
        provider.id,
        provider.name,
        ...developed.flatMap((model) => [
          model.id,
          model.name,
          ...model.aliases.map((alias) => alias.alias),
        ]),
        ...api.flatMap((model) => [
          model.id,
          model.name,
          ...model.aliases.map((alias) => alias.alias),
        ]),
        ...plans.flatMap((plan) => [plan.id, plan.name]),
      ]
        .join(" ")
        .toLowerCase(),
    };
  });
}
export function matchingPublishedPlans(row: ProviderDiscoveryRow, tool: string): number {
  return row.planTools.filter((plan) => tool === "all" || plan.tools.includes(tool)).length;
}
export function filterProviderRows(
  rows: readonly ProviderDiscoveryRow[],
  state: ProviderDiscoveryState,
): ProviderDiscoveryRow[] {
  return rows.filter(
    (row) =>
      (state.scope === "all" || row.featured) &&
      (state.role === "all" ||
        (state.role === "developer" && row.releases + row.families > 0) ||
        (state.role === "api" && row.apiRecords > 0) ||
        (state.role === "publisher" && row.plans > 0)) &&
      (state.tool === "all" || matchingPublishedPlans(row, state.tool) > 0) &&
      row.searchText.includes(state.query.trim().toLowerCase()),
  );
}
