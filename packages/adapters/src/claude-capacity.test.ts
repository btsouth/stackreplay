import { describe, expect, it } from "vitest";
import { createClaudeCodeAdapter } from "./adapters/claude-code.js";
import { intakeBrowserCandidates } from "./browser.js";
import { claudeCapacityEvent, dedupeCapacityEvents } from "./claude-capacity.js";
import { CLAUDE_CODE_SESSION } from "./fixtures/content.js";
import {
  createFixtureEnvironment,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
  withTempDir,
  writeFixture,
} from "./fixtures/helpers.js";
import { createModelMapper } from "./models.js";

const row = {
  type: "assistant",
  isApiErrorMessage: true,
  error: "rate_limit",
  uuid: "native-1",
  sessionId: "session-1",
  timestamp: "2026-09-19T10:00:00Z",
  quotaLimits: {
    status: "rejected",
    rateLimitType: "five_hour",
    resetsAt: Date.parse("2026-09-19T11:00:00Z") / 1000,
  },
  message: {
    model: "<synthetic>",
    content: [{ type: "text", text: "You've hit your session limit" }],
  },
};
describe("native capacity evidence", () => {
  it("retains structured resets, hashes identities and excludes raw message text", () => {
    const event = claudeCapacityEvent(row, "main", "salt");
    expect(event).toMatchObject({
      resourceInstanceId: "main",
      windowType: "five_hour",
      resetAt: "2026-09-19T11:00:00.000Z",
      eventType: "hard_limit_reached",
    });
    expect(JSON.stringify(event)).not.toMatch(/native-1|session-1|You've/);
  });
  it("rejects user quotations, ordinary assistant prose, overload and generic API 429", () => {
    for (const record of [
      { ...row, type: "user" },
      { ...row, isApiErrorMessage: false },
      { ...row, error: "overloaded", quotaLimits: undefined },
      { ...row, quotaLimits: undefined },
    ])
      expect(claudeCapacityEvent(record, "main", "salt")).toBeUndefined();
  });
  it("keeps exact model labels and does not attribute exhausted credits to subscriptions", () => {
    const event = (text: string) =>
      claudeCapacityEvent(
        {
          ...row,
          quotaLimits: undefined,
          message: { model: "<synthetic>", content: [{ type: "text", text }] },
        },
        "main",
        "salt",
      );
    expect(event("You've reached your Fable limit. Switch models.")).toMatchObject({
      windowType: "model",
      modelLabel: "Fable",
    });
    expect(event("You're out of usage credits. Try again.")).toMatchObject({
      eventType: "unknown_capacity_message",
      code: "credits_exhausted",
    });
  });
  it("deduplicates repeated native identity but keeps separate attempts and accounts", () => {
    const first = claudeCapacityEvent(row, "main", "salt");
    const second = claudeCapacityEvent({ ...row, uuid: "native-2" }, "main", "salt");
    const other = claudeCapacityEvent(row, "other", "salt");
    if (!first || !second || !other) throw new Error("fixture not parsed");
    const result = dedupeCapacityEvents([first, first, second, other]);
    expect(result).toHaveLength(3);
    expect(result.find((e) => e.id === first.id)?.duplicateRows).toBe(1);
  });
  it("normal native ingestion retains capacity records even without usage and bounds the cycle", async () => {
    await withTempDir(async (directory) => {
      const root = `${directory}/.claude/projects`;
      await writeFixture(
        `${root}/project/session.jsonl`,
        [row, row, { ...row, uuid: "outside", timestamp: "2026-09-20T00:00:00Z" }]
          .map((r) => JSON.stringify(r))
          .join("\n"),
      );
      const result = await createClaudeCodeAdapter().collect(
        createFixtureEnvironment({ homeDir: directory }),
        {
          now: fixtureNow(),
          salt: FIXTURE_SALT,
          mapper: createModelMapper(syntheticCatalog()),
          roots: [root],
          since: "2026-09-19T00:00:00Z",
          until: "2026-09-20T00:00:00Z",
        },
      );
      expect(result.events).toEqual([]);
      expect(result.warnings.some((w) => w.code === "MODEL_UNKNOWN")).toBe(false);
      expect(result.capacityEvents).toHaveLength(1);
      expect(result.capacityEvents?.[0]?.duplicateRows).toBe(1);
    });
  });
});

it("browser normalization retains capacity evidence and deduplicates it across session files", async () => {
  const contents = [
    CLAUDE_CODE_SESSION + "\n" + JSON.stringify(row),
    CLAUDE_CODE_SESSION +
      "\n" +
      JSON.stringify(row) +
      "\n" +
      JSON.stringify({ ...row, uuid: "second" }),
  ];
  const result = await intakeBrowserCandidates(
    contents.map((text, i) => ({
      path: `.claude/projects/project/${i}.jsonl`,
      size: new TextEncoder().encode(text).length,
      lastModified: fixtureNow().getTime(),
      text: async () => text,
    })),
    syntheticCatalog(),
    { now: fixtureNow().toISOString(), salt: FIXTURE_SALT },
  );
  expect(result.exported?.capacityObservations?.events).toHaveLength(2);
  expect(result.exported?.capacityObservations?.events.some((e) => e.duplicateRows === 1)).toBe(
    true,
  );
  expect(JSON.stringify(result.exported?.capacityObservations)).not.toContain("You've");
});
it("generic API retries remain unattributed capacity messages, not subscription rejections", () => {
  const parsed = claudeCapacityEvent(
    {
      type: "system",
      subtype: "api_error",
      error: { status: 429 },
      timestamp: row.timestamp,
      sessionId: row.sessionId,
      uuid: row.uuid,
    },
    "main",
    "salt",
  );
  expect(parsed).toMatchObject({
    code: "api_rate_limit",
    eventType: "unknown_capacity_message",
    windowType: "unknown",
  });
});

it("deduplicates assistant response identity even when row UUIDs differ", () => {
  const first = claudeCapacityEvent(
    { ...row, message: { ...row.message, id: "response" } },
    "main",
    "salt",
  );
  const repeated = claudeCapacityEvent(
    { ...row, uuid: "another-row", message: { ...row.message, id: "response" } },
    "main",
    "salt",
  );
  if (!first || !repeated) throw new Error("fixture not parsed");
  expect(dedupeCapacityEvents([first, repeated])).toHaveLength(1);
});
