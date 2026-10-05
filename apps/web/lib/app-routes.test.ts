import { describe, expect, it } from "vitest";
import { legacyAppDestination } from "./app-routes";

describe("legacy app routes", () => {
  it("preserves repeated, encoded, empty and unknown parameters", () => {
    const result = new URL(
      legacyAppDestination("/app/stats", {
        import: "local id",
        target: "plan+one",
        tag: ["a", "b"],
        empty: "",
        future: "yes",
      }),
      "https://stackreplay.com",
    );
    expect(result.pathname).toBe("/app/stats");
    expect([...result.searchParams]).toEqual([
      ["import", "local id"],
      ["target", "plan+one"],
      ["tag", "a"],
      ["tag", "b"],
      ["empty", ""],
      ["future", "yes"],
    ]);
  });
  it("retains query values that collide with the new section selector", () => {
    const result = new URL(
      legacyAppDestination("/app/plans", { section: ["old", "future"], import: "scan" }, "replay"),
      "https://stackreplay.com",
    );
    expect(result.searchParams.getAll("section")).toEqual(["replay", "old", "future"]);
    expect(result.searchParams.get("import")).toBe("scan");
  });
  it("keeps quantities and billing view", () => {
    const stack = "anthropic-claude-max:2,openai-chatgpt-pro:1";
    const replay = new URL(
      legacyAppDestination(
        "/app/plans",
        { stack, mode: "custom", scope: "claude-code,codex", import: "scan" },
        "replay",
      ),
      "https://stackreplay.com",
    );
    expect(replay.searchParams.get("stack")).toBe(stack);
    expect(replay.searchParams.get("section")).toBe("replay");
    expect(
      legacyAppDestination("/app/plans", { view: "billing", decision: "stack" }, "compare"),
    ).toBe("/app/plans?section=compare&view=billing&decision=stack");
  });
});
