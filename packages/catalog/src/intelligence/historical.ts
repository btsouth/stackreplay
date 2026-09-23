import { z } from "zod";
import { catalogIdV1Schema } from "../schema.js";
import { evidenceClassV1Schema } from "./contract.js";

/** Review bookkeeping only. This module is never imported by accepted catalog loaders. */
const limitwatchReferenceV1Schema = z.strictObject({
  path: z.string().regex(/^data\/(snapshots\/\d{4}-\d{2}-\d{2}\.json|reset-windows\.json)$/),
  entryIndex: z.number().int().nonnegative(),
  limitIndex: z.number().int().nonnegative().optional(),
  snapshotDate: z.iso.date().optional(),
  asOf: z.iso.date().optional(),
  verifiedOn: z.iso.date().optional(),
  effectiveOn: z.iso.date().optional(),
  originalSourceUrl: z.url(),
});

const findingV1Schema = z.strictObject({
  severity: z.enum(["error", "warning", "info"]),
  code: z.string().min(1),
});

export const historicalManifestV1Schema = z.strictObject({
  version: z.literal(1),
  cohort: z.literal("M4H-C1"),
  limitwatch: z.strictObject({
    repository: z.literal("https://github.com/btsouth/limitwatch"),
    commit: z.literal("e135b9492b0a09cda9ca49496206f09d90cb8fde"),
  }),
  acceptedCatalogVersion: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  entries: z.array(
    z.strictObject({
      slug: catalogIdV1Schema,
      candidateFile: z.string().regex(/^candidates\/[a-z0-9-]+\.json$/),
      candidateId: z.string().regex(/^sha256:[a-f0-9]{64}$/),
      sourceId: catalogIdV1Schema,
      evidenceClass: evidenceClassV1Schema,
      limitwatch: limitwatchReferenceV1Schema,
      findings: z.array(findingV1Schema),
      // Human review metadata. Neither field is a deterministic validator result or catalog acceptance.
      collision: z.enum([
        "NEW_HISTORICAL_INFORMATION",
        "DUPLICATES_CURRENT_TRUTH",
        "CONFLICTS_WITH_CURRENT_TRUTH",
        "SUPERSEDED_MECHANIC",
        "UNMAPPABLE",
      ]),
      recommendation: z.enum([
        "READY_FOR_CATALOG_REVIEW",
        "NEEDS_MORE_EVIDENCE",
        "REFERENCE_ONLY",
        "REJECT",
      ]),
      promotionTarget: z
        .string()
        .regex(/^packages\/catalog\/data\/plans\/[a-z0-9-]+\.yaml$/)
        .optional(),
    }),
  ),
});
export type HistoricalManifestV1 = z.infer<typeof historicalManifestV1Schema>;
