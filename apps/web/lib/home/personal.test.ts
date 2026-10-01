import { describe, expect, it } from "vitest";
import type { TargetKey } from "../routes";
import type { ImportRecord, ModelSummary, WorkloadSummary } from "../worker-protocol";
import {
  addCents,
  canonicalUsage,
  type HomeCatalogIndex,
  lineupCoverage,
  marketRelation,
  modelUsage,
  personalRelevance,
  personalSnapshot,
} from "./personal";

const index: HomeCatalogIndex = {
  models: {
    "claude-opus": { name: "Claude Opus", developer: "Anthropic" },
    "claude-opus-5-5": { name: "Claude Opus 5.5", developer: "Anthropic", familyId: "claude-opus" },
    "claude-opus-5": { name: "Claude Opus 5", developer: "Anthropic", familyId: "claude-opus" },
    "gpt-6-1-sol": { name: "GPT-6.1 Sol", developer: "OpenAI" },
    "gpt-6-sol": { name: "GPT-6 Sol", developer: "OpenAI" },
  },
  plans: {
    "anthropic-claude-max-20x": {
      name: "Claude Max 20x",
      providerName: "Anthropic",
      price: { amount: "200", currency: "USD", interval: "month" },
    },
    "google-ai-pro": {
      name: "Google AI Pro",
      providerName: "Google",
      price: { amount: "19.99", currency: "USD", interval: "month" },
    },
  },
  apiProviders: { anthropic: "Anthropic" },
};

const model = (
  entry: Partial<ModelSummary> & { rawName: string; events: number },
): ModelSummary => ({
  mapped: entry.canonicalId !== undefined,
  ...entry,
});

function summary(models: ModelSummary[]): WorkloadSummary {
  const eventCount = models.reduce((sum, entry) => sum + entry.events, 0);
  return {
    eventCount,
    sessionCount: 3,
    projectCount: 1,
    firstEventAt: "2026-09-01T10:00:00Z",
    lastEventAt: "2026-09-10T10:00:00Z",
    tokens: {
      known: 1_000_000,
      lowerBound: 0,
      unknownEvents: 0,
      buckets: {
        uncachedInputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
      },
    },
    models,
    usageSources: [
      { adapterId: "claude-code", name: "Claude Code", role: "usage", events: 60 },
      { adapterId: "codex", name: "Codex", role: "usage", events: 40 },
    ],
    orchestration: [],
    otherSources: [],
    redaction: {
      promptsIncluded: false,
      responsesIncluded: false,
      sourceCodeIncluded: false,
      filePathsIncluded: false,
      repositoryNamesIncluded: false,
    },
    catalogVersion: "sha256:test",
  };
}

const workload = summary([
  model({ rawName: "claude-opus-5", canonicalId: "claude-opus-5", events: 50 }),
  // Names that look like a catalog model but did not resolve stay unresolved.
  model({ rawName: "claude-opus-5-5-preview", events: 7 }),
  model({ rawName: "Claude Opus 5.5 (beta)", events: 3 }),
  model({ rawName: "gpt-6.1-sol", canonicalId: "gpt-6-1-sol", events: 30, basis: "alias" }),
  model({ rawName: "gpt-6-1-sol", canonicalId: "gpt-6-1-sol", events: 10 }),
]);

describe("canonical identity", () => {
  const usage = canonicalUsage(workload);

  it("counts calls by resolved canonical id and merges spellings of one identity", () => {
    expect(usage.byModel.get("gpt-6-1-sol")).toBe(40);
    expect(usage.byModel.get("claude-opus-5")).toBe(50);
    expect(usage.total).toBe(100);
  });

  it("keeps unresolved names unresolved instead of matching similar names", () => {
    expect(usage.unresolved).toBe(10);
    expect(usage.byModel.has("claude-opus-5-5")).toBe(false);
    expect(modelUsage("claude-opus-5-5", "claude-opus", usage, index)).not.toMatchObject({
      kind: "used",
    });
  });

  it("names another release of the same family through the catalog family, not the name", () => {
    expect(modelUsage("claude-opus-5-5", "claude-opus", usage, index)).toEqual({
      kind: "related",
      related: [{ id: "claude-opus-5", name: "Claude Opus 5", calls: 50, familyOnly: false }],
    });
    // GPT-6 Sol shares most of its name with GPT-6.1 Sol but no recorded family.
    expect(modelUsage("gpt-6-sol", undefined, usage, index)).toEqual({ kind: "unseen" });
  });

  it("reports the exact model with its share of recorded calls", () => {
    expect(modelUsage("gpt-6-1-sol", undefined, usage, index)).toEqual({
      kind: "used",
      calls: 40,
      share: 0.4,
    });
  });

  it("says only 'family name' for calls that never resolved to a release", () => {
    const familyOnly = canonicalUsage(
      summary([model({ rawName: "opus", canonicalId: "claude-opus", events: 5 })]),
    );
    expect(modelUsage("claude-opus-5-5", "claude-opus", familyOnly, index)).toEqual({
      kind: "related",
      related: [{ id: "claude-opus", name: "Claude Opus", calls: 5, familyOnly: true }],
    });
  });
});

describe("personal relevance of market changes", () => {
  const usage = canonicalUsage(workload);
  const stack: TargetKey[] = ["plan:anthropic-claude-max-20x"];

  it("marks a plan change for a plan in the stack", () => {
    expect(
      personalRelevance({ planIds: ["anthropic-claude-max-20x"], modelIds: [] }, stack, usage),
    ).toBe("stack");
  });

  it("marks a model change for a model the workload used", () => {
    expect(personalRelevance({ planIds: [], modelIds: ["gpt-6-1-sol"] }, [], usage)).toBe(
      "workload",
    );
  });

  it("leaves everything else unmarked, including unresolved lookalikes", () => {
    expect(
      personalRelevance(
        { planIds: ["google-ai-pro"], modelIds: ["claude-opus-5-5"] },
        stack,
        usage,
      ),
    ).toBe(undefined);
    expect(personalRelevance({ planIds: [], modelIds: ["gpt-6-1-sol"] }, [], undefined)).toBe(
      undefined,
    );
  });
});

describe("market relations by canonical identity", () => {
  const usage = canonicalUsage(workload);
  const familyIndex: HomeCatalogIndex = {
    ...index,
    plans: {
      ...index.plans,
      "anthropic-claude-max-20x": {
        ...(index.plans["anthropic-claude-max-20x"] as HomeCatalogIndex["plans"][string]),
        family: "claude",
      },
      "anthropic-claude-max-5x": {
        name: "Claude Max 5x",
        providerName: "Anthropic",
        price: { amount: "100", currency: "USD", interval: "month" },
        family: "claude",
      },
    },
  };
  const stack: TargetKey[] = ["plan:anthropic-claude-max-20x"];

  it("a plan in the stack reads 'In your stack'", () => {
    expect(
      marketRelation(
        { planIds: ["anthropic-claude-max-20x"], modelIds: [] },
        stack,
        usage,
        familyIndex,
      ),
    ).toMatchObject({ kind: "stack", label: "In your stack" });
  });

  it("an exact used model reads 'Used by you' with its recorded calls", () => {
    expect(
      marketRelation({ planIds: [], modelIds: ["gpt-6-1-sol"] }, [], usage, familyIndex),
    ).toEqual({ kind: "used", label: "Used by you", detail: "40 recorded calls on GPT-6.1 Sol" });
  });

  it("a new release in a used family is relevant through the catalog familyId only", () => {
    expect(
      marketRelation({ planIds: [], modelIds: ["claude-opus-5-5"] }, [], usage, familyIndex),
    ).toEqual({
      kind: "related",
      label: "Relevant to you",
      detail: "You used Claude Opus 5 (50 recorded calls)",
    });
    // GPT-6 Sol shares most of GPT-6.1 Sol's name, but no family: no relation.
    expect(
      marketRelation({ planIds: [], modelIds: ["gpt-6-sol"] }, [], usage, familyIndex),
    ).toBeUndefined();
  });

  it("a sibling plan of a stack plan is relevant through the reviewed plan family", () => {
    expect(
      marketRelation(
        { planIds: ["anthropic-claude-max-5x"], modelIds: [] },
        stack,
        undefined,
        familyIndex,
      ),
    ).toMatchObject({
      kind: "related",
      detail: "Same plan family as Claude Max 20x in your stack",
    });
    expect(
      marketRelation({ planIds: ["google-ai-pro"], modelIds: [] }, stack, usage, familyIndex),
    ).toBeUndefined();
  });

  it("never fuzzy-matches an unresolved lookalike name", () => {
    // The workload recorded "claude-opus-5-5-preview" and "Claude Opus 5.5 (beta)" unresolved.
    const noFamily: HomeCatalogIndex = {
      ...familyIndex,
      models: { ...familyIndex.models, "claude-opus-5-5": { name: "Claude Opus 5.5" } },
    };
    expect(
      marketRelation({ planIds: [], modelIds: ["claude-opus-5-5"] }, [], usage, noFamily),
    ).toBeUndefined();
  });

  it("unknown stays unknown without a workload or stack", () => {
    expect(
      marketRelation({ planIds: [], modelIds: ["gpt-6-1-sol"] }, [], undefined, familyIndex),
    ).toBeUndefined();
  });
});

describe("personal snapshot", () => {
  const record: Pick<ImportRecord, "id" | "label" | "summary"> = {
    id: "local-1",
    label: "September history",
    summary: workload,
  };

  it("names the recording tools instead of a generated import label", () => {
    expect(
      personalSnapshot({ ...record, label: "Selected workload (1168 files)" }, [], index).label,
    ).toBe("Claude Code + Codex history");
    expect(personalSnapshot({ ...record, label: "Selected workload" }, [], index).label).toBe(
      "Claude Code + Codex history",
    );
    // A label the user chose is kept, even one that mentions files.
    expect(personalSnapshot(record, [], index).label).toBe("September history");
    expect(personalSnapshot({ ...record, label: "Laptop (3 files)" }, [], index).label).toBe(
      "Laptop (3 files)",
    );
  });

  it("summarizes stored facts without opening the payload", () => {
    const snapshot = personalSnapshot(record, [], index);
    expect(snapshot.calls).toBe(100);
    expect(snapshot.resolvedModels).toBe(2);
    expect(snapshot.unresolvedCalls).toBe(10);
    expect(snapshot.topModel).toMatchObject({ id: "claude-opus-5", calls: 50 });
    expect(snapshot.tools.map((tool) => [tool.label, tool.share])).toEqual([
      ["Claude Code", 0.6],
      ["Codex", 0.4],
    ]);
    // Developer shares are of resolved calls; unresolved calls are not assigned to anyone.
    expect(snapshot.developers.map((entry) => [entry.label, entry.calls])).toEqual([
      ["Anthropic", 50],
      ["OpenAI", 40],
    ]);
  });

  it("totals published monthly prices exactly and names targets it no longer lists", () => {
    const snapshot = personalSnapshot(
      record,
      ["plan:anthropic-claude-max-20x", "plan:google-ai-pro", "api:anthropic"],
      index,
    );
    expect(snapshot.stackMonthlyUsd).toBe("219.99");
    expect(snapshot.stack.map((line) => line.name)).toEqual([
      "Claude Max 20x",
      "Google AI Pro",
      "Anthropic API",
    ]);
    const unknown = personalSnapshot(record, ["plan:retired-plan"], index);
    expect(unknown.stack[0]?.name).toBe("Plan no longer listed");
    expect(unknown.stackMonthlyUsd).toBeUndefined();
  });
});

describe("helpers", () => {
  it("adds decimal dollars in cents", () => {
    expect(addCents(["19.99", "20", "0.01"])).toBe("40");
    expect(addCents(["9.99", "100"])).toBe("109.99");
  });

  it("measures lineup coverage over all recorded calls, unresolved included", () => {
    const usage = canonicalUsage(workload);
    expect(lineupCoverage(["claude-opus-5", "claude-opus-5-5"], usage)).toBe(0.5);
    expect(lineupCoverage([], usage)).toBe(0);
  });
});
