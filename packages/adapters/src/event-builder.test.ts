import { describe, expect, it } from "vitest";
import {
  buildEvent,
  type EventContext,
  type EventDraft,
  eventContext,
  HARNESS_IDS,
} from "./event-builder.js";
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
    identity: "record-1",
    occurredAtMs: Date.parse("2026-09-19T10:00:00.000Z"),
    rawModel: "example-medium",
    usage: { inputTokens: 100, accounting: {} },
    ...overrides,
  };
}

describe("event builder: project identity", () => {
  /**
   * Regression (benchmark F019): the project key reached the hash unnormalized, so
   * the same directory written with a trailing separator (or, on Windows, with the
   * other separator or different case) hashed to a different project identity and
   * the same work appeared as two projects.
   */
  it("normalizes a project key before hashing it", () => {
    const withTrailingSeparator = buildEvent(
      draft({ adapterId: "claude-code", sessionId: "s1", projectKey: "/home/example/code/app/" }),
      context,
    );
    const withoutTrailingSeparator = buildEvent(
      draft({ adapterId: "claude-code", sessionId: "s1", projectKey: "/home/example/code/app" }),
      context,
    );
    expect(withTrailingSeparator.projectHash).toBe(withoutTrailingSeparator.projectHash);

    const otherProject = buildEvent(
      draft({ adapterId: "claude-code", sessionId: "s1", projectKey: "/home/example/code/other" }),
      context,
    );
    expect(otherProject.projectHash).not.toBe(withoutTrailingSeparator.projectHash);
  });

  it("normalizes Windows separators and case on Windows", () => {
    const windowsContext = eventContext(
      createFixtureEnvironment({ homeDir: "C:\\Users\\example", platform: "win32" }),
      {
        now: new Date("2026-09-19T12:00:00.000Z"),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
      },
    );
    const backslashes = buildEvent(
      draft({ adapterId: "codex", sessionId: "s1", projectKey: "C:\\Code\\Demo\\" }),
      windowsContext,
    );
    const forwardSlashes = buildEvent(
      draft({ adapterId: "codex", sessionId: "s1", projectKey: "c:/code/demo" }),
      windowsContext,
    );
    expect(backslashes.projectHash).toBe(forwardSlashes.projectHash);
    // The path itself never travels: only its salted hash does.
    expect(JSON.stringify(backslashes)).not.toContain("Code");
  });
});

describe("event builder: native event identity", () => {
  /**
   * Regression (P1, found by the independent audit): a record that names no
   * session hashed an empty session identity, so every such record of one adapter
   * shared one native hash and one canonical id and deduplication kept only the
   * first. Identity is now a tagged tuple, so the two shapes cannot collide and
   * distinct records stay distinct.
   */
  it("gives distinct session-less records distinct identities", () => {
    const first = buildEvent(draft({ adapterId: "ccusage", identity: "2026-09-19#0" }), context);
    const second = buildEvent(draft({ adapterId: "ccusage", identity: "2026-09-19#1" }), context);
    expect(first.source.nativeEventHash).not.toBe(second.source.nativeEventHash);
    expect(first.id).not.toBe(second.id);
    // Neither fabricates a session for a record that names none.
    expect(first.source.nativeSessionHash).toBeUndefined();
    expect(second.source.nativeSessionHash).toBeUndefined();
  });

  it("separates a session-backed identity from a session-less one", () => {
    const sessionLess = buildEvent(draft({ adapterId: "ccusage", identity: "record-1" }), context);
    const sessionBacked = buildEvent(
      draft({ adapterId: "ccusage", identity: "record-1", sessionId: "session-1" }),
      context,
    );
    expect(sessionLess.id).not.toBe(sessionBacked.id);
    expect(sessionBacked.source.nativeSessionHash).toMatch(/^ns_[0-9a-f]{32}$/u);
    expect(sessionLess.source.nativeSessionHash).toBeUndefined();
  });

  it("keeps identity stable for identical records and distinct across adapters", () => {
    const first = buildEvent(draft({ adapterId: "codex", sessionId: "s1" }), context);
    const again = buildEvent(draft({ adapterId: "codex", sessionId: "s1" }), context);
    const otherAdapter = buildEvent(draft({ adapterId: "claude-code", sessionId: "s1" }), context);
    expect(again.id).toBe(first.id);
    expect(otherAdapter.id).not.toBe(first.id);
  });

  it("recognizes a provider response copied into another session", () => {
    const first = buildEvent(
      draft({
        adapterId: "claude-code",
        sessionId: "s1",
        identity: "msg-1\u0000req-1",
        identityScope: "global",
      }),
      context,
    );
    const copied = buildEvent(
      draft({
        adapterId: "claude-code",
        sessionId: "s2",
        identity: "msg-1\u0000req-1",
        identityScope: "global",
      }),
      context,
    );
    const nextRequest = buildEvent(
      draft({
        adapterId: "claude-code",
        sessionId: "s2",
        identity: "msg-1\u0000req-2",
        identityScope: "global",
      }),
      context,
    );
    expect(copied.id).toBe(first.id);
    expect(copied.source.nativeSessionHash).not.toBe(first.source.nativeSessionHash);
    expect(nextRequest.id).not.toBe(first.id);
  });

  it("carries harness and model attribution without inventing either", () => {
    const event = buildEvent(
      draft({ adapterId: "hermes", sessionId: "s1", harnessId: HARNESS_IDS.hermes }),
      context,
    );
    expect(event.harness).toEqual({ id: "hermes", attribution: "exact" });
    expect(event.model.canonicalId).toBe("example-medium");
  });
});
