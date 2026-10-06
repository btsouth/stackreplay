import { describe, expect, it } from "vitest";
import { removedAppDestination, removedAppRoutes } from "./app-routes";

const origin = "https://stackreplay.com";

describe("removed app pages", () => {
  it("sends plans and my stack to what you pay in Settings", () => {
    for (const route of ["plans", "stack"] as const)
      expect(removedAppDestination(route, {})).toBe("/app/settings#what-you-pay");
  });
  it("sends replay, compare and workload to Stats and import to Scan", () => {
    for (const route of ["replay", "compare", "workload"] as const)
      expect(removedAppDestination(route, {})).toBe("/app/stats");
    expect(removedAppDestination("import", {})).toBe("/app/scan");
  });
  it("keeps the period when the destination reads it", () => {
    expect(
      removedAppDestination("plans", {
        period: "90",
        stack: "anthropic-claude-max:2",
        scope: "claude-code",
      }),
    ).toBe("/app/settings?period=90#what-you-pay");
    expect(removedAppDestination("stack", { period: "all" })).toBe(
      "/app/settings?period=all#what-you-pay",
    );
  });
  it("preserves repeated, encoded, empty and unknown parameters where they are read", () => {
    const result = new URL(
      removedAppDestination("workload", {
        import: "local id",
        period: "30",
        target: "plan+one",
        tag: ["a", "b"],
        empty: "",
        future: "yes",
      }),
      origin,
    );
    expect(result.pathname).toBe("/app/stats");
    expect([...result.searchParams]).toEqual([
      ["import", "local id"],
      ["period", "30"],
      ["target", "plan+one"],
      ["tag", "a"],
      ["tag", "b"],
      ["empty", ""],
      ["future", "yes"],
    ]);
    expect(removedAppDestination("import", { import: "scan", period: "90" })).toBe(
      "/app/scan?import=scan&period=90",
    );
  });
  it("only points at pages that stay", () => {
    const staying = ["/app/stats", "/app/scan", "/app/settings"];
    for (const { to } of Object.values(removedAppRoutes)) expect(staying).toContain(to);
  });
});
