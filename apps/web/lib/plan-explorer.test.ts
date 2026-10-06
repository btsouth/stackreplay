import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildPlanExplorer } from "./plan-explorer";
import { buildRecap } from "./recap";

describe("plan explorer", () => {
  it("shares the recap calendar period and preserves unknown plan capacity", () => {
    const events = buildDemoExport("billing").events;
    const recap = buildRecap(events, "30", "2026-10-05T12:00:00Z", "UTC");
    const rows = buildPlanExplorer(events, recap, {
      "plan:anthropic-claude-max-5x": 2,
      "plan:openai-chatgpt-pro": 1,
    });
    const max = rows.find((r) => r.id === "anthropic-claude-max-5x")!;
    expect(max.quantity).toBe(2);
    expect(max.monthly).toBe("200");
    expect(max.daysOut).toBeUndefined();
    expect(rows.every((r) => r.share >= 0 && r.share <= 1)).toBe(true);
  });
  it("opens a requested catalog plan even when it is outside the shortlist", () => {
    const events = buildDemoExport("billing").events;
    const recap = buildRecap(events, "all", "2026-10-05T12:00:00Z", "UTC");
    const requested = buildPlanExplorer(events, recap, {}, ["anthropic-claude-max-20x"]);
    expect(requested.find((row) => row.id === "anthropic-claude-max-20x")?.name).toBe(
      "Claude Max 20x",
    );
  });
  it("preserves a Direct API deep link and selected tools", () => {
    const events = buildDemoExport("billing").events;
    const recap = buildRecap(events, "all", "2026-10-05T12:00:00Z", "UTC");
    const result = buildPlanExplorer(events, recap, {}, ["api:anthropic"], "2026-10-05T12:00:00Z", [
      "claude-code",
    ]);
    const api = result.find((row) => row.id === "api:anthropic");
    expect(api?.kind).toBe("api");
    expect(api?.name).toBe("Anthropic API");
    expect(api?.error).not.toBe(true);
    expect(api?.monthly).toBeUndefined();
    expect(api?.limits).toEqual([]);
  });
});
