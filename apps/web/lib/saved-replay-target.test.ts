import { describe, expect, it } from "vitest";
import { type CompletedReplay, completedReplaySchema } from "./completed-replays";
import { savedReplayTargetLine } from "./saved-replay-target";

/**
 * Saved results keep the target they ran against. A record written before the
 * target field existed stays readable and is not assigned a plan version after
 * the fact.
 */

const legacy = {
  version: 1,
  id: "saved-1",
  importId: "import-1",
  scopeDigest: "digest",
  catalogHash: "sha256:old",
  rulesAt: "2026-09-20",
  title: "Custom: ChatGPT Pro $200 (Pro 20x tier)",
  mode: "assessment",
  createdAt: "2026-09-20T12:00:00.000Z",
  calls: 10,
  tokens: 1000,
  priced: 0,
  translatedCalls: 0,
  mappings: [],
  contributions: [],
  limitations: [],
};

const parse = (value: unknown): CompletedReplay => completedReplaySchema.parse(value);

describe("saved replay targets", () => {
  it("still reads a result saved before targets were recorded, without inventing a version", () => {
    const record = parse(legacy);
    expect(record.target).toBeUndefined();
    expect(savedReplayTargetLine(record)).toBe("Plan version not recorded with this saved result");
  });

  it("names the terms a pre-revision result used, whatever today is", () => {
    const record = parse({
      ...legacy,
      target: {
        type: "subscription",
        planId: "openai-chatgpt-pro-20x",
        planVersionId: "openai-chatgpt-pro-20x@2026-09-22",
      },
    });
    expect(savedReplayTargetLine(record)).toBe(
      "ChatGPT Pro $200 · terms before the Sep 29, 2026 revision",
    );
  });

  it("names revised terms for a result computed on them", () => {
    const record = parse({
      ...legacy,
      rulesAt: "2026-09-29",
      target: {
        type: "subscription",
        planId: "openai-chatgpt-pro-20x",
        planVersionId: "openai-chatgpt-pro-20x@2026-09-29",
      },
    });
    expect(savedReplayTargetLine(record)).toBe("ChatGPT Pro $200 · terms effective Sep 29, 2026");
  });

  it("keeps a grandfathered result grandfathered, whenever it is read", () => {
    const record = parse({
      ...legacy,
      rulesAt: "2026-10-01",
      target: {
        type: "subscription",
        planId: "openai-chatgpt-pro-20x",
        planVersionId: "openai-chatgpt-pro-20x@2026-09-29~grandfathered",
        cohort: "grandfathered",
      },
    });
    // The label reads only the stored version: Oct 29 passing does not change it.
    expect(savedReplayTargetLine(record)).toBe(
      "ChatGPT Pro $200 · eligible existing subscribers' previous allowance through Oct 29, 2026",
    );
    expect(record.target).toMatchObject({ cohort: "grandfathered" });
  });

  it("says when a grandfathered replay ran after the window and used market terms", () => {
    const record = parse({
      ...legacy,
      rulesAt: "2026-11-02",
      target: {
        type: "subscription",
        planId: "openai-chatgpt-pro-20x",
        planVersionId: "openai-chatgpt-pro-20x@2026-09-29",
        cohort: "grandfathered",
      },
    });
    expect(savedReplayTargetLine(record)).toBe(
      "ChatGPT Pro $200 · terms effective Sep 29, 2026 (cohort terms did not apply; market terms used)",
    );
  });

  it("does not call a cohort ended when a saved replay predates its window", () => {
    const record = parse({
      ...legacy,
      rulesAt: "2026-09-28",
      target: {
        type: "subscription",
        planId: "openai-chatgpt-pro-20x",
        planVersionId: "openai-chatgpt-pro-20x@2026-09-22",
        cohort: "grandfathered",
      },
    });
    expect(savedReplayTargetLine(record)).toBe(
      "ChatGPT Pro $200 · terms before the Sep 29, 2026 revision (cohort terms did not apply; market terms used)",
    );
  });

  it("keeps a Direct API result's provider and processing tier", () => {
    const record = parse({
      ...legacy,
      title: "Custom: OpenAI",
      target: { type: "api", providerId: "openai", serviceTier: "fast" },
    });
    expect(savedReplayTargetLine(record)).toBe("OpenAI API · Fast processing");
    expect(
      savedReplayTargetLine(parse({ ...record, target: { type: "api", providerId: "openai" } })),
    ).toBe("OpenAI API · Standard processing");
  });

  it("refuses a tier that is not a processing tier", () => {
    expect(
      completedReplaySchema.safeParse({
        ...legacy,
        target: { type: "api", providerId: "openai", serviceTier: "gpt-6-astra-ultrafast" },
      }).success,
    ).toBe(false);
  });

  it("leaves multi-provider suggestions without a target line", () => {
    expect(savedReplayTargetLine(parse({ ...legacy, title: "Same models → direct APIs" }))).toBe(
      undefined,
    );
  });
});
