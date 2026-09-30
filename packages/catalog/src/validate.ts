import { Temporal } from "@js-temporal/polyfill";
import type { z } from "zod";
import { stableStringify } from "./canonical.js";
import { type CatalogV1, planVersionId } from "./catalog.js";
import {
  type ModelRuleV1,
  modelRuleV1Schema,
  modelV1Schema,
  type PlanLimitV1,
  type PlanV1,
  type PricingRateSetV1,
  type PricingTierScheduleConditionV1,
  type PricingV1,
  planV1Schema,
  pricingV1Schema,
  providerV1Schema,
  type UtcTimeWindowV1,
} from "./schema.js";

/**
 * Pure catalog validation (spec points 18-21, point 93).
 *
 * Structural validation uses the Zod schemas; this module adds the semantic
 * checks that make catalog data trustworthy: duplicate ids, effective-date
 * ordering and overlap, reference integrity, decimal/integer units, window
 * validity (including IANA timezones) and multiplier bounds.
 *
 * Browser-safe and deterministic: same input, same issues, same order.
 */

export type CatalogValidationSeverity = "error" | "warning";

export interface CatalogValidationIssue {
  severity: CatalogValidationSeverity;
  code: string;
  message: string;
  file?: string;
}

export interface RawCatalogFile {
  file: string;
  data: unknown;
}

export interface RawCatalogData {
  providers: RawCatalogFile[];
  models: RawCatalogFile[];
  plans: RawCatalogFile[];
  pricing: RawCatalogFile[];
}

const INTEGER_AMOUNT_PATTERN = /^\d+$/;
const MAX_MULTIPLIER = 10;

function exceedsMaxMultiplier(value: string): boolean {
  const [whole = "", fraction = ""] = value.split(".");
  return (
    whole.length > 2 ||
    (whole.length === 2 && (whole > "10" || (whole === "10" && /[1-9]/.test(fraction))))
  );
}

function isValidTimeZone(timeZone: string): boolean {
  if (/^[+-]/.test(timeZone)) return false;
  try {
    Temporal.Instant.from("2026-01-01T00:00:00Z").toZonedDateTimeISO(timeZone);
    return true;
  } catch {
    return false;
  }
}

function isValidDuration(duration: string): boolean {
  try {
    const value = Temporal.Duration.from(duration).total({ unit: "milliseconds" });
    return Number.isSafeInteger(value) && value > 0 && value <= 8_640_000_000_000_000;
  } catch {
    return false;
  }
}

interface DateRange {
  from: string;
  /** undefined means open-ended. */
  to?: string;
}

function rangesOverlap(a: DateRange, b: DateRange): boolean {
  const aEnd = a.to ?? "9999-12-31";
  const bEnd = b.to ?? "9999-12-31";
  return a.from <= bEnd && b.from <= aEnd;
}

function parseEntries<T>(
  entries: RawCatalogFile[],
  schema: z.ZodType<T>,
  issues: CatalogValidationIssue[],
): Array<{ file: string; value: T }> {
  const parsed: Array<{ file: string; value: T }> = [];
  for (const entry of entries) {
    const result = schema.safeParse(entry.data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          severity: "error",
          code: "SCHEMA_INVALID",
          message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
          file: entry.file,
        });
      }
      continue;
    }
    parsed.push({ file: entry.file, value: result.data });
  }
  return parsed;
}

function checkDuplicateIds(
  entries: Array<{ file: string; value: { id: string } }>,
  kind: string,
  issues: CatalogValidationIssue[],
): void {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const previous = seen.get(entry.value.id);
    if (previous !== undefined) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_ID",
        message: `duplicate ${kind} id "${entry.value.id}" (also in ${previous})`,
        file: entry.file,
      });
    } else {
      seen.set(entry.value.id, entry.file);
    }
  }
}

function checkVersionRanges(
  ranges: Array<{ file: string; range: DateRange; label: string }>,
  issues: CatalogValidationIssue[],
): void {
  for (const { file, range, label } of ranges) {
    if (range.to !== undefined && range.to < range.from) {
      issues.push({
        severity: "error",
        code: "VERSION_DATE_ORDER",
        message: `${label}: effectiveTo ${range.to} is before effectiveFrom ${range.from}`,
        file,
      });
    }
  }
  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      const a = ranges[i];
      const b = ranges[j];
      if (a === undefined || b === undefined) continue;
      if (a.label !== b.label) continue;
      if (rangesOverlap(a.range, b.range)) {
        issues.push({
          severity: "error",
          code: "VERSION_OVERLAP",
          message: `${a.label}: effective ranges overlap (${a.range.from}..${a.range.to ?? "open"} and ${b.range.from}..${b.range.to ?? "open"})`,
          file: b.file,
        });
      }
    }
  }
}

/**
 * Plan history and version lifecycle. Dates have to be able to say what they
 * claim: an event needs a day to sit at, an announcement is dated by its
 * announcement, a link to a version names a version that exists, and a
 * comparison with "previous terms" needs previous terms.
 */
function checkPlanHistory(plan: PlanV1, file: string, issues: CatalogValidationIssue[]): void {
  const add = (code: string, message: string) =>
    issues.push({ severity: "error", code, message: `${plan.id}: ${message}`, file });
  const cohortIds = new Set((plan.cohorts ?? []).map((cohort) => cohort.id));
  if (cohortIds.size !== (plan.cohorts ?? []).length) add("DUPLICATE_ID", "duplicate cohort id");
  for (const version of plan.versions)
    if (version.cohort !== undefined && !cohortIds.has(version.cohort))
      add(
        "PLAN_COHORT_UNKNOWN",
        `version ${version.effectiveFrom} names cohort "${version.cohort}", which the plan does not declare`,
      );
  const sorted = plan.versions
    .filter((version) => version.cohort === undefined)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));
  const starts = new Set(plan.versions.map((version) => version.effectiveFrom));
  for (const [index, version] of sorted.entries()) {
    const where = `version ${version.effectiveFrom}`;
    if (version.announcedAt !== undefined && version.announcedAt > version.effectiveFrom)
      add("PLAN_HISTORY_DATE_ORDER", `${where} is announced after it takes effect`);
    if (version.withdrawn !== undefined && version.withdrawn.at > version.effectiveFrom)
      add(
        "PLAN_HISTORY_DATE_ORDER",
        `${where} is withdrawn after its effective date; a version that took effect ends with effectiveTo instead`,
      );
    if (
      version.revision?.relativeValue !== undefined &&
      sorted.slice(0, index).every((earlier) => earlier.withdrawn !== undefined)
    )
      add(
        "PLAN_HISTORY_NO_PREVIOUS_TERMS",
        `${where} compares itself with previous terms, but no earlier version exists`,
      );
  }
  const ids = new Set<string>();
  for (const event of plan.history?.events ?? []) {
    const where = `event "${event.id}"`;
    if (ids.has(event.id)) add("DUPLICATE_ID", `duplicate history ${where}`);
    ids.add(event.id);
    if (event.kind === "announcement" && event.announcedAt === undefined)
      add("PLAN_HISTORY_UNDATED", `${where} is an announcement without announcedAt`);
    if (event.announcedAt === undefined && event.effectiveAt === undefined)
      add("PLAN_HISTORY_UNDATED", `${where} has neither announcedAt nor effectiveAt`);
    if (
      event.announcedAt !== undefined &&
      event.effectiveAt !== undefined &&
      event.announcedAt > event.effectiveAt
    )
      add("PLAN_HISTORY_DATE_ORDER", `${where} is announced after it takes effect`);
    if (event.versionEffectiveFrom !== undefined && !starts.has(event.versionEffectiveFrom))
      add("PLAN_HISTORY_VERSION_MISSING", `${where} names version ${event.versionEffectiveFrom}`);
    const overlap = (event.appliesTo ?? []).filter((audience) =>
      (event.unaffected ?? []).includes(audience),
    );
    if (overlap.length > 0)
      add("PLAN_HISTORY_AUDIENCE", `${where} both applies to and leaves unaffected ${overlap[0]}`);
  }
}

function checkLimits(
  plan: PlanV1,
  file: string,
  knownModelIds: Set<string>,
  issues: CatalogValidationIssue[],
): void {
  for (const version of plan.versions) {
    const where = `${plan.id}@${version.effectiveFrom}`;
    // A plan version states at least one limit. A plan whose provider publishes
    // no number states its limits qualitatively; the array is never padded with
    // an invented amount to satisfy a shape.
    if (version.limits.length === 0 && (version.qualitativeLimits ?? []).length === 0)
      issues.push({
        severity: "error",
        code: "MISSING_LIMIT",
        message: `${where}: a plan version must state at least one limit, numeric or qualitative`,
        file,
      });
    for (const [kind, ids] of [
      ["limit", version.limits.map((limit) => limit.id)],
      ["qualitative limit", (version.qualitativeLimits ?? []).map((limit) => limit.id)],
      ["model rule", version.modelRules.map((rule) => rule.model)],
      ["promotion", (version.promotions ?? []).map((promotion) => promotion.id)],
    ] as const) {
      if (new Set(ids).size !== ids.length)
        issues.push({
          severity: "error",
          code: "DUPLICATE_ID",
          message: `${where}: duplicate ${kind}`,
          file,
        });
    }
    // Bound the widest possible monetary sum, including all simultaneously active
    // model/promotion factors. See decision 21 for the 100-digit proof.
    let maxIntegerGrowth = 0;
    let maxScale = 0;
    for (const rule of version.modelRules) {
      const promotions = (version.promotions ?? []).filter(
        (p) => p.models === undefined || p.models.includes(rule.model),
      );
      const dates = [version.effectiveFrom, ...promotions.map((p) => p.effectiveFrom)];
      for (const date of dates) {
        const factors = [
          rule.multiplier ?? "1",
          ...promotions
            .filter(
              (p) =>
                p.effectiveFrom <= date && (p.effectiveTo === undefined || p.effectiveTo >= date),
            )
            .map((p) => p.multiplier),
        ];
        let integerGrowth = 0;
        let scale = 0;
        for (const factor of factors) {
          const [whole = "0", fractional = ""] = factor.split(".");
          const fraction = fractional.replace(/0+$/, "");
          scale += fraction.length;
          if (whole !== "0" && (whole !== "1" || fraction.length > 0)) integerGrowth += 1;
        }
        maxIntegerGrowth = Math.max(maxIntegerGrowth, integerGrowth);
        maxScale = Math.max(maxScale, scale);
      }
    }
    if (68 + maxIntegerGrowth + maxScale + String(version.limits.length).length > 100) {
      issues.push({
        severity: "error",
        code: "ARITHMETIC_ENVELOPE_EXCEEDED",
        file,
        message: `${where}: composed multipliers and constraint count exceed the supported exact-arithmetic budget`,
      });
    }
    for (const limit of version.limits) {
      checkLimit(limit, where, file, knownModelIds, issues);
    }
    for (const rule of version.modelRules) {
      const parsed = modelRuleV1Schema.safeParse(rule);
      if (!parsed.success) continue;
      if (!knownModelIds.has(rule.model)) {
        issues.push({
          severity: "error",
          code: "MODEL_REF_MISSING",
          message: `${where}: model rule references unknown model "${rule.model}"`,
          file,
        });
      }
      if (rule.multiplier !== undefined && exceedsMaxMultiplier(rule.multiplier))
        issues.push({
          severity: "error",
          code: "MULTIPLIER_OUT_OF_RANGE",
          message: `${where}: model multiplier exceeds ${MAX_MULTIPLIER}`,
          file,
        });
      const excluded = rule.excluded === true;
      if (!excluded && rule.pricingRef === undefined) {
        // A warning, not an error: a subscription catalog may legitimately ship
        // without API list prices for a model. The replay engine only prices what
        // it has a reference for, so the consequence is a missing list-price
        // equivalent, which the result already reports as absent.
        issues.push({
          severity: "warning",
          code: "MODEL_RULE_INVALID",
          message: `${where}: model rule for "${rule.model}" needs a pricingRef or must be excluded`,
          file,
        });
      }
    }
    for (const promotion of version.promotions ?? []) {
      if (promotion.effectiveTo !== undefined && promotion.effectiveTo < promotion.effectiveFrom) {
        issues.push({
          severity: "error",
          code: "PROMOTION_DATE_ORDER",
          message: `${where}: promotion "${promotion.id}" ends before it starts`,
          file,
        });
      }
      if (exceedsMaxMultiplier(promotion.multiplier)) {
        issues.push({
          severity: "error",
          code: "MULTIPLIER_OUT_OF_RANGE",
          message: `${where}: promotion "${promotion.id}" multiplier exceeds ${MAX_MULTIPLIER}`,
          file,
        });
      }
      for (const modelId of promotion.models ?? []) {
        if (!knownModelIds.has(modelId)) {
          issues.push({
            severity: "error",
            code: "MODEL_REF_MISSING",
            message: `${where}: promotion "${promotion.id}" references unknown model "${modelId}"`,
            file,
          });
        }
      }
    }
  }
}

function checkLimit(
  limit: PlanLimitV1,
  where: string,
  file: string,
  knownModelIds: Set<string>,
  issues: CatalogValidationIssue[],
): void {
  const prefix = `${where}: limit "${limit.id}"`;
  if (limit.type !== "credit_pool" && !INTEGER_AMOUNT_PATTERN.test(limit.amount)) {
    issues.push({
      severity: "error",
      code: "LIMIT_AMOUNT_INVALID",
      message: `${prefix}: ${limit.type} amounts must be whole numbers of ${limit.type === "token_limit" ? "tokens" : "requests"}`,
      file,
    });
  }
  for (const modelId of limit.models ?? []) {
    if (!knownModelIds.has(modelId)) {
      issues.push({
        severity: "error",
        code: "MODEL_REF_MISSING",
        message: `${prefix}: references unknown model "${modelId}"`,
        file,
      });
    }
  }
  if (limit.window.type === "rolling" && !isValidDuration(limit.window.duration)) {
    issues.push({
      severity: "error",
      code: "WINDOW_INVALID",
      message: `${prefix}: "${limit.window.duration}" is not a valid ISO-8601 duration`,
      file,
    });
  }
  if (limit.window.type === "calendar" && !isValidTimeZone(limit.window.timezone)) {
    issues.push({
      severity: "error",
      code: "TIMEZONE_INVALID",
      message: `${prefix}: "${limit.window.timezone}" is not a valid IANA timezone`,
      file,
    });
  }

  // Explicit exceed behavior and overage pricing (decisions 14, 19).
  if (limit.exceed === "allow_overage") {
    if (limit.type === "credit_pool") {
      if (limit.overageRate !== undefined) {
        issues.push({
          severity: "error",
          code: "LIMIT_OVERAGE_RATE_INVALID",
          message: `${prefix}: a credit pool's excess is already currency and must not declare an overage rate`,
          file,
        });
      }
    } else if (limit.overageRate === undefined) {
      issues.push({
        severity: "error",
        code: "LIMIT_OVERAGE_RATE_MISSING",
        message: `${prefix}: allow_overage requires an explicit overage rate`,
        file,
      });
    } else {
      const expected = limit.type === "token_limit" ? "per_1m_tokens" : "per_request";
      if (limit.overageRate.unit !== expected) {
        issues.push({
          severity: "error",
          code: "LIMIT_OVERAGE_RATE_INVALID",
          message: `${prefix}: overage rate unit must be ${expected} for a ${limit.type}`,
          file,
        });
      }
    }
  } else if (limit.overageRate !== undefined) {
    issues.push({
      severity: "error",
      code: "LIMIT_OVERAGE_RATE_INVALID",
      message: `${prefix}: overageRate is only valid with allow_overage`,
      file,
    });
  }
}

/**
 * Pricing semantics (M4A pricing remediation): a `billedAs` relationship must
 * name a different category with a published amount in the same rate set (no
 * chains, no cycles), a tier is a complete alternative rate set, and tier
 * conditions cannot overlap. With at most one input-token tier and pairwise
 * disjoint UTC windows, at most one tier can match any event, so rate selection
 * never depends on declaration order.
 */
const RATE_CATEGORIES = ["input", "output", "cacheRead", "cacheWrite", "reasoning"] as const;

function minutesOfDay(value: string): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}

function timeWindowsOverlap(a: UtcTimeWindowV1, b: UtcTimeWindowV1): boolean {
  if (!a.days.some((day) => b.days.includes(day))) return false;
  return minutesOfDay(a.start) < minutesOfDay(b.end) && minutesOfDay(b.start) < minutesOfDay(a.end);
}

function checkRateSet(
  rates: PricingRateSetV1,
  prefix: string,
  file: string,
  issues: CatalogValidationIssue[],
): void {
  for (const category of RATE_CATEGORIES) {
    const value = rates[category];
    if (value === undefined || typeof value === "string") continue;
    const target = rates[value.billedAs];
    if (value.billedAs === category || target === undefined || typeof target !== "string") {
      issues.push({
        severity: "error",
        code: "PRICING_EQUIVALENCE_INVALID",
        message: `${prefix}: rate "${category}" declares billedAs "${value.billedAs}", which must name a different category with a published amount in the same rate set`,
        file,
      });
    }
  }
}

/**
 * A rule's route variants are the plan provider's own, declared by an alias of
 * the rule's model, and each is priced only by a record of the same model and
 * the same variant. An excluded model has no variants to offer.
 */
function checkRuleVariants(
  rule: ModelRuleV1,
  plan: PlanV1,
  effectiveFrom: string,
  file: string,
  context: {
    routeVariants: ReadonlySet<string>;
    pricing: ReadonlyArray<{ value: PricingV1 }>;
    pricingIds: ReadonlySet<string>;
    issues: CatalogValidationIssue[];
  },
): void {
  const variants = rule.variants ?? [];
  const where = `${plan.id}@${effectiveFrom}: ${rule.model}`;
  const add = (code: string, message: string) =>
    context.issues.push({ severity: "error", code, message: `${where}: ${message}`, file });
  if (variants.length > 0 && rule.excluded === true)
    add("MODEL_RULE_INVALID", "an excluded model cannot list route variants");
  const seen = new Set<string>();
  for (const variant of variants) {
    if (seen.has(variant.id)) add("DUPLICATE_ID", `route variant "${variant.id}" is listed twice`);
    seen.add(variant.id);
    if (rule.multiplier !== undefined && variant.multiplier === undefined)
      add(
        "MODEL_RULE_INVALID",
        `route variant "${variant.id}" must state its own multiplier; the rule's ${rule.multiplier} is not inherited`,
      );
    if (variant.multiplier !== undefined && exceedsMaxMultiplier(variant.multiplier))
      add(
        "MULTIPLIER_OUT_OF_RANGE",
        `route variant "${variant.id}" multiplier exceeds ${MAX_MULTIPLIER}`,
      );
    if (!context.routeVariants.has(`${rule.model}|${plan.providerId}|${variant.id}`))
      add(
        "RULE_VARIANT_UNDECLARED",
        `route variant "${variant.id}" is not declared by any alias of ${rule.model} for provider "${plan.providerId}"`,
      );
    if (variant.pricingRef === undefined) continue;
    if (!context.pricingIds.has(variant.pricingRef)) {
      add("PRICING_REF_UNKNOWN", `variant pricingRef "${variant.pricingRef}" does not exist`);
      continue;
    }
    const price = context.pricing.find((row) => row.value.id === variant.pricingRef)?.value;
    if (price !== undefined && (price.modelId !== rule.model || price.variantId !== variant.id))
      add(
        "PRICING_VARIANT_MISMATCH",
        `route variant "${variant.id}" names pricing "${price.id}", which prices ${price.modelId}${price.variantId === undefined ? "'s default route" : ` variant "${price.variantId}"`}`,
      );
  }
}

/**
 * A schedule's date calendar must be complete through a stated date, so a
 * holiday the list does not reach yet is never read as an ordinary weekday.
 * The lists are sorted, free of repeats and disjoint: a date is either skipped
 * or left open, never both.
 */
function checkScheduleCalendar(
  when: PricingTierScheduleConditionV1,
  tierPrefix: string,
  file: string,
  issues: CatalogValidationIssue[],
): void {
  const except = when.exceptUtcDates ?? [];
  const open = when.unestablishedUtcDates ?? [];
  const problem = (message: string) =>
    issues.push({
      severity: "error",
      code: "PRICING_TIER_CALENDAR_INVALID",
      message: `${tierPrefix}: ${message}`,
      file,
    });
  if ((except.length > 0 || open.length > 0) && when.datesKnownThrough === undefined)
    problem(
      "a date calendar must state datesKnownThrough, the last date its lists are complete for",
    );
  for (const [name, dates] of [
    ["exceptUtcDates", except],
    ["unestablishedUtcDates", open],
  ] as const) {
    for (let i = 1; i < dates.length; i += 1) {
      const previous = dates[i - 1];
      const current = dates[i];
      if (previous !== undefined && current !== undefined && previous >= current)
        problem(`${name} must be sorted with no repeats`);
    }
    for (const date of dates)
      if (when.datesKnownThrough !== undefined && date > when.datesKnownThrough)
        problem(`${name} lists ${date}, after datesKnownThrough ${when.datesKnownThrough}`);
  }
  const skipped = new Set(except);
  for (const date of open) if (skipped.has(date)) problem(`${date} is both skipped and left open`);
}

function checkPricingSemantics(
  pricing: Pick<PricingV1, "id" | "rates" | "tiers"> & Partial<Pick<PricingV1, "promotion">>,
  file: string,
  issues: CatalogValidationIssue[],
): void {
  const prefix = `pricing "${pricing.id}"`;
  checkRateSet(pricing.rates, `${prefix}: base rates`, file, issues);
  const tierIds = new Set<string>();
  let inputTierSeen = false;
  const windows: Array<{ tier: string; window: UtcTimeWindowV1 }> = [];

  for (const tier of pricing.tiers ?? []) {
    const tierPrefix = `${prefix}: tier "${tier.id}"`;
    if (tierIds.has(tier.id)) {
      issues.push({
        severity: "error",
        code: "PRICING_TIER_ID_DUPLICATE",
        message: `${prefix}: duplicate tier id "${tier.id}"`,
        file,
      });
    }
    tierIds.add(tier.id);
    checkRateSet(tier.rates, tierPrefix, file, issues);
    const baseKeys = RATE_CATEGORIES.filter((category) => pricing.rates[category] !== undefined);
    const tierKeys = RATE_CATEGORIES.filter((category) => tier.rates[category] !== undefined);
    if (baseKeys.join(",") !== tierKeys.join(",")) {
      issues.push({
        severity: "error",
        code: "PRICING_TIER_RATES_INCOMPLETE",
        message: `${tierPrefix}: a tier must establish exactly the categories of the base rates; it is a complete alternative rate set, never a partial override`,
        file,
      });
    }
    if ("inputTokensAbove" in tier.when) {
      if (inputTierSeen || windows.length > 0) {
        issues.push({
          severity: "error",
          code: "PRICING_TIER_OVERLAP",
          message: `${prefix}: mixes request-size and time-of-day tier conditions; at most one condition family is allowed so rate selection can never depend on declaration order`,
          file,
        });
      }
      inputTierSeen = true;
      continue;
    }
    if (inputTierSeen) {
      issues.push({
        severity: "error",
        code: "PRICING_TIER_OVERLAP",
        message: `${prefix}: mixes request-size and time-of-day tier conditions; at most one condition family is allowed so rate selection can never depend on declaration order`,
        file,
      });
    }
    for (const window of tier.when.utcWindows) {
      if (minutesOfDay(window.end) <= minutesOfDay(window.start)) {
        issues.push({
          severity: "error",
          code: "PRICING_TIER_WINDOW_INVALID",
          message: `${tierPrefix}: window ${window.start}-${window.end} must be half-open with start before end; a schedule that wraps midnight is not representable and must not be flattened`,
          file,
        });
      }
      if (new Set(window.days).size !== window.days.length) {
        issues.push({
          severity: "error",
          code: "PRICING_TIER_WINDOW_INVALID",
          message: `${tierPrefix}: a window names a weekday more than once`,
          file,
        });
      }
      windows.push({ tier: tier.id, window });
    }
    checkScheduleCalendar(tier.when, tierPrefix, file, issues);
  }

  for (let i = 0; i < windows.length; i += 1) {
    for (let j = i + 1; j < windows.length; j += 1) {
      const a = windows[i];
      const b = windows[j];
      if (a === undefined || b === undefined || a.tier === b.tier) continue;
      if (timeWindowsOverlap(a.window, b.window)) {
        issues.push({
          severity: "error",
          code: "PRICING_TIER_OVERLAP",
          message: `${prefix}: tiers "${a.tier}" and "${b.tier}" have overlapping UTC windows, so more than one rate set could match one event`,
          file,
        });
      }
    }
  }
  const promotion = pricing.promotion;
  if (promotion?.regularRates)
    checkRateSet(promotion.regularRates, `${prefix}: promotion regular rates`, file, issues);
  const regularTierIds = new Set<string>();
  for (const tier of promotion?.regularTiers ?? []) {
    checkRateSet(tier.rates, `${prefix}: promotion regular tier "${tier.id}"`, file, issues);
    if (regularTierIds.has(tier.id))
      issues.push({
        severity: "error",
        code: "PRICING_PROMOTION_TIER_DUPLICATE",
        message: `${prefix}: promotion regular tier "${tier.id}" is listed more than once`,
        file,
      });
    regularTierIds.add(tier.id);
    if (!tierIds.has(tier.id))
      issues.push({
        severity: "error",
        code: "PRICING_PROMOTION_TIER_UNKNOWN",
        message: `${prefix}: promotion regular tier "${tier.id}" names no tier on this record`,
        file,
      });
  }
}

export function validateCatalogData(raw: RawCatalogData): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];

  const providers = parseEntries(raw.providers, providerV1Schema, issues);
  const models = parseEntries(raw.models, modelV1Schema, issues);
  const plans = parseEntries(raw.plans, planV1Schema, issues);
  const pricing = parseEntries(raw.pricing, pricingV1Schema, issues);

  checkDuplicateIds(providers, "provider", issues);
  checkDuplicateIds(models, "model", issues);
  checkDuplicateIds(plans, "plan", issues);
  checkDuplicateIds(pricing, "pricing", issues);

  const providerIds = new Set(providers.map((entry) => entry.value.id));
  const modelIds = new Set(models.map((entry) => entry.value.id));
  const pricingIds = new Set(pricing.map((entry) => entry.value.id));

  for (const entry of models) {
    for (const providerId of entry.value.providerIds ?? []) {
      if (!providerIds.has(providerId)) {
        issues.push({
          severity: "error",
          code: "PROVIDER_REF_MISSING",
          message: `model "${entry.value.id}" references unknown provider "${providerId}"`,
          file: entry.file,
        });
      }
    }
  }

  // Processing tiers (service tiers): one entry per tier per model, so a
  // model's availability for a tier has exactly one answer.
  const listedTiers = new Map<string, Set<string>>();
  for (const entry of models) {
    const tiers = (entry.value.serviceTiers ?? []).map((tier) => tier.tier);
    listedTiers.set(entry.value.id, new Set(tiers));
    if (new Set(tiers).size !== tiers.length)
      issues.push({
        severity: "error",
        code: "DUPLICATE_ID",
        message: `model "${entry.value.id}" lists a processing tier twice`,
        file: entry.file,
      });
  }

  // Taxonomy (launch): a developer is a provider record, a family reference
  // points at a record that declares itself a family, and a family record is
  // an identity, not a release, so it has neither a family nor a lifecycle.
  const modelKinds = new Map(
    models.map((entry) => [entry.value.id, entry.value.kind ?? "release"]),
  );
  for (const entry of models) {
    const model = entry.value;
    if (model.developerId !== undefined && !providerIds.has(model.developerId)) {
      issues.push({
        severity: "error",
        code: "DEVELOPER_REF_MISSING",
        message: `model "${model.id}" names unknown developer "${model.developerId}"`,
        file: entry.file,
      });
    }
    if (model.kind === "family") {
      if (
        model.familyId !== undefined ||
        model.lifecycle !== undefined ||
        model.releaseDate !== undefined
      ) {
        issues.push({
          severity: "error",
          code: "FAMILY_RECORD_INVALID",
          message: `family record "${model.id}" cannot declare a family, lifecycle or release date; those describe releases`,
          file: entry.file,
        });
      }
      continue;
    }
    if (model.familyId !== undefined && modelKinds.get(model.familyId) !== "family") {
      issues.push({
        severity: "error",
        code: "FAMILY_REF_INVALID",
        message: `model "${model.id}" names "${model.familyId}" as its family, which is not a family record`,
        file: entry.file,
      });
    }
  }

  // Alias declarations must be unambiguous: an alias is the only thing that can
  // map an outside identifier onto a model, so two models claiming the same
  // spelling in the same scope, a duplicate alias id, or an alias that shadows
  // another model's canonical id or name are all catalog authoring errors.
  const aliasIds = new Set<string>();
  const aliasOwners = new Map<string, string>();
  /** `model|provider|variant` for every route variant an alias declares. */
  const routeVariants = new Set<string>();
  const canonicalNames = new Map<string, string>();
  for (const entry of models) {
    for (const candidate of [entry.value.id.toLowerCase(), entry.value.name.toLowerCase()]) {
      const previous = canonicalNames.get(candidate);
      if (previous === undefined || previous === entry.value.id) {
        canonicalNames.set(candidate, entry.value.id);
      }
    }
  }
  for (const entry of models) {
    for (const alias of entry.value.aliases ?? []) {
      if (aliasIds.has(alias.id)) {
        issues.push({
          severity: "error",
          code: "ALIAS_ID_DUPLICATE",
          message: `alias id "${alias.id}" is declared more than once`,
          file: entry.file,
        });
      }
      aliasIds.add(alias.id);

      const key = `${alias.harness?.toLowerCase() ?? "*"}|${alias.alias.trim().toLowerCase()}`;
      const owner = aliasOwners.get(key);
      if (owner !== undefined && owner !== entry.value.id) {
        issues.push({
          severity: "error",
          code: "ALIAS_CONFLICT",
          message: `alias "${alias.alias}"${alias.harness === undefined ? "" : ` for harness "${alias.harness}"`} is claimed by both "${owner}" and "${entry.value.id}"`,
          file: entry.file,
        });
      }
      aliasOwners.set(key, entry.value.id);

      const shadowed = canonicalNames.get(alias.alias.trim().toLowerCase());
      if (shadowed !== undefined && shadowed !== entry.value.id) {
        issues.push({
          severity: "error",
          code: "ALIAS_SHADOWS_CANONICAL",
          message: `alias "${alias.alias}" on "${entry.value.id}" is the canonical id or name of "${shadowed}" and would never apply`,
          file: entry.file,
        });
      }

      if (alias.variant !== undefined) {
        if (alias.harness === undefined)
          issues.push({
            severity: "error",
            code: "ALIAS_VARIANT_UNSCOPED",
            message: `alias "${alias.alias}" on "${entry.value.id}" selects route variant "${alias.variant.id}" but is not scoped to a harness`,
            file: entry.file,
          });
        if (!providerIds.has(alias.variant.providerId))
          issues.push({
            severity: "error",
            code: "PROVIDER_REF_MISSING",
            message: `alias "${alias.alias}" on "${entry.value.id}" names unknown provider "${alias.variant.providerId}" for its route variant`,
            file: entry.file,
          });
        routeVariants.add(`${entry.value.id}|${alias.variant.providerId}|${alias.variant.id}`);
      }
    }
  }

  const planVersionRanges: Array<{ file: string; range: DateRange; label: string }> = [];
  const pricingRanges: Array<{ file: string; range: DateRange; label: string }> = [];

  for (const entry of plans) {
    const plan = entry.value;
    if (!providerIds.has(plan.providerId)) {
      issues.push({
        severity: "error",
        code: "PROVIDER_REF_MISSING",
        message: `plan "${plan.id}" references unknown provider "${plan.providerId}"`,
        file: entry.file,
      });
    }
    checkPlanHistory(plan, entry.file, issues);
    for (const version of plan.versions) {
      // A withdrawn version never takes effect, so it cannot overlap the
      // version that replaced it.
      if (version.withdrawn === undefined)
        planVersionRanges.push({
          file: entry.file,
          // One line of versions per cohort: a cohort's terms run beside the
          // market's and may overlap them, but not each other.
          label: version.cohort === undefined ? plan.id : `${plan.id}~${version.cohort}`,
          range: {
            from: version.effectiveFrom,
            ...(version.effectiveTo !== undefined ? { to: version.effectiveTo } : {}),
          },
        });
      for (const rule of version.modelRules) {
        if (rule.access !== undefined && rule.excluded !== true)
          issues.push({
            severity: "error",
            code: "ACCESS_WITHOUT_EXCLUSION",
            message: `${plan.id}@${version.effectiveFrom}: ${rule.model} records paid access but is not excluded from included usage`,
            file: entry.file,
          });
        const price = pricing.find((entry) => entry.value.id === rule.pricingRef)?.value;
        if (price !== undefined && price.modelId !== rule.model)
          issues.push({
            severity: "error",
            code: "PRICING_MODEL_MISMATCH",
            message: `${plan.id}: pricing does not belong to model ${rule.model}`,
            file: entry.file,
          });
        if (rule.pricingRef !== undefined && !pricingIds.has(rule.pricingRef)) {
          issues.push({
            severity: "error",
            code: "PRICING_REF_UNKNOWN",
            message: `${plan.id}@${version.effectiveFrom}: pricingRef "${rule.pricingRef}" does not exist`,
            file: entry.file,
          });
        }
        // The rule's own price is the default route's. A variant record there
        // would price every default-route call at the variant's rates.
        if (price?.variantId !== undefined)
          issues.push({
            severity: "error",
            code: "PRICING_VARIANT_MISMATCH",
            message: `${plan.id}@${version.effectiveFrom}: ${rule.model}'s own pricingRef "${price.id}" is a "${price.variantId}" variant record; a variant is priced only from its entry in the rule's variants`,
            file: entry.file,
          });
        checkRuleVariants(rule, plan, version.effectiveFrom, entry.file, {
          routeVariants,
          pricing,
          pricingIds,
          issues,
        });
      }
    }
    const executionVersions = [...(plan.executionVersions ?? [])].sort((a, b) =>
      a.validity.start < b.validity.start ? -1 : a.validity.start > b.validity.start ? 1 : 0,
    );
    const executionIds = new Set<string>();
    let priorExecutionVersion: (typeof executionVersions)[number] | undefined;
    for (const version of executionVersions) {
      const claimIds = new Set(version.claims.map((claim) => claim.id));
      const add = (code: string, message: string) =>
        issues.push({
          severity: "error" as const,
          code,
          message: `${plan.id}/${version.id}: ${message}`,
          file: entry.file,
        });
      for (const [kind, rows] of [
        ["claim", version.claims],
        ["requirement", version.requirements],
        ["group", version.groups],
        ["rate", version.rates],
        ["meter", version.meters],
        ["pool", version.pools],
        ["debit", version.debits],
        ["window", version.windows],
        ["constraint", version.constraints],
        ["route", version.routes],
      ] as const) {
        if (new Set(rows.map((row) => row.id)).size !== rows.length)
          add("EXECUTION_DUPLICATE_ID", `duplicate ${kind} ID`);
      }
      if (executionIds.has(version.id))
        add("EXECUTION_VERSION_DUPLICATE", "duplicate immutable version ID");
      executionIds.add(version.id);
      if (
        version.validity.start >= version.validity.end ||
        (priorExecutionVersion !== undefined &&
          priorExecutionVersion.validity.end > version.validity.start)
      )
        add("EXECUTION_VERSION_OVERLAP", "invalid or overlapping half-open validity");
      priorExecutionVersion = version;
      if (version.validity.basis === "current-market" && !version.publication.catalogActivatedAt)
        add("EXECUTION_ACTIVATION_UNKNOWN", "current-market version requires catalog activation");
      const operations = [
        version.validity,
        ...(version.purchase.kind === "subscription" ? [version.purchase] : []),
        ...version.requirements,
        ...version.groups,
        ...version.rates,
        ...version.debits,
        ...version.windows,
        ...version.constraints,
        ...version.routes,
        version.continuation,
        ...version.capabilities,
      ];
      for (const operation of operations)
        for (const ref of operation.claimRefs)
          if (!claimIds.has(ref)) add("EXECUTION_CLAIM_UNKNOWN", `unknown claim ${ref}`);
      for (const claim of version.claims) {
        if (claim.reviewedAt < claim.observedAt)
          add("EXECUTION_REVIEW_TIME", `claim ${claim.id} was reviewed before observation`);
        if (claim.authority === "provider" && claim.certainty === "synthetic")
          add("EXECUTION_CLAIM_AUTHORITY", `claim ${claim.id} has contradictory authority`);
      }
      for (const route of version.routes) {
        for (const id of route.requirementIds)
          if (!version.requirements.some((r) => r.id === id))
            add(
              "EXECUTION_REQUIREMENT_UNKNOWN",
              `route ${route.id} uses unknown requirement ${id}`,
            );
      }
      for (const window of version.windows)
        if (window.kind === "fixed_partition") {
          if (
            !version.requirements.some(
              (r) => r.id === window.anchorRequirementId && r.kind === "account_reset_anchor",
            )
          )
            add(
              "EXECUTION_ANCHOR_UNKNOWN",
              `fixed partition ${window.id} lacks an account reset anchor requirement`,
            );
        } else if (window.kind === "calendar" && !isValidTimeZone(window.timezone))
          add(
            "EXECUTION_TIMEZONE_INVALID",
            `calendar window ${window.id} has invalid IANA timezone`,
          );
    }
    if (
      new Set((plan.executionOverlays ?? []).map((o) => o.id)).size !==
      (plan.executionOverlays ?? []).length
    )
      issues.push({
        severity: "error",
        code: "EXECUTION_OVERLAY_DUPLICATE",
        message: `${plan.id}: duplicate overlay ID`,
        file: entry.file,
      });
    for (const overlay of plan.executionOverlays ?? []) {
      if (overlay.validFrom >= overlay.validUntil)
        issues.push({
          severity: "error",
          code: "EXECUTION_OVERLAY_INTERVAL",
          message: `${plan.id}/${overlay.id}: invalid half-open overlay interval`,
          file: entry.file,
        });
      for (const id of overlay.planVersionIds)
        if (!executionIds.has(id))
          issues.push({
            severity: "error",
            code: "EXECUTION_OVERLAY_VERSION",
            message: `${plan.id}/${overlay.id}: unknown version ${id}`,
            file: entry.file,
          });
      for (const id of overlay.planVersionIds) {
        const version = executionVersions.find((v) => v.id === id);
        if (!version) continue;
        const claims = new Set(version.claims.map((c) => c.id));
        const requirements = new Set(version.requirements.map((r) => r.id));
        for (const ref of [
          ...overlay.claimRefs,
          ...overlay.modifications.flatMap((m) => m.claimRefs),
        ])
          if (!claims.has(ref))
            issues.push({
              severity: "error",
              code: "EXECUTION_OVERLAY_CLAIM",
              message: `${plan.id}/${overlay.id}: unknown claim ${ref}`,
              file: entry.file,
            });
        for (const ref of overlay.requirementIds)
          if (!requirements.has(ref))
            issues.push({
              severity: "error",
              code: "EXECUTION_OVERLAY_REQUIREMENT",
              message: `${plan.id}/${overlay.id}: unknown requirement ${ref}`,
              file: entry.file,
            });
      }
    }
    checkLimits(plan, entry.file, modelIds, issues);
  }

  for (const entry of pricing) {
    if (!modelIds.has(entry.value.modelId)) {
      issues.push({
        severity: "error",
        code: "MODEL_REF_MISSING",
        message: `pricing "${entry.value.id}" references unknown model "${entry.value.modelId}"`,
        file: entry.file,
      });
    }
    checkPricingSemantics(entry.value, entry.file, issues);
    const tier = entry.value.serviceTier ?? "standard";
    if (tier !== "standard" && listedTiers.get(entry.value.modelId)?.has(tier) !== true)
      issues.push({
        severity: "error",
        code: "SERVICE_TIER_UNDECLARED",
        message: `pricing "${entry.value.id}" prices the ${tier} tier, which model "${entry.value.modelId}" does not list`,
        file: entry.file,
      });
    pricingRanges.push({
      file: entry.file,
      label: `pricing:${entry.value.modelId}:${entry.value.basis}:${entry.value.endpointId ?? "legacy"}:${entry.value.variantId ?? "base"}:${tier}`,
      range: {
        from: entry.value.effectiveFrom,
        ...(entry.value.effectiveTo !== undefined ? { to: entry.value.effectiveTo } : {}),
      },
    });
  }

  checkVersionRanges(planVersionRanges, issues);
  checkVersionRanges(pricingRanges, issues);

  return issues;
}

/** Validate the serialized boundary too, including redundant indexes. */
export function validateLoadedCatalog(catalog: CatalogV1): CatalogValidationIssue[] {
  const raw: RawCatalogData = { providers: [], models: [], plans: [], pricing: [] };
  const issues: CatalogValidationIssue[] = [];
  for (const role of ["providers", "models", "plans", "pricing"] as const) {
    for (const [key, value] of Object.entries(catalog[role])) {
      raw[role].push({ file: `${role}/${key}`, data: value });
      if (key !== value.id)
        issues.push({
          severity: "error",
          code: "INDEX_MISMATCH",
          message: `${role}: key differs from id`,
        });
    }
  }
  issues.push(...validateCatalogData(raw));
  const expected: CatalogV1["planVersions"] = {};
  for (const plan of Object.values(catalog.plans)) {
    for (const version of plan.versions) {
      const versionId = planVersionId(plan.id, version.effectiveFrom, version.cohort);
      expected[versionId] = {
        ...version,
        versionId,
        planId: plan.id,
        planName: plan.name,
        providerId: plan.providerId,
      };
    }
  }
  if (stableStringify(expected) !== stableStringify(catalog.planVersions))
    issues.push({
      severity: "error",
      code: "INDEX_MISMATCH",
      message: "planVersions does not match plans",
    });
  return issues;
}

/** The same rate validation for compiled routes, without catalog source records. */
export function validateExecutionRates(
  pricing: Pick<PricingV1, "id" | "rates" | "tiers">,
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  checkPricingSemantics(pricing, pricing.id, issues);
  return issues;
}
