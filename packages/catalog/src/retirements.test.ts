import { expect, it } from "vitest";
import { loadDefaultCatalog } from "./load.js";
import { selectLoadedPlanVersionAt } from "./versions.js";

it("applies Copilot retirements on the provider date while retaining historical capacity and rates", () => {
  const catalog = loadDefaultCatalog();
  const retired = ["claude-opus-4-7", "gemini-3-5-flash", "gemini-3-6-flash", "kimi-k2-7-code"];
  for (const id of [
    "github-copilot-pro",
    "github-copilot-pro-plus",
    "github-copilot-max",
    "github-copilot-business",
    "github-copilot-enterprise",
  ]) {
    const previous = selectLoadedPlanVersionAt(
      Object.values(catalog.planVersions),
      id,
      "2026-10-01",
    );
    const current = selectLoadedPlanVersionAt(
      Object.values(catalog.planVersions),
      id,
      "2026-10-02",
    );
    if (!previous || !current) throw Error(`Missing version for ${id}`);
    expect(current.effectiveFrom).toBe("2026-10-02");
    expect(current.effectiveFromBasis).toBe("provider");
    expect(current.limits).toEqual(previous.limits);
    expect(current.price).toEqual(previous.price);
    for (const model of retired) {
      expect(current.modelRules.find((rule) => rule.model === model)).toEqual({
        model,
        excluded: true,
      });
      expect(previous.modelRules.find((rule) => rule.model === model)).toBeDefined();
      expect(catalog.pricing[`${model}-github-pricing`]?.effectiveTo).toBe("2026-10-01");
    }
    expect(
      previous.modelRules.find((rule) => rule.model === "gemini-3-6-flash")?.excluded,
    ).not.toBe(true);
  }
  expect(catalog.pricing["gemini-3-6-flash-api-reference-20260928"]?.effectiveTo).toBe(
    "2026-12-31",
  );
});
