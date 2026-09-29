import { createModelIdentityIndex } from "@stackreplay/catalog";
import { bundledPlansAt, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { projectReplay, replay } from "@stackreplay/replay-engine";
import type { ExecutionTargetV1, TextUsageEventV1 } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { shareSnapshotRefusal } from "../../lib/share-snapshot";
import { splitByIdentity } from "../../lib/workload-scope";
import { summarizeExport } from "../../lib/workload-summary";
import {
  compatibility,
  substituteChoices,
  targetModels,
  translationPolicy,
  workloadModels,
} from "./translation-model";

const catalog = loadBundledCatalog();
const identity = createModelIdentityIndex(catalog);
const RULES = "2026-09-23";

function event(id: string, rawName: string, occurredAt: string): TextUsageEventV1 {
  return {
    schemaVersion: 1,
    id,
    occurredAt,
    source: { adapterId: "codex", nativeSessionHash: "ns_a" },
    model: { rawName },
    modality: "text",
    usage: {
      inputTokens: 10_000,
      cacheReadTokens: 8_000,
      cacheWriteTokens: 0,
      outputTokens: 500,
      reasoningTokens: 0,
      accounting: {
        cacheReadIncludedInInput: true,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: true,
      },
    },
    confidence: { usage: "exact", model: "exact" },
  };
}

function workloadOf(events: TextUsageEventV1[]) {
  const summary = summarizeExport(
    {
      format: "stackreplay",
      version: 1,
      generatedAt: "2026-09-23T00:00:00Z",
      collectorVersion: "test",
      range: { from: "2026-09-01T00:00:00Z", to: "2026-09-23T00:00:00Z" },
      detectedSources: [],
      events,
      redactionReport: {
        promptsIncluded: false,
        responsesIncluded: false,
        sourceCodeIncluded: false,
        filePathsIncluded: false,
        repositoryNamesIncluded: false,
      },
    },
    "test",
    identity,
  );
  return workloadModels(summary.models);
}

function run(events: TextUsageEventV1[], target: ExecutionTargetV1) {
  const result = replay({ events, target, catalog, context: { rulesAsOf: RULES } });
  return { result, projection: projectReplay(result, catalog) };
}

const CODEX = [
  event("ev_1", "gpt-5.6-sol", "2026-09-01T10:00:00Z"),
  event("ev_2", "gpt-5.6-sol", "2026-09-01T10:05:00Z"),
  event("ev_3", "gpt-6-sol", "2026-09-01T11:00:00Z"),
  event("ev_4", "mystery-model-9", "2026-09-01T12:00:00Z"),
];
const CLAUDE = [
  event("ev_c1", "claude-sonnet-5", "2026-09-02T10:00:00Z"),
  event("ev_c2", "claude-opus-5-5", "2026-09-02T11:00:00Z"),
];

function planWith(prefix: string): string {
  const plan = bundledPlansAt(RULES).find((entry) => entry.id.startsWith(prefix));
  if (plan === undefined) throw new Error(`no plan ${prefix}`);
  return plan.id;
}

describe("translated replay", () => {
  it("groups aliases by canonical model and keeps unresolved identities apart", () => {
    const models = workloadOf(CODEX);
    expect(models.sources.map((source) => source.modelId)).toEqual(["gpt-5-6-sol", "gpt-6-sol"]);
    expect(models.sources[0]?.events).toBe(2);
    expect(models.unresolved).toEqual([{ rawName: "mystery-model-9", events: 1 }]);
  });

  it("builds a user, token-preserving policy and never a same-model rule", () => {
    expect(translationPolicy({})).toBeUndefined();
    expect(translationPolicy({ "gpt-6-sol": "gpt-6-sol", "gpt-5-6-sol": "" })).toBeUndefined();
    const policy = translationPolicy({
      "gpt-6-sol": "claude-opus-5-5",
      "gpt-5-6-sol": "gpt-5-6-sol",
    });
    expect(policy).toMatchObject({
      provenance: "user",
      transform: "token-preserving",
      rules: [{ sourceModelId: "gpt-6-sol", targetModelId: "claude-opus-5-5" }],
    });
  });

  it("Codex to Claude: exact replay is unavailable, the chosen substitution runs translated", () => {
    const planId = planWith("anthropic-claude-max");
    const models = workloadOf(CODEX);
    const compat = compatibility(models, targetModels({ kind: "subscription", planId }, RULES));
    expect(compat.served).toEqual([]);
    expect(compat.unservedEvents).toBe(3);

    const exact = run(CODEX, { type: "subscription", planId });
    expect(exact.projection.mode).toBe("exact");
    expect(exact.projection.outcomes.find((entry) => entry.key === "unavailable")?.count).toBe(3);

    const policy = translationPolicy({
      "gpt-5-6-sol": "claude-sonnet-5",
      "gpt-6-sol": "claude-opus-5-5",
    });
    const translated = run(CODEX, { type: "subscription", planId, modelTranslation: policy });
    expect(translated.projection.mode).toBe("translated");
    expect(translated.projection.translation?.substitutedEvents).toBe(3);
    expect(translated.projection.translation?.method).toBe("token-preserving");
    expect(translated.projection.outcomes.find((entry) => entry.key === "unavailable")?.count).toBe(
      0,
    );
    // The unresolved identity is never mapped: it stays unknown.
    expect(translated.projection.outcomes.find((entry) => entry.key === "unknown")?.count).toBe(1);
    // A translated result can never become a V1 share link that reads as exact.
    expect(shareSnapshotRefusal(translated.result)).toBeDefined();
  });

  it("Claude to Codex: the reverse substitution runs on a ChatGPT plan", () => {
    const planId = planWith("openai-chatgpt-pro");
    const compat = compatibility(
      workloadOf(CLAUDE),
      targetModels({ kind: "subscription", planId }, RULES),
    );
    expect(compat.served).toEqual([]);
    const policy = translationPolicy({
      "claude-sonnet-5": "gpt-5-6-sol",
      "claude-opus-5-5": "gpt-6-sol",
    });
    const translated = run(CLAUDE, { type: "subscription", planId, modelTranslation: policy });
    expect(translated.projection.mode).toBe("translated");
    expect(translated.projection.outcomes.find((entry) => entry.key === "included")?.count).toBe(2);
  });

  it("mixed providers: rows map independently and an unmapped model stays unavailable", () => {
    const planId = planWith("anthropic-claude-max");
    const mixed = [...CODEX.slice(0, 3), ...CLAUDE];
    const compat = compatibility(
      workloadOf(mixed),
      targetModels({ kind: "subscription", planId }, RULES),
    );
    expect(compat.served.map((source) => source.modelId).sort()).toEqual([
      "claude-opus-5-5",
      "claude-sonnet-5",
    ]);
    // Only GPT-6 Sol is mapped; GPT-5.6 Sol is left unmapped on purpose.
    const policy = translationPolicy({ "gpt-6-sol": "claude-opus-5-5" });
    const translated = run(mixed, { type: "subscription", planId, modelTranslation: policy });
    expect(translated.projection.mode).toBe("translated");
    expect(translated.projection.translation?.substitutedEvents).toBe(1);
    expect(translated.projection.outcomes.find((entry) => entry.key === "unavailable")?.count).toBe(
      2,
    );
    expect(translated.projection.outcomes.find((entry) => entry.key === "included")?.count).toBe(3);
  });

  it("a Direct API target lists only offered models and prices a translated scenario", () => {
    const offered = targetModels({ kind: "api", providerId: "anthropic" }, RULES);
    const offeredIds = offered.map((model) => model.id);
    // Offering follows the catalog: a model is listed only where the provider offers it.
    for (const id of offeredIds)
      expect(catalog.models[id]?.providerIds ?? []).toContain("anthropic");
    expect(offeredIds).toContain("claude-opus-5-5");
    // Anthropic documents claude-sonnet-5 on the Claude API, with a list price.
    expect(offered.find((model) => model.id === "claude-sonnet-5")).toMatchObject({
      available: true,
      priced: true,
    });
    const policy = translationPolicy({
      "gpt-5-6-sol": "claude-sonnet-5",
      "gpt-6-sol": "claude-opus-5-5",
    });
    const { resolved } = splitByIdentity(CODEX, identity);
    const translated = run(resolved, {
      type: "api",
      providerId: "anthropic",
      modelTranslation: policy,
    });
    expect(translated.projection.mode).toBe("translated");
    expect(translated.projection.economics.targetCost).toBeDefined();
  });
});

describe("substitute choices", () => {
  it("offers concrete releases instead of bare family aliases, and marks legacy ones", () => {
    const choices = substituteChoices(
      targetModels({ kind: "subscription", planId: "anthropic-claude-max-20x" }, "2026-09-23"),
    );
    const labels = choices.map((choice) => choice.label);
    for (const alias of ["Opus", "Sonnet", "Haiku", "Fable"]) expect(labels).not.toContain(alias);
    expect(labels).toContain("Claude Opus 5.5");
    expect(labels).toContain("Claude Opus 4.8 (legacy)");
    // Current releases come before legacy ones.
    const firstLegacy = choices.findIndex((choice) => choice.lifecycle === "legacy");
    const lastCurrent = choices.map((choice) => choice.lifecycle).lastIndexOf("current");
    expect(firstLegacy).toBeGreaterThan(lastCurrent);
  });
});

describe("explicit resolved-only scope", () => {
  it("leaves out exactly the events whose identity no catalog source establishes", () => {
    const { resolved, unresolved } = splitByIdentity(CODEX, identity);
    expect(unresolved).toBe(1);
    expect(resolved.map((item) => item.id)).toEqual(["ev_1", "ev_2", "ev_3"]);
    // With the scope, the same engine establishes a Direct API cost; without it, it refuses.
    expect(
      run(CODEX, { type: "api", providerId: "openai" }).projection.economics.targetCost,
    ).toBeUndefined();
    expect(
      run(resolved, { type: "api", providerId: "openai" }).projection.economics.targetCost,
    ).toBeDefined();
  });
});
