import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { type ExecutionReplayResultV1, executionReplayResultV1Schema } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import { ReplayEngineError } from "./errors.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";

/**
 * A subscription replay binds to the plan version for its audience. ChatGPT
 * Pro $200 has two term sets from Sep 29, 2026: the revised market terms a
 * buyer gets, and the previous allowance eligible existing subscribers keep
 * through Oct 29. The default is the market; the cohort is asked for by name;
 * a pinned version replays the same terms whatever day it is.
 */

const catalog = loadBundledCatalog();
const PRO_200 = "openai-chatgpt-pro-20x";

const events = [
  makeEvent({
    id: "a",
    occurredAt: "2026-09-20T10:00:00Z",
    model: { rawName: "gpt-6-sol" },
    usage: completeUsage({ uncachedInputTokens: 10_000, outputTokens: 1_000 }),
  }),
];

const run = (
  target: { planId?: string; planVersionId?: string; cohort?: string },
  rulesAsOf: string,
): ExecutionReplayResultV1 => {
  const result = replay({
    events,
    target: { type: "subscription", ...target },
    catalog,
    context: { rulesAsOf },
  });
  expect(executionReplayResultV1Schema.safeParse(result).success).toBe(true);
  return result;
};

describe("subscription replay by cohort", () => {
  it("uses the revised market terms for a buyer from Sep 29, and the previous terms on Sep 28", () => {
    expect(run({ planId: PRO_200 }, "2026-09-28").subscription?.planVersionId).toBe(
      `${PRO_200}@2026-09-22`,
    );
    expect(run({ planId: PRO_200 }, "2026-09-29").subscription?.planVersionId).toBe(
      `${PRO_200}@2026-09-29`,
    );
  });

  it("uses the grandfathered version for the cohort through Oct 29, and the market's from Oct 30", () => {
    const cohort = "grandfathered";
    expect(run({ planId: PRO_200, cohort }, "2026-09-29").subscription?.planVersionId).toBe(
      `${PRO_200}@2026-09-29~grandfathered`,
    );
    expect(run({ planId: PRO_200, cohort }, "2026-10-29").subscription?.planVersionId).toBe(
      `${PRO_200}@2026-09-29~grandfathered`,
    );
    expect(run({ planId: PRO_200, cohort }, "2026-10-30").subscription?.planVersionId).toBe(
      `${PRO_200}@2026-09-29`,
    );
  });

  it("records the requested cohort on the result's own target", () => {
    const result = run({ planId: PRO_200, cohort: "grandfathered" }, "2026-10-01");
    expect(result.target).toMatchObject({ type: "subscription", cohort: "grandfathered" });
    expect(result.versions.targetReference).toBe(`${PRO_200}@2026-09-29~grandfathered`);
  });

  it("replays a pinned grandfathered version the same way after the window has ended", () => {
    const pinned = `${PRO_200}@2026-09-29~grandfathered`;
    const during = run({ planVersionId: pinned }, "2026-10-01");
    const after = run({ planVersionId: pinned }, "2026-11-15");
    expect(after.subscription?.planVersionId).toBe(pinned);
    expect(after.subscription?.price).toEqual(during.subscription?.price);
    expect(after.coverage).toEqual(during.coverage);
  });

  it("refuses a cohort the plan does not declare, or a cohort beside a pinned version", () => {
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (error) {
        return error instanceof ReplayEngineError ? error.code : "other";
      }
      return undefined;
    };
    expect(code(() => run({ planId: PRO_200, cohort: "vip" }, "2026-10-01"))).toBe(
      "PLAN_COHORT_UNKNOWN",
    );
    expect(
      code(() => run({ planId: "openai-chatgpt-plus", cohort: "grandfathered" }, "2026-10-01")),
    ).toBe("PLAN_COHORT_UNKNOWN");
    expect(
      code(() =>
        run({ planVersionId: `${PRO_200}@2026-09-29`, cohort: "grandfathered" }, "2026-10-01"),
      ),
    ).toBe("PLAN_COHORT_UNKNOWN");
  });
});
