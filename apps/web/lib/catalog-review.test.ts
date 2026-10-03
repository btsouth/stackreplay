import { describe, expect, it } from "vitest";
import { includedAccessModels, subscriptionAccess } from "./subscription-access";
import { subscriptionPublishedTerms } from "./subscription-published-terms";

const google = ["google-ai-pro", "google-ai-ultra", "google-ai-ultra-20x"];
const copilot = [
  "github-copilot-pro",
  "github-copilot-pro-plus",
  "github-copilot-max",
  "github-copilot-business",
  "github-copilot-enterprise",
];
const retired = ["claude-opus-4-7", "gemini-3-5-flash", "gemini-3-6-flash", "kimi-k2-7-code"];

describe("October 3 reviewed subscription access", () => {
  it("preserves earlier Google lineups and qualifies Pro trial eligibility", () => {
    for (const id of google) {
      const previous = subscriptionAccess(id, "2026-10-02");
      const current = subscriptionAccess(id, "2026-10-03");
      if (!previous || !current) throw Error(`Missing access for ${id}`);
      expect(includedAccessModels(previous).some((m) => m.modelId === "claude-sonnet-5-5")).toBe(
        false,
      );
      const claude = current.groups.find((g) =>
        g.models.some((m) => m.modelId === "claude-sonnet-5-5"),
      );
      expect(claude?.access).toBe(id === "google-ai-pro" ? "conditional" : "included");
      expect(claude?.sourceUrl).toBe("https://antigravity.google/docs/models");
      const antigravity = current.groups.find((g) => g.label === "Google Antigravity");
      expect(antigravity?.models.some((m) => m.modelId === "claude-sonnet-4-6")).toBe(
        id === "google-ai-pro",
      );
      expect(antigravity?.models.find((m) => m.modelId === "gpt-oss-120b")?.note).toContain(
        "November 2, 2026",
      );
      const terms = subscriptionPublishedTerms(id, "2026-10-03");
      expect(terms?.terms.find((t) => t.label === "Antigravity model access")?.value).toContain(
        "November 2, 2026",
      );
      expect(terms?.effectiveFrom).toBeUndefined();
      expect(subscriptionPublishedTerms(id, "2026-10-02")?.checkedAt).toBe("2026-09-29");
    }
  });
  it("removes retired Copilot models only from the newly reviewed access snapshot", () => {
    for (const id of copilot) {
      const previous = subscriptionAccess(id, "2026-10-02");
      const current = subscriptionAccess(id, "2026-10-03");
      if (!previous || !current) throw Error(`Missing access for ${id}`);
      expect(
        previous.groups.some((g) => g.models.some((m) => retired.includes(m.modelId ?? ""))),
      ).toBe(true);
      for (const modelId of retired) {
        expect(current.groups.some((g) => g.models.some((m) => m.modelId === modelId))).toBe(false);
      }
    }
  });
});
