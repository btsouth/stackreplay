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
});
