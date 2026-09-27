import { createHash } from "node:crypto";
import {
  type CompiledExecutionPlanV2,
  compiledExecutionPlanV2Schema,
  decimalAmountV1Schema,
  type ExecutionReason,
  pricingRateSetV1Schema,
} from "@stackreplay/schema";
import { stableStringify } from "./canonical.js";
import type { CatalogV1 } from "./catalog.js";
import {
  type ExecutionSelector,
  type ExecutionVersion,
  executionOverlaySchema,
  executionVersionSchema,
} from "./execution-authoring.js";

export const EXECUTION_COMPILER_VERSION = "catalog-execution-c1-v2";
const lexical = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sorted = (values: string[]) => [...new Set(values)].sort(lexical);
const hash = (value: unknown) =>
  `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;

function decimalParts(value: string): { n: bigint; scale: number } {
  const [whole, fraction = ""] = value.split(".");
  return { n: BigInt(`${whole}${fraction}`), scale: fraction.length };
}
function decimalFrom(n: bigint, scale: number): string {
  const digits = n.toString().padStart(scale + 1, "0");
  const raw = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits;
  return decimalAmountV1Schema.parse(
    raw.includes(".") ? raw.replace(/0+$/, "").replace(/\.$/, "") : raw,
  );
}
function multiply(a: string, b: string): string {
  const x = decimalParts(a),
    y = decimalParts(b);
  return decimalFrom(x.n * y.n, x.scale + y.scale);
}
const normalizeDecimal = (value: string): string => {
  const x = decimalParts(value);
  return decimalFrom(x.n, x.scale);
};
const normalizeRateSet = (rates: Record<string, unknown>) =>
  pricingRateSetV1Schema.parse(
    Object.fromEntries(
      Object.entries(rates).map(([category, value]) => [
        category,
        typeof value === "string" ? normalizeDecimal(value) : value,
      ]),
    ),
  );
function compare(a: string, b: string): number {
  const x = decimalParts(a),
    y = decimalParts(b);
  const left = x.n * 10n ** BigInt(y.scale),
    right = y.n * 10n ** BigInt(x.scale);
  return left < right ? -1 : left > right ? 1 : 0;
}
function uniqueIds(label: string, rows: readonly { id: string }[]) {
  if (new Set(rows.map((x) => x.id)).size !== rows.length) throw new Error(`Duplicate ${label} ID`);
}

/** New accepted versions are half-open. Legacy selection remains in versions.ts. */
export function selectExecutionVersionAt(
  versions: readonly ExecutionVersion[],
  at: string,
): ExecutionVersion | undefined {
  const ordered = [...versions].sort((a, b) => lexical(a.validity.start, b.validity.start));
  let previous: ExecutionVersion | undefined;
  for (const v of ordered) {
    if (v.validity.start >= v.validity.end) throw new Error(`Invalid interval: ${v.id}`);
    if (previous && previous.validity.end > v.validity.start)
      throw new Error(`Overlapping immutable execution versions: ${previous.id}, ${v.id}`);
    previous = v;
  }
  return ordered.find((v) => v.validity.start <= at && at < v.validity.end);
}

export interface SelectorTrace {
  subject: string;
  selector: ExecutionSelector;
  modelIds: string[];
  pricingRefs: string[];
  unresolved?: string;
}
export interface ExecutionCompileResult {
  artifact: CompiledExecutionPlanV2;
  resolutionTrace: SelectorTrace[];
}

/** Pure with respect to source state: no clock, fetch, random ID or mutation. */
export function compileExecutionPlan(
  catalog: CatalogV1,
  planId: string,
  versionId: string,
  selectedOverlayIds: readonly string[],
  rulesAt: string,
): ExecutionCompileResult {
  const plan = catalog.plans[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  const versions = (plan.executionVersions ?? []).map((v) => executionVersionSchema.parse(v));
  uniqueIds("execution version", versions);
  selectExecutionVersionAt(versions, rulesAt); // Also checks every overlap.
  const v = versions.find((x) => x.id === versionId);
  if (!v) throw new Error(`Unknown execution version: ${versionId}`);
  if (rulesAt < v.validity.start || rulesAt >= v.validity.end)
    throw new Error("Rules instant lies outside the selected half-open version");
  if (v.validity.basis === "current-market" && !v.publication.catalogActivatedAt)
    throw new Error("Current-market validity needs an explicit catalog activation instant");
  if (
    v.validity.basis === "current-market" &&
    v.validity.start !== v.publication.catalogActivatedAt
  )
    throw new Error("Current-market validity must begin at catalog activation");
  if (
    v.validity.basis === "effective" &&
    v.claims.some(
      (c) => v.validity.claimRefs.includes(c.id) && c.effectiveDateBasis !== "provider_stated",
    )
  )
    throw new Error("Effective validity lacks reviewed provider-effective evidence");
  const claims = new Map(v.claims.map((c) => [c.id, c]));
  uniqueIds("claim", v.claims);
  const operations = new Map<string, Set<string>>();
  const use = (operation: string, refs: readonly string[]) => {
    if (!refs.length) throw new Error(`Missing claim evidence: ${operation}`);
    for (const ref of refs) {
      if (!claims.has(ref)) throw new Error(`Unknown claim ${ref} on ${operation}`);
      const entries = operations.get(ref) ?? new Set<string>();
      entries.add(operation);
      operations.set(ref, entries);
    }
  };
  const reasons: ExecutionReason[] = [];
  const block = (code: ExecutionReason["code"], subject: string, claimRefs: readonly string[]) => {
    use(subject, claimRefs);
    if (!reasons.some((r) => r.code === code && r.subject === subject))
      reasons.push({ code, subject, claimRefs: sorted([...claimRefs]) });
  };
  const numeric = (
    subject: string,
    refs: readonly string[],
    code: ExecutionReason["code"] = "unsupported_semantics",
  ) => {
    use(subject, refs);
    if (
      refs.some(
        (r) =>
          !["published_deterministic", "published_hard_limit", "synthetic"].includes(
            claims.get(r)?.certainty ?? "inferred",
          ),
      )
    )
      block(code, subject, refs);
  };
  use("validity", v.validity.claimRefs);
  const basePurchase =
    v.purchase.kind === "subscription" && v.purchase.fixedUsd !== null
      ? { ...v.purchase, fixedUsd: normalizeDecimal(v.purchase.fixedUsd) }
      : v.purchase;
  const overlays = selectedOverlayIds
    .map((overlayId) => {
      const overlay = (plan.executionOverlays ?? []).find((x) => x.id === overlayId);
      if (!overlay) throw new Error(`Unknown overlay: ${overlayId}`);
      return executionOverlaySchema.parse(overlay);
    })
    .sort((a, b) => a.precedence - b.precedence || lexical(a.id, b.id));
  if (new Set(selectedOverlayIds).size !== selectedOverlayIds.length)
    throw new Error("Duplicate selected overlay");
  for (const o of overlays) {
    if (!o.planVersionIds.includes(v.id) || rulesAt < o.validFrom || rulesAt >= o.validUntil)
      throw new Error(`Overlay ${o.id} is not valid for this plan/rules instant`);
    use(o.id, o.claimRefs);
  }
  const occupied = new Map<string, number>();
  for (const o of overlays)
    for (const m of o.modifications) {
      const key = `${m.kind}:${"constraintId" in m ? m.constraintId : "debitId" in m ? m.debitId : "routeId" in m ? m.routeId : "purchase"}`;
      if (occupied.get(key) === o.precedence) throw new Error(`Ambiguous overlay stacking: ${key}`);
      occupied.set(key, o.precedence);
    }

  const trace: SelectorTrace[] = [];
  const resolve = (
    subject: string,
    selector: ExecutionSelector,
    refs: readonly string[],
  ): string[] => {
    let modelIds: string[] = [],
      pricingRefs: string[] = [],
      unresolved: string | undefined;
    switch (selector.kind) {
      case "exact":
        modelIds = selector.modelIds;
        break;
      case "family":
        modelIds = Object.values(catalog.models)
          .filter((m) => m.kind !== "family" && m.familyId === selector.familyId)
          .map((m) => m.id);
        break;
      case "group":
        modelIds = v.groups.find((g) => g.id === selector.groupId)?.modelIds ?? [];
        break;
      case "provider_supported":
        modelIds = Object.values(catalog.models)
          .filter((m) => m.kind !== "family" && m.providerIds?.includes(selector.providerId))
          .map((m) => m.id);
        break;
      case "price_at_or_below": {
        pricingRefs = selector.pricingRefs;
        const byModel = new Map<string, string>();
        for (const ref of selector.pricingRefs) {
          const p = catalog.pricing[ref];
          if (
            p?.verificationStatus !== "verified" ||
            p.basis !== selector.basis ||
            p.currency !== selector.currency ||
            p.endpointId !== selector.endpointId ||
            p.rateVersion !== selector.rateVersion ||
            p.effectiveFrom > rulesAt.slice(0, 10) ||
            (p.effectiveTo && p.effectiveTo < rulesAt.slice(0, 10))
          ) {
            unresolved = `unverified or mismatched rate ${ref}`;
            break;
          }
          if (byModel.has(p.modelId)) {
            unresolved = `ambiguous rate for ${p.modelId}`;
            break;
          }
          byModel.set(p.modelId, ref);
          const rate = p.rates[selector.category];
          if (typeof rate !== "string") {
            unresolved = `unknown ${selector.category} rate for ${p.modelId}`;
            break;
          }
          if (compare(rate, selector.threshold) <= 0) modelIds.push(p.modelId);
        }
        break;
      }
    }
    modelIds = sorted(modelIds);
    if (modelIds.some((m) => !catalog.models[m] || catalog.models[m]?.kind === "family"))
      unresolved = "selector includes missing or non-release model";
    if (!modelIds.length && !unresolved) unresolved = "selector resolved to no exact model";
    trace.push({
      subject,
      selector,
      modelIds,
      pricingRefs: sorted(pricingRefs),
      ...(unresolved ? { unresolved } : {}),
    });
    if (unresolved)
      block(
        selector.kind === "price_at_or_below" ? "price_unknown" : "unsupported_model",
        subject,
        refs,
      );
    return modelIds;
  };
  for (const g of v.groups) use(g.id, g.claimRefs);
  uniqueIds("requirement", v.requirements);
  const req = (id: string) => {
    const found = v.requirements.find((r) => r.id === id);
    if (!found) throw new Error(`Unknown requirement: ${id}`);
    use(id, found.claimRefs);
    return { id, claimRefs: sorted(found.claimRefs) };
  };
  const requirements = v.requirements
    .filter((r) => r.scope === "plan" && r.kind !== "account_reset_anchor")
    .map((r) => req(r.id));
  for (const o of overlays)
    for (const id of o.requirementIds)
      if (!requirements.some((r) => r.id === id)) requirements.push(req(id));
  const rates = v.rates
    .map((r) => {
      numeric(r.id, r.claimRefs, "price_unknown");
      const p = catalog.pricing[r.pricingRef];
      if (
        p?.verificationStatus !== "verified" ||
        p.basis !== r.basis ||
        p.endpointId !== r.endpointId ||
        p.rateVersion !== r.rateVersion
      ) {
        block("price_unknown", r.id, r.claimRefs);
        return undefined;
      }
      return {
        id: r.id,
        denomination: r.denomination,
        rates: normalizeRateSet(p.rates),
        ...(p.tiers
          ? { tiers: p.tiers.map((tier) => ({ ...tier, rates: normalizeRateSet(tier.rates) })) }
          : {}),
        claimRefs: sorted(r.claimRefs),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== undefined);
  const meters = [...v.meters].sort((a, b) => lexical(a.id, b.id));
  for (const meter of meters)
    if (
      meter.kind === "provider_credit" &&
      !/^[a-z0-9-]+:[a-z0-9-]+:v[1-9][0-9]*$/.test(meter.unitId)
    )
      throw new Error(`Provider credit requires issuer, definition and version: ${meter.id}`);
  const pools = [...v.pools].sort((a, b) => lexical(a.id, b.id));
  const debits = v.debits
    .map((d) => {
      numeric(d.id, d.claimRefs, "unknown_debit");
      if (d.operation.kind === "opaque") {
        block("unknown_debit", d.id, d.claimRefs);
        return undefined;
      }
      const operation =
        d.operation.kind === "rate"
          ? {
              kind: "rate" as const,
              rateId: d.operation.rateId,
              factor: normalizeDecimal(d.operation.debitFactor),
              ...(d.operation.conversion ? { conversion: true as const } : {}),
            }
          : d.operation.kind === "constant"
            ? { ...d.operation, amount: normalizeDecimal(d.operation.amount) }
            : {
                ...d.operation,
                coefficients: d.operation.coefficients.map((c) => ({
                  ...c,
                  coefficient: normalizeDecimal(c.coefficient),
                })),
              };
      return {
        id: d.id,
        poolId: d.poolId,
        meterId: d.meterId,
        operation,
        claimRefs: sorted(d.claimRefs),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== undefined);
  const windows = v.windows
    .map((w) => {
      numeric(w.id, w.claimRefs);
      if (w.kind === "trailing") {
        block("unsupported_trailing_window", w.id, w.claimRefs);
        return undefined;
      }
      if (w.kind === "first_use_anchored")
        return {
          id: w.id,
          kind: w.kind,
          durationMs: w.durationMs,
          activationModels: resolve(w.id, w.activation, w.claimRefs),
          trigger: w.trigger,
        };
      if (w.kind === "calendar") {
        if ((w.resetTime && w.resetTime !== "00:00") || (w.weekStart && w.weekStart !== "mon"))
          block("unsupported_semantics", w.id, w.claimRefs);
        return { id: w.id, kind: w.kind, unit: w.unit, timezone: w.timezone };
      }
      if (
        v.requirements.find((r) => r.id === w.anchorRequirementId)?.kind !== "account_reset_anchor"
      )
        throw new Error(`Fixed partition ${w.id} lacks a reviewed reset anchor requirement`);
      req(w.anchorRequirementId);
      return w;
    })
    .filter((w): w is NonNullable<typeof w> => w !== undefined);
  const constraints = v.constraints
    .map((c) => {
      numeric(c.id, c.claimRefs, "opaque_capacity");
      if (c.amount === null) {
        block("opaque_capacity", c.id, c.claimRefs);
        return undefined;
      }
      return {
        id: c.id,
        poolId: c.poolId,
        windowId: c.windowId,
        ...(c.models ? { models: resolve(c.id, c.models, c.claimRefs) } : {}),
        amount: normalizeDecimal(c.amount),
        exceed: c.exceed,
        claimRefs: sorted(c.claimRefs),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== undefined);
  const routes = v.routes.map((r) => {
    numeric(r.id, r.claimRefs);
    const models = resolve(r.id, r.models, r.claimRefs);
    const excluded = r.exclude ? resolve(`${r.id}:exclude`, r.exclude, r.claimRefs) : [];
    for (const id of r.requirementIds) req(id);
    return {
      id: r.id,
      models: models.filter((m) => !excluded.includes(m)),
      debitIds: sorted(r.debitIds),
      ...(r.cash
        ? { cash: { rateId: r.cash.rateId, factor: normalizeDecimal(r.cash.cashRateFactor) } }
        : {}),
      requirements: [
        { id: `harness:${r.id}`, claimRefs: sorted(r.claimRefs) },
        { id: `protocol:${r.id}`, claimRefs: sorted(r.claimRefs) },
        ...r.requirementIds.map(req),
      ],
      claimRefs: sorted(r.claimRefs),
    };
  });
  uniqueIds("rate", v.rates);
  uniqueIds("meter", meters);
  uniqueIds("pool", pools);
  uniqueIds("debit", v.debits);
  uniqueIds("window", v.windows);
  uniqueIds("constraint", v.constraints);
  uniqueIds("route", v.routes);
  const meterById = new Map(meters.map((m) => [m.id, m]));
  for (const p of pools)
    if (!meterById.has(p.meterId)) throw new Error(`Pool ${p.id} has no meter`);
  for (const d of v.debits) {
    const pool = pools.find((p) => p.id === d.poolId);
    if (!pool || pool.meterId !== d.meterId)
      throw new Error(`Incompatible debit/pool meter: ${d.id}`);
    const meter = meterById.get(d.meterId);
    if (!meter) throw new Error(`Unknown debit meter ${d.meterId}`);
    if (d.operation.kind === "tokens" && meter.kind !== "token")
      throw new Error(`Token coefficients cannot debit ${meter.kind}`);
    if (d.operation.kind === "rate") {
      const rateId = d.operation.rateId;
      const rate = rates.find((r) => r.id === rateId);
      if (!rate) block("price_unknown", d.id, d.claimRefs);
      else if (
        rate.denomination === "USD"
          ? meter.kind !== "usd_usage_value" && !d.operation.conversion
          : rate.denomination.meterId !== meter.id && !d.operation.conversion
      )
        throw new Error(`Undocumented debit conversion: ${d.id}`);
    }
  }
  for (const c of v.constraints) {
    if (!pools.some((p) => p.id === c.poolId) || !v.windows.some((w) => w.id === c.windowId))
      throw new Error(`Invalid constraint mapping: ${c.id}`);
  }
  for (const r of v.routes) {
    const seen = new Set<string>();
    if (v.purchase.kind === "subscription" && !r.debitIds.length)
      throw new Error(`Included route ${r.id} has no debit`);
    if (
      v.purchase.kind === "api" &&
      (!r.cash || r.debitIds.length || v.pools.length || v.constraints.length)
    )
      throw new Error(`API route ${r.id} must be independent and priced`);
    for (const debitId of r.debitIds) {
      const d = v.debits.find((x) => x.id === debitId);
      if (!d || seen.has(d.poolId)) throw new Error(`Conflicting pool mapping on route ${r.id}`);
      seen.add(d.poolId);
      if (d.operation.kind === "rate") {
        const rateId = d.operation.rateId;
        const rate = v.rates.find((x) => x.id === rateId);
        const price = rate && catalog.pricing[rate.pricingRef];
        const models = routes.find((x) => x.id === r.id)?.models ?? [];
        if (price && models.some((model) => model !== price.modelId))
          throw new Error(`Debit rate ${rate?.id} does not belong to exact route models`);
      }
    }
    if (r.cash && !rates.some((x) => x.id === r.cash?.rateId && x.denomination === "USD"))
      block("price_unknown", r.id, r.claimRefs);
    if (r.cash) {
      const rate = v.rates.find((x) => x.id === r.cash?.rateId);
      const price = rate && catalog.pricing[rate.pricingRef];
      const models = routes.find((x) => x.id === r.id)?.models ?? [];
      if (price && models.some((model) => model !== price.modelId))
        throw new Error(`Cash rate ${rate?.id} does not belong to exact route models`);
    }
  }
  for (const p of pools)
    if (!v.constraints.some((c) => c.poolId === p.id))
      throw new Error(`Pool ${p.id} has no constraint`);
  const offered = new Set<string>();
  for (const route of routes)
    for (const model of route.models) {
      if (v.purchase.kind === "subscription" && offered.has(model))
        throw new Error(`Ambiguous included model mapping: ${model}`);
      offered.add(model);
    }
  for (const c of v.capabilities) block(c.code, c.subject, c.claimRefs);
  use("continuation", v.continuation.claimRefs);
  if (["automatic_payg", "purchased_balance", "unknown"].includes(v.continuation.kind))
    block("unsupported_continuation", "continuation", v.continuation.claimRefs);
  if (v.purchase.kind === "subscription" && (!v.constraints.length || !routes.length))
    block("opaque_capacity", "plan_capacity", v.validity.claimRefs);

  // Overlays are immutable source records; application changes only this local derivation.
  let purchase = basePurchase;
  for (const o of overlays)
    for (const m of o.modifications) {
      numeric(`${o.id}:${m.kind}`, m.claimRefs);
      if (m.kind === "fixed_fee") {
        if (purchase.kind !== "subscription") throw new Error("Fee overlay on API plan");
        purchase = {
          ...purchase,
          fixedUsd: normalizeDecimal(m.fixedUsd),
          claimRefs: sorted([...m.claimRefs, ...o.claimRefs]),
        };
        use("purchase", [...m.claimRefs, ...o.claimRefs]);
      } else if (m.kind === "constraint_amount" || m.kind === "allowance_factor") {
        const c = constraints.find((x) => x.id === m.constraintId);
        if (!c) throw new Error(`Unknown overlay constraint ${m.constraintId}`);
        c.amount =
          m.kind === "constraint_amount"
            ? normalizeDecimal(m.amount)
            : multiply(c.amount, m.factor);
        c.claimRefs = sorted([...c.claimRefs, ...m.claimRefs, ...o.claimRefs]);
        use(c.id, [...m.claimRefs, ...o.claimRefs]);
      } else if (m.kind === "debit_factor") {
        const d = debits.find((x) => x.id === m.debitId);
        if (!d || (d.operation.kind !== "rate" && d.operation.kind !== "constant"))
          throw new Error(`Unsupported debit factor target ${m.debitId}`);
        if (d.operation.kind === "rate")
          d.operation.factor = multiply(d.operation.factor, m.factor);
        else d.operation.amount = multiply(d.operation.amount, m.factor);
        d.claimRefs = sorted([...d.claimRefs, ...m.claimRefs, ...o.claimRefs]);
        use(d.id, [...m.claimRefs, ...o.claimRefs]);
      } else if (m.kind === "cash_rate_factor") {
        const r = routes.find((x) => x.id === m.routeId);
        if (!r?.cash) throw new Error(`Unknown cash route ${m.routeId}`);
        r.cash.factor = multiply(r.cash.factor, m.factor);
        r.claimRefs = sorted([...r.claimRefs, ...m.claimRefs, ...o.claimRefs]);
        use(r.id, [...m.claimRefs, ...o.claimRefs]);
      } else {
        const r = routes.find((x) => x.id === m.routeId);
        if (
          !r ||
          m.modelIds.some((id) => !catalog.models[id] || catalog.models[id]?.kind === "family")
        )
          throw new Error(`Invalid finite entitlement overlay ${m.routeId}`);
        r.models = sorted(m.modelIds);
        r.claimRefs = sorted([...r.claimRefs, ...m.claimRefs, ...o.claimRefs]);
        use(r.id, [...m.claimRefs, ...o.claimRefs]);
      }
    }
  if (purchase.kind === "subscription") {
    numeric("purchase", purchase.claimRefs, "price_unknown");
    if (purchase.fixedUsd === null) block("price_unknown", "purchase", purchase.claimRefs);
    if (purchase.term !== "month" && purchase.term !== "28_days")
      block("unsupported_purchase", "purchase", purchase.claimRefs);
  }
  const finalOffered = new Set<string>();
  for (const route of routes) {
    if (!route.models.length) block("unsupported_model", route.id, route.claimRefs);
    for (const model of route.models) {
      if (!catalog.models[model] || catalog.models[model]?.kind === "family")
        block("unsupported_model", route.id, route.claimRefs);
      if (purchase.kind === "subscription" && finalOffered.has(model))
        throw new Error(`Overlay created ambiguous included model mapping: ${model}`);
      finalOffered.add(model);
    }
    const source = v.routes.find((r) => r.id === route.id);
    if (!source) throw new Error(`Overlay route disappeared: ${route.id}`);
    for (const debitId of source.debitIds) {
      const debit = v.debits.find((d) => d.id === debitId);
      if (debit?.operation.kind !== "rate") continue;
      const rateId = debit.operation.rateId;
      const rate = v.rates.find((r) => r.id === rateId);
      const price = rate && catalog.pricing[rate.pricingRef];
      if (price && route.models.some((model) => model !== price.modelId))
        throw new Error(`Overlay entitlement conflicts with debit rate ${rate?.id}`);
    }
    if (source.cash) {
      const rate = v.rates.find((r) => r.id === source.cash?.rateId);
      const price = rate && catalog.pricing[rate.pricingRef];
      if (price && route.models.some((model) => model !== price.modelId))
        throw new Error(`Overlay entitlement conflicts with cash rate ${rate?.id}`);
    }
  }
  const usedClaimRows = v.claims
    .filter((c) => operations.has(c.id))
    .map((c) => ({
      id: c.id,
      evidencePackageHash: c.evidencePackageHash,
      certainty:
        c.certainty === "synthetic"
          ? ("synthetic" as const)
          : c.certainty === "published_estimate"
            ? ("estimated" as const)
            : c.certainty === "inferred"
              ? ("modeled" as const)
              : ("published" as const),
      operationIds: sorted([...(operations.get(c.id) ?? [])]),
    }))
    .sort((a, b) => lexical(a.id, b.id));
  const computation: CompiledExecutionPlanV2["computation"] = reasons.length
    ? {
        kind: "not_computable",
        reasons: reasons.sort((a, b) =>
          lexical(`${a.code}:${a.subject}`, `${b.code}:${b.subject}`),
        ),
      }
    : {
        kind: "executable",
        rates: rates.sort((a, b) => lexical(a.id, b.id)),
        meters,
        pools,
        debits: debits.sort((a, b) => lexical(a.id, b.id)),
        windows: windows.sort((a, b) => lexical(a.id, b.id)),
        constraints: constraints.sort((a, b) => lexical(a.id, b.id)),
        routes: routes.sort((a, b) => lexical(a.id, b.id)),
        continuation:
          v.continuation.kind === "independent_api_fallback"
            ? "independent_api_fallback"
            : "hard_stop",
      };
  const content = {
    contractVersion: 2 as const,
    catalogHash: catalog.catalogVersion,
    compilerVersion: EXECUTION_COMPILER_VERSION,
    planId,
    planVersionId: v.id,
    appliedOverlayIds: overlays.map((o) => o.id),
    validity: { start: v.validity.start, end: v.validity.end, basis: v.validity.basis },
    purchase,
    requirements: requirements.sort((a, b) => lexical(a.id, b.id)),
    computation,
    claims: usedClaimRows,
  };
  const artifact = compiledExecutionPlanV2Schema.parse({ ...content, artifactHash: hash(content) });
  return { artifact, resolutionTrace: trace.sort((a, b) => lexical(a.subject, b.subject)) };
}
