import type { CatalogV1 } from "../catalog.js";
import {
  type CandidateChangeV1,
  type ClaimKindV1,
  candidateChangeV1Schema,
  candidateIdentity,
  type SourceRegistryV1,
  sourceRegistryV1Schema,
} from "./contract.js";

export interface CandidateFindingV1 {
  severity: "error" | "warning" | "info";
  code: string;
  path: string;
  message: string;
}

/** Every normalized claim that would become a provider-published catalog fact. */
const publishedCatalogClaimKinds: ReadonlySet<ClaimKindV1> = new Set([
  "subscription_price",
  "pricing_rate",
  "overage_price",
  "numeric_limit",
  "qualitative_limit",
  "model_availability",
  "model_alias",
  "effective_date",
]);

/** A pure review report. Findings never modify the candidate or accepted catalog. */
export function validateCandidate(
  input: unknown,
  registryInput: unknown,
  catalog?: Readonly<CatalogV1>,
  existingIds: ReadonlySet<string> = new Set(),
): CandidateFindingV1[] {
  const findings: CandidateFindingV1[] = [];
  const candidateResult = candidateChangeV1Schema.safeParse(input);
  const registryResult = sourceRegistryV1Schema.safeParse(registryInput);
  if (!candidateResult.success) {
    for (const issue of candidateResult.error.issues)
      findings.push({
        severity: "error",
        code: "malformed_candidate",
        path: issue.path.join("."),
        message: issue.message,
      });
  }
  if (!registryResult.success) {
    for (const issue of registryResult.error.issues)
      findings.push({
        severity: "error",
        code: "malformed_registry",
        path: issue.path.join("."),
        message: issue.message,
      });
  }
  if (!candidateResult.success || !registryResult.success) return findings;
  const candidate = candidateResult.data;
  const registry = registryResult.data;
  const add = (
    severity: CandidateFindingV1["severity"],
    code: string,
    path: string,
    message: string,
  ) => findings.push({ severity, code, path, message });
  const source = registry.sources.find((entry) => entry.id === candidate.sourceId);
  if (source === undefined)
    add("error", "unknown_source", "sourceId", "Source ID is not registered");
  else {
    if (source.url !== candidate.sourceUrl)
      add("error", "source_url_mismatch", "sourceUrl", "Source URL differs from the registry");
    if (source.status !== "active")
      add("warning", "source_inactive", "sourceId", "Source is not active");
    if (!source.claimKinds.includes(candidate.claim.kind))
      add("error", "claim_not_allowed", "claim.kind", "Source does not allow this claim kind");
    if (!source.evidenceClasses.includes(candidate.evidenceClass))
      add(
        "error",
        "evidence_not_allowed",
        "evidenceClass",
        "Source does not allow this evidence class",
      );
    if (candidate.evidenceClass === "published" && source.authority !== "provider_owned")
      add(
        "error",
        "insufficient_authority",
        "evidenceClass",
        "Published evidence requires a provider-owned source",
      );
    const providerId = claimProviderId(candidate, catalog);
    if (
      source.providerId !== undefined &&
      providerId !== undefined &&
      source.providerId !== providerId
    )
      add("error", "provider_mismatch", "claim.subject", "Source belongs to a different provider");
  }
  if (candidate.id !== candidateIdentity(candidate))
    add(
      "error",
      "identity_mismatch",
      "id",
      "Candidate ID does not match exact normalized identity",
    );
  if (existingIds.has(candidate.id))
    add("warning", "duplicate_candidate", "id", "Exact candidate already exists");
  if (candidate.proposedEffectiveDate === undefined)
    add(
      "warning",
      "effective_date_unestablished",
      "proposedEffectiveDate",
      "Observation time does not establish an effective date",
    );
  else if (
    candidate.effectiveDateEvidence === undefined ||
    candidate.evidenceClass !== "published" ||
    source?.authority !== "provider_owned" ||
    !source.evidenceClasses.includes("published")
  )
    add(
      "error",
      "effective_date_unsupported",
      "proposedEffectiveDate",
      "Effective date needs explicit provider-published evidence",
    );
  if (
    candidate.claim.kind === "effective_date" &&
    candidate.claim.proposed?.date !== undefined &&
    candidate.proposedEffectiveDate !== undefined &&
    candidate.claim.proposed.date !== candidate.proposedEffectiveDate
  )
    add(
      "error",
      "conflicting_effective_date",
      "claim.proposed.date",
      "Claim date conflicts with proposed effective date",
    );
  if (
    candidate.evidenceClass === "observed" &&
    publishedCatalogClaimKinds.has(candidate.claim.kind)
  )
    add(
      "error",
      "observed_not_published",
      "evidenceClass",
      "Observed behavior cannot establish a provider-published catalog rule",
    );
  if (candidate.evidenceClass === "unsupported") {
    add("info", "unsupported_evidence", "evidenceClass", "Evidence does not establish this claim");
    if (publishedCatalogClaimKinds.has(candidate.claim.kind))
      add(
        "error",
        "unsupported_not_published",
        "evidenceClass",
        "Unsupported evidence cannot establish a provider-published catalog rule",
      );
  }
  if (candidate.evidence.excerpt === undefined && candidate.evidence.reference === undefined)
    add(
      "warning",
      "evidence_reference_missing",
      "evidence",
      "Short excerpt or reference is needed for review",
    );
  if (candidate.claim.kind === "pricing_rate") {
    if (candidate.claim.proposed?.amount === undefined)
      add(
        "warning",
        "pricing_amount_missing",
        "claim.proposed.amount",
        "Pricing amount is unresolved",
      );
    if (candidate.claim.proposed?.currency === undefined)
      add(
        "warning",
        "pricing_currency_missing",
        "claim.proposed.currency",
        "Pricing currency is unresolved",
      );
    if (candidate.claim.subject.basis === undefined)
      add(
        "warning",
        "pricing_basis_missing",
        "claim.subject.basis",
        "API list price and target billing rate are distinct",
      );
    if (candidate.claim.proposed?.unit === undefined)
      add("warning", "pricing_unit_missing", "claim.proposed.unit", "Pricing unit is unresolved");
    if (candidate.claim.proposed?.category === undefined)
      add(
        "warning",
        "pricing_category_missing",
        "claim.proposed.category",
        "Token category is unresolved",
      );
  }
  if (candidate.claim.kind === "subscription_price") {
    if (candidate.claim.proposed?.amount === undefined)
      add(
        "warning",
        "pricing_amount_missing",
        "claim.proposed.amount",
        "Subscription price is unresolved",
      );
    if (candidate.claim.proposed?.currency === undefined)
      add(
        "warning",
        "pricing_currency_missing",
        "claim.proposed.currency",
        "Subscription currency is unresolved",
      );
    if (candidate.claim.proposed?.interval === undefined)
      add(
        "warning",
        "pricing_basis_missing",
        "claim.proposed.interval",
        "Subscription billing interval is unresolved",
      );
  }
  if (candidate.claim.kind === "overage_price") {
    if (candidate.claim.proposed?.amount === undefined)
      add(
        "warning",
        "pricing_amount_missing",
        "claim.proposed.amount",
        "Overage amount is unresolved",
      );
    if (candidate.claim.proposed?.unit === undefined)
      add("warning", "pricing_basis_missing", "claim.proposed.unit", "Overage unit is unresolved");
  }
  if (candidate.claim.kind === "numeric_limit") {
    if (candidate.claim.proposed?.amount === undefined)
      add(
        "warning",
        "numeric_amount_missing",
        "claim.proposed.amount",
        "Limit amount is unresolved",
      );
    if (candidate.claim.proposed?.type === undefined)
      add("warning", "numeric_unit_missing", "claim.proposed.type", "Limit unit is unresolved");
    if (candidate.claim.proposed?.window === undefined)
      add(
        "warning",
        "reset_window_missing",
        "claim.proposed.window",
        "Reset window or anchor is unresolved",
      );
    if (candidate.claim.proposed?.exceed === undefined)
      add(
        "warning",
        "exceed_behavior_missing",
        "claim.proposed.exceed",
        "Exceed behavior is unresolved",
      );
  }
  if (
    candidate.claim.kind === "qualitative_limit" &&
    candidate.claim.proposed?.statement === undefined
  )
    add(
      "warning",
      "qualitative_statement_missing",
      "claim.proposed.statement",
      "Provider wording is unresolved",
    );
  if (candidate.claim.kind === "model_availability") {
    if (candidate.claim.proposed?.available === undefined)
      add(
        "warning",
        "availability_value_missing",
        "claim.proposed.available",
        "Availability outcome is unresolved",
      );
    if (candidate.claim.subject.modelId === undefined)
      add(
        "warning",
        "model_identity_unresolved",
        "claim.subject.modelId",
        "Raw model name is not a canonical model ID",
      );
    if (
      candidate.claim.subject.planId === undefined &&
      candidate.claim.subject.providerId === undefined
    )
      add(
        "warning",
        "model_scope_ambiguous",
        "claim.subject",
        "Plan or provider scope is unresolved",
      );
  }
  if (candidate.claim.kind === "model_alias") {
    if (candidate.claim.subject.modelId === undefined)
      add(
        "warning",
        "model_identity_unresolved",
        "claim.subject.modelId",
        "Alias source string is not a canonical model ID",
      );
    if (candidate.claim.proposed?.alias === undefined)
      add("warning", "alias_value_missing", "claim.proposed.alias", "Exact alias is unresolved");
    if (candidate.claim.proposed?.aliasKind === undefined)
      add("warning", "alias_kind_missing", "claim.proposed.aliasKind", "Alias kind is unresolved");
  }
  if (candidate.claim.kind === "effective_date") {
    if (candidate.claim.proposed?.date === undefined)
      add(
        "warning",
        "effective_date_value_missing",
        "claim.proposed.date",
        "Claim date is unresolved",
      );
    if (candidate.effectiveDateEvidence === undefined)
      add(
        "warning",
        "effective_date_evidence_missing",
        "effectiveDateEvidence",
        "Effective-date evidence is unresolved",
      );
  }
  if (candidate.claim.kind === "unclassified_change") {
    add("info", "claim_unclassified", "claim.kind", "Source change has no normalized claim yet");
    if (candidate.claim.proposed?.summary === undefined)
      add(
        "warning",
        "value_unresolved",
        "claim.proposed.summary",
        "Normalized proposed value is unresolved",
      );
  }
  if (candidate.claim.proposed === undefined)
    add("warning", "value_unresolved", "claim.proposed", "Normalized proposed value is unresolved");
  checkCatalogReferences(
    candidate,
    catalog,
    source?.authority === "provider_owned" ? source.providerId : undefined,
    add,
  );
  return findings;
}

function claimProviderId(
  candidate: CandidateChangeV1,
  catalog?: Readonly<CatalogV1>,
): string | undefined {
  const subject = candidate.claim.subject;
  if ("providerId" in subject && subject.providerId !== undefined) return subject.providerId;
  if ("planId" in subject && subject.planId !== undefined)
    return catalog?.plans[subject.planId]?.providerId;
  if ("planVersionId" in subject && subject.planVersionId !== undefined)
    return catalog?.planVersions[subject.planVersionId]?.providerId;
  if (candidate.claim.kind === "effective_date" && candidate.claim.subject.recordId !== undefined) {
    if (candidate.claim.subject.recordKind === "plan_version")
      return catalog?.planVersions[candidate.claim.subject.recordId]?.providerId;
  }
  return undefined;
}

function checkCatalogReferences(
  candidate: CandidateChangeV1,
  catalog: Readonly<CatalogV1> | undefined,
  sourceProviderId: string | undefined,
  add: (
    severity: CandidateFindingV1["severity"],
    code: string,
    path: string,
    message: string,
  ) => void,
): void {
  if (catalog === undefined) return;
  const subject = candidate.claim.subject;
  const planId = "planId" in subject ? subject.planId : undefined;
  const planVersionId = "planVersionId" in subject ? subject.planVersionId : undefined;
  const modelId = "modelId" in subject ? subject.modelId : undefined;
  const providerId = "providerId" in subject ? subject.providerId : undefined;
  const pricingId = "pricingId" in subject ? subject.pricingId : undefined;
  const plan = planId === undefined ? undefined : catalog.plans[planId];
  const planVersion = planVersionId === undefined ? undefined : catalog.planVersions[planVersionId];
  const model = modelId === undefined ? undefined : catalog.models[modelId];
  const pricing = pricingId === undefined ? undefined : catalog.pricing[pricingId];
  if (sourceProviderId !== undefined && catalog.providers[sourceProviderId] === undefined)
    add(
      "warning",
      "unknown_source_provider",
      "sourceId",
      "Source provider is not in the accepted catalog",
    );
  if (planId !== undefined && plan === undefined)
    add("warning", "unknown_plan", "claim.subject.planId", "Plan is not in the accepted catalog");
  if (planVersionId !== undefined && planVersion === undefined)
    add(
      "warning",
      "unknown_plan_version",
      "claim.subject.planVersionId",
      "Plan version is not in the accepted catalog",
    );
  if (modelId !== undefined && model === undefined)
    add(
      "warning",
      "unknown_model",
      "claim.subject.modelId",
      "Model is not in the accepted catalog",
    );
  if (providerId !== undefined && catalog.providers[providerId] === undefined)
    add(
      "warning",
      "unknown_provider",
      "claim.subject.providerId",
      "Provider is not in the accepted catalog",
    );
  if (pricingId !== undefined && pricing === undefined)
    add(
      "warning",
      "unknown_pricing",
      "claim.subject.pricingId",
      "Pricing record is not in the accepted catalog",
    );
  if (plan !== undefined && planVersion !== undefined && planVersion.planId !== plan.id)
    add(
      "error",
      "plan_version_mismatch",
      "claim.subject.planVersionId",
      "Plan version belongs to another plan",
    );
  if (plan !== undefined && providerId !== undefined && plan.providerId !== providerId)
    add(
      "error",
      "provider_plan_mismatch",
      "claim.subject.providerId",
      "Plan belongs to another provider",
    );
  if (
    planVersion !== undefined &&
    providerId !== undefined &&
    planVersion.providerId !== providerId
  )
    add(
      "error",
      "provider_plan_version_mismatch",
      "claim.subject.providerId",
      "Plan version belongs to another provider",
    );
  if (pricing !== undefined && modelId !== undefined && pricing.modelId !== modelId)
    add(
      "error",
      "pricing_model_mismatch",
      "claim.subject.pricingId",
      "Pricing record belongs to another model",
    );
  if (
    model !== undefined &&
    providerId !== undefined &&
    model.providerIds !== undefined &&
    !model.providerIds.includes(providerId)
  )
    add(
      "warning",
      "model_offering_differs_from_accepted",
      "claim.subject.providerId",
      "Accepted catalog does not record this provider offering the model",
    );
  if (model !== undefined && sourceProviderId !== undefined) {
    if (model.providerIds === undefined)
      add(
        "warning",
        "model_provider_unestablished",
        "claim.subject.modelId",
        "Accepted catalog does not establish this model's offering providers",
      );
    else if (!model.providerIds.includes(sourceProviderId))
      add(
        "warning",
        "source_model_provider_mismatch",
        "sourceId",
        "Source provider is not among the model's accepted offering providers",
      );
  }
  if (
    candidate.claim.kind === "model_alias" &&
    modelId !== undefined &&
    candidate.claim.subject.aliasId !== undefined
  ) {
    const aliasId = candidate.claim.subject.aliasId;
    const owningModel = Object.values(catalog.models).find((entry) =>
      entry.aliases?.some((alias) => alias.id === aliasId),
    );
    if (owningModel !== undefined && owningModel.id !== modelId)
      add(
        "error",
        "alias_model_mismatch",
        "claim.subject.aliasId",
        "Alias belongs to another model",
      );
    else if (owningModel === undefined)
      add(
        "warning",
        "unknown_alias",
        "claim.subject.aliasId",
        "Alias is not in the accepted catalog",
      );
  }
  if (
    (candidate.claim.kind === "numeric_limit" ||
      candidate.claim.kind === "qualitative_limit" ||
      candidate.claim.kind === "overage_price") &&
    "limitId" in subject &&
    subject.limitId !== undefined &&
    planId !== undefined
  ) {
    const limitId = subject.limitId;
    const qualitative = candidate.claim.kind === "qualitative_limit";
    const relevantVersions = Object.values(catalog.planVersions).filter(
      (entry) => entry.planId === planId,
    );
    const contains = (version: CatalogV1["planVersions"][string]) =>
      qualitative
        ? (version.qualitativeLimits?.some((entry) => entry.id === limitId) ?? false)
        : version.limits.some((entry) => entry.id === limitId);
    const inPlan = relevantVersions.some(contains);
    const inVersion = planVersion === undefined ? false : contains(planVersion);
    if (planVersion !== undefined && !inVersion && inPlan)
      add(
        "error",
        "constraint_version_mismatch",
        "claim.subject.limitId",
        "Constraint belongs to another version of this plan",
      );
    else if (!inPlan) {
      const elsewhere = Object.values(catalog.planVersions).some(contains);
      add(
        elsewhere ? "error" : "warning",
        elsewhere ? "constraint_plan_mismatch" : "unknown_constraint",
        "claim.subject.limitId",
        elsewhere
          ? "Constraint belongs to another plan"
          : "Constraint is not in the accepted catalog",
      );
    }
  }
  if (candidate.claim.kind === "effective_date" && candidate.claim.subject.recordId !== undefined) {
    const { recordId, recordKind } = candidate.claim.subject;
    if (recordKind === "plan_version") {
      const version = catalog.planVersions[recordId];
      if (version === undefined)
        add(
          "warning",
          "unknown_plan_version",
          "claim.subject.recordId",
          "Plan version is not in the accepted catalog",
        );
      else if (sourceProviderId !== undefined && version.providerId !== sourceProviderId)
        add(
          "error",
          "provider_mismatch",
          "claim.subject.recordId",
          "Source belongs to another provider",
        );
    } else {
      const record = catalog.pricing[recordId];
      if (record === undefined)
        add(
          "warning",
          "unknown_pricing",
          "claim.subject.recordId",
          "Pricing record is not in the accepted catalog",
        );
      else if (sourceProviderId !== undefined) {
        const recordModel = catalog.models[record.modelId];
        if (recordModel !== undefined && recordModel.providerIds === undefined)
          add(
            "warning",
            "model_provider_unestablished",
            "claim.subject.recordId",
            "Accepted catalog does not establish this pricing model's offering providers",
          );
        else if (
          recordModel?.providerIds !== undefined &&
          !recordModel.providerIds.includes(sourceProviderId)
        )
          add(
            "warning",
            "source_model_provider_mismatch",
            "sourceId",
            "Source provider is not among the pricing model's accepted offering providers",
          );
      }
    }
  }
  if (
    candidate.previousAccepted !== undefined &&
    candidate.previousAccepted.catalogVersion !== catalog.catalogVersion
  )
    add(
      "warning",
      "accepted_version_changed",
      "previousAccepted.catalogVersion",
      "Review reference points to a different accepted catalog version",
    );
}

/** Validated registry as an immutable value for review callers. No persistence or network access. */
export function parseSourceRegistry(input: unknown): SourceRegistryV1 {
  return sourceRegistryV1Schema.parse(input);
}
