import { describe, expect, it } from "vitest";
import { detectBrowserSource } from "./browser.js";
import { codexRecordHead } from "./codex-record-head.js";
import { CODEX_ROLLOUT } from "./fixtures/content.js";

function row(type = "response_item", payloadType = "custom_tool_call_output", ordinal = false) {
  return JSON.stringify({
    timestamp: "2026-09-19T11:00:03.000Z",
    ...(ordinal ? { ordinal: 123 } : {}),
    type,
    payload: { type: payloadType, output: "x".repeat(8192) },
  });
}

describe("long native Codex record headers", () => {
  it.each([false, true])("reads tool headers (ordinal=%s)", (ordinal) => {
    expect(codexRecordHead(row("response_item", "custom_tool_call_output", ordinal))).toEqual({
      timestamp: "2026-09-19T11:00:03.000Z",
      type: "response_item",
      payload: { type: "custom_tool_call_output" },
    });
  });

  it("reads item_completed without retaining its large payload", () => {
    expect(codexRecordHead(row("event_msg", "item_completed"))?.payload.type).toBe(
      "item_completed",
    );
  });

  it.each([
    ["session_meta", "session_meta"],
    ["turn_context", "turn_context"],
    ["token_usage_record", "usage"],
    ["event_msg", "token_count"],
    ["response_item", "message"],
  ])("fully parses %s/%s", (type, payload) => {
    expect(codexRecordHead(row(type, payload))).toBeUndefined();
  });

  it("falls back for short, reordered, escaped and truncated rows", () => {
    expect(codexRecordHead(row().replace("x".repeat(8192), "small"))).toBeUndefined();
    expect(codexRecordHead(` {${row().slice(1)}`)).toBeUndefined();
    expect(
      codexRecordHead(row().replace("custom_tool_call_output", "custom\\u005ftool_call_output")),
    ).toBeUndefined();
    expect(codexRecordHead(row().slice(0, -1))).toBeUndefined();
  });

  it("keeps source detection and truncated-line accounting", () => {
    expect(detectBrowserSource(`${row()}\n${CODEX_ROLLOUT}`)).toEqual(
      detectBrowserSource(CODEX_ROLLOUT),
    );
    expect(detectBrowserSource(row().slice(0, -1))).toMatchObject({ malformed: true });
    expect(detectBrowserSource(`${row()}\n${row("event_msg", "item_completed")}`)).toEqual({
      reason: "No supported source structure found",
    });
  });
});
