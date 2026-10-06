import { BUNDLED_CATALOG_VERSION } from "@stackreplay/catalog/bundled";
import {
  assertNoForbiddenFields,
  decodeAnyShareToken,
  encodeShareTokenV2,
} from "@stackreplay/share";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap } from "./recap";
import { recapShareV2 } from "./share-v2";
import { sharedRecap } from "./shared-recap";

describe("recap share compatibility", () => {
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
