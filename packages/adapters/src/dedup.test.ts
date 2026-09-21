import { describe, expect, it } from "vitest";
import { dedupeEvents } from "./dedup.js";
import { buildEvent, type EventContext, type EventDraft } from "./event-builder.js";
import { createFixtureEnvironment, FIXTURE_SALT, syntheticCatalog } from "./fixtures/helpers.js";
import { createModelMapper } from "./models.js";
import type { AdapterId, SourceEnvironment } from "./types.js";

const env: SourceEnvironment = createFixtureEnvironment({ homeDir: "/home/example" });
const context: EventContext = {
  env,
  salt: FIXTURE_SALT,
  mapper: createModelMapper(syntheticCatalog()),
};

function draft(overrides: Partial<EventDraft> & { adapterId: AdapterId }): EventDraft {
  return {
    sessionId: "session-one",
    identity: "record-1",
    occurredAtMs: Date.parse("2026-09-19T10:00:00.000Z"),
    rawModel: "example-medium",
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      reasoningTokens: 0,
      accounting: { reasoningIncludedInOutput: false },
    },
    ...overrides,
  };
}

describe("deduplication", () => {
  it("collapses exact duplicates from the same adapter", () => {
    const events = [
      buildEvent(draft({ adapterId: "claude-code" }), context),
      buildEvent(draft({ adapterId: "claude-code" }), context),
    ];
    const result = dedupeEvents(events);
    expect(result.events).toHaveLength(1);
    expect(result.exactDuplicates).toBe(1);
    expect(result.overlaps).toBe(0);
  });

  it("keeps distinct records from the same adapter", () => {
    const events = [
      buildEvent(draft({ adapterId: "claude-code", identity: "record-1" }), context),
      buildEvent(draft({ adapterId: "claude-code", identity: "record-2" }), context),
    ];
    const result = dedupeEvents(events);
    expect(result.events).toHaveLength(2);
    expect(result.exactDuplicates).toBe(0);
  });

  it("prefers the native source when an import describes the same session record", () => {
    const native = buildEvent(draft({ adapterId: "claude-code" }), context);
    const imported = buildEvent(draft({ adapterId: "ccusage" }), context);
    const result = dedupeEvents([imported, native]);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.source.adapterId).toBe("claude-code");
    expect(result.overlaps).toBe(1);
    expect(result.warnings[0]?.message).toContain("higher-precision source was kept");
  });

  it("does not treat different sessions or token counts as the same work", () => {
    const first = buildEvent(draft({ adapterId: "claude-code" }), context);
    const otherSession = buildEvent(
      draft({ adapterId: "ccusage", sessionId: "session-two", identity: "record-2" }),
      context,
    );
    const otherTokens = buildEvent(
      draft({
        adapterId: "ccusage",
        identity: "record-3",
        usage: {
          inputTokens: 999,
          outputTokens: 50,
          reasoningTokens: 0,
          accounting: { reasoningIncludedInOutput: false },
        },
      }),
      context,
    );
    const result = dedupeEvents([first, otherSession, otherTokens]);
    expect(result.events).toHaveLength(3);
    expect(result.overlaps).toBe(0);
  });

  it("orders events deterministically by timestamp then id", () => {
    const later = buildEvent(
      draft({
        adapterId: "codex",
        identity: "record-later",
        occurredAtMs: Date.parse("2026-09-19T12:00:00.000Z"),
      }),
      context,
    );
    const earlier = buildEvent(
      draft({
        adapterId: "codex",
        identity: "record-earlier",
        occurredAtMs: Date.parse("2026-09-19T09:00:00.000Z"),
      }),
      context,
    );
    const result = dedupeEvents([later, earlier]);
    expect(result.events.map((event) => event.occurredAt)).toEqual([
      "2026-09-19T09:00:00.000Z",
      "2026-09-19T12:00:00.000Z",
    ]);
  });

  it("is idempotent", () => {
    const events = [
      buildEvent(draft({ adapterId: "codex" }), context),
      buildEvent(draft({ adapterId: "ccusage" }), context),
      buildEvent(draft({ adapterId: "codex" }), context),
    ];
    const once = dedupeEvents(events);
    const twice = dedupeEvents(once.events);
    expect(twice.events).toEqual(once.events);
    expect(twice.exactDuplicates).toBe(0);
    expect(twice.overlaps).toBe(0);
  });
});
