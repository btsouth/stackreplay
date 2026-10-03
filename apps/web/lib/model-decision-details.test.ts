import { describe, expect, it } from "vitest";
import { MODEL_DECISION_DETAILS } from "./model-decision-details";
import { modelCapabilities, modelContext, modelSpecifications } from "./model-specifications";
import { loadPublicCatalog } from "./public-catalog";

const catalog = loadPublicCatalog("2026-09-29");
function model(id: string) {
  const found = catalog.modelById(id);
  if (!found) throw new Error(`Missing model ${id}`);
  return found;
}

describe("public model decision details", () => {
  it("shows scheduled API retirement without replacing the exact Sonnet release", () => {
    const sonnet = model("claude-sonnet-4-5");
    expect(sonnet.lifecycle).toBe("legacy");
    const facts = MODEL_DECISION_DETAILS[sonnet.id]?.facts;
    expect(facts?.find((fact) => fact.label === "API availability")?.value).toBe(
      "Deprecated on September 30, 2026; API retirement scheduled for November 30, 2026.",
    );
    expect(facts?.find((fact) => fact.label === "Scope")?.value).toContain("Claude API");
    expect(facts?.find((fact) => fact.label === "Recommended replacement")?.value).toContain(
      "not an alias",
    );
    expect(
      catalog.models.find((entry) =>
        entry.aliases.some((alias) => alias.alias === "claude-sonnet-4-5-20250929"),
      )?.id,
    ).toBe(sonnet.id);
  });
  it("adds decision overlays only to accepted exact releases", () => {
    const ids = catalog.models.filter((entry) => entry.kind === "release").map((entry) => entry.id);
    for (const id of Object.keys(MODEL_DECISION_DETAILS)) expect(ids).toContain(id);
    for (const entry of catalog.models) expect(entry.sources.length, entry.id).toBeGreaterThan(0);
    for (const [id, details] of Object.entries(MODEL_DECISION_DETAILS)) {
      expect(details.facts.length).toBeGreaterThan(0);
      expect(details.sources.length).toBeGreaterThan(0);
      expect(details.checkedAt).toBe(id === "claude-sonnet-4-5" ? "2026-10-03" : "2026-09-29");
      for (const source of details.sources) expect(source.url).toMatch(/^https:\/\//);
    }
  });

  it("does not present Google's maximum input as a combined context budget", () => {
    const gemini = model("gemini-3-8-flash");
    expect(modelContext(gemini)).toEqual({ value: 1048576, label: "max input" });
    expect(modelSpecifications(gemini)?.contextTokens).toBeUndefined();
    expect(modelSpecifications(gemini)?.maxOutputTokens).toBe(65536);
    // No mutation of catalog or replay input.
    expect(gemini.specifications?.contextTokens).toBe(1048576);
  });

  it("does not infer a maximum input by subtracting output from context", () => {
    const sol = model("gpt-6-sol");
    expect(modelContext(sol)).toEqual({ value: 1050000, label: "context" });
    expect(modelSpecifications(sol)?.maxInputTokens).toBeUndefined();
  });

  it("shows exact published Kimi capabilities and output ceiling", () => {
    const kimi = model("kimi-k3");
    expect(modelSpecifications(kimi)?.maxOutputTokens).toBe(1048576);
    expect(modelCapabilities(kimi)).toContain("Video input");
    expect(modelCapabilities(kimi)).toContain("Structured output");
    expect(
      MODEL_DECISION_DETAILS[kimi.id]?.facts.find((fact) => fact.label === "Output control")?.value,
    ).toContain("does not add to the 1M context budget");
  });

  it("keeps negative capabilities and unavailable exact identities honest", () => {
    expect(modelCapabilities(model("nano-banana-pro"))).not.toContain("Tool calling");
    expect(modelCapabilities(model("nano-banana-pro"))).not.toContain("Structured output");
    for (const id of ["gpt-5-thinking-mini", "gpt-5-6-sol-pro", "gemini-3-flash-lite"]) {
      expect(modelSpecifications(model(id))).toBeUndefined();
    }
    expect(MODEL_DECISION_DETAILS["deepseek-v4-flash"]?.facts[0]?.value).toContain("retired");
  });

  it("adds sourced legacy specs without treating an older release as unavailable", () => {
    const opus = model("claude-opus-5");
    expect(modelSpecifications(opus)?.contextTokens).toBe(1000000);
    expect(
      MODEL_DECISION_DETAILS[opus.id]?.facts.find((fact) => fact.label === "API availability")
        ?.value,
    ).toBe("Active (legacy)");
  });
});
