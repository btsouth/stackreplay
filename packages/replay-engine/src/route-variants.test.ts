import {
  type CatalogV1,
  isDefaultPriceRecord,
  type ModelRuleV1,
  type PlanVersionEntryV1,
  pricesServiceTier,
} from "@stackreplay/catalog";
import { loadDefaultCatalog } from "@stackreplay/catalog/load";
import { SERVICE_TIERS_V1, type TextUsageV1 } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import { rollingLimit } from "./fixtures/catalog.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";

/**
 * Command Code's `deepseek/deepseek-v4.1-flash-fast` is DeepSeek V4.1 Flash on
 * a separately priced route. Identity stays canonical; the Fast price only
 * ever prices a Fast call, and nothing prices a Fast call as regular V4.1 Flash.
 */

const base = loadDefaultCatalog();
const FAST = "deepseek/deepseek-v4.1-flash-fast";
const REGULAR = "deepseek/deepseek-v4.1-flash";
const FAST_PRICE = "deepseek-v4-1-flash-fast-command-code-pricing";
const REGULAR_PRICE = "deepseek-v4-1-flash-command-code-pricing";
const DEEPSEEK_PRICE = "deepseek-v4-1-flash-pricing";
const RULES_AS_OF = "2026-10-12";

/**
 * A copy of the catalog where one plan's Sep 28 version bills a credit pool,
 * so the engine converts every covered call to money. The published Command
 * Code versions state their allowances qualitatively, which never prices.
 */
function withCreditPool(planId: string, modelRules?: ModelRuleV1[]): CatalogV1 {
  const plan = base.plans[planId];
  const versionId = `${planId}@2026-09-28`;
  const loaded = base.planVersions[versionId];
  if (plan === undefined || loaded === undefined) throw new Error(`missing ${versionId}`);
  const patch = <T extends PlanVersionEntryV1>(version: T): T => ({
    ...version,
    limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "1000.00" })],
    ...(modelRules === undefined ? {} : { modelRules }),
  });
  return {
    ...base,
    plans: {
      ...base.plans,
      [planId]: {
        ...plan,
        versions: plan.versions.map((version) =>
          version.effectiveFrom === "2026-09-28" ? patch(version) : version,
        ),
      },
    },
    planVersions: { ...base.planVersions, [versionId]: patch(loaded) },
  };
}

/** A Command Code call as the importer writes it: raw name kept, canonical id attached. */
function commandCodeCall(
  id: string,
  rawName: string,
  occurredAt: string,
  usage: TextUsageV1,
  options: { preResolved?: boolean } = {},
) {
  return makeEvent({
    id,
    occurredAt,
    usage,
    harnessId: "command-code",
    model:
      options.preResolved === false ? { rawName } : { rawName, canonicalId: "deepseek-v4-1-flash" },
    confidence: { usage: "exact", model: "mapped" },
  });
}

const million = (category: "input" | "cacheRead" | "cacheWrite" | "output"): TextUsageV1 =>
  completeUsage(
    category === "input"
      ? { uncachedInputTokens: 1_000_000 }
      : category === "cacheRead"
        ? { cacheReadTokens: 1_000_000 }
        : category === "cacheWrite"
          ? { cacheWriteTokens: 1_000_000 }
          : { outputTokens: 1_000_000 },
  );

function consumed(catalog: CatalogV1, planId: string, events: ReturnType<typeof makeEvent>[]) {
  const result = replay({
    events,
    target: { type: "subscription", planVersionId: `${planId}@2026-09-28` },
    catalog,
    context: { rulesAsOf: RULES_AS_OF },
  });
  return {
    result,
    units: result.constraints.find((constraint) => constraint.id === "credits")?.consumedUnits,
    warnings: result.warnings.map((warning) => warning.code),
  };
}

const commandCodeGo = withCreditPool("command-code-go");

describe("Command Code V4.1 Flash Fast: the Fast price record", () => {
  const fast = base.pricing[FAST_PRICE];
  it("is Command Code's own billing rate for the fast variant of the canonical model", () => {
    expect(fast).toMatchObject({
      modelId: "deepseek-v4-1-flash",
      basis: "target_billing_rate",
      endpointId: "command-code",
      variantId: "fast",
      rates: { input: "0.16", output: "0.58", cacheRead: "0.016" },
      effectiveFrom: "2026-09-28",
    });
    expect(fast?.rates.cacheWrite).toBeUndefined();
    expect(fast?.tiers?.[0]?.rates).toEqual({ input: "0.32", output: "1.16", cacheRead: "0.032" });
  });

  it("can never be selected automatically as V4.1 Flash's price, at any processing tier", () => {
    if (fast === undefined) throw new Error("missing Fast record");
    expect(isDefaultPriceRecord(fast)).toBe(false);
    for (const tier of SERVICE_TIERS_V1) expect(pricesServiceTier(fast, tier), tier).toBe(false);
  });

  it("leaves V4.1 Flash with exactly one default API list price, DeepSeek's", () => {
    const defaults = Object.values(base.pricing).filter(
      (row) =>
        row.modelId === "deepseek-v4-1-flash" &&
        row.basis === "api_list_price" &&
        isDefaultPriceRecord(row),
    );
    expect(defaults.map((row) => row.id)).toEqual([DEEPSEEK_PRICE]);
  });
});

describe("Command Code V4.1 Flash Fast: plan replay", () => {
  it("recovers Fast after JSON persistence, including case and surrounding whitespace", () => {
    const events = JSON.parse(
      JSON.stringify([
        commandCodeCall(
          "fast",
          `  ${FAST.toUpperCase()}  `,
          "2026-09-29T12:00:00Z",
          million("input"),
        ),
        commandCodeCall("regular", REGULAR, "2026-09-29T12:00:01Z", million("input")),
      ]),
    );
    expect(consumed(commandCodeGo, "command-code-go", events).units).toBe("0.31");
  });

  it("does not invent a Fast route when only the canonical model name remains", () => {
    const event = commandCodeCall(
      "canonical-only",
      "deepseek-v4-1-flash",
      "2026-09-29T12:00:00Z",
      million("input"),
    );
    expect(consumed(commandCodeGo, "command-code-go", [event]).units).toBe("0.15");
  });

  it("prices an imported Fast call at the Fast rate, never regular V4.1 Flash's", () => {
    const { result, units } = consumed(commandCodeGo, "command-code-go", [
      commandCodeCall("fast", FAST, "2026-09-29T12:00:00Z", million("input")),
    ]);
    expect(units).toBe("0.16");
    // Identity stays the canonical model; the route never becomes a model of its own.
    expect(result.semantics?.modelMix.models.map((entry) => entry.modelId)).toEqual([
      "deepseek-v4-1-flash",
    ]);
    expect(result.unsupportedModels).toEqual([]);
  });

  it("keeps the Fast rate when the event carries only its raw Command Code name", () => {
    const { units } = consumed(commandCodeGo, "command-code-go", [
      commandCodeCall("fast", FAST, "2026-09-29T12:00:00Z", million("input"), {
        preResolved: false,
      }),
    ]);
    expect(units).toBe("0.16");
  });

  it("prices regular V4.1 Flash at Command Code's regular rate, and the two apart in one workload", () => {
    expect(
      consumed(commandCodeGo, "command-code-go", [
        commandCodeCall("regular", REGULAR, "2026-09-29T12:00:00Z", million("input")),
      ]).units,
    ).toBe("0.15");
    expect(
      consumed(commandCodeGo, "command-code-go", [
        commandCodeCall("regular", REGULAR, "2026-09-29T12:00:00Z", million("output")),
        commandCodeCall("fast", FAST, "2026-09-29T12:00:01Z", million("output")),
      ]).units,
    ).toBe("1.18");
  });

  it("selects peak and off-peak Fast rates from each call's own instant", () => {
    const cases: Array<[string, string, string]> = [
      ["2026-09-29T07:00:00Z", "input", "0.32"], // Tuesday, peak
      ["2026-09-29T04:00:00Z", "input", "0.16"], // between the two peak windows
      ["2026-09-29T09:59:59Z", "output", "1.16"], // last second of peak
      ["2026-09-29T10:00:00Z", "output", "0.58"], // peak ends: windows are half-open
      ["2026-10-03T07:00:00Z", "input", "0.16"], // Saturday
      ["2026-10-01T07:00:00Z", "input", "0.16"], // National Day, listed off-peak
      ["2026-10-05T07:00:00Z", "input", "0.16"], // listed off-peak by Command Code
      ["2026-10-09T07:00:00Z", "input", "0.32"], // Friday after the break, peak again
    ];
    for (const [at, category, expected] of cases) {
      const usage = million(category as "input" | "output");
      expect(
        consumed(commandCodeGo, "command-code-go", [commandCodeCall("fast", FAST, at, usage)])
          .units,
        at,
      ).toBe(expected);
    }
  });

  it("prices Fast cache reads at the Fast cache rate and never guesses a cache-write rate", () => {
    expect(
      consumed(commandCodeGo, "command-code-go", [
        commandCodeCall("off", FAST, "2026-09-29T12:00:00Z", million("cacheRead")),
      ]).units,
    ).toBe("0.016");
    expect(
      consumed(commandCodeGo, "command-code-go", [
        commandCodeCall("peak", FAST, "2026-09-29T02:00:00Z", million("cacheRead")),
      ]).units,
    ).toBe("0.032");
    const write = consumed(commandCodeGo, "command-code-go", [
      commandCodeCall("write", FAST, "2026-09-29T12:00:00Z", million("cacheWrite")),
    ]);
    expect(write.units).toBe("0");
    expect(write.warnings).toContain("PRICING_CATEGORY_UNDOCUMENTED");
  });

  it("does not cover a Fast call on a plan that lists only regular V4.1 Flash", () => {
    const regularOnly = withCreditPool("command-code-go", [
      { model: "gpt-5-6-luna" },
      { model: "deepseek-v4-1-flash", pricingRef: REGULAR_PRICE },
    ]);
    const { result, units, warnings } = consumed(regularOnly, "command-code-go", [
      commandCodeCall("fast", FAST, "2026-09-29T12:00:00Z", million("input")),
      commandCodeCall("regular", REGULAR, "2026-09-29T12:00:01Z", million("input")),
    ]);
    // Only the regular call is priced; 0.31 would mean the Fast call borrowed 0.15.
    expect(units).toBe("0.15");
    expect(warnings).toContain("MODEL_ROUTE_VARIANT_NOT_OFFERED");
    expect(result.unsupportedModels).toEqual([
      {
        rawName: FAST,
        canonicalId: "deepseek-v4-1-flash",
        eventCount: 1,
        reason: "not_supported",
      },
    ]);
  });

  it("lists both Command Code prices as pricing references of the plan version", () => {
    const { result } = consumed(commandCodeGo, "command-code-go", [
      commandCodeCall("fast", FAST, "2026-09-29T12:00:00Z", million("input")),
    ]);
    expect(result.versions.pricingReferences).toEqual(
      expect.arrayContaining([FAST_PRICE, REGULAR_PRICE]),
    );
  });

  it("replays a Fast call on another provider's plan on that plan's own route, and says so", () => {
    const opencode = withCreditPool("opencode-go");
    const { result, warnings } = consumed(opencode, "opencode-go", [
      commandCodeCall("fast", FAST, "2026-09-29T12:00:00Z", million("input")),
    ]);
    expect(result.unsupportedModels).toEqual([]);
    expect(warnings).toContain("MODEL_ROUTE_VARIANT_NOT_CARRIED");
  });

  it("ignores the variant marker outside the harness that published it", () => {
    const { result } = consumed(commandCodeGo, "command-code-go", [
      makeEvent({
        id: "elsewhere",
        occurredAt: "2026-09-29T12:00:00Z",
        usage: million("input"),
        harnessId: "opencode",
        model: { rawName: FAST },
        confidence: { usage: "exact", model: "mapped" },
      }),
    ]);
    // The spelling is only declared for Command Code, so elsewhere it is unknown.
    expect(result.unsupportedModels.map((entry) => entry.reason)).toEqual(["unresolved"]);
  });
});

describe("Command Code V4.1 Flash Fast: Direct API replay", () => {
  const run = (events: ReturnType<typeof makeEvent>[]) =>
    replay({
      events,
      target: { type: "api", providerId: "deepseek" },
      catalog: base,
      context: { rulesAsOf: RULES_AS_OF },
    });

  it("prices a Fast call on DeepSeek's API at DeepSeek's own list price, and says the route changed", () => {
    const result = run([commandCodeCall("fast", FAST, "2026-09-29T12:00:00Z", million("input"))]);
    expect(result.economics?.targetCost.amount).toBe("0.15");
    expect(result.versions.pricingReferences).toEqual([DEEPSEEK_PRICE]);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "MODEL_ROUTE_VARIANT_NOT_CARRIED",
    );
  });

  it("never reads a Command Code rate as a DeepSeek list price", () => {
    const result = run([
      commandCodeCall("regular", REGULAR, "2026-09-29T07:00:00Z", million("input")),
    ]);
    expect(result.economics?.targetCost.amount).toBe("0.3");
    expect(result.versions.pricingReferences).toEqual([DEEPSEEK_PRICE]);
  });
});
