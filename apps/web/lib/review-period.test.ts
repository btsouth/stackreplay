import { bundledModelIdentity, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { marketDecisionInputs, optimizeCompiledExactModels } from "@stackreplay/replay-engine";
import { assertNoForbiddenFields, shareSnapshotV2Schema } from "@stackreplay/share";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { summarizeCompiledOptimization } from "./optimizer-runtime";
import {
  type BillingFact,
  billingFactSchema,
  composeReview,
  daysInPeriod,
  periodSchema,
  type ReviewChoice,
} from "./review-period";
import { reviewWorkload } from "./review-workload";
import { presentShare } from "./share-presentation";
import { workloadShareV2 } from "./share-v2";
import { buildWorkloadProfile } from "./workload-profile";
import { summarizeExport } from "./workload-summary";

const catalog = loadBundledCatalog();
const exported = buildDemoExport("moderate");
const history = reviewWorkload(exported.events).history;
const decision = {
  history,
  scenarios: marketDecisionInputs(catalog, DECISION_MARKET, exported.events).map((input, i) => ({
    id: DECISION_MARKET.scenarios[i]?.id ?? "",
    summary: summarizeCompiledOptimization(optimizeCompiledExactModels(input)),
  })),
};
const period = { start: "2026-09-01", end: "2026-10-01" };
const selected = ["plan:anthropic-claude-max-5x", "plan:openai-chatgpt-plus"];
const billing: Record<string, BillingFact> = Object.fromEntries(
  selected.map((key, i) => [
    key,
    { cycle: period, paid: i ? "20" : "100", provenance: "local-user" },
  ]),
);
const choice: ReviewChoice = { mode: "custom", period };
const confirmation = {
  importId: "test-import",
  scopeDigest: decision.scenarios[0]?.summary.scope.digest ?? "",
  period,
  confirmedAt: "2026-10-01T00:00:00Z",
  provenance: "local-user" as const,
};
const input = { importId: "test-import", decision, choice, billing, selected, asOf: "2026-10-01" };

describe("billing-period composition", () => {
  it("never infers complete history from boundary events or published monthly fees", () => {
    const result = composeReview(input);
    expect(result.complete).toBe(false);
    expect(result.confirmedSpend).toBe("120");
    expect(result.difference).toBeUndefined();
    expect(result.conclusion).toContain("Not directly comparable yet");
    expect(result.history.firstDate).toBe("2026-09-14");
    expect(composeReview({ ...input, billing: {} }).confirmedSpend).toBeUndefined();
  });
  it("compares only a locally confirmed common period, using exact existing API receipts", () => {
    const result = composeReview({
      ...input,
      choice: { ...choice, historyConfirmation: confirmation },
    });
    expect(result.complete).toBe(true);
    expect(result.difference).toEqual({ low: "113.9037333", high: "114.06641355" });
    expect(result.conclusion).toContain("does not prove the subscriptions were unnecessary");
    expect(result.reason).toContain("not independently verified");
  });
  it("keeps different cycles and missing amounts out of the comparison, without proration", () => {
    const facts = {
      ...billing,
      [selected[1] ?? ""]: {
        cycle: { start: "2026-09-04", end: "2026-10-04" },
        paid: "20",
        provenance: "local-user" as const,
      },
    };
    const result = composeReview({
      ...input,
      choice: { ...choice, historyConfirmation: confirmation },
      billing: facts,
    });
    expect(result.confirmedSpend).toBe("100");
    expect(result.confirmedCount).toBe(1);
    expect(result.unmatchedCount).toBe(1);
    expect(result.complete).toBe(false);
    expect(result.difference).toBeUndefined();
    expect(result.reason).toContain("No charges are prorated");
  });
  it("recognizes zero actual paid as confirmed and preserves a negative difference", () => {
    const facts = Object.fromEntries(
      selected.map((key) => [key, { cycle: period, paid: "0", provenance: "local-user" as const }]),
    );
    const result = composeReview({
      ...input,
      choice: { ...choice, historyConfirmation: confirmation },
      billing: facts,
    });
    expect(result.complete).toBe(true);
    expect(result.difference?.low).toBe("-6.0962667");
    expect(result.conclusion).toContain("every burst without interruption");
  });
  it("invalidates confirmation on date changes and withholds comparison for scan gaps or unknown pricing", () => {
    const confirmed = { ...choice, historyConfirmation: confirmation };
    expect(
      composeReview({
        ...input,
        choice: { ...confirmed, period: { start: "2026-09-02", end: "2026-10-02" } },
      }).historyConfirmed,
    ).toBe(false);
    expect(composeReview({ ...input, choice: confirmed, partialScan: true }).complete).toBe(false);
    expect(
      composeReview({ ...input, choice: confirmed, decision: { ...decision, scenarios: [] } })
        .complete,
    ).toBe(false);
  });
  it("cannot confirm future history for real usage", () => {
    const result = composeReview({
      ...input,
      asOf: "2026-09-27",
      choice: { ...choice, historyConfirmation: confirmation },
    });
    expect(result.complete).toBe(false);
    expect(result.historyConfirmed).toBe(false);
    expect(result.reason).toContain("has not ended");
  });
  it("requires a fresh dated declaration for this import and workload", () => {
    expect(
      composeReview({ ...input, choice: { ...choice, historyConfirmed: "2026-09-01/2026-10-01" } })
        .historyConfirmed,
    ).toBe(false);
    expect(
      composeReview({
        ...input,
        importId: "another-import",
        choice: { ...choice, historyConfirmation: confirmation },
      }).historyConfirmed,
    ).toBe(false);
    expect(
      composeReview({
        ...input,
        choice: {
          ...choice,
          historyConfirmation: { ...confirmation, scopeDigest: "changed-workload" },
        },
      }).historyConfirmed,
    ).toBe(false);
  });
  it("rejects invalid dates, too-long cycles, negative or ambiguous amounts", () => {
    for (const cycle of [
      { start: "2026-02-30", end: "2026-03-05" },
      { start: "2026-09-01", end: "2026-11-01" },
      { start: "2026-09-01", end: "2026-09-01" },
    ])
      expect(periodSchema.safeParse(cycle).success).toBe(false);
    for (const paid of ["-1", "NaN", "1e2", "1.001", "", "01"])
      expect(billingFactSchema.safeParse({ paid, provenance: "local-user" }).success).toBe(false);
    expect(daysInPeriod({ start: "2028-02-01", end: "2028-03-01" })).toBe(29);
    expect(daysInPeriod({ start: "2026-03-01", end: "2026-04-01" })).toBe(31);
  });
  it("filters half-open UTC boundaries without losing or modifying the saved input", () => {
    const base = exported.events[0];
    if (!base) throw new Error("missing event");
    const events = [
      "2026-08-31T23:59:59.999999999Z",
      "2026-09-01T00:00:00Z",
      "2026-09-30T23:59:59.999999999Z",
      "2026-10-01T00:00:00Z",
    ].map((occurredAt, i) => ({ ...base, occurredAt, id: String(i) }));
    const scoped = reviewWorkload(events, period);
    expect(scoped.events.map((e) => e.id)).toEqual(["1", "2"]);
    expect(scoped.events[0]).toBe(events[1]);
    expect(scoped.history.outsideCalls).toBe(2);
    expect(events).toHaveLength(4);
    expect(reviewWorkload(events, { start: "2026-11-01", end: "2026-12-01" }).history.calls).toBe(
      0,
    );
  });
  it("builds an explicitly synthetic month without altering the D1 week", () => {
    const full = reviewWorkload(buildDemoExport("billing").events, period);
    expect(full.history.calls).toBe(3600);
    expect(full.history.firstDate).toBe("2026-09-01");
    expect(full.history.lastDate).toBe("2026-09-30");
    expect(full.history.outsideCalls).toBe(0);
    expect(history.calls).toBe(900);
  });
});

it("shares local paid amounts only by explicit opt-in and never changes scope", () => {
  const review = composeReview({
    ...input,
    choice: { ...choice, historyConfirmation: confirmation },
  });
  const profile = buildWorkloadProfile(exported.events, {
    catalog,
    identity: bundledModelIdentity(),
    timeZone: "UTC",
    rulesAsOf: "2026-09-27",
  });
  const record = {
    id: "private",
    label: "private",
    createdAt: "2026-09-27T00:00:00Z",
    eventCount: 900,
    summary: summarizeExport(exported, catalog.catalogVersion, bundledModelIdentity()),
  };
  for (const includePaid of [false, true]) {
    const snapshot = workloadShareV2(
      record,
      profile,
      { includePeriod: false, includeReview: true, includePaid },
      { ...decision, review },
    );
    expect(shareSnapshotV2Schema.safeParse(snapshot).success).toBe(true);
    expect(() => assertNoForbiddenFields(snapshot)).not.toThrow();
    expect(snapshot.review?.spend?.amount).toBe(includePaid ? "120" : undefined);
    expect(snapshot.review?.difference).toEqual(includePaid ? review.difference : undefined);
    expect(snapshot.review?.state).toBe(includePaid ? "aligned" : "spend-private");
    expect(presentShare(snapshot).support.join(" ")).toContain("not independently verified");
    expect(JSON.stringify(snapshot)).not.toContain('"id":"private"');
  }
  const anonymous = workloadShareV2(
    record,
    profile,
    { includePeriod: false },
    { ...decision, review },
  );
  expect(anonymous.review?.period).toBeUndefined();
  expect(anonymous.review?.history).toBeUndefined();
  expect(anonymous.review?.spend).toBeUndefined();
  expect(anonymous.value).toBeUndefined();
  expect(anonymous.market).toBeUndefined();
});

describe("account-bound billing reviews", () => {
  it("filters only the selected root and period, including dedup integrity", () => {
    const events = exported.events.slice(0, 3).map((e, i) => ({
      ...e,
      source: {
        ...e.source,
        resourceInstanceId: i === 2 ? "other" : "main",
        nativeResponse: { final: true, duplicateRows: i + 1 },
      },
    }));
    const scoped = reviewWorkload(events, undefined, "main");
    expect(scoped.events).toHaveLength(2);
    expect(scoped.history.resourceInstanceId).toBe("main");
    expect(scoped.history.nativeResponses).toBe(2);
    expect(scoped.history.duplicateRows).toBe(3);
    expect(scoped.history.accounts).toHaveLength(2);
  });
  it("binds both billing and history to the account, import and period", () => {
    const scopedDecision = {
      ...decision,
      history: {
        ...history,
        resourceInstanceId: "main",
        accounts: [{ resourceInstanceId: "main", source: "claude-code", calls: history.calls }],
      },
    };
    const scopedChoice = {
      ...choice,
      resourceInstanceId: "main",
      historyConfirmation: { ...confirmation, resourceInstanceId: "main" },
    };
    const scopedBilling = Object.fromEntries(
      Object.entries(billing).map(([key, fact]) => [key, { ...fact, resourceInstanceId: "main" }]),
    );
    const scopedInput = {
      ...input,
      decision: scopedDecision,
      choice: scopedChoice,
      billing: scopedBilling,
    };
    expect(composeReview(scopedInput).complete).toBe(true);
    expect(
      composeReview({ ...scopedInput, choice: { ...scopedChoice, resourceInstanceId: "other" } })
        .complete,
    ).toBe(false);
    expect(composeReview({ ...scopedInput, billing }).confirmedSpend).toBeUndefined();
    expect(composeReview({ ...scopedInput, importId: "changed" }).historyConfirmed).toBe(false);
    const one = composeReview({ ...scopedInput, selected: [selected[0] ?? ""] });
    expect(one.conclusion).toContain("for this confirmed Claude billing cycle");
    expect(one.conclusion).toContain("currently modeled published API rates");
    expect(one.conclusion).toContain("Max 5x could be replaced without interruption");
  });
});
