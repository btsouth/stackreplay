import { describe, expect, it } from "vitest";
import { buildCompareFacts } from "./compare-facts";
import { loadPublicCatalog } from "./public-catalog";
import {
  includedAccessModels,
  includedPlanCounts,
  type SubscriptionAccessModel,
  subscriptionAccess,
} from "./subscription-access";

const date = "2026-09-28";
const catalog = loadPublicCatalog(date);
const accessFor = (id: string) => {
  const access = subscriptionAccess(id, date);
  if (!access) throw new Error(`Missing access for ${id}`);
  return access;
};
const names = (id: string) => includedAccessModels(accessFor(id)).map((m) => m.name);

describe("published subscription access", () => {
  it("covers every public subscription with linked, dated plan-level evidence", () => {
    for (const plan of catalog.plans) {
      const access = subscriptionAccess(plan.id, date);
      expect(access, plan.id).toBeDefined();
      for (const group of accessFor(plan.id).groups) {
        expect(group.sourceUrl).toMatch(/^https:\/\//);
        for (const model of group.models) {
          expect(model.name).not.toMatch(/L\d+:||/);
          if (model.modelId) expect(catalog.modelById(model.modelId), model.name).toBeDefined();
        }
      }
    }
  });
  it("shows the Command Code Max lineup beyond the two replay model rules", () => {
    const plan = catalog.planById("command-code-max-20x");
    if (!plan) throw new Error("Missing Command Code Max");
    const facts = buildCompareFacts(plan, catalog.modelById);
    expect(plan.modelRules.map((rule) => rule.model)).toEqual(["gpt-5-6-luna", "gpt-5-6-sol"]);
    expect(facts.models.total).toBe(86);
    expect(names(plan.id)).toEqual(
      expect.arrayContaining([
        "Claude Opus 5.5",
        "GPT-6 Astra",
        "Grok 4.7",
        "Kimi K3",
        "MiMo V2.6 Pro",
        "GLM-5.3 Flash",
      ]),
    );
    expect(facts.simulation).toContain("Exact capacity replay is not supported");
  });
  it("keeps Command Code Go, GOAT, Pro and Max access separate", () => {
    expect(names("command-code-go")).not.toContain("Claude Sonnet 5.5");
    expect(names("command-code-goat")).toContain("Claude Sonnet 5.5");
    expect(names("command-code-goat")).not.toContain("GPT-6 Sol");
    expect(names("command-code-pro")).toContain("GPT-6 Sol");
    expect(names("command-code-pro")).not.toContain("Claude Opus 5.5");
    expect(names("command-code-max-20x")).toContain("Claude Opus 5.5");
  });
  it("retains models without a canonical Replay identity", () => {
    expect(names("clinepass")).toHaveLength(12);
    expect(names("clinepass")).toContain("MiMo-V2.5-Pro");
    expect(names("opencode-go")).toHaveLength(30);
    expect(names("ollama-cloud-pro")).toHaveLength(17);
    expect(names("kiro-pro")).toContain("Qwen3 Coder Next");
  });
  it("preserves tier, product and credit-only distinctions", () => {
    expect(names("anthropic-claude-pro")).not.toContain("Claude Fable 5.1");
    expect(
      accessFor("anthropic-claude-pro")
        .groups.find((g) => g.access === "extra_usage")
        ?.models.map((m) => m.name),
    ).toContain("Claude Fable 5.1");
    expect(names("anthropic-claude-max-5x")).toContain("Claude Fable 5.1");
    expect(names("openai-chatgpt-plus")).not.toContain("GPT-5.6 Sol Pro");
    expect(names("openai-chatgpt-pro")).toContain("GPT-5.6 Sol Pro");
    expect(names("github-copilot-pro")).not.toContain("Claude Opus 5.5");
    expect(names("github-copilot-pro-plus")).not.toContain("Claude Sonnet 4.6");
    expect(names("github-copilot-max")).not.toContain("GPT-5.4 nano");
    expect(names("cursor-hobby")).toEqual([]);
    expect(names("github-copilot-free")).toEqual([]);
    expect(names("google-ai-pro")).toContain("Claude Sonnet 4.6 (thinking)");
  });
  it("does not backdate current lineup observations", () => {
    expect(subscriptionAccess("command-code-max-20x", "2026-09-27")).toBeUndefined();
  });
});

describe("included plan counts", () => {
  const access = (models: SubscriptionAccessModel[], extra: SubscriptionAccessModel[] = []) => ({
    modelAccess: {
      checkedAt: date,
      summary: "",
      groups: [
        {
          label: "Included",
          access: "included" as const,
          sourceUrl: "https://example.com",
          models,
        },
        {
          label: "Extra",
          access: "extra_usage" as const,
          sourceUrl: "https://example.com",
          models: extra,
        },
      ],
    },
  });

  it("counts only explicit modelId links, once per plan", () => {
    const counts = includedPlanCounts([
      access([
        { name: "Alpha", modelId: "alpha" },
        { name: "Alpha again", modelId: "alpha" },
      ]),
      access([{ name: "alpha" }, { name: "Beta" }]),
      access([], [{ name: "Alpha", modelId: "alpha" }]),
      {},
    ]);
    expect(counts).toEqual({ alpha: 1 });
  });

  it("matches the linked plans the public catalog lists for each model", () => {
    const counts = includedPlanCounts(catalog.plans);
    expect(counts["claude-sonnet-5-5"]).toBeGreaterThan(0);
    for (const model of catalog.models) {
      const linked = catalog.plans.filter((plan) =>
        includedAccessModels(accessFor(plan.id)).some((entry) => entry.modelId === model.id),
      );
      expect(counts[model.id] ?? 0, model.id).toBe(linked.length);
    }
  });
});
