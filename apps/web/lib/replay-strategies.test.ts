import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkloadModels } from "@/components/replay/translation-model";
import {
  type CompletedReplay,
  comparableReplays,
  completedReplaySchema,
  readCompletedReplays,
  removeCompletedReplay,
  saveCompletedReplay,
} from "./completed-replays";
import {
  approvedPolicy,
  mappingCoverage,
  replayDifference,
  suggestedMapping,
  TRANSLATION_PROFILES,
} from "./replay-strategies";

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
afterEach(() => vi.unstubAllGlobals());
describe("workload-aware counterfactual policies", () => {
  it("enumerates exact canonical identities without fuzzy family matching", () => {
    expect(
      suggestedMapping(
        frontier,
        workload(["claude-opus-5-5", "claude-sonnet-5", "claude-haiku-4-5", "claude-opus-future"]),
      ),
    ).toEqual({
      "claude-opus-5-5": "gpt-6-sol",
      "claude-sonnet-5": "gpt-5-6-terra",
      "claude-haiku-4-5": "gpt-6-luna",
    });
  });
  it("does not invert many-to-one rules or manufacture an economy profile", () => {
    expect(
      suggestedMapping(TRANSLATION_PROFILES[1], workload(["gpt-6-astra", "gpt-6-sol"])),
    ).toEqual({ "gpt-6-astra": "claude-fable-5-1" });
    expect(TRANSLATION_PROFILES).toHaveLength(2);
  });
  it("pins version and local user approval and distinguishes edits", () => {
    expect(approvedPolicy(frontier, { "claude-opus-5-5": "gpt-6-sol" })).toMatchObject({
      id: "openai-frontier",
      version: "1",
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
        "claude-opus-5-5": "gpt-6-sol",
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
        ...result,
        rawHistory: "secret",
        paidAmount: "999",
      } as CompletedReplay),
    ).toBe(true);
    expect(readCompletedReplays()).toEqual([result]);
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
