import { bundledModelIdentity, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkloadModels } from "@/components/replay/translation-model";
import {
  type CompletedReplay,
  comparableReplayGroup,
  comparableReplays,
  compatibleReplaySnapshots,
  completedReplaySchema,
  readCompletedReplays,
  removeCompletedReplay,
  saveCompletedReplay,
} from "./completed-replays";
import {
  approvedPolicy,
  DECISION_RULES_DATE,
  mappingCoverage,
  replayDifference,
  suggestedMapping,
  TRANSLATION_PROFILE_HISTORY,
  TRANSLATION_PROFILES,
} from "./replay-strategies";
import { defaultRulesDate } from "./rules-date";
import { runScopedReplay } from "./scoped-replay";

const frontier = TRANSLATION_PROFILES[0];
const workload = (ids: string[]): WorkloadModels => ({
  sources: ids.map((modelId) => ({ modelId, name: modelId, events: 10, observedNames: [modelId] })),
  unresolved: [{ rawName: "mystery", events: 2 }],
});
const result: CompletedReplay = {
  version: 1,
  id: "r1",
  importId: "i1",
  scopeDigest: "same-scope",
  catalogHash: "catalog",
  rulesAt: "2026-09-27",
  title: "Test strategy",
  mode: "translated",
  createdAt: "2026-09-27T00:00:00Z",
  calls: 20,
  tokens: 2000,
  priced: 20,
  translatedCalls: 10,
  cost: { low: "2", high: "2" },
  baseline: { low: "3", high: "4" },
  difference: { low: "-2", high: "-1" },
  mappings: [],
  contributions: [],
  limitations: [],
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-29T12:00:00Z"));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("workload-aware counterfactual policies", () => {
  it("pins suggested availability and coverage after midnight while custom defaults to today", () => {
    vi.setSystemTime(new Date("2026-09-30T12:00:00Z"));
    expect(defaultRulesDate()).toBe("2026-09-30");
    expect(DECISION_RULES_DATE).toBe("2026-09-29");
    expect(DECISION_RULES_DATE).toBe(DECISION_MARKET.rulesAt.slice(0, 10));
    const sources = workload(["claude-opus-5-5"]);
    const mapping = suggestedMapping(frontier, sources);
    expect(mapping).toEqual({ "claude-opus-5-5": "gpt-6-1-sol" });
    expect(mappingCoverage(sources, frontier.providerId, mapping)).toEqual({
      recorded: 12,
      mapped: 10,
      applicable: 10,
    });
    // Also prove an implicit Suggested date does not consult a pre-release viewer clock.
    vi.setSystemTime(new Date("2026-09-28T12:00:00Z"));
    expect(suggestedMapping(frontier, sources)).toEqual(mapping);
    expect(mappingCoverage(sources, frontier.providerId, mapping)).toEqual({
      recorded: 12,
      mapped: 10,
      applicable: 10,
    });
  });
  it("enumerates exact canonical identities without fuzzy family matching", () => {
    expect(
      suggestedMapping(
        frontier,
        workload(["claude-opus-5-5", "claude-sonnet-5", "claude-haiku-4-5", "claude-opus-future"]),
      ),
    ).toEqual({
      "claude-opus-5-5": "gpt-6-1-sol",
      "claude-sonnet-5": "gpt-5-6-terra",
      "claude-haiku-4-5": "gpt-6-luna",
    });
  });
  it("preserves v1 explicit rules and recorded Sol identities after v2 approval", () => {
    const v1 = TRANSLATION_PROFILE_HISTORY.find(
      (p) => p.id === "openai-frontier" && p.version === "1",
    );
    if (!v1) throw Error("Missing historical policy");
    const original = approvedPolicy(v1, suggestedMapping(v1, workload(["claude-opus-5-5"])));
    const saved = JSON.parse(JSON.stringify(original));
    expect(saved).toMatchObject({
      id: "openai-frontier",
      version: "1",
      rules: [{ sourceModelId: "claude-opus-5-5", targetModelId: "gpt-6-sol" }],
    });
    expect(
      approvedPolicy(frontier, suggestedMapping(frontier, workload(["claude-opus-5-5"]))),
    ).toMatchObject({
      version: "2",
      rules: [{ sourceModelId: "claude-opus-5-5", targetModelId: "gpt-6-1-sol" }],
    });
    expect(original).toEqual(saved);
    expect(
      suggestedMapping(
        frontier,
        workload(["gpt-6-sol", "gpt-6-1-sol", "claude-opus-5-5-future", "CLAUDE-OPUS-5-5"]),
      ),
    ).toEqual({});
    expect(
      suggestedMapping(TRANSLATION_PROFILES[1], workload(["gpt-6-sol", "gpt-6-1-sol"])),
    ).toEqual({});
  });
  it("replays a saved v1 explicit policy unchanged after v2, without changing source identity", () => {
    const catalog = loadBundledCatalog();
    const identity = bundledModelIdentity();
    expect(identity.resolve("gpt-6-sol").canonicalId).toBe("gpt-6-sol");
    expect(identity.resolve("gpt-6.1-sol").canonicalId).toBe("gpt-6-1-sol");
    const base = buildDemoExport("moderate").events[0];
    if (!base) throw Error("Missing fixture");
    const events = ["claude-opus-5-5", "gpt-6-sol", "gpt-6-1-sol"].map((id, i) => ({
      ...base,
      id: `policy-${i}`,
      model: { rawName: id, canonicalId: id },
    }));
    const historical = TRANSLATION_PROFILE_HISTORY[0];
    const saved = JSON.parse(
      JSON.stringify(approvedPolicy(historical, { "claude-opus-5-5": "gpt-6-sol" })),
    );
    const replay = (modelTranslation: typeof saved) =>
      runScopedReplay({
        events,
        catalog,
        identity,
        rulesAsOf: "2026-09-29",
        target: { type: "api", providerId: "openai", modelTranslation },
      });
    const first = replay(saved);
    const next = replay(approvedPolicy(frontier, { "claude-opus-5-5": "gpt-6-1-sol" }));
    expect(replay(saved).result).toEqual(first.result);
    expect(first.projection.translation).toMatchObject({
      policyId: "openai-frontier",
      policyVersion: "1",
    });
    expect(next.projection.translation).toMatchObject({
      policyId: "openai-frontier",
      policyVersion: "2",
    });
    expect(first.result.semantics?.translation?.applied).toEqual([
      { sourceModelId: "claude-opus-5-5", targetModelId: "gpt-6-sol", eventCount: 1 },
    ]);
    expect(next.result.semantics?.translation?.applied).toEqual([
      { sourceModelId: "claude-opus-5-5", targetModelId: "gpt-6-1-sol", eventCount: 1 },
    ]);
    expect(next.receipt?.lines.map((l) => l.modelId)).toContain("gpt-6-sol");
    expect(events.map((e) => e.model.canonicalId)).toEqual([
      "claude-opus-5-5",
      "gpt-6-sol",
      "gpt-6-1-sol",
    ]);
  });
  it("does not suggest a new target before its accepted pricing starts", () => {
    expect(suggestedMapping(frontier, workload(["claude-opus-5-5"]), "2026-09-28")).toEqual({});
    expect(suggestedMapping(frontier, workload(["claude-opus-5-5"]), "2026-09-29")).toEqual({
      "claude-opus-5-5": "gpt-6-1-sol",
    });
  });
  it("does not invert many-to-one rules or manufacture an economy profile", () => {
    expect(
      suggestedMapping(TRANSLATION_PROFILES[1], workload(["gpt-6-astra", "gpt-6-sol"])),
    ).toEqual({ "gpt-6-astra": "claude-fable-5-1" });
    expect(TRANSLATION_PROFILES).toHaveLength(2);
  });
  it("pins version and local user approval and distinguishes edits", () => {
    expect(approvedPolicy(frontier, { "claude-opus-5-5": "gpt-6-1-sol" })).toMatchObject({
      id: "openai-frontier",
      version: "2",
      provenance: "user",
      transform: "token-preserving",
    });
    expect(approvedPolicy(frontier, { "claude-opus-5-5": "" })).toMatchObject({
      id: "openai-frontier-edited",
      rules: [],
    });
  });
  it("keeps unmapped and unidentified calls in the coverage denominator", () => {
    expect(
      mappingCoverage(workload(["claude-opus-5-5", "claude-sonnet-5"]), "openai", {
        "claude-opus-5-5": "gpt-6-1-sol",
      }),
    ).toEqual({ recorded: 22, mapped: 10, applicable: 10 });
  });
  it("subtracts range endpoints conservatively only for a fully priced population", () => {
    expect(replayDifference({ low: "3", high: "4" }, { low: "2", high: "2" }, 20, 20)).toEqual({
      low: "-2",
      high: "-1",
    });
    expect(
      replayDifference({ low: "3", high: "4" }, { low: "2", high: "2" }, 20, 19),
    ).toBeUndefined();
    expect(replayDifference(undefined, { low: "2", high: "2" }, 20, 20)).toBeUndefined();
  });
});
describe("completed local comparisons", () => {
  const modern = { ...result, decisionSnapshotHash: DECISION_MARKET.decisionSnapshotHash };
  it("groups matching execution semantics across metadata-only catalog revisions", () => {
    expect(comparableReplays(modern, modern)).toBe(true);
    expect(comparableReplays(modern, { ...modern, catalogHash: "different", mode: "exact" })).toBe(
      true,
    );
    expect(
      comparableReplays(modern, { ...modern, decisionSnapshotHash: `sha256:${"0".repeat(64)}` }),
    ).toBe(false);
    for (const key of ["importId", "scopeDigest", "rulesAt"] as const)
      expect(comparableReplays(modern, { ...modern, [key]: "different" })).toBe(false);
    expect(comparableReplays(modern, { ...modern, calls: 19 })).toBe(false);
  });
  it("does not let legacy fallback bridge incompatible members in Compare", () => {
    const revised = { ...modern, id: "revised", catalogHash: "metadata-only" };
    const legacy = { ...result, id: "legacy" };
    expect(comparableReplayGroup(modern, [modern, revised, legacy])).toEqual([modern, revised]);
    expect(comparableReplayGroup(legacy, [legacy, modern, revised])).toEqual([legacy, modern]);
  });
  it("keeps same-snapshot records when a legacy record is listed first", () => {
    const revised = { ...modern, id: "revised", catalogHash: "metadata-only" };
    const legacy = { ...result, id: "legacy" };
    expect(comparableReplayGroup(modern, [legacy, revised, modern])).toEqual([modern, revised]);
  });
  it("keeps mixed legacy/new records on exact catalog fallback", () => {
    expect(comparableReplays(result, modern)).toBe(true);
    expect(comparableReplays(modern, result)).toBe(true);
    expect(comparableReplays(result, { ...modern, catalogHash: "different" })).toBe(false);
    expect(comparableReplays(modern, { ...result, catalogHash: "different" })).toBe(false);
  });
  it("keeps the dollar-difference snapshot guard conservative", () => {
    expect(compatibleReplaySnapshots(modern, { ...modern, catalogHash: "metadata-change" })).toBe(
      true,
    );
    expect(compatibleReplaySnapshots(modern, { ...modern, decisionSnapshotHash: "another" })).toBe(
      false,
    );
    expect(compatibleReplaySnapshots(modern, { ...modern, rulesAt: "other-day" })).toBe(false);
    expect(compatibleReplaySnapshots(modern, { ...result, catalogHash: "legacy-other" })).toBe(
      false,
    );
  });
  it("keeps different workloads, scopes, dates and catalog snapshots separate", () => {
    expect(comparableReplays(result, { ...result, id: "another", mode: "exact" })).toBe(true);
    for (const key of ["importId", "scopeDigest", "rulesAt", "catalogHash"] as const)
      expect(comparableReplays(result, { ...result, [key]: "different" })).toBe(false);
    expect(comparableReplays(result, { ...result, calls: 19 })).toBe(false);
  });
  it("rejects impossible counts, reversed ranges and partial-scope differences", () => {
    expect(completedReplaySchema.safeParse({ ...result, priced: 21 }).success).toBe(false);
    expect(
      completedReplaySchema.safeParse({ ...result, cost: { low: "4", high: "2" } }).success,
    ).toBe(false);
    expect(completedReplaySchema.safeParse({ ...result, priced: 19 }).success).toBe(false);
  });
  it("stores bounded aggregates, strips extra private fields, reloads and removes", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
    });
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    expect(
      saveCompletedReplay({
        ...modern,
        rawHistory: "secret",
        paidAmount: "999",
      } as CompletedReplay),
    ).toBe(true);
    expect(readCompletedReplays()).toEqual([modern]);
    for (let i = 0; i < 22; i++) saveCompletedReplay({ ...result, id: String(i) });
    expect(readCompletedReplays()).toHaveLength(20);
    expect(removeCompletedReplay("21")).toBe(true);
    expect(readCompletedReplays()).toHaveLength(19);
    expect([...storage.values()].join()).not.toContain("secret");
  });
  it("handles unavailable storage and corrupted records without throwing", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "broken",
      setItem: () => {
        throw Error("quota");
      },
    });
    expect(readCompletedReplays()).toEqual([]);
    expect(saveCompletedReplay(result)).toBe(false);
    expect(removeCompletedReplay(result.id)).toBe(false);
  });
});
