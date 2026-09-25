import type { ApiPriceabilityCountsV1 } from "@stackreplay/replay-engine";
import { describe, expect, it } from "vitest";
import { apiScopeAdvice, sentence } from "./replay-advice";

const counts = (overrides: Partial<ApiPriceabilityCountsV1>): ApiPriceabilityCountsV1 => ({
  priced: 0,
  unresolved: 0,
  not_offered: 0,
  offering_unestablished: 0,
  usage_incomplete: 0,
  price_not_recorded: 0,
  price_category_undocumented: 0,
  ...overrides,
});

describe("Direct API scope advice", () => {
  it("offers the resolved-only scope only when it would actually complete the cost", () => {
    const advice = apiScopeAdvice(counts({ priced: 35_292, unresolved: 83 }), "Anthropic");
    expect(advice.resolvedScopeCompletes).toBe(true);
    expect(advice.sentences.join(" ")).toMatch(/complete priced scope/u);
  });

  it("never claims the resolved-only scope completes a cost other gaps still block", () => {
    // The mixed workload from the product audit: most of the demand is on
    // models the provider does not offer, so dropping 83 events changes nothing.
    const advice = apiScopeAdvice(
      counts({ priced: 29_292, unresolved: 83, not_offered: 37_476 }),
      "OpenAI",
    );
    expect(advice.resolvedScopeCompletes).toBe(false);
    const text = advice.sentences.join(" ");
    expect(text).not.toMatch(/complete priced scope/u);
    expect(text).toMatch(/37,476 calls use models OpenAI doesn't offer/u);
    expect(text).toMatch(/would still not complete the cost/u);
  });

  it("names every other gap without inventing one", () => {
    const advice = apiScopeAdvice(
      counts({ priced: 10, usage_incomplete: 2, price_not_recorded: 1 }),
      "DeepSeek",
    );
    expect(advice.sentences).toEqual([
      "2 calls report incomplete token data and 1 call uses a model with no published DeepSeek rate for what it consumed.",
    ]);
  });

  it("says nothing when nothing blocks the cost", () => {
    expect(apiScopeAdvice(counts({ priced: 5 }), "OpenAI").sentences).toEqual([]);
  });
});

describe("sentence", () => {
  it("ends a sentence exactly once", () => {
    expect(sentence("a partial one.")).toBe("a partial one.");
    expect(sentence("a partial one")).toBe("a partial one.");
    expect(sentence("done?")).toBe("done?");
    expect(sentence("")).toBe("");
  });
});
