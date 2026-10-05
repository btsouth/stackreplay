import { describe, expect, it } from "vitest";
import { appNavItems, isNavItemActive, scanAction } from "./nav";

describe("app navigation", () => {
  it("has four sections and a separate scan action", () => {
    expect(appNavItems.map((item) => [item.label, item.href])).toEqual([
      ["Recap", "/app/recap"],
      ["Stats", "/app/stats"],
      ["Plans", "/app/plans"],
      ["Settings", "/app/settings"],
    ]);
    expect(scanAction).toEqual({ label: "Scan history", href: "/app/scan" });
    expect(appNavItems.some((item) => item.href === String(scanAction.href))).toBe(false);
  });
  it("uses exact path segments", () => {
    expect(isNavItemActive("/app/plans/example", "/app/plans")).toBe(true);
    expect(isNavItemActive("/app/plans-extra", "/app/plans")).toBe(false);
    expect(isNavItemActive("/app/scan", "/app")).toBe(false);
  });
});
