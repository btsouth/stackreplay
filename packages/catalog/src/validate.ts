import { Temporal } from "@js-temporal/polyfill";
import type { z } from "zod";
import {
  modelRuleV1Schema,
  modelV1Schema,
  type PlanLimitV1,
  type PlanV1,
  planV1Schema,
  pricingV1Schema,
  providerV1Schema,
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

function isValidTimeZone(timeZone: string): boolean {
  try {
    Temporal.Instant.from("2026-01-01T00:00:00Z").toZonedDateTimeISO(timeZone);
    return true;
  } catch {
    return false;
  }
}

function isValidDuration(duration: string): boolean {
  try {
    Temporal.Duration.from(duration);
    return true;
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

function checkLimits(
  plan: PlanV1,
  file: string,
  knownModelIds: Set<string>,
  issues: CatalogValidationIssue[],
): void {
  for (const version of plan.versions) {
    const where = `${plan.id}@${version.effectiveFrom}`;
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
      const excluded = rule.excluded === true;
      if (!excluded && rule.pricingRef === undefined) {
        issues.push({
          severity: "error",
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
      if (Number(promotion.multiplier) > MAX_MULTIPLIER) {
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
    for (const version of plan.versions) {
      planVersionRanges.push({
        file: entry.file,
        label: plan.id,
        range: {
          from: version.effectiveFrom,
          ...(version.effectiveTo !== undefined ? { to: version.effectiveTo } : {}),
        },
      });
      for (const rule of version.modelRules) {
        if (rule.pricingRef !== undefined && !pricingIds.has(rule.pricingRef)) {
          issues.push({
            severity: "error",
            code: "PRICING_REF_UNKNOWN",
            message: `${plan.id}@${version.effectiveFrom}: pricingRef "${rule.pricingRef}" does not exist`,
            file: entry.file,
          });
        }
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
    pricingRanges.push({
      file: entry.file,
      label: `pricing:${entry.value.modelId}`,
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
