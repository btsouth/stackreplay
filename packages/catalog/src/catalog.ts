import { verificationStatusV1Schema } from "@stackreplay/schema";
import { z } from "zod";
import {
  modelV1Schema,
  planV1Schema,
  planVersionEntryV1Schema,
  pricingV1Schema,
  providerV1Schema,
} from "./schema.js";

/**
 * The loaded catalog object consumed by the replay engine and the web app.
 * This module is browser-safe: loading from disk lives in `./load.js`.
 */

export const loadedPlanVersionV1Schema = planVersionEntryV1Schema.extend({
  versionId: z.string().min(1),
  planId: z.string().min(1),
  planName: z.string().min(1),
  providerId: z.string().min(1),
});
export type LoadedPlanVersionV1 = z.infer<typeof loadedPlanVersionV1Schema>;

export const catalogV1Schema = z.strictObject({
  /** Content hash of the canonical catalog JSON, e.g. "sha256:<hex>". */
  catalogVersion: z.string().min(1),
  providers: z.record(z.string(), providerV1Schema),
  models: z.record(z.string(), modelV1Schema),
  plans: z.record(z.string(), planV1Schema),
  planVersions: z.record(z.string(), loadedPlanVersionV1Schema),
  pricing: z.record(z.string(), pricingV1Schema),
});
export type CatalogV1 = z.infer<typeof catalogV1Schema>;

export const verificationStatusSchema = verificationStatusV1Schema;

/** Version id convention: `planId@effectiveFrom` (spec point 19). */
export function planVersionId(planId: string, effectiveFrom: string): string {
  return `${planId}@${effectiveFrom}`;
}

export function getPlanVersion(
  catalog: CatalogV1,
  versionId: string,
): LoadedPlanVersionV1 | undefined {
  return catalog.planVersions[versionId];
}

export function getPricing(
  catalog: CatalogV1,
  pricingRef: string,
): CatalogV1["pricing"][string] | undefined {
  return catalog.pricing[pricingRef];
}
