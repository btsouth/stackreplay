import { describe, expect, it } from "vitest";
import { cardName } from "./terminal-card";
import { modelDisplayName, unresolvedModel } from "./terminal-presentation";

describe("model display names", () => {
  it.each([
    ["deepseek/deepseek-v4-pro", "deepseek-v4-pro"],
    ["gpt-daybreak-blue-latest", "gpt-daybreak-blue-latest"],
    ["moonshotai/Kimi-K3", "Kimi-K3"],
    ["vendor/model/variant", "model/variant"],
  ])("cleans only the vendor prefix of %s on every surface", (id, label) => {
    expect(modelDisplayName(id)).toBe(label);
    expect(cardName(id)).toBe(label);
    expect(unresolvedModel(id)).toBe(true);
  });
  it("preserves a supplied catalog name, including an unpriced model", () => {
    expect(modelDisplayName("gpt-5-6-sol", "Partial model")).toBe("Partial model");
    expect(unresolvedModel("gpt-5-6-sol", "Partial model")).toBe(false);
  });
  it("keeps a resolved catalog label prominent", () => {
    expect(modelDisplayName("claude-opus-5-5")).toBe("Claude Opus 5.5");
    expect(unresolvedModel("claude-opus-5-5")).toBe(false);
  });
});
