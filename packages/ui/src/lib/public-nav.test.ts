import { describe, expect, it } from "vitest";
import {
  isPublicNavItemActive,
  personalNavItems,
  primaryCta,
  publicFooterGroups,
  publicNavItems,
  returningCta,
} from "./public-nav";

describe("public navigation", () => {
  it("leads with the market, then the personal surfaces", () => {
    expect(publicNavItems.map((item) => item.label)).toEqual([
      "Models",
      "Providers",
      "Benchmarks",
      "Compare",
      "Plans",
      "Updates",
    ]);
    expect(personalNavItems.map((item) => [item.label, item.href])).toEqual([
      ["Workload", "/app/workload"],
      ["My Stack", "/app/stack"],
    ]);
  });

  it("offers a scan first and the saved workload once one exists", () => {
    expect(primaryCta).toEqual({ label: "Scan my history", href: "/app/import" });
    expect(returningCta).toEqual({ label: "Open my workload", href: "/app/workload" });
  });

  it("keeps every header destination reachable from the footer or the header itself", () => {
    const footer = publicFooterGroups.flatMap((group) => group.items.map((item) => item.href));
    for (const href of [
      "/methodology",
      "/changelog",
      "/plans",
      "/models",
      "/providers",
      "/benchmarks",
      "/compare",
    ])
      expect(footer).toContain(href);
  });

  it("marks nested public routes active for their section only", () => {
    expect(isPublicNavItemActive("/providers/anthropic", "/providers")).toBe(true);
    expect(isPublicNavItemActive("/providers/anthropic", "/models")).toBe(false);
    expect(publicFooterGroups[0].items.slice(1, 3).map((item) => item.label)).toEqual([
      "Models",
      "Providers",
    ]);
    expect(isPublicNavItemActive("/plans/claude-max", "/plans")).toBe(true);
    expect(isPublicNavItemActive("/planscape", "/plans")).toBe(false);
    expect(isPublicNavItemActive("/models", "/")).toBe(false);
  });
});
