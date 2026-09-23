import { describe, expect, it } from "vitest";
import { modeLabel, modeMicroLabel } from "./mode-label";

/**
 * A missing mode is not Exact. These cases exist because three surfaces used to
 * derive their own label from a boolean, so a result carrying no mode rendered
 * as the one mode that certainly was not applied.
 */
describe("replay mode labels", () => {
  it("names the two modes the engine declares", () => {
    expect(modeLabel("exact")).toBe("Exact replay");
    expect(modeLabel("translated")).toBe("Translated replay");
    expect(modeMicroLabel("exact")).toBe("exact replay");
    expect(modeMicroLabel("translated")).toBe("translated replay");
  });

  it("never calls an absent mode exact", () => {
    for (const label of [modeLabel(undefined), modeMicroLabel(undefined)]) {
      expect(label).toMatch(/not recorded/iu);
      expect(label).not.toMatch(/exact|translated/iu);
    }
  });
});
