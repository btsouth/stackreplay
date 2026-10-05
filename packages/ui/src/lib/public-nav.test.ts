import { describe, expect, it } from "vitest";
import {
  catalogNavItems,
  isPublicNavItemActive,
  primaryCta,
  publicFooterGroups,
  publicNavItems,
  returningCta,
} from "./public-nav";

describe("public navigation", () => {
  it("leads with recap and one catalog entry", () => {
    expect(publicNavItems.map((item) => item.label)).toEqual([
      "Recap",
      "Models & plans",
      "Methodology",
      "Privacy",
    ]);
    expect(catalogNavItems.map((item) => item.label)).toEqual([
      "Models",
      "Providers",
      "Benchmarks",
      "Plans",
      "Compare",
      "Updates",
    ]);
  });
  it("opens saved scans in recap", () => {
    expect(primaryCta).toEqual({ label: "Scan my history", href: "/app/scan" });
    expect(returningCta).toEqual({ label: "Open my recap", href: "/app/recap" });
  });
  it("keeps the catalog in the footer", () => {
    const hrefs = publicFooterGroups.flatMap((group) => group.items.map((item) => item.href));
    for (const item of catalogNavItems) expect(hrefs).toContain(item.href);
  });
  it("marks catalog details active without false prefixes", () => {
    expect(isPublicNavItemActive("/providers/anthropic", "/catalog")).toBe(true);
    expect(isPublicNavItemActive("/providers-extra", "/catalog")).toBe(false);
    expect(isPublicNavItemActive("/models", "/")).toBe(false);
    expect(isPublicNavItemActive("/methodology", "/methodology#privacy")).toBe(false);
  });
});
