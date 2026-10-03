import { describe, expect, it } from "vitest";
import { planTools } from "./market-discovery";
import { isFeaturedModel } from "./model-library";
import {
  DEFAULT_PROVIDER_DISCOVERY,
  FEATURED_PLAN_IDS,
  filterProviderRows,
  matchingPublishedPlans,
  type ProviderDiscoveryRow,
  providerDiscoveryRows,
  providerDiscoverySearch,
  readProviderDiscovery,
} from "./public-discovery";
import { loadPublicProviderDirectory } from "./public-providers";

const data = loadPublicProviderDirectory("2026-10-03");
const rows = providerDiscoveryRows(
  data,
  Object.fromEntries(data.directory.plans.map((plan) => [plan.id, planTools(plan)])),
);
const tools = [...new Set(rows.flatMap((row) => row.planTools.flatMap((plan) => plan.tools)))];
describe("provider discovery selection", () => {
  it("uses existing model editorial membership and explicit accepted plan IDs", () => {
    expect(isFeaturedModel("gpt-6-1-sol")).toBe(true);
    expect(isFeaturedModel("unreviewed-new-model")).toBe(false);
    for (const id of FEATURED_PLAN_IDS) expect(data.directory.planById(id), id).toBeDefined();
    expect(
      filterProviderRows(rows, DEFAULT_PROVIDER_DISCOVERY).some((row) => row.id === "anthropic"),
    ).toBe(true);
    expect(rows.find((row) => row.id === "devin")?.featured).toBe(false);
    expect(rows.find((row) => row.id === "mistral")?.featured).toBe(false);
    expect(rows.find((row) => row.id === "google")?.featured).toBe(true);
  });
  it("search and nondefault role/tool filters reach All and preserve unfeatured rows", () => {
    expect(readProviderDiscovery("?q=Devin", tools).scope).toBe("all");
    expect(
      filterProviderRows(rows, readProviderDiscovery("?q=Devin", tools)).map((row) => row.id),
    ).toEqual(["devin"]);
    expect(
      filterProviderRows(rows, readProviderDiscovery("?q=mistral", tools)).map((row) => row.id),
    ).toEqual(["mistral"]);
    expect(
      filterProviderRows(
        rows,
        readProviderDiscovery("?q=google-code-assist-enterprise", tools),
      ).map((row) => row.id),
    ).toEqual(["google"]);
    expect(readProviderDiscovery("?role=developer", tools).scope).toBe("all");
    const firstTool = tools[0];
    if (!firstTool) throw new Error("Missing real tool options");
    const state = readProviderDiscovery(`?tool=${encodeURIComponent(firstTool)}`, tools);
    expect(state.scope).toBe("all");
    for (const row of filterProviderRows(rows, state))
      expect(matchingPublishedPlans(row, firstTool)).toBeGreaterThan(0);
    const developerOnly: ProviderDiscoveryRow = {
      id: "developer",
      name: "Developer",
      featured: true,
      releases: 2,
      legacy: 0,
      families: 1,
      apiRecords: 0,
      apiReleases: 0,
      plans: 0,
      updates: 0,
      planTools: [],
      searchText: "developer",
    };
    expect(filterProviderRows([developerOnly], { ...state, role: "developer" })).toEqual([]);
  });
  it("keeps roles separate and tool counts scoped to matching published plans", () => {
    const developer = filterProviderRows(
      rows,
      readProviderDiscovery("?role=developer&q=devin", tools),
    );
    expect(developer).toEqual([]);
    expect(
      filterProviderRows(rows, readProviderDiscovery("?role=publisher&q=devin", tools)),
    ).toHaveLength(1);
    const row = rows.find((entry) => entry.id === "google");
    if (!row) throw new Error("Missing Google");
    for (const tool of tools)
      expect(matchingPublishedPlans(row, tool)).toBe(
        row.planTools.filter((plan) => plan.tools.includes(tool)).length,
      );
  });
  it("normalizes unknowns, shares explicit Featured filtering and resets to plain Featured", () => {
    expect(
      readProviderDiscovery(
        "?scope=unknown&role=bad&tool=bad&audience=enterprise&usecase=bad",
        tools,
      ),
    ).toEqual(DEFAULT_PROVIDER_DISCOVERY);
    expect(providerDiscoverySearch(DEFAULT_PROVIDER_DISCOVERY)).toBe("");
    const all = readProviderDiscovery("?role=publisher&q=Devin", tools);
    expect(readProviderDiscovery(providerDiscoverySearch(all), tools)).toEqual(all);
    const featured = { ...all, scope: "featured" as const };
    expect(readProviderDiscovery(providerDiscoverySearch(featured), tools)).toEqual(featured);
    expect(filterProviderRows(rows, featured)).toEqual([]);
    expect(readProviderDiscovery("?q=%20%20", tools)).toEqual(DEFAULT_PROVIDER_DISCOVERY);
    const typing = { ...all, query: "Claude " };
    expect(readProviderDiscovery(providerDiscoverySearch(typing), tools).query).toBe("Claude ");
  });
});
