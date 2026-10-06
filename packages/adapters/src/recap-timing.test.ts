import { describe, expect, it } from "vitest";
import { createClaudeCodeAdapter } from "./adapters/claude-code.js";
import { createCodexAdapter } from "./adapters/codex.js";
import { createCommandCodeAdapter } from "./adapters/command-code.js";
import { hermesServingProvider } from "./adapters/hermes.js";
import {
  createFixtureEnvironment,
  createMemoryFileSystem,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
} from "./fixtures/helpers.js";
import { createModelMapper } from "./models.js";

const opts = {
  salt: FIXTURE_SALT,
  now: fixtureNow(),
  mapper: createModelMapper(syntheticCatalog()),
};
const line = (record: unknown) => JSON.stringify(record);
describe("request timing and recorded billing routes", () => {
  it("pairs final Claude chunks by message id and restarts after a tool result", async () => {
    const assistant = (id: string, at: string, output: number, final: boolean) => ({
      type: "assistant",
      timestamp: at,
      sessionId: "s",
      message: {
        id,
        model: "claude-opus-4-1",
        stop_reason: final ? "end_turn" : null,
        usage: {
          input_tokens: 10,
          output_tokens: output,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
      },
    });
    const content = [
      { type: "user", timestamp: "2026-09-21T12:00:00Z" },
      assistant("a", "2026-09-21T12:00:01Z", 1, false),
      assistant("a", "2026-09-21T12:00:10Z", 100, true),
      {
        type: "user",
        timestamp: "2026-09-21T12:01:00Z",
        message: { content: [{ type: "tool_result" }] },
      },
      assistant("b", "2026-09-21T12:01:04Z", 40, true),
    ]
      .map(line)
      .join("\n");
    const env = createFixtureEnvironment({
      homeDir: "/home/test",
      fs: createMemoryFileSystem({ "/home/test/.claude/projects/p/s.jsonl": content }),
    });
    const r = await createClaudeCodeAdapter().collect(env, opts);
    expect(r.events).toHaveLength(2);
    expect(r.events[0]?.requestStartedAt).toBe("2026-09-21T12:00:00.000Z");
    expect(r.events[0]?.requestEndedAt).toBe("2026-09-21T12:00:10.000Z");
    expect(r.events[1]?.requestStartedAt).toBe("2026-09-21T12:01:00.000Z");
    const side = content
      .split("\n")
      .map((x) => {
        const r = JSON.parse(x);
        return line({ ...r, isSidechain: true });
      })
      .join("\n");
    const sidechain = await createClaudeCodeAdapter().collect(
      createFixtureEnvironment({
        homeDir: "/home/test",
        fs: createMemoryFileSystem({ "/home/test/.claude/projects/p/s.jsonl": side }),
      }),
      opts,
    );
    expect(sidechain.events[0]?.requestStartedAt).toBe("2026-09-21T12:00:00.000Z");
  });
  it("does not treat Codex task_started as an API request start", async () => {
    const usage = { input_tokens: 10, output_tokens: 20, total_tokens: 30 };
    const records = [
      { type: "session_meta", payload: { id: "s" } },
      { type: "turn_context", payload: { model: "gpt-5" } },
      { type: "event_msg", timestamp: "2026-09-21T12:00:00Z", payload: { type: "task_started" } },
      {
        type: "event_msg",
        timestamp: "2026-09-21T12:00:10Z",
        payload: {
          type: "token_count",
          info: { last_token_usage: usage, total_token_usage: usage },
        },
      },
    ];
    const collect = async (rows: unknown[]) =>
      createCodexAdapter().collect(
        createFixtureEnvironment({
          homeDir: "/home/test",
          fs: createMemoryFileSystem({
            "/home/test/.codex/sessions/2026/09/21/s.jsonl": rows.map(line).join("\n"),
          }),
        }),
        opts,
      );
    expect((await collect(records)).events[0]?.requestStartedAt).toBeUndefined();
    records[2]!.payload = { type: "request_started" };
    expect((await collect(records)).events[0]?.requestStartedAt).toBe("2026-09-21T12:00:00.000Z");
  });
  it.each(["user_message", "function_call_output", "custom_tool_call_output"])(
    "times Codex from %s without reusing duplicate counts",
    async (input) => {
      const row = (type: string, payload: unknown, timestamp: string) => ({
        type,
        payload,
        timestamp,
      });
      const usage = { input_tokens: 10, output_tokens: 100, total_tokens: 110 };
      const count = row(
        "event_msg",
        { type: "token_count", info: { last_token_usage: usage, total_token_usage: usage } },
        "2026-09-21T12:00:10Z",
      );
      const rows = [
        row("session_meta", { id: "s" }, "2026-09-21T12:00:00Z"),
        row("turn_context", { model: "gpt-5" }, "2026-09-21T12:00:00Z"),
        row(
          input === "user_message" ? "event_msg" : "response_item",
          { type: input },
          "2026-09-21T12:00:01Z",
        ),
        row("event_msg", { type: "agent_message" }, "2026-09-21T12:00:09Z"),
        count,
        count,
      ];
      const result = await createCodexAdapter().collect(
        createFixtureEnvironment({
          homeDir: "/home/test",
          fs: createMemoryFileSystem({
            "/home/test/.codex/sessions/2026/09/21/s.jsonl": rows.map(line).join("\n"),
          }),
        }),
        opts,
      );
      expect(result.events[0]).toMatchObject({
        requestStartedAt: "2026-09-21T12:00:01.000Z",
        requestEndedAt: "2026-09-21T12:00:10.000Z",
      });
      expect(result.events[1]?.requestStartedAt).toBeUndefined();
    },
  );
  it.each([
    ["anthropic", "anthropic"],
    ["openai-codex", "openai"],
    ["openai-api", "openai"],
    ["commandcode", "command-code"],
    ["opencode-go", "opencode"],
    ["zai", "z-ai"],
    ["deepseek", "deepseek"],
    ["hermes", undefined],
    ["custom", undefined],
  ])("maps Hermes route %s independently from the model", (raw, id) =>
    expect(hermesServingProvider(raw)).toBe(id),
  );
  it("maps recognized endpoint hosts while leaving custom endpoints unattributed", () => {
    expect(hermesServingProvider("custom", "https://api.z.ai/api/paas/v4")).toBe("z-ai");
    expect(hermesServingProvider("custom", "https://private.example/v1")).toBeUndefined();
    expect(hermesServingProvider("custom", "https://api.cline.bot/v1")).toBe("cline");
    expect(hermesServingProvider("openai", "https://opencode.ai/zen/v1")).toBe("opencode");
    expect(hermesServingProvider("custom", "https://ollama.com/v1")).toBe("ollama");
  });
});

describe("native per-response timing boundaries", () => {
  const at = (seconds: number) => new Date(Date.UTC(2026, 8, 21, 12, 0, seconds)).toISOString();
  const ms = (seconds: number) => Date.parse(at(seconds));

  it("uses Command Code creation metadata rather than delayed persistence and follows parents", async () => {
    const user = (id: string, seconds: number) => ({
      type: "message",
      id,
      timestamp: at(seconds),
      message: { role: "user" },
    });
    const assistant = (id: string, parentId: string, ended?: number) => ({
      type: "message",
      id,
      parentId,
      timestamp: at(50),
      model: "gpt-5",
      message: { role: "assistant", meta: ended === undefined ? {} : { createdAt: ms(ended) } },
      usage: { inputTokens: 10, outputTokens: 100 },
    });
    const rows = [
      user("a", 1),
      user("unrelated", 20),
      assistant("b", "a", 10),
      { ...user("tool", 50), message: { role: "user", meta: { createdAt: ms(11) } } },
      assistant("c", "tool", 15),
      assistant("missing", "absent", 30),
      assistant("no-completion", "a"),
      assistant("reversed", "unrelated", 10),
    ];
    const r = await createCommandCodeAdapter().collect(
      createFixtureEnvironment({
        homeDir: "/home/test",
        fs: createMemoryFileSystem({
          "/home/test/.commandcode/projects/p/s.jsonl": rows.map(line).join("\n"),
        }),
      }),
      opts,
    );
    expect(r.events).toHaveLength(5);
    expect(r.events[0]).toMatchObject({ requestStartedAt: at(1), requestEndedAt: at(10) });
    expect(r.events[1]).toMatchObject({ requestStartedAt: at(11), requestEndedAt: at(15) });
    expect(r.events.slice(2).every((e) => !e.requestStartedAt && !e.requestEndedAt)).toBe(true);
  });

  it("times Claude subagents through parent metadata without borrowing another branch's input", async () => {
    const assistant = (
      id: string,
      uuid: string,
      parentUuid: string,
      seconds: number,
      final = true,
    ) => ({
      type: "assistant",
      uuid,
      parentUuid,
      timestamp: at(seconds),
      isSidechain: true,
      message: {
        id,
        model: "gpt-5",
        stop_reason: final ? "end_turn" : null,
        usage: { input_tokens: 10, output_tokens: seconds },
      },
    });
    const rows = [
      { type: "user", uuid: "input", timestamp: at(1), isSidechain: true },
      { type: "attachment", uuid: "context", parentUuid: "input" },
      { type: "user", uuid: "other-input", timestamp: at(8), isSidechain: true },
      assistant("response", "chunk", "context", 9, false),
      assistant("response", "final", "chunk", 10),
      assistant("missing-parent", "missing", "absent", 11),
      assistant("no-new-input", "continuation", "final", 12),
      assistant("incomplete", "unfinished", "other-input", 13, false),
    ];
    const r = await createClaudeCodeAdapter().collect(
      createFixtureEnvironment({
        homeDir: "/home/test",
        fs: createMemoryFileSystem({
          "/home/test/.claude/projects/p/subagents/s.jsonl": rows.map(line).join("\n"),
        }),
      }),
      opts,
    );
    expect(r.events).toHaveLength(4);
    expect(r.events[0]).toMatchObject({ requestStartedAt: at(1), requestEndedAt: at(10) });
    expect(r.events.slice(1).every((e) => !e.requestStartedAt)).toBe(true);
  });

  it("preserves a Codex tool boundary across a repeated usage snapshot, including subagents", async () => {
    const usage = { input_tokens: 10, output_tokens: 100, total_tokens: 110 };
    const count = (seconds: number, total: number) => ({
      type: "event_msg",
      timestamp: at(seconds),
      payload: {
        type: "token_count",
        info: { last_token_usage: usage, total_token_usage: { total_tokens: total } },
      },
    });
    const rows = [
      { type: "session_meta", payload: { id: "s", source: { subagent: {} } } },
      { type: "turn_context", payload: { model: "gpt-5" } },
      { type: "event_msg", timestamp: at(1), payload: { type: "user_message" } },
      count(10, 110),
      { type: "response_item", timestamp: at(11), payload: { type: "custom_tool_call_output" } },
      count(12, 110),
      count(15, 220),
      count(16, 220),
    ];
    const r = await createCodexAdapter().collect(
      createFixtureEnvironment({
        homeDir: "/home/test",
        fs: createMemoryFileSystem({
          "/home/test/.codex/sessions/2026/09/21/s.jsonl": rows.map(line).join("\n"),
        }),
      }),
      opts,
    );
    expect(r.events[0]).toMatchObject({ requestStartedAt: at(1), requestEndedAt: at(10) });
    expect(r.events[1]?.requestStartedAt).toBeUndefined();
    expect(r.events[2]).toMatchObject({ requestStartedAt: at(11), requestEndedAt: at(15) });
    expect(r.events[3]?.requestStartedAt).toBeUndefined();
  });
  it("matches Codex native completion before tools to the later UI usage snapshot", async () => {
    const usage = { input_tokens: 10, output_tokens: 100, total_tokens: 110 };
    const native = (seconds: number, total: number) => ({
      type: "token_usage_record",
      timestamp: at(seconds),
      payload: { usage, thread_token_usage: { total_tokens: total } },
    });
    const count = (seconds: number, total: number) => ({
      type: "event_msg",
      timestamp: at(seconds),
      payload: {
        type: "token_count",
        info: { last_token_usage: usage, total_token_usage: { total_tokens: total } },
      },
    });
    const rows = [
      { type: "session_meta", payload: { id: "s" } },
      { type: "turn_context", payload: { model: "gpt-5" } },
      { type: "response_item", timestamp: at(1), payload: { type: "message", role: "user" } },
      native(10, 110),
      { type: "response_item", timestamp: at(20), payload: { type: "custom_tool_call_output" } },
      count(20, 110),
      count(21, 110),
      native(30, 220),
      count(40, 220),
      native(45, 330),
      count(46, 330),
    ];
    const r = await createCodexAdapter().collect(
      createFixtureEnvironment({
        homeDir: "/home/test",
        fs: createMemoryFileSystem({
          "/home/test/.codex/sessions/2026/09/21/s.jsonl": rows.map(line).join("\n"),
        }),
      }),
      opts,
    );
    expect(r.events[0]).toMatchObject({ requestStartedAt: at(1), requestEndedAt: at(10) });
    expect(r.events[1]?.requestStartedAt).toBeUndefined();
    expect(r.events[2]).toMatchObject({ requestStartedAt: at(20), requestEndedAt: at(30) });
    expect(r.events[3]?.requestStartedAt).toBeUndefined();
  });
});
