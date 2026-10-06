import { decodeAnyShareToken, encodeShareTokenV2 } from "@stackreplay/share";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap } from "./recap";
import { terminalShareV2 } from "./share-v2";
import { DEFAULT_SELECTIONS, makeCard } from "./terminal-card";

const recap = buildRecap(
  buildArchetypeExport("mixed").events,
  "all",
  "2026-09-24T12:00:00Z",
  "UTC",
);
describe("terminal share privacy boundary", () => {
  it("roundtrips selected aggregate tokens through the guarded share codec", async () => {
    const card = makeCard(recap, DEFAULT_SELECTIONS, "dark", undefined, 123);
    const snapshot = terminalShareV2(card);
    const decoded = await decodeAnyShareToken(await encodeShareTokenV2(snapshot));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.snapshot).toEqual(snapshot);
    expect(card.totalTokens).toBe(recap.total);
    expect(card.github).toBe(123);
    expect(card.paidMultiplier).toBeUndefined();
    expect(JSON.stringify(snapshot)).not.toMatch(/project|hash|rawName|label/);
  });
  it("leaves deselected figures out of the link", () => {
    const card = makeCard(
      recap,
      {
        tokens: false,
        usd: false,
        speed: false,
        github: false,
        streak: false,
        models: false,
        peakHour: false,
        paidMultiplier: false,
      },
      "light",
      undefined,
      123,
    );
    expect(card).toEqual({ theme: "light", start: recap.start, end: recap.end });
  });
});
