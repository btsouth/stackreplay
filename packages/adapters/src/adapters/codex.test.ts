import { describe, expect, it } from "vitest";
import { CODEX_ROLLOUT, CODEX_ROLLOUT_PATH } from "../fixtures/content.js";
import {
  createFixtureEnvironment,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
  withTempDir,
  writeFixture,
} from "../fixtures/helpers.js";
import { createModelMapper } from "../models.js";
import { createCodexAdapter } from "./codex.js";

const adapter = createCodexAdapter();

async function collectFrom(session: string = CODEX_ROLLOUT) {
  return withTempDir(async (directory) => {
    await writeFixture(`${directory}/.codex/sessions/${CODEX_ROLLOUT_PATH}`, session);
    const env = createFixtureEnvironment({ homeDir: directory });
    return adapter.collect(env, {
      now: fixtureNow(),
      salt: FIXTURE_SALT,
      mapper: createModelMapper(syntheticCatalog()),
      roots: [`${directory}/.codex/sessions`],
    });
  });
}

describe("codex adapter", () => {
  it("emits one event per per-turn token delta", async () => {
    const result = await collectFrom();
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.occurredAt).toBe("2026-09-19T11:00:10.000Z");
    expect(result.events[1]?.occurredAt).toBe("2026-09-19T11:01:10.000Z");
    expect(result.events[0]?.usage).toEqual({
      inputTokens: 2000,
      outputTokens: 300,
      cacheReadTokens: 1500,
      cacheWriteTokens: 200,
      reasoningTokens: 100,
      accounting: {
        cacheReadIncludedInInput: true,
        cacheWriteIncludedInInput: true,
        reasoningIncludedInOutput: true,
      },
    });
    expect(result.events[1]?.usage.inputTokens).toBe(600);
    expect(result.events[1]?.usage.cacheWriteTokens).toBe(0);
  });

  it("uses the model from the surrounding turn context", async () => {
    const result = await collectFrom();
    expect(result.events[0]?.model.rawName).toBe("example-large");
    expect(result.events[0]?.model.canonicalId).toBe("example-large");
    expect(result.events[0]?.confidence.model).toBe("exact");
  });

  it("degrades cache to unknown when the subset relationship does not hold", async () => {
    const damaged = CODEX_ROLLOUT.replaceAll(
      '"cached_input_tokens":1500',
      '"cached_input_tokens":90000',
    );
    const result = await collectFrom(damaged);
    const usage = result.events[0]?.usage;
    expect(usage?.cacheReadTokens).toBeUndefined();
    expect(usage?.cacheWriteTokens).toBeUndefined();
    expect(usage?.inputTokens).toBe(2000);
    expect(result.warnings.map((warning) => warning.code)).toContain("ACCOUNTING_UNESTABLISHED");
  });

  it("skips records with no model context and reports them", async () => {
    const withoutContext = CODEX_ROLLOUT.split("\n")
      .filter((line) => !line.includes("turn_context"))
      .join("\n");
    const result = await collectFrom(withoutContext);
    expect(result.events).toHaveLength(0);
    expect(result.warnings.map((warning) => warning.code)).toContain("MODEL_UNKNOWN");
  });

  it("hashes the project path and keeps sessions pseudonymous", async () => {
    const result = await collectFrom();
    const serialized = JSON.stringify(result.events);
    expect(serialized).not.toContain("/home/example");
    expect(result.events[0]?.projectHash).toMatch(/^ph_[0-9a-f]{32}$/u);
    expect(result.events[0]?.source.nativeSessionHash).toMatch(/^ns_[0-9a-f]{32}$/u);
  });

  it("is idempotent for identical inputs", async () => {
    const first = await collectFrom();
    const second = await collectFrom();
    expect(second.events).toEqual(first.events);
  });

  it("detects rollout files", async () => {
    await withTempDir(async (directory) => {
      await writeFixture(`${directory}/.codex/sessions/${CODEX_ROLLOUT_PATH}`, CODEX_ROLLOUT);
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(true);
      expect(detection.supported).toBe(true);
      expect(detection.probes[0]?.sessionCount).toBe(1);
    });
  });
});

describe("codex adapter: schema validity when fields are absent", () => {
  it("emits a schema-valid event when the record omits reasoning and cache fields", async () => {
    const { usageEventV1Schema } = await import("@stackreplay/schema");
    const trimmed = CODEX_ROLLOUT.split("\n")
      .map((line) => {
        if (!line.includes("last_token_usage")) return line;
        const record = JSON.parse(line) as {
          payload: { info: { last_token_usage: Record<string, unknown> } };
        };
        const usage = record.payload.info.last_token_usage;
        delete usage.reasoning_output_tokens;
        delete usage.cache_write_input_tokens;
        return JSON.stringify(record);
      })
      .join("\n");
    const result = await collectFrom(trimmed);
    expect(result.events).toHaveLength(2);
    for (const event of result.events) {
      const parsed = usageEventV1Schema.safeParse(event);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
    const first = result.events[0]?.usage;
    expect(first?.reasoningTokens).toBeUndefined();
    expect(first?.accounting?.reasoningIncludedInOutput).toBeUndefined();
    expect(first?.cacheReadTokens).toBe(1500);
    expect(first?.accounting?.cacheReadIncludedInInput).toBe(true);
  });
});
