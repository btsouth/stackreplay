import { createHash } from "node:crypto";
import { decimalAmountV1Schema, isoDateV1Schema } from "@stackreplay/schema";
import { z } from "zod";
import { stableStringify } from "../canonical.js";
import { catalogIdV1Schema, pricingBasisV1Schema, rollingWindowV1Schema } from "../schema.js";

/** Research artifacts. This module is deliberately absent from catalog loaders and the root export. */
export const claimKindV1Schema = z.enum([
  "subscription_price",
  "pricing_rate",
  "overage_price",
  "numeric_limit",
  "qualitative_limit",
  "model_availability",
  "model_alias",
  "effective_date",
  "unclassified_change",
]);
export type ClaimKindV1 = z.infer<typeof claimKindV1Schema>;
export const evidenceClassV1Schema = z.enum(["published", "observed", "unsupported"]);
export type EvidenceClassV1 = z.infer<typeof evidenceClassV1Schema>;
export const sourceKindV1Schema = z.enum([
  "provider_pricing",
  "provider_docs",
  "provider_changelog",
  "provider_page",
  "archive",
  "third_party",
  "community",
  "measurement",
]);
export const sourceAuthorityV1Schema = z.enum([
  "provider_owned",
  "archival",
  "third_party",
  "community",
  "measured",
]);
const rawUrlWhitespaceOrControl = /[\s\p{Cc}\p{Cf}]/u;
export const httpsEvidenceUrlV1Schema = z.string().refine((value) => {
  if (rawUrlWhitespaceOrControl.test(value) || value.includes("\\") || !/^https:\/\//iu.test(value))
    return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.length > 0 &&
      parsed.username.length === 0 &&
      parsed.password.length === 0
    );
  } catch {
    return false;
  }
}, "must be an HTTPS URL without credentials or raw whitespace/control characters");
const timestamp = z.iso.datetime({ offset: true });
const shortText = z.string().trim().min(1).max(500);
const snapshotRefV1Schema = z.strictObject({
  id: z.string().min(1).max(160),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export type SnapshotRefV1 = z.infer<typeof snapshotRefV1Schema>;

export const sourceRegistryEntryV1Schema = z
  .strictObject({
    id: catalogIdV1Schema,
    url: httpsEvidenceUrlV1Schema,
    providerId: catalogIdV1Schema.optional(),
    kind: sourceKindV1Schema,
    authority: sourceAuthorityV1Schema,
    claimKinds: z.array(claimKindV1Schema).min(1),
    evidenceClasses: z.array(evidenceClassV1Schema).min(1),
    retrievalMode: z.enum(["http", "browser", "manual", "observation"]).optional(),
    status: z.enum(["active", "paused", "retired"]),
    label: shortText.optional(),
    notes: shortText.optional(),
  })
  .superRefine((source, ctx) => {
    const expected = source.kind.startsWith("provider_")
      ? "provider_owned"
      : source.kind === "archive"
        ? "archival"
        : source.kind === "third_party"
          ? "third_party"
          : source.kind === "community"
            ? "community"
            : "measured";
    if (source.authority !== expected)
      ctx.addIssue({
        code: "custom",
        message: "source kind and authority disagree",
        path: ["authority"],
      });
    if (source.authority === "provider_owned" && source.providerId === undefined)
      ctx.addIssue({
        code: "custom",
        message: "provider-owned source needs providerId",
        path: ["providerId"],
      });
    if (source.authority !== "provider_owned" && source.evidenceClasses.includes("published"))
      ctx.addIssue({
        code: "custom",
        message: "only provider-owned sources can offer published evidence",
        path: ["evidenceClasses"],
      });
    if (source.authority === "measured" && source.retrievalMode !== "observation")
      ctx.addIssue({
        code: "custom",
        message: "measured sources use observation retrieval",
        path: ["retrievalMode"],
      });
    if (new Set(source.claimKinds).size !== source.claimKinds.length)
      ctx.addIssue({
        code: "custom",
        message: "duplicate claim eligibility",
        path: ["claimKinds"],
      });
  });
export type SourceRegistryEntryV1 = z.infer<typeof sourceRegistryEntryV1Schema>;
export const sourceRegistryV1Schema = z
  .strictObject({
    version: z.literal(1),
    sources: z.array(sourceRegistryEntryV1Schema),
  })
  .superRefine((registry, ctx) => {
    const seen = new Set<string>();
    registry.sources.forEach((source, index) => {
      if (seen.has(source.id))
        ctx.addIssue({
          code: "custom",
          message: "duplicate source ID",
          path: ["sources", index, "id"],
        });
      seen.add(source.id);
    });
  });
export type SourceRegistryV1 = z.infer<typeof sourceRegistryV1Schema>;

/** Health is an optional future retrieval result, never a catalog fact. */
export const sourceHealthV1Schema = z.strictObject({
  version: z.literal(1),
  sourceId: catalogIdV1Schema,
  lastAttemptAt: timestamp.optional(),
  lastSuccessAt: timestamp.optional(),
  httpStatus: z.number().int().min(100).max(599).optional(),
  redirectedTo: httpsEvidenceUrlV1Schema.optional(),
  contentType: shortText.optional(),
  fingerprint: snapshotRefV1Schema.optional(),
  state: z.enum(["unknown", "healthy", "failed", "stale"]),
  failure: shortText.optional(),
});
export type SourceHealthV1 = z.infer<typeof sourceHealthV1Schema>;

const pricePartial = z.strictObject({
  amount: decimalAmountV1Schema.optional(),
  currency: z.literal("USD").optional(),
  interval: z.enum(["month", "year"]).optional(),
  conditions: shortText.optional(),
});
const ratePartial = z.strictObject({
  amount: decimalAmountV1Schema.optional(),
  currency: z.literal("USD").optional(),
  unit: z.literal("per_1m_tokens").optional(),
  category: z.enum(["input", "output", "cacheRead", "cacheWrite", "reasoning"]).optional(),
  conditions: shortText.optional(),
});
/** Candidate windows never inherit the accepted catalog's UTC default. */
export const candidateLimitWindowV1Schema = z.discriminatedUnion("type", [
  rollingWindowV1Schema,
  z.strictObject({
    type: z.literal("calendar"),
    unit: z.enum(["day", "week", "month"]),
    timezone: z.string().min(1).optional(),
  }),
]);

const limitPartial = z.strictObject({
  amount: decimalAmountV1Schema.optional(),
  type: z.enum(["credit_pool", "token_limit", "request_limit"]).optional(),
  window: candidateLimitWindowV1Schema.optional(),
  exceed: z
    .enum(["reject_request", "latch_until_reset", "allow_overage", "record_only"])
    .optional(),
  modelIds: z.array(catalogIdV1Schema).optional(),
});
const planSubject = z.strictObject({
  planId: catalogIdV1Schema,
  planVersionId: z.string().min(1).optional(),
});
const claimV1Schema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("subscription_price"),
    subject: planSubject,
    proposed: pricePartial.optional(),
  }),
  z.strictObject({
    kind: z.literal("pricing_rate"),
    subject: z.strictObject({
      modelId: catalogIdV1Schema,
      pricingId: catalogIdV1Schema.optional(),
      basis: pricingBasisV1Schema.optional(),
    }),
    proposed: ratePartial.optional(),
  }),
  z.strictObject({
    kind: z.literal("overage_price"),
    subject: z.strictObject({
      planId: catalogIdV1Schema,
      planVersionId: z.string().min(1).optional(),
      limitId: catalogIdV1Schema.optional(),
    }),
    proposed: z
      .strictObject({
        amount: decimalAmountV1Schema.optional(),
        unit: z.enum(["per_1m_tokens", "per_request"]).optional(),
      })
      .optional(),
  }),
  z.strictObject({
    kind: z.literal("numeric_limit"),
    subject: z.strictObject({
      planId: catalogIdV1Schema,
      planVersionId: z.string().min(1).optional(),
      limitId: catalogIdV1Schema.optional(),
    }),
    proposed: limitPartial.optional(),
  }),
  z.strictObject({
    kind: z.literal("qualitative_limit"),
    subject: z.strictObject({
      planId: catalogIdV1Schema,
      planVersionId: z.string().min(1).optional(),
      limitId: catalogIdV1Schema.optional(),
    }),
    proposed: z.strictObject({ statement: shortText.optional() }).optional(),
  }),
  z.strictObject({
    kind: z.literal("model_availability"),
    subject: z.strictObject({
      modelId: catalogIdV1Schema.optional(),
      rawModelName: shortText.optional(),
      providerId: catalogIdV1Schema.optional(),
      planId: catalogIdV1Schema.optional(),
      planVersionId: z.string().min(1).optional(),
    }),
    proposed: z.strictObject({ available: z.boolean().optional() }).optional(),
  }),
  z.strictObject({
    kind: z.literal("model_alias"),
    subject: z.strictObject({
      modelId: catalogIdV1Schema.optional(),
      rawModelName: shortText,
      aliasId: catalogIdV1Schema.optional(),
    }),
    proposed: z
      .strictObject({
        alias: shortText.optional(),
        aliasKind: z.enum(["provider_id", "harness_alias", "provider_route"]).optional(),
        harness: catalogIdV1Schema.optional(),
      })
      .optional(),
  }),
  z.strictObject({
    kind: z.literal("effective_date"),
    subject: z.strictObject({
      recordKind: z.enum(["plan_version", "pricing"]),
      recordId: z.string().min(1).optional(),
    }),
    proposed: z.strictObject({ date: isoDateV1Schema.optional() }).optional(),
  }),
  z.strictObject({
    kind: z.literal("unclassified_change"),
    subject: z.strictObject({ providerId: catalogIdV1Schema.optional(), description: shortText }),
    proposed: z.strictObject({ summary: shortText.optional() }).optional(),
  }),
]);
export type CandidateClaimV1 = z.infer<typeof claimV1Schema>;

export const candidateChangeV1Schema = z.strictObject({
  version: z.literal(1),
  id: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  sourceId: catalogIdV1Schema,
  sourceUrl: httpsEvidenceUrlV1Schema,
  observedAt: timestamp,
  sourcePublishedOn: isoDateV1Schema.optional(),
  snapshots: z
    .strictObject({
      previous: snapshotRefV1Schema.optional(),
      current: snapshotRefV1Schema.optional(),
    })
    .optional(),
  claim: claimV1Schema,
  previousAccepted: z
    .strictObject({ catalogVersion: z.string().min(1), recordId: z.string().min(1) })
    .optional(),
  proposedEffectiveDate: isoDateV1Schema.optional(),
  effectiveDateEvidence: shortText.optional(),
  evidenceClass: evidenceClassV1Schema,
  evidence: z.strictObject({
    excerpt: z.string().trim().min(1).max(300).optional(),
    reference: httpsEvidenceUrlV1Schema.optional(),
  }),
  extractionMethod: z.enum([
    "manual",
    "deterministic_parser",
    "source_diff",
    "llm_assisted",
    "measurement",
  ]),
  review: z.discriminatedUnion("status", [
    z.strictObject({ status: z.enum(["pending", "needs_review"]) }),
    z.strictObject({
      status: z.enum(["accepted", "rejected", "superseded"]),
      reviewer: shortText,
      decidedAt: timestamp,
      reason: shortText.optional(),
      acceptedCatalogVersion: z.string().min(1).optional(),
    }),
  ]),
});
export type CandidateChangeV1 = z.infer<typeof candidateChangeV1Schema>;

/**
 * Artifact identity includes source, claim, evidence and date semantics. Review
 * decisions and repeated retrieval time are deliberately mutable context.
 */
export function candidateIdentity(
  input: Pick<
    CandidateChangeV1,
    | "version"
    | "sourceId"
    | "sourceUrl"
    | "sourcePublishedOn"
    | "snapshots"
    | "claim"
    | "previousAccepted"
    | "proposedEffectiveDate"
    | "effectiveDateEvidence"
    | "evidenceClass"
    | "evidence"
    | "extractionMethod"
  >,
): string {
  const parsedClaim = claimV1Schema.parse(input.claim);
  const proposed = parsedClaim.proposed;
  const claim =
    proposed !== undefined && "amount" in proposed && proposed.amount !== undefined
      ? { ...parsedClaim, proposed: { ...proposed, amount: canonicalDecimal(proposed.amount) } }
      : parsedClaim;
  return `sha256:${createHash("sha256")
    .update(
      stableStringify({
        version: input.version,
        sourceId: input.sourceId,
        sourceUrl: input.sourceUrl,
        sourcePublishedOn: input.sourcePublishedOn,
        snapshots: input.snapshots ?? {},
        claim,
        previousAccepted: input.previousAccepted,
        proposedEffectiveDate: input.proposedEffectiveDate,
        effectiveDateEvidence: input.effectiveDateEvidence?.trim(),
        evidenceClass: input.evidenceClass,
        evidence: {
          excerpt: input.evidence.excerpt?.trim(),
          reference: input.evidence.reference,
        },
        extractionMethod: input.extractionMethod,
      }),
    )
    .digest("hex")}`;
}

function canonicalDecimal(amount: string): string {
  const [whole, fraction] = amount.split(".");
  const trimmed = fraction?.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : (whole ?? amount);
}
export function serializeCandidate(candidate: CandidateChangeV1): string {
  return `${stableStringify(candidate)}\n`;
}
