import { describe, expect, it } from "vitest";
import { appNavItems, isNavItemActive } from "./nav";

describe("isNavItemActive", () => {
  it("marks /app active only on the overview route", () => {
    expect(isNavItemActive("/app", "/app")).toBe(true);
    expect(isNavItemActive("/app/replay", "/app")).toBe(false);
  });

  it("marks nested routes active for their section", () => {
    expect(isNavItemActive("/app/replay", "/app/replay")).toBe(true);
    expect(isNavItemActive("/app/replay/abc123", "/app/replay")).toBe(true);
    expect(isNavItemActive("/app/replay", "/app/stack")).toBe(false);
  });

  it("does not match prefixes of other routes", () => {
    expect(isNavItemActive("/app/replayground", "/app/replay")).toBe(false);
  });
});

describe("appNavItems", () => {
  it("covers the six shell surfaces from the specification", () => {
    expect(appNavItems.map((item) => item.label)).toEqual([
      "Overview",
      "Replay",
      "Stack",
      "Plans",
      "History",
      "Settings",
    ]);
  });
});
