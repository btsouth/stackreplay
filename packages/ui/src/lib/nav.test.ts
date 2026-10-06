import { describe, expect, it } from "vitest";
import { appNavItems, isNavItemActive, scanAction } from "./nav";

describe("app navigation", () => {
  it("has three sections and a separate scan action", () => {
    expect(appNavItems.map((item) => [item.label, item.href])).toEqual([
      ["Recap", "/app/recap"],
      ["Stats", "/app/stats"],
      ["Settings", "/app/settings"],
    ]);
    expect(scanAction).toEqual({ label: "Scan my history", href: "/app/scan" });
    expect(appNavItems.some((item) => item.href === String(scanAction.href))).toBe(false);
  });
  it("has no link to a removed page", () => {
    for (const item of appNavItems) expect(item.href).toMatch(/^\/app\/(recap|stats|settings)$/u);
  });
  it("uses exact path segments", () => {
    expect(isNavItemActive("/app/stats/example", "/app/stats")).toBe(true);
    expect(isNavItemActive("/app/stats-extra", "/app/stats")).toBe(false);
    expect(isNavItemActive("/app/scan", "/app")).toBe(false);
  });
});
