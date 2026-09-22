import { describe, expect, it } from "vitest";
import { CCUSAGE_DAILY_JSON, CCUSAGE_SESSION_JSON } from "../fixtures/content.js";
import {
  createFixtureEnvironment,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
  withTempDir,
  writeFixture,
} from "../fixtures/helpers.js";
import { createModelMapper } from "../models.js";
import { ccusageRows, createCcusageAdapter } from "./ccusage.js";

const adapter = createCcusageAdapter();

async function collectFrom(content: string) {
  return withTempDir(async (directory) => {
    const inputFile = `${directory}/ccusage.json`;
    await writeFixture(inputFile, content);
    const env = createFixtureEnvironment({ homeDir: directory, inputFile });
    return adapter.collect(env, {
      now: fixtureNow(),
      salt: FIXTURE_SALT,
      mapper: createModelMapper(syntheticCatalog()),
      inputFile,
    });
  });
}

describe("ccusage import adapter", () => {
  it("imports session rows with additive cache categories", async () => {
    const result = await collectFrom(CCUSAGE_SESSION_JSON);
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.usage).toEqual({
      inputTokens: 4512,
      outputTokens: 350846,
      cacheReadTokens: 1024,
      cacheWriteTokens: 512,
      accounting: { cacheReadIncludedInInput: false, cacheWriteIncludedInInput: false },
    });
  });

  it("keeps reasoning unknown because ccusage cannot establish the relationship", async () => {
    const result = await collectFrom(CCUSAGE_SESSION_JSON);
    expect(result.events[0]?.usage.reasoningTokens).toBeUndefined();
    expect(result.warnings.map((warning) => warning.code)).toContain("ACCOUNTING_UNESTABLISHED");
    expect(result.warnings[0]?.message).toContain("reasoning stays unknown");
  });

  it("labels multi-model rows honestly instead of picking one model", async () => {
    const result = await collectFrom(CCUSAGE_SESSION_JSON);
    expect(result.events[0]?.model.rawName).toBe("example-medium");
    expect(result.events[1]?.model.rawName).toBe("example-small, example-large");
    expect(result.events[1]?.confidence.model).toBe("unknown");
  });

  it("imports daily rows at day granularity with cost", async () => {
    const result = await collectFrom(CCUSAGE_DAILY_JSON);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.occurredAt).toBe("2026-09-16T00:00:00.000Z");
    expect(result.events[0]?.nativeCost).toEqual({ amount: "7.33", currency: "USD" });
    expect(result.events[0]?.usage.inputTokens).toBe(177);
  });

  it("supports blocks, monthly and project-grouped layouts", () => {
    const blocks = ccusageRows({
      type: "blocks",
      data: [
        {
          blockStart: "2026-09-16T10:00:00.000Z",
          blockEnd: "2026-09-16T15:00:00.000Z",
          models: ["example-medium"],
          inputTokens: 1250,
          outputTokens: 15000,
          cacheCreationTokens: 256,
          cacheReadTokens: 512,
          costUSD: 8.75,
        },
      ],
    });
    expect(blocks?.layout).toBe("blocks");
    expect(blocks?.rows[0]?.occurredAtMs).toBe(Date.parse("2026-09-16T15:00:00.000Z"));

    const monthly = ccusageRows([
      {
        month: "2026-09",
        models: ["example-medium"],
        inputTokens: 45231,
        outputTokens: 892456,
        cacheCreationTokens: 2048,
        cacheReadTokens: 4096,
        totalCost: 1247.92,
      },
    ]);
    expect(monthly?.layout).toBe("monthly");
    expect(monthly?.rows[0]?.occurredAtMs).toBe(Date.parse("2026-09-01T00:00:00.000Z"));
    expect(monthly?.rows[0]?.nativeCost).toBe("1247.92");

    const projects = ccusageRows({
      projects: {
        "demo-project": [
          {
            date: "2026-09-16",
            models: ["example-small"],
            inputTokens: 100,
            outputTokens: 200,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            totalCost: 0.25,
          },
        ],
      },
    });
    expect(projects?.layout).toBe("projects");
    expect(projects?.rows[0]?.projectKey).toBe("demo-project");
  });

  it("hashes imported project names", async () => {
    const result = await collectFrom(
      JSON.stringify({
        projects: {
          "demo-project": [
            {
              date: "2026-09-16",
              models: ["example-small"],
              inputTokens: 100,
              outputTokens: 200,
              cacheCreationTokens: 0,
              cacheReadTokens: 0,
              totalCost: 0.25,
            },
          ],
        },
      }),
    );
    expect(result.events[0]?.projectHash).toMatch(/^ph_[0-9a-f]{32}$/u);
    expect(JSON.stringify(result.events)).not.toContain("demo-project");
  });

  it("rejects an unknown layout instead of inventing a parser", async () => {
    const result = await collectFrom(JSON.stringify({ something: "else" }));
    expect(result.events).toHaveLength(0);
    expect(result.warnings.map((warning) => warning.code)).toContain("SOURCE_LAYOUT_UNSUPPORTED");
  });

  it("reports a missing import file", async () => {
    await withTempDir(async (directory) => {
      const inputFile = `${directory}/missing.json`;
      const env = createFixtureEnvironment({ homeDir: directory, inputFile });
      const result = await adapter.collect(env, {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        inputFile,
      });
      expect(result.warnings.map((warning) => warning.code)).toContain("SOURCE_UNREADABLE");
    });
  });

  it("is not auto-detected without an explicit import file", async () => {
    await withTempDir(async (directory) => {
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(false);
      expect(detection.note).toContain("--input");
    });
  });

  it("is idempotent for identical inputs", async () => {
    const first = await collectFrom(CCUSAGE_SESSION_JSON);
    const second = await collectFrom(CCUSAGE_SESSION_JSON);
    expect(second.events).toEqual(first.events);
  });

  /**
   * Regression (benchmark F012): a daily, monthly or block row aggregates a
   * bucket of work and names no session. Hashing the bucket name as a session
   * identity fabricated a session, and the row could then never be recognised
   * as the same work a native scan already read: the combined run double
   * counted, silently.
   */
  it("carries no fabricated session identity for bucket rows", async () => {
    const daily = await collectFrom(CCUSAGE_DAILY_JSON);
    expect(daily.events).toHaveLength(1);
    expect(daily.events[0]?.source.nativeSessionHash).toBeUndefined();
    expect(daily.warnings.map((warning) => warning.code)).toContain("AGGREGATE_NO_SESSION");
  });

  it("keeps the provider session identity when the layout names one", async () => {
    const session = await collectFrom(CCUSAGE_SESSION_JSON);
    expect(session.events[0]?.source.nativeSessionHash).toMatch(/^ns_[0-9a-f]{32}$/u);
    expect(session.warnings.map((warning) => warning.code)).not.toContain("AGGREGATE_NO_SESSION");
  });

  /**
   * Regression (P1, found by the independent audit of the F012 fix): a
   * session-less row hashed an empty session identity, so every bucket row of
   * this adapter received the same `nativeEventHash` and the same canonical
   * event id. `dedupeEvents` then treated the later rows as exact duplicates of
   * the first and discarded them, and their tokens disappeared from the
   * accounting silently.
   *
   * Two rows of the same bucket, carrying different token counts, are the shape
   * that exposes it: the adapter must derive each row's identity from the row.
   */
  const FIRST_BUCKET_ROW: Record<string, unknown> = {
    date: "2026-09-16",
    month: "2026-09",
    models: ["example-medium"],
    inputTokens: 1000,
    outputTokens: 200,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    blockStart: "2026-09-16T10:00:00.000Z",
    blockEnd: "2026-09-16T15:00:00.000Z",
  };
  const SECOND_BUCKET_ROW: Record<string, unknown> = {
    date: "2026-09-16",
    month: "2026-09",
    models: ["example-small"],
    inputTokens: 99,
    outputTokens: 9,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    blockStart: "2026-09-16T10:00:00.000Z",
    blockEnd: "2026-09-16T15:00:00.000Z",
  };
  const TWO_ROWS = [FIRST_BUCKET_ROW, SECOND_BUCKET_ROW];

  const SESSION_LESS_LAYOUTS: { layout: string; payload: unknown }[] = [
    { layout: "daily", payload: { type: "daily", data: TWO_ROWS } },
    { layout: "monthly", payload: TWO_ROWS },
    { layout: "blocks", payload: { type: "blocks", data: TWO_ROWS } },
    { layout: "projects", payload: { projects: { "demo-project": TWO_ROWS } } },
  ];

  it.each(SESSION_LESS_LAYOUTS)(
    "gives two session-less $layout rows distinct identities and loses no tokens",
    async ({ payload }) => {
      const { dedupeEvents } = await import("../dedup.js");
      const result = await collectFrom(JSON.stringify(payload));
      expect(result.events).toHaveLength(2);

      const ids = new Set(result.events.map((event) => event.id));
      const hashes = new Set(result.events.map((event) => event.source.nativeEventHash));
      expect(ids.size).toBe(2);
      expect(hashes.size).toBe(2);
      // Neither row invents a session: the identity comes from the row itself.
      expect(result.events.every((event) => event.source.nativeSessionHash === undefined)).toBe(
        true,
      );

      const deduped = dedupeEvents(result.events);
      expect(deduped.events).toHaveLength(2);
      expect(deduped.exactDuplicates).toBe(0);
      const inputTokens = deduped.events.reduce(
        (total, event) => total + (event.usage.inputTokens ?? 0),
        0,
      );
      const outputTokens = deduped.events.reduce(
        (total, event) => total + (event.usage.outputTokens ?? 0),
        0,
      );
      expect(inputTokens).toBe(1099);
      expect(outputTokens).toBe(209);
    },
  );

  it("keeps a session-less row distinct from a session-backed one", async () => {
    // The two domains are separated explicitly: a bucket row and a session row
    // that happen to share a record identity must not hash alike.
    const result = await collectFrom(
      JSON.stringify({
        type: "daily",
        data: [
          {
            ...FIRST_BUCKET_ROW,
            sessionId: "77777777-7777-4777-8777-777777777777",
            lastActivity: "2026-09-16T15:00:00.000Z",
          },
        ],
      }),
    );
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.source.nativeSessionHash).toMatch(/^ns_[0-9a-f]{32}$/u);
    const bucketOnly = await collectFrom(
      JSON.stringify({ type: "daily", data: [FIRST_BUCKET_ROW] }),
    );
    expect(bucketOnly.events[0]?.id).not.toBe(result.events[0]?.id);
  });

  it("reports imported rows as estimated usage, never as exact counters", async () => {
    const session = await collectFrom(CCUSAGE_SESSION_JSON);
    expect(session.events.every((event) => event.confidence.usage === "estimated")).toBe(true);
  });

  /**
   * Regression (benchmark F013): `totalTokens` is the record's own oracle, and
   * the accounting policy requires checking the reported categories against it.
   */
  it("checks the record's own total and degrades an unreconcilable row", async () => {
    const unreconciled = await collectFrom(
      JSON.stringify({
        sessions: [
          {
            sessionId: "11111111-1111-4111-8111-111111111111",
            inputTokens: 300,
            outputTokens: 120,
            cacheCreationTokens: 0,
            cacheReadTokens: 512,
            totalTokens: 420,
            firstActivity: "2026-09-19T10:01:00.000Z",
            lastActivity: "2026-09-19T10:01:00.000Z",
            modelsUsed: ["example-medium"],
          },
        ],
      }),
    );
    const usage = unreconciled.events[0]?.usage;
    expect(usage?.inputTokens).toBe(300);
    expect(usage?.outputTokens).toBe(120);
    expect(usage?.cacheReadTokens).toBeUndefined();
    expect(unreconciled.warnings.map((warning) => warning.code)).toContain(
      "ACCOUNTING_UNRECONCILED",
    );
    expect(unreconciled.warnings.some((warning) => warning.message.includes("do not add up"))).toBe(
      true,
    );
  });

  it("keeps every category when the row reconciles with its own total", async () => {
    const reconciled = await collectFrom(
      JSON.stringify({
        sessions: [
          {
            sessionId: "11111111-1111-4111-8111-111111111111",
            inputTokens: 300,
            outputTokens: 120,
            cacheCreationTokens: 100,
            cacheReadTokens: 200,
            totalTokens: 720,
            firstActivity: "2026-09-19T10:01:00.000Z",
            lastActivity: "2026-09-19T10:01:00.000Z",
            modelsUsed: ["example-medium"],
          },
        ],
      }),
    );
    expect(reconciled.events[0]?.usage.cacheReadTokens).toBe(200);
    expect(reconciled.events[0]?.usage.cacheWriteTokens).toBe(100);
    expect(reconciled.warnings.some((warning) => warning.message.includes("do not add up"))).toBe(
      false,
    );
  });

  /** Regression (benchmark F038): ccusage dates go through the calendar guard. */
  it("refuses an impossible calendar date instead of rolling it over", async () => {
    const rolled = await collectFrom(
      JSON.stringify({
        type: "daily",
        data: [
          {
            date: "2026-02-30",
            models: ["example-medium"],
            inputTokens: 10,
            outputTokens: 5,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
          },
        ],
      }),
    );
    expect(rolled.events).toHaveLength(0);
    expect(rolled.stats.recordsRead).toBe(0);
  });
});
