import { decodeAnyShareToken, encodeShareTokenV2 } from "@stackreplay/share";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap } from "./recap";
import { terminalShareV2 } from "./share-v2";
import { DEFAULT_SELECTIONS, makeCard, cardLayout, CARD_SIZES } from "./terminal-card";

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

describe("card layout bounds", () => {
  const card = makeCard(
    recap,
    Object.fromEntries(
      Object.keys(DEFAULT_SELECTIONS).map((k) => [k, true]),
    ) as typeof DEFAULT_SELECTIONS,
    "dark",
    { text: "33×", monthlyUsd: "300", accounts: 2, days: 30 },
    1234,
  );
  for (const format of ["landscape", "square", "story"] as const)
    it(`${format} keeps every selected figure separate from the footer`, () => {
      const texts = cardLayout(card, format, [{ name: "Claude Opus 5.5", median: 47.2 }]).texts;
      const [width, height] = CARD_SIZES[format];
      for (const t of texts) {
        const left = t.align === "right" ? t.x - t.width : t.x;
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left + t.width).toBeLessThanOrEqual(width);
        expect(t.y + t.size).toBeLessThan(height);
      }
      for (let i = 0; i < texts.length; i++)
        for (const b of texts.slice(i + 1)) {
          const a = texts[i]!,
            ax = a.align === "right" ? a.x - a.width : a.x,
            bx = b.align === "right" ? b.x - b.width : b.x;
          const overlaps =
            ax < bx + b.width && ax + a.width > bx && a.y < b.y + b.size && a.y + a.size > b.y;
          expect(overlaps, `${a.id} and ${b.id}`).toBe(false);
        }
    });
});
