// biome-ignore-all lint/style/noNonNullAssertion: fixture construction proves these entries exist.
import { describe, expect, it } from "vitest";
import { syntheticExecutionCatalog, syntheticExecutionRecord } from "../test-fixtures/execution.js";
import { executionVersionSchema } from "./execution-authoring.js";
import { compileExecutionPlan, selectExecutionVersionAt } from "./execution-compiler.js";
import { loadDefaultCatalog } from "./load.js";
import { selectPlanVersionAt } from "./versions.js";

const at = "2026-09-12T00:00:00Z";
const compile = (
  family: Parameters<typeof syntheticExecutionRecord>[0],
  overlays: string[] = [],
) => {
  const catalog = syntheticExecutionCatalog();
  return compileExecutionPlan(catalog, `fixture-${family}`, `${family}-v1`, overlays, at);
};
describe("accepted execution compiler", () => {
  it("parses and hashes the same accepted catalog and artifact deterministically", () => {
    const a = compile("goat"),
      b = compile("goat");
    expect(a).toEqual(b);
    expect(a.artifact.contractVersion).toBe(2);
    expect(a.artifact.artifactHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(a.artifact.catalogHash).toBe(b.artifact.catalogHash);
    expect(a.artifact.computation.kind).toBe("executable");
  });
  it("keeps legacy inclusive selection while new versions are half-open", () => {
    const legacy = loadDefaultCatalog();
    expect(legacy.catalogVersion).toMatch(/^sha256:[a-f0-9]{64}$/);
    const versions = [
      { effectiveFrom: "2026-01-01", effectiveTo: "2026-09-01" },
      { effectiveFrom: "2026-09-01" },
    ];
    expect(selectPlanVersionAt(versions, "2026-09-01")).toBe(versions[1]);
    const execution = syntheticExecutionCatalog().plans["fixture-goat"]!.executionVersions!;
    expect(selectExecutionVersionAt(execution, "2027-09-01T00:00:00Z")).toBeUndefined();
    expect(selectExecutionVersionAt(execution, at)?.id).toBe("goat-v1");
  });
  it("keeps a reviewed opaque relative quota non-computable with a known fee", () => {
    const p = compile("claude").artifact;
    expect(p.purchase).toMatchObject({ fixedUsd: "100" });
    expect(p.knownAccess).toEqual([
      expect.objectContaining({ id: "included-a", models: ["fixture-a"] }),
    ]);
    expect(p.computation).toMatchObject({
      kind: "not_computable",
      reasons: [{ code: "opaque_capacity" }],
    });
    expect(p.claims.find((c) => c.id === "capacity")?.certainty).toBe("published");
  });
  it("uses half-open validity for exact route prices and pins the selected rate identity", () => {
    const catalog = syntheticExecutionCatalog(["api"]);
    const price = catalog.pricing["fixture-a-price"]!;
    const build = (instant = at) =>
      compileExecutionPlan(catalog, "fixture-api", "api-v1", [], instant).artifact;
    let artifact = build();
    expect(artifact.computation.kind).toBe("executable");
    if (artifact.computation.kind !== "executable") throw new Error("expected executable");
    expect(artifact.computation.rates.find((r) => r.id === "rate-a")).toMatchObject({
      pricingRef: price.id,
      endpointId: "fixture-endpoint",
      rateVersion: "fixture-rate-v1",
      validity: { start: "2026-01-01T00:00:00.000Z" },
    });

    price.effectiveFrom = "2026-09-13";
    artifact = build();
    expect(artifact.computation).toMatchObject({
      kind: "not_computable",
      reasons: expect.arrayContaining([
        expect.objectContaining({ code: "price_unknown", subject: "rate-a" }),
      ]),
    });

    price.effectiveFrom = "2026-01-01";
    price.effectiveTo = "2026-09-12";
    expect(build().computation.kind).toBe("not_computable");
    expect(build("2026-09-11T23:59:59Z").computation.kind).toBe("executable");

    price.effectiveTo = "2026-09-13";
    expect(build().computation.kind).toBe("executable");
    price.effectiveFromInstant = "2026-09-12T00:00:01Z";
    expect(build().computation.kind).toBe("not_computable");
    expect(build("2026-09-12T00:00:01Z").computation.kind).toBe("executable");
  });
  it("keeps semantic artifact identity when an unrelated inactive price changes", () => {
    const catalog = syntheticExecutionCatalog(["api"]);
    const original = compileExecutionPlan(catalog, "fixture-api", "api-v1", [], at).artifact;
    catalog.pricing["fixture-c-price"]!.effectiveFrom = "2027-01-01";
    catalog.catalogVersion = "sha256:changed-source-catalog";
    const updated = compileExecutionPlan(catalog, "fixture-api", "api-v1", [], at).artifact;
    expect(updated.catalogHash).not.toBe(original.catalogHash);
    expect(updated.artifactHash).toBe(original.artifactHash);
    expect(updated.computation).toEqual(original.computation);
  });
  it("compiles shared constraints and activation without adding balances", () => {
    const p = compile("goat").artifact;
    if (p.computation.kind !== "executable") throw new Error("not executable");
    expect(p.computation.pools).toHaveLength(1);
    expect(p.computation.constraints).toHaveLength(4);
    expect(p.computation.constraints.find((c) => c.id === "a-cap")?.models).toEqual(["fixture-a"]);
    expect(p.computation.windows.find((w) => w.id === "session")).toMatchObject({
      activationModels: ["fixture-a", "fixture-b"],
    });
  });
  it("resolves pinned price bands to finite exact routes and retains a trace", () => {
    const { artifact, resolutionTrace } = compile("token");
    if (artifact.computation.kind !== "executable") throw new Error("not executable");
    expect(artifact.computation.routes.map((r) => r.models)).toEqual([
      ["fixture-a"],
      ["fixture-b"],
    ]);
    expect(resolutionTrace.filter((t) => t.selector.kind === "price_at_or_below")).toHaveLength(2);
    expect(artifact.computation.windows[0]).toMatchObject({
      kind: "fixed_partition",
      count: 4,
      durationMs: 604800000,
      carry: "none",
    });
  });
  it("keeps named pools and provider credit identities distinct", () => {
    const cursor = compile("cursor").artifact,
      copilot = compile("copilot").artifact;
    if (cursor.computation.kind !== "executable") throw new Error("not executable");
    expect(cursor.computation.pools.map((p) => p.id)).toEqual(["cursor-models", "other-models"]);
    expect(copilot.computation).toMatchObject({
      kind: "not_computable",
      reasons: [{ code: "unsupported_semantics", subject: "flexible-grant" }],
    });
  });
  it("applies immutable overlays to debit only and preserves derivation", () => {
    const base = compile("goat").artifact,
      promoted = compile("goat", ["promo"]).artifact;
    if (base.computation.kind !== "executable" || promoted.computation.kind !== "executable")
      throw new Error("not executable");
    expect(base.computation.debits.find((d) => d.id === "debit-a")?.operation).toMatchObject({
      factor: "1",
    });
    expect(promoted.computation.debits.find((d) => d.id === "debit-a")?.operation).toMatchObject({
      factor: "0.5",
    });
    expect(promoted.purchase).toEqual(base.purchase);
    expect(promoted.appliedOverlayIds).toEqual(["promo"]);
    expect(promoted.claims.find((c) => c.id === "overlay")?.operationIds).toContain("debit-a");
    expect(promoted.artifactHash).not.toBe(base.artifactHash);
  });
  it("keeps allowance, cash price and fixed fee modifications separate", () => {
    const catalog = syntheticExecutionCatalog(["goat", "api"]);
    const goat = catalog.plans["fixture-goat"]!;
    goat.executionOverlays!.push({
      id: "allowance",
      validFrom: "2026-09-01T00:00:00Z",
      validUntil: "2027-09-01T00:00:00Z",
      planVersionIds: ["goat-v1"],
      requirementIds: [],
      precedence: 2,
      claimRefs: ["overlay"],
      modifications: [
        {
          kind: "allowance_factor",
          constraintId: "monthly-cap",
          factor: "2",
          claimRefs: ["overlay"],
        },
      ],
    });
    const base = compileExecutionPlan(catalog, "fixture-goat", "goat-v1", [], at).artifact;
    const doubled = compileExecutionPlan(
      catalog,
      "fixture-goat",
      "goat-v1",
      ["allowance"],
      at,
    ).artifact;
    if (base.computation.kind !== "executable" || doubled.computation.kind !== "executable")
      throw new Error("not executable");
    expect(doubled.computation.constraints.find((c) => c.id === "monthly-cap")?.amount).toBe("140");
    expect(doubled.computation.debits).toEqual(base.computation.debits);
    expect(doubled.purchase).toEqual(base.purchase);
    const api = catalog.plans["fixture-api"]!;
    api.executionOverlays!.push({
      id: "cash-discount",
      validFrom: "2026-09-01T00:00:00Z",
      validUntil: "2027-09-01T00:00:00Z",
      planVersionIds: ["api-v1"],
      requirementIds: [],
      precedence: 1,
      claimRefs: ["overlay"],
      modifications: [
        { kind: "cash_rate_factor", routeId: "api-a", factor: "0.5", claimRefs: ["overlay"] },
      ],
    });
    const discounted = compileExecutionPlan(
      catalog,
      "fixture-api",
      "api-v1",
      ["cash-discount"],
      at,
    ).artifact;
    const undiscounted = compileExecutionPlan(catalog, "fixture-api", "api-v1", [], at).artifact;
    if (
      discounted.computation.kind !== "executable" ||
      undiscounted.computation.kind !== "executable"
    )
      throw new Error("not executable");
    expect(discounted.computation.routes.find((r) => r.id === "api-a")?.cash?.factor).toBe("0.5");
    expect(discounted.computation.rates).toEqual(undiscounted.computation.rates);
    expect(discounted.computation.debits).toEqual(undiscounted.computation.debits);
  });
  it("retains overlay cohort facts without silently applying an unknown redemption", () => {
    const catalog = syntheticExecutionCatalog(["goat"]);
    const plan = catalog.plans["fixture-goat"]!,
      v = plan.executionVersions![0]!;
    v.requirements.push({
      id: "redeemed",
      scope: "overlay",
      kind: "opt_in",
      value: "redeemed",
      claimRefs: ["availability"],
    });
    plan.executionOverlays![0]!.requirementIds = ["redeemed"];
    const promoted = compileExecutionPlan(catalog, plan.id, v.id, ["promo"], at).artifact;
    const base = compileExecutionPlan(catalog, plan.id, v.id, [], at).artifact;
    expect(promoted.requirements.map((r) => r.id)).toContain("redeemed");
    expect(base.requirements.map((r) => r.id)).not.toContain("redeemed");
  });
  it("can establish an unknown base fee with reviewed overlay evidence", () => {
    const catalog = syntheticExecutionCatalog(["goat"]);
    const plan = catalog.plans["fixture-goat"]!,
      version = plan.executionVersions![0]!;
    if (version.purchase.kind !== "subscription") throw new Error("expected subscription");
    version.purchase.fixedUsd = null;
    plan.executionOverlays!.push({
      id: "fee",
      validFrom: "2026-09-01T00:00:00Z",
      validUntil: "2027-09-01T00:00:00Z",
      planVersionIds: [version.id],
      requirementIds: [],
      precedence: 2,
      claimRefs: ["overlay"],
      modifications: [{ kind: "fixed_fee", fixedUsd: "7.00", claimRefs: ["overlay"] }],
    });
    expect(
      compileExecutionPlan(catalog, plan.id, version.id, [], at).artifact.computation.kind,
    ).toBe("not_computable");
    const promoted = compileExecutionPlan(catalog, plan.id, version.id, ["fee"], at).artifact;
    expect(promoted.computation.kind).toBe("executable");
    expect(promoted.purchase).toMatchObject({ fixedUsd: "7", claimRefs: ["overlay"] });
  });
  it("revalidates exact route rates after entitlement overlays", () => {
    const catalog = syntheticExecutionCatalog(["goat"]);
    const plan = catalog.plans["fixture-goat"]!;
    plan.executionOverlays!.push({
      id: "wrong-route",
      validFrom: "2026-09-01T00:00:00Z",
      validUntil: "2027-09-01T00:00:00Z",
      planVersionIds: ["goat-v1"],
      requirementIds: [],
      precedence: 2,
      claimRefs: ["overlay"],
      modifications: [
        {
          kind: "entitlement_set",
          routeId: "included-a",
          modelIds: ["fixture-b"],
          claimRefs: ["overlay"],
        },
      ],
    });
    expect(() => compileExecutionPlan(catalog, plan.id, "goat-v1", ["wrong-route"], at)).toThrow(
      /ambiguous included model mapping|conflicts with debit rate/,
    );
  });
  it("rejects unreviewed conflicts and unsupported exact-unit authoring", () => {
    const catalog = syntheticExecutionCatalog();
    const plan = catalog.plans["fixture-goat"]!;
    plan.executionVersions![0]!.claims[0]!.certainty = "published_estimate";
    expect(
      compileExecutionPlan(catalog, plan.id, "goat-v1", [], at).artifact.computation.kind,
    ).toBe("executable");
    plan.executionVersions![0]!.constraints[0]!.claimRefs = ["validity"];
    expect(
      compileExecutionPlan(catalog, plan.id, "goat-v1", [], at).artifact.computation.kind,
    ).toBe("not_computable");
    plan.executionVersions![0]!.meters = [
      { id: "value", kind: "provider_credit", unitId: "credit" },
    ];
    expect(() => compileExecutionPlan(catalog, plan.id, "goat-v1", [], at)).toThrow(
      /Provider credit/,
    );
  });
  it("keeps research-only fields out of accepted versions", () => {
    const record = syntheticExecutionRecord("goat");
    const version = record.executionVersions[0];
    expect(executionVersionSchema.safeParse({ ...version, review_required: true }).success).toBe(
      false,
    );
    expect(
      executionVersionSchema.safeParse({ ...version, unresolvedConflict: "two sources" }).success,
    ).toBe(false);
    const catalog = syntheticExecutionCatalog(["claude"]);
    const capacity = catalog.plans["fixture-claude"]!.executionVersions![0]!.claims.find(
      (c) => c.id === "capacity",
    )!;
    capacity.authority = "provider";
    capacity.sourceType = "provider_docs";
    expect(
      compileExecutionPlan(catalog, "fixture-claude", "claude-v1", [], at).artifact.computation
        .kind,
    ).toBe("not_computable");
  });
  it("refuses estimated numeric capacity even when a source was reviewed", () => {
    const catalog = syntheticExecutionCatalog(["cursor"]);
    const cap = catalog.plans["fixture-cursor"]!.executionVersions![0]!.claims.find(
      (c) => c.id === "capacity",
    )!;
    cap.certainty = "published_estimate";
    const computation = compileExecutionPlan(catalog, "fixture-cursor", "cursor-v1", [], at)
      .artifact.computation;
    expect(computation.kind).toBe("not_computable");
    if (computation.kind === "not_computable")
      expect(computation.reasons.every((r) => r.code === "opaque_capacity")).toBe(true);
  });
  it("marks unknown selector evidence and missing price basis non-computable or invalid", () => {
    const catalog = syntheticExecutionCatalog(["token"]);
    catalog.pricing["fixture-a-price"]!.verificationStatus = "estimated";
    const result = compileExecutionPlan(catalog, "fixture-token", "token-v1", [], at);
    expect(result.resolutionTrace.find((t) => t.subject === "included-a")?.unresolved).toMatch(
      /rate/,
    );
    expect(result.artifact.computation.kind).toBe("not_computable");
    const v = catalog.plans["fixture-token"]!.executionVersions![0]!;
    const selector = v.routes[0]!.models as Record<string, unknown>;
    delete selector.basis;
    expect(() => compileExecutionPlan(catalog, "fixture-token", "token-v1", [], at)).toThrow();
  });
  it("does not lower a trailing window, an unknown debit or a purchased balance", () => {
    const catalog = syntheticExecutionCatalog(["ollama"]),
      v = catalog.plans["fixture-ollama"]!.executionVersions![0]!;
    v.windows = [{ id: "trailing", kind: "trailing", durationMs: 3600000, claimRefs: ["window"] }];
    v.constraints[0]!.windowId = "trailing";
    expect(
      compileExecutionPlan(catalog, "fixture-ollama", "ollama-v1", [], at).artifact.computation,
    ).toMatchObject({ kind: "not_computable", reasons: [{ code: "unsupported_trailing_window" }] });
    v.windows = [
      { id: "month", kind: "calendar", unit: "month", timezone: "UTC", claimRefs: ["window"] },
    ];
    v.constraints[0]!.windowId = "month";
    v.debits[0]!.operation = { kind: "opaque" };
    expect(
      compileExecutionPlan(catalog, "fixture-ollama", "ollama-v1", [], at).artifact.computation
        .kind,
    ).toBe("not_computable");
    v.debits[0]!.operation = { kind: "constant", amount: "6" };
    v.continuation = { kind: "purchased_balance", claimRefs: ["continuation"] };
    expect(
      compileExecutionPlan(catalog, "fixture-ollama", "ollama-v1", [], at).artifact.computation,
    ).toMatchObject({ kind: "not_computable", reasons: [{ code: "unsupported_continuation" }] });
  });
  it("keeps nondefault calendar rules explicit rather than changing reset meaning", () => {
    const catalog = syntheticExecutionCatalog(["cursor"]),
      v = catalog.plans["fixture-cursor"]!.executionVersions![0]!;
    v.windows[0] = {
      id: "month",
      kind: "calendar",
      unit: "month",
      timezone: "UTC",
      resetTime: "04:00",
      claimRefs: ["window"],
    };
    expect(
      compileExecutionPlan(catalog, "fixture-cursor", "cursor-v1", [], at).artifact.computation
        .kind,
    ).toBe("not_computable");
  });
  it("rejects overlapping versions, duplicate pool mappings and undocumented conversion", () => {
    const catalog = syntheticExecutionCatalog(["goat"]),
      plan = catalog.plans["fixture-goat"]!;
    const copy = structuredClone(plan.executionVersions![0]!);
    copy.id = "goat-v2";
    plan.executionVersions!.push(copy);
    expect(() => compileExecutionPlan(catalog, plan.id, "goat-v1", [], at)).toThrow(/Overlapping/);
    plan.executionVersions!.pop();
    const v = plan.executionVersions![0]!;
    v.routes[0]!.debitIds.push("debit-b");
    expect(() => compileExecutionPlan(catalog, plan.id, "goat-v1", [], at)).toThrow(/pool mapping/);
    v.routes[0]!.debitIds.pop();
    v.meters = [{ id: "value", kind: "token" }];
    expect(() => compileExecutionPlan(catalog, plan.id, "goat-v1", [], at)).toThrow(
      /Undocumented debit conversion/,
    );
  });
  it("rejects same-precedence overlays targeting the same operation", () => {
    const catalog = syntheticExecutionCatalog(["goat"]),
      overlays = catalog.plans["fixture-goat"]!.executionOverlays!;
    overlays.push({ ...structuredClone(overlays[0]!), id: "promo-two" });
    expect(() =>
      compileExecutionPlan(catalog, "fixture-goat", "goat-v1", ["promo", "promo-two"], at),
    ).toThrow(/Ambiguous overlay stacking/);
  });
});
