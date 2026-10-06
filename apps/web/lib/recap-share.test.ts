import { BUNDLED_CATALOG_VERSION } from "@stackreplay/catalog/bundled";
import {
  assertNoForbiddenFields,
  decodeAnyShareToken,
  encodeShareToken,
  encodeShareTokenV2,
  type ShareReplaySnapshotV1,
} from "@stackreplay/share";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap } from "./recap";
import { recapShareV2 } from "./share-v2";
import { sharedRecap } from "./shared-recap";

describe("recap share compatibility", () => {
  it("reads original links without inventing missing usage or losing shared sessions", async () => {
    const old: ShareReplaySnapshotV1 = {
      version: 1,
      workload: {
        eventCount: 12,
        sessionCount: 3,
        modelCount: 1,
        tokenTotals: {},
        rangeIncluded: false,
      },
      target: {
        type: "subscription",
        planId: "example-plan",
        planVersionId: "example-plan@2026-09-01",
        planName: "Example plan",
        providerId: "example-provider",
        providerName: "Example provider",
        price: { currency: "USD", amount: "20", interval: "month" },
        verificationStatus: "estimated",
        lastVerifiedAt: "2026-09-01",
        sources: [],
      },
      feasibility: { status: "unknown", coverageDimension: "requests" },
      coverage: {
        requests: { status: "known", covered: 0, total: 12, percent: 0 },
        usage: { status: "known", covered: 0, total: 12, percent: 0 },
        models: { status: "known", covered: 0, total: 1, percent: 0 },
      },
      constraints: [],
      violations: [],
      confidence: { level: "low", factors: [] },
      versions: {
        schema: 1,
        engine: "old",
        catalog: "old",
        methodology: "old",
        rulesAsOf: "2026-09-01",
        targetReference: "example-plan@2026-09-01",
      },
    };
    const decoded = await decodeAnyShareToken(await encodeShareToken(old));
    if (!decoded.ok) throw Error("Old share link failed to decode");
    const view = sharedRecap(decoded.snapshot);
    expect(view.tokens).toBeUndefined();
    expect(view.usd).toBeUndefined();
    expect(view.sessions).toBe(3);
    expect(view.rules).toBe("2026-09-01");
    old.workload.tokenTotals = { inputTokens: 0 };
    expect(sharedRecap(old).tokens).toBe(0);
  });
  it("round trips card aggregates without private identifiers", async () => {
    const recap = buildRecap(
      buildDemoExport("billing").events,
      "all",
      "2026-10-05T12:00:00Z",
      "UTC",
    );
    const share = recapShareV2(recap);
    expect(share.versions.catalog).toBe(BUNDLED_CATALOG_VERSION);
    expect(() => assertNoForbiddenFields(share)).not.toThrow();
    const decoded = await decodeAnyShareToken(await encodeShareTokenV2(share));
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw Error("decode failed");
    const view = sharedRecap(decoded.snapshot);
    expect(view.tokens).toBe(recap.total);
    expect(view.usd).toBe(recap.usd);
    expect(view.sessions).toBe(recap.sessions);
    expect(JSON.stringify(share)).not.toMatch(/nativeSessionHash|projectHash|account|prompt/);
  });
  it("reads an old token with no recap fields", async () => {
    const share = recapShareV2(
      buildRecap(buildDemoExport("billing").events, "all", "2026-10-05T12:00:00Z", "UTC"),
    );
    delete share.recap;
    const decoded = await decodeAnyShareToken(await encodeShareTokenV2(share));
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw Error("decode failed");
    expect(sharedRecap(decoded.snapshot).streak).toBeUndefined();
    expect(sharedRecap(decoded.snapshot).tokens).toBe(share.workload.knownTokens);
  });
});
