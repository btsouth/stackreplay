import { createModelIdentityIndex } from "@stackreplay/catalog";
import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { importRecordSchema } from "./local-record-schema";
import { splitByIdentity } from "./workload-scope";

const identity = createModelIdentityIndex(loadBundledCatalog());

function event(id: string, rawName: string, canonicalId?: string): TextUsageEventV1 {
  return {
    schemaVersion: 1,
    id,
    occurredAt: "2026-09-01T10:00:00Z",
    source: { adapterId: "codex" },
    model: { rawName, ...(canonicalId === undefined ? {} : { canonicalId }) },
    modality: "text",
    usage: { inputTokens: 1 },
    confidence: { usage: "exact", model: "exact" },
  };
}

describe("resolved-only scope", () => {
  it("keeps recorded canonical ids and catalog aliases, and counts the rest", () => {
    const { resolved, unresolved } = splitByIdentity(
      [
        event("a", "gpt-5.6-sol"),
        event("b", "whatever", "gpt-6-sol"),
        event("c", "no-such-model"),
        event("d", "no-such-model"),
      ],
      identity,
    );
    expect(resolved.map((item) => item.id)).toEqual(["a", "b"]);
    expect(unresolved).toBe(2);
  });
});

describe("local project labels in the stored record", () => {
  const base = {
    id: "0123456789abcdef0123456789abcdef",
    label: "Selected workload (2 files)",
    createdAt: "2026-09-23T00:00:00.000Z",
    eventCount: 0,
    summary: {
      eventCount: 0,
      sessionCount: 0,
      projectCount: 0,
      tokens: {
        known: 0,
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
      models: [],
      usageSources: [],
      orchestration: [],
      otherSources: [],
      redaction: {
        promptsIncluded: false,
        responsesIncluded: false,
        sourceCodeIncluded: false,
        filePathsIncluded: false,
        repositoryNamesIncluded: false,
      },
      catalogVersion: "test",
    },
  };
  const hash = `ph_${"a".repeat(32)}`;

  it("accepts short folder labels keyed by salted hash", () => {
    expect(
      importRecordSchema.safeParse({ ...base, localProjects: [{ hash, label: "app · work" }] })
        .success,
    ).toBe(true);
  });

  it("refuses a label that carries a path", () => {
    expect(
      importRecordSchema.safeParse({
        ...base,
        localProjects: [{ hash, label: "/home/someone/app" }],
      }).success,
    ).toBe(false);
    expect(
      importRecordSchema.safeParse({ ...base, localProjects: [{ hash: "raw-path", label: "app" }] })
        .success,
    ).toBe(false);
  });
});
