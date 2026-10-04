import { describe, expect, it } from "vitest";
import { createClaudeCodeAdapter } from "./adapters/claude-code.js";
import { createCodexAdapter } from "./adapters/codex.js";
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
    expect(r.events[0]!.requestStartedAt).toBe("2026-09-21T12:00:00.000Z");
    expect(r.events[0]!.requestEndedAt).toBe("2026-09-21T12:00:10.000Z");
    expect(r.events[1]!.requestStartedAt).toBe("2026-09-21T12:01:00.000Z");
    const side = content
      .split("\n")
      .map((x) => {
        const r = JSON.parse(x);
        return line({ ...r, isSidechain: true });
      })
      .join("\n");
    const excluded = await createClaudeCodeAdapter().collect(
      createFixtureEnvironment({
        homeDir: "/home/test",
        fs: createMemoryFileSystem({ "/home/test/.claude/projects/p/s.jsonl": side }),
      }),
      opts,
    );
    expect(excluded.events.every((e) => !e.requestStartedAt)).toBe(true);
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
    expect((await collect(records)).events[0]!.requestStartedAt).toBeUndefined();
    records[2]!.payload = { type: "request_started" };
    expect((await collect(records)).events[0]!.requestStartedAt).toBe("2026-09-21T12:00:00.000Z");
  });
  it.each(["user_message", "function_call_output"])(
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
      expect(result.events[1]!.requestStartedAt).toBeUndefined();
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
