import { describe, expect, it } from "vitest";
import { appNavItems, appUtilityNavItems, isNavItemActive } from "./nav";

describe("isNavItemActive", () => {
  it("marks /app active only on the app entry route", () => {
    expect(isNavItemActive("/app", "/app")).toBe(true);
    expect(isNavItemActive("/app/replay", "/app")).toBe(false);
  });

  it("marks nested routes active for their section", () => {
    expect(isNavItemActive("/app/replay", "/app/replay")).toBe(true);
    expect(isNavItemActive("/app/replay/abc123", "/app/replay")).toBe(true);
    expect(isNavItemActive("/app/replay", "/app/settings")).toBe(false);
  });

  it("does not match prefixes of other routes", () => {
    expect(isNavItemActive("/app/replayground", "/app/replay")).toBe(false);
  });
});

describe("app navigation", () => {
  it("leads with the workload and the tools that investigate it", () => {
    expect(appNavItems.map((item) => item.label)).toEqual(["Workload", "Replay", "Compare"]);
  });

  it("keeps Import and Settings as quieter utilities", () => {
    expect(appUtilityNavItems.map((item) => item.label)).toEqual(["Import", "Settings"]);
  });

  it("keeps import and replay as distinct destinations", () => {
    expect(isNavItemActive("/app/import", "/app/import")).toBe(true);
    expect(isNavItemActive("/app/replay", "/app/import")).toBe(false);
  });
});
