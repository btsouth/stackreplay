import { bundledModelIdentity, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { runScopedReplay } from "./scoped-replay";
import { suggestedReplaySnapshotHash } from "./suggested-replay-snapshot";

function replay(model: string = "gpt-6-1-sol", serviceTier: "standard" | "batch" = "standard") {
  const source = buildDemoExport("moderate").events[0];
  if (!source) throw new Error("Missing fixture event");
  return runScopedReplay({
    events: [{ ...source, model: { rawName: model } }],
    catalog: loadBundledCatalog(),
    identity: bundledModelIdentity(),
    target: { type: "api", providerId: "openai", serviceTier },
    rulesAsOf: DECISION_MARKET.rulesAt.slice(0, 10),
    timeZone: "UTC",
  });
}
describe("Suggested Replay snapshot admission", () => {
  it("recognizes actual Standard receipts for an admitted API model", () => {
    const run = replay();
    expect(run.receipt?.pricedEvents).toBe(1);
    expect(suggestedReplaySnapshotHash(run)).toBe(DECISION_MARKET.decisionSnapshotHash);
  });
  it("does not stamp another tier, unadmitted model or changed receipt rate", () => {
    expect(suggestedReplaySnapshotHash(replay("gpt-6-1-sol", "batch"))).toBeUndefined();
    expect(suggestedReplaySnapshotHash(replay("gpt-6-astra"))).toBeUndefined();
    const run = replay();
    if (!run.receipt) throw new Error("Missing receipt");
    expect(
      suggestedReplaySnapshotHash({
        ...run,
        receipt: {
          ...run.receipt,
          lines: run.receipt.lines.map((l) => ({ ...l, ratePerMillion: "999" })),
        },
      }),
    ).toBeUndefined();
    expect(
      suggestedReplaySnapshotHash({ ...run, receipt: { ...run.receipt, pricedEvents: 0 } }),
    ).toBeUndefined();
    expect(
      suggestedReplaySnapshotHash({
        ...run,
        result: {
          ...run.result,
          versions: { ...run.result.versions, catalog: "different-catalog" },
        },
      }),
    ).toBeUndefined();
    expect(
      suggestedReplaySnapshotHash({
        ...run,
        result: { ...run.result, versions: { ...run.result.versions, rulesAsOf: "2026-09-28" } },
      }),
    ).toBeUndefined();
  });
});
