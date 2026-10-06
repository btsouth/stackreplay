import { decodeAnyShareToken, encodeShareTokenV2 } from "@stackreplay/share";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap } from "./recap";
import { terminalShareV2 } from "./share-v2";
import {
  CARD_SIZES,
  cardLayout,
  cardMetrics,
  cardTitle,
  DEFAULT_SELECTIONS,
  makeCard,
} from "./terminal-card";

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
    expect(card.speed).toBeUndefined();
    expect(card.speeds).toBeUndefined();
    expect(card.streak).toBe(recap.longestStreak);
    expect(card.models?.length).toBeGreaterThan(0);
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
      const texts = cardLayout(
        {
          ...card,
          speeds: Array.from({ length: 14 }, (_, i) => ({ id: `model-${i}`, median: 100 - i })),
        },
        format,
      ).texts;
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

describe("speed board compatibility", () => {
  it("keeps old speed tokens valid but uses speed only in the list", async () => {
    const card = {
      theme: "dark" as const,
      start: recap.start,
      end: recap.end,
      speed: { id: "claude-opus-5-5", median: 87.1, replies: 123 },
    };
    const snapshot = terminalShareV2(card);
    const decoded = await decodeAnyShareToken(await encodeShareTokenV2(snapshot));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.snapshot).toEqual(snapshot);
    expect(cardTitle(card)).toBe("AI CODING");
    expect(cardMetrics(card)).toEqual([]);
    for (const format of ["landscape", "square", "story"] as const) {
      const texts = cardLayout(card, format).texts;
      expect(texts.find((t) => t.id === "hero")?.text).toBe("AI CODING");
      expect(texts.find((t) => t.id === "speed-name-0")?.text).toBe("Claude Opus 5.5");
      expect(texts.find((t) => t.id === "speed-value-0")?.text).toBe("87.1");
    }
  });
  it("roundtrips the complete ranked board only with an explicit opt-in", async () => {
    const timed = buildArchetypeExport("mixed").events.map((event) => ({
      ...event,
      requestStartedAt: new Date(Date.parse(event.occurredAt) - 10000).toISOString(),
      requestEndedAt: event.occurredAt,
    }));
    const timedRecap = buildRecap(timed, "all", "2026-09-24T12:00:00Z", "UTC");
    const card = makeCard(timedRecap, { ...DEFAULT_SELECTIONS, speed: true }, "dark");
    expect(card.speed).toBeUndefined();
    expect(card.speeds?.length).toBeGreaterThan(0);
    expect(card.speeds).toEqual(
      [...(timedRecap.deep?.speeds ?? [])]
        .sort((a, b) => b.median - a.median)
        .map((m) => ({ id: m.id, median: m.median })),
    );
    const snapshot = terminalShareV2(card);
    const decoded = await decodeAnyShareToken(await encodeShareTokenV2(snapshot));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.snapshot).toEqual(snapshot);
    expect(makeCard(timedRecap, DEFAULT_SELECTIONS, "dark").speeds).toBeUndefined();
  });
  it("uses five volume-ranked models and share bars in the square without GitHub", () => {
    const card = makeCard(recap, DEFAULT_SELECTIONS, "light");
    const layout = cardLayout(card, "square");
    expect(card.github).toBeUndefined();
    expect(layout.bars).toHaveLength(card.models!.length);
    expect(layout.texts.find((t) => t.id === "hero")?.text).toBe(cardTitle(card));
    expect(layout.texts.filter((t) => t.id.startsWith("stat-")).length).toBe(2);
    expect(layout.texts.some((t) => t.id.startsWith("speed-"))).toBe(false);
    for (const [i, bar] of layout.bars.entries())
      expect(bar.width / 968).toBeCloseTo(card.models![i]!.tokenCount / recap.total);
  });
});
