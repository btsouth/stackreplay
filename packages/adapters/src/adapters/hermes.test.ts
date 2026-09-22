import type { UsageEventV1 } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { HERMES_CALL_COUNT_FIXTURE_SQL, HERMES_FIXTURE_SQL } from "../fixtures/content.js";
import {
  createFixtureEnvironment,
  createSqliteFixture,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
  withTempDir,
} from "../fixtures/helpers.js";
import { createModelMapper } from "../models.js";
import { createHermesAdapter, hermesEpochMs } from "./hermes.js";

const adapter = createHermesAdapter();

async function collectFrom() {
  return withTempDir(async (directory) => {
    await createSqliteFixture(`${directory}/.hermes/state.db`, HERMES_FIXTURE_SQL);
    const env = createFixtureEnvironment({ homeDir: directory });
    return adapter.collect(env, {
      now: fixtureNow(),
      salt: FIXTURE_SALT,
      mapper: createModelMapper(syntheticCatalog()),
      roots: [`${directory}/.hermes`],
    });
  });
}

describe("hermes adapter", () => {
  it("emits one aggregate event per session and model", async () => {
    const result = await collectFrom();
    expect(result.events).toHaveLength(2);
    expect(Date.parse(result.events[0]?.occurredAt ?? "")).toBe(1789603516670);
    expect(Date.parse(result.events[1]?.occurredAt ?? "")).toBe(1789605516250);
  });

  it("converts epoch seconds to canonical timestamps", () => {
    expect(hermesEpochMs(1789601516.6703937)).toBe(1789601516670);
    expect(hermesEpochMs(1789601516670)).toBe(1789601516670);
    expect(hermesEpochMs(null)).toBeUndefined();
    expect(hermesEpochMs(0)).toBeUndefined();
    // An epoch second far outside the representable date range must not become a
    // RangeError out of the event builder: the row is not a usable timestamp.
    expect(hermesEpochMs(1e18)).toBeUndefined();
    expect(hermesEpochMs(-1)).toBeUndefined();
  });

  it("treats cache as additional and reasoning as a subset of output", async () => {
    const result = await collectFrom();
    expect(result.events[0]?.usage).toEqual({
      inputTokens: 5000,
      outputTokens: 900,
      cacheReadTokens: 40000,
      cacheWriteTokens: 1200,
      reasoningTokens: 300,
      accounting: {
        cacheReadIncludedInInput: false,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: true,
      },
    });
  });

  it("carries the activity window and prefers actual over estimated cost", async () => {
    const result = await collectFrom();
    const first = result.events[0];
    const second = result.events[1];
    expect(first?.requestStartedAt).toBe(new Date(1789601516670).toISOString());
    expect(first?.requestEndedAt).toBe(new Date(1789603516670).toISOString());
    expect(first?.durationMs).toBe(2000000);
    expect(first?.nativeCost).toEqual({ amount: "0.75", currency: "USD" });
    expect(second?.nativeCost).toEqual({ amount: "0.009", currency: "USD" });
  });

  it("flags aggregated rows so request counts are not overstated", async () => {
    const result = await collectFrom();
    expect(result.warnings.map((warning) => warning.code)).toContain("RECORD_INCOMPLETE");
    expect(result.warnings[0]?.message).toContain("approximate");
  });

  it("hashes the project path instead of exporting it", async () => {
    const result = await collectFrom();
    expect(result.events[0]?.projectHash).toMatch(/^ph_[0-9a-f]{32}$/u);
    expect(JSON.stringify(result.events)).not.toContain("demo-app");
  });

  it("is idempotent for identical inputs", async () => {
    const first = await collectFrom();
    const second = await collectFrom();
    expect(second.events).toEqual(first.events);
  });

  it("detects the profile and counts usage records", async () => {
    await withTempDir(async (directory) => {
      await createSqliteFixture(`${directory}/.hermes/state.db`, HERMES_FIXTURE_SQL);
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(true);
      expect(detection.supported).toBe(true);
      expect(detection.note).toContain("2 session/model usage record(s)");
    });
  });

  it("reports a missing profile without inventing one", async () => {
    await withTempDir(async (directory) => {
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(false);
      expect(detection.note).toContain("no Hermes profile found");
    });
  });
});

describe("hermes adapter: rows that collide on (session, model)", () => {
  async function collectCollisions() {
    const { HERMES_PK_COLLISION_FIXTURE_SQL } = await import("../fixtures/content.js");
    return withTempDir(async (directory) => {
      await createSqliteFixture(`${directory}/.hermes/state.db`, HERMES_PK_COLLISION_FIXTURE_SQL);
      const env = createFixtureEnvironment({ homeDir: directory });
      return adapter.collect(env, {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        roots: [`${directory}/.hermes`],
      });
    });
  }

  /**
   * Regression: the source table's primary key is
   * (session_id, model, billing_provider, billing_base_url, billing_mode, task).
   * Keying the event on `sessionId#model` made every extra row for a pair look
   * like an exact duplicate, and dedup discarded its tokens silently (on a real
   * store that dropped 85.1% of Hermes tokens).
   */
  it("keeps every row of a (session, model) pair as its own event", async () => {
    const result = await collectCollisions();
    expect(result.events).toHaveLength(3);
    expect(new Set(result.events.map((event) => event.id)).size).toBe(3);
    expect(result.stats.eventsEmitted).toBe(3);
  });

  it("loses no tokens across the collision rows", async () => {
    const result = await collectCollisions();
    const inputTokens = result.events.reduce(
      (total, event) => total + (event.usage.inputTokens ?? 0),
      0,
    );
    expect(inputTokens).toBe(6000 + 1200 + 800);
  });

  it("survives the deduplication pass with every row intact", async () => {
    const { dedupeEvents } = await import("../dedup.js");
    const result = await collectCollisions();
    const deduped = dedupeEvents(result.events);
    expect(deduped.events).toHaveLength(3);
    expect(deduped.exactDuplicates).toBe(0);
    const inputTokens = deduped.events.reduce(
      (total, event) => total + (event.usage.inputTokens ?? 0),
      0,
    );
    expect(inputTokens).toBe(8000);
  });

  it("reports an aggregate row's usage as estimated, not exact", async () => {
    const result = await collectCollisions();
    const byTask = (events: typeof result.events, task: string) =>
      events.find((event) => event.requestEndedAt === new Date(Number(task)).toISOString());
    // The 4-call row is an aggregate; the 1-call rows are single calls.
    expect(byTask(result.events, "1789603516670")?.confidence.usage).toBe("estimated");
    expect(byTask(result.events, "1789607516250")?.confidence.usage).toBe("exact");
  });
});

/**
 * Regression (audit of the F014 fix): only `api_call_count > 1` made a row
 * estimated, so a row whose count is absent — one that may stand for any number
 * of calls — stayed `exact` and a request figure built from it read as a real
 * count. Confidence now follows the count: one call is exact, anything else
 * (several, none, or fewer than one) is estimated.
 */
describe("hermes adapter: usage confidence follows the recorded call count", () => {
  async function collectCallCounts() {
    return withTempDir(async (directory) => {
      await createSqliteFixture(`${directory}/.hermes/state.db`, HERMES_CALL_COUNT_FIXTURE_SQL);
      const env = createFixtureEnvironment({ homeDir: directory });
      return adapter.collect(env, {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        roots: [`${directory}/.hermes`],
      });
    });
  }

  const confidenceAt = (events: UsageEventV1[], lastSeen: number) =>
    events.find((event) => event.requestEndedAt === new Date(lastSeen).toISOString());

  it("keeps a single-call row exact and every other row estimated", async () => {
    const result = await collectCallCounts();
    expect(result.events).toHaveLength(4);
    expect(confidenceAt(result.events, 1789603516500)?.confidence.usage).toBe("exact");
    expect(confidenceAt(result.events, 1789604516500)?.confidence.usage).toBe("estimated");
    expect(confidenceAt(result.events, 1789605516500)?.confidence.usage).toBe("estimated");
    expect(confidenceAt(result.events, 1789606516500)?.confidence.usage).toBe("estimated");
  });

  it("says why an uncounted row's request count is approximate", async () => {
    const result = await collectCallCounts();
    // One sample per warning code, with the exact number of rows behind it: the
    // three rows that are not exact counters are reported, the single-call row
    // raises nothing.
    expect(result.warnings).toHaveLength(1);
    const warning = result.warnings[0];
    expect(warning?.code).toBe("RECORD_INCOMPLETE");
    expect(warning?.message).toContain("request counts are approximate");
    expect(warning?.message).toContain("may report no call count");
    expect(warning?.message).toContain("(3 records affected)");
  });
});

describe("hermes adapter: schema validity when the reasoning column is null", () => {
  it("emits a schema-valid event when reasoning is not recorded", async () => {
    const { usageEventV1Schema } = await import("@stackreplay/schema");
    const statements = HERMES_FIXTURE_SQL.map((statement) =>
      statement.replace(", 300, 0.75,", ", null, 0.75,"),
    );
    const result = await withTempDir(async (directory) => {
      await createSqliteFixture(`${directory}/.hermes/state.db`, statements);
      const env = createFixtureEnvironment({ homeDir: directory });
      return adapter.collect(env, {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        roots: [`${directory}/.hermes`],
      });
    });
    expect(result.events.length).toBeGreaterThan(0);
    for (const event of result.events) {
      const parsed = usageEventV1Schema.safeParse(event);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
    expect(result.events[0]?.usage.reasoningTokens).toBeUndefined();
    expect(result.events[0]?.usage.accounting?.reasoningIncludedInOutput).toBeUndefined();
  });
});
