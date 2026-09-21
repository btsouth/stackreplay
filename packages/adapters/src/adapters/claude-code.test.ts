import { describe, expect, it } from "vitest";
import {
  CLAUDE_CODE_FILE,
  CLAUDE_CODE_PROJECT_DIR,
  CLAUDE_CODE_SESSION,
} from "../fixtures/content.js";
import {
  createFixtureEnvironment,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
  withTempDir,
  writeFixture,
} from "../fixtures/helpers.js";
import { createModelMapper } from "../models.js";
import { createClaudeCodeAdapter } from "./claude-code.js";

const adapter = createClaudeCodeAdapter();

function options() {
  return {
    now: fixtureNow(),
    salt: FIXTURE_SALT,
    mapper: createModelMapper(syntheticCatalog()),
  };
}

async function collectFrom(root: string, extra: Record<string, unknown> = {}) {
  return withTempDir(async (directory) => {
    await writeFixture(
      `${directory}/.claude/projects/${CLAUDE_CODE_PROJECT_DIR}/${CLAUDE_CODE_FILE}`,
      CLAUDE_CODE_SESSION,
    );
    const env = createFixtureEnvironment({ homeDir: directory });
    return adapter.collect(env, {
      ...options(),
      roots: [root.replace("$DIR", directory)],
      ...extra,
    });
  });
}

describe("claude-code adapter", () => {
  it("emits one event per usage-bearing assistant record", async () => {
    const result = await collectFrom("$DIR/.claude/projects");
    expect(result.events).toHaveLength(2);
    expect(result.stats.recordsRead).toBe(7);
    expect(result.stats.recordsUnsupported).toBe(3);
    expect(result.events[0]?.occurredAt).toBe("2026-09-19T10:00:05.000Z");
    expect(result.events[1]?.occurredAt).toBe("2026-09-19T10:01:00.000Z");
  });

  it("reports cache categories as additional and reasoning as included in output", async () => {
    const result = await collectFrom("$DIR/.claude/projects");
    const [first] = result.events;
    expect(first?.usage).toEqual({
      inputTokens: 1200,
      outputTokens: 400,
      cacheReadTokens: 5000,
      cacheWriteTokens: 800,
      reasoningTokens: 0,
      accounting: {
        cacheReadIncludedInInput: false,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: true,
      },
    });
  });

  it("preserves the reported thinking quantity as reasoning inside output", async () => {
    const result = await withTempDir(async (directory) => {
      await writeFixture(
        `${directory}/.claude/projects/demo/${CLAUDE_CODE_FILE}`,
        JSON.stringify({
          type: "assistant",
          uuid: "a-thinking",
          sessionId: "11111111-1111-4111-8111-111111111111",
          timestamp: "2026-09-19T10:05:00.000Z",
          cwd: "/home/example/projects/demo-app",
          message: {
            id: "msg_thinking",
            role: "assistant",
            model: "example-medium",
            usage: {
              input_tokens: 700,
              output_tokens: 900,
              cache_read_input_tokens: 4200,
              output_tokens_details: { thinking_tokens: 640 },
            },
          },
        }),
      );
      const env = createFixtureEnvironment({ homeDir: directory });
      return adapter.collect(env, { ...options(), roots: [`${directory}/.claude/projects`] });
    });
    expect(result.events[0]?.usage).toEqual({
      inputTokens: 700,
      outputTokens: 900,
      cacheReadTokens: 4200,
      reasoningTokens: 640,
      accounting: {
        cacheReadIncludedInInput: false,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: true,
      },
    });
  });

  it("reports reasoning as unknown when thinking exceeds output", async () => {
    const result = await withTempDir(async (directory) => {
      await writeFixture(
        `${directory}/.claude/projects/demo/${CLAUDE_CODE_FILE}`,
        JSON.stringify({
          type: "assistant",
          uuid: "a-impossible",
          sessionId: "11111111-1111-4111-8111-111111111111",
          timestamp: "2026-09-19T10:06:00.000Z",
          cwd: "/home/example/projects/demo-app",
          message: {
            id: "msg_impossible",
            role: "assistant",
            model: "example-medium",
            usage: {
              input_tokens: 700,
              output_tokens: 100,
              output_tokens_details: { thinking_tokens: 900 },
            },
          },
        }),
      );
      const env = createFixtureEnvironment({ homeDir: directory });
      return adapter.collect(env, { ...options(), roots: [`${directory}/.claude/projects`] });
    });
    const [event] = result.events;
    expect(event?.usage.reasoningTokens).toBeUndefined();
    expect(event?.usage.accounting?.reasoningIncludedInOutput).toBeUndefined();
    expect(result.warnings.map((warning) => warning.code)).toContain("ACCOUNTING_UNESTABLISHED");
  });

  it("keeps a missing cache category unknown rather than zero", async () => {
    const result = await collectFrom("$DIR/.claude/projects");
    const second = result.events[1];
    expect(second?.usage.cacheReadTokens).toBeUndefined();
    expect(second?.usage.cacheWriteTokens).toBeUndefined();
    expect(second?.usage.reasoningTokens).toBe(0);
  });

  it("warns about malformed, untimestamped and synthetic records", async () => {
    const result = await collectFrom("$DIR/.claude/projects");
    const codes = result.warnings.map((warning) => warning.code).sort();
    expect(codes).toEqual(["MODEL_UNKNOWN", "RECORD_MALFORMED", "TIMESTAMP_INVALID"]);
  });

  it("hashes the project path instead of exporting it", async () => {
    const result = await collectFrom("$DIR/.claude/projects");
    const serialized = JSON.stringify(result.events);
    expect(serialized).not.toContain("demo-app");
    expect(serialized).not.toContain("/home/example");
    expect(result.events[0]?.projectHash).toMatch(/^ph_[0-9a-f]{32}$/u);
  });

  it("is idempotent for identical inputs", async () => {
    const first = await collectFrom("$DIR/.claude/projects");
    const second = await collectFrom("$DIR/.claude/projects");
    expect(second.events).toEqual(first.events);
  });

  it("honours the requested window", async () => {
    const result = await collectFrom("$DIR/.claude/projects", {
      since: "2026-09-19T10:00:30.000Z",
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.occurredAt).toBe("2026-09-19T10:01:00.000Z");
  });

  it("maps catalog models and leaves unknown names unmapped", async () => {
    const result = await withTempDir(async (directory) => {
      await writeFixture(
        `${directory}/.claude/projects/demo/${CLAUDE_CODE_FILE}`,
        CLAUDE_CODE_SESSION.replace(/"model":"example-medium"/gu, '"model":"claude-sonnet-4-5"'),
      );
      const env = createFixtureEnvironment({ homeDir: directory });
      return adapter.collect(env, {
        ...options(),
        roots: [`${directory}/.claude/projects`],
      });
    });
    const [first] = result.events;
    expect(first?.model.rawName).toBe("claude-sonnet-4-5");
    expect(first?.model.canonicalId).toBeUndefined();
    expect(first?.confidence.model).toBe("unknown");
  });

  it("detects the history directory and counts sessions", async () => {
    await withTempDir(async (directory) => {
      await writeFixture(
        `${directory}/.claude/projects/${CLAUDE_CODE_PROJECT_DIR}/${CLAUDE_CODE_FILE}`,
        CLAUDE_CODE_SESSION,
      );
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(true);
      expect(detection.supported).toBe(true);
      expect(detection.probes[0]?.sessionCount).toBe(1);
    });
  });

  it("reports an absent source without inventing one", async () => {
    await withTempDir(async (directory) => {
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(false);
      expect(detection.note).toContain("no Claude Code history found");
    });
  });
});
