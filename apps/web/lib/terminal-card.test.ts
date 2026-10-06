import { decodeAnyShareToken, encodeShareTokenV2 } from "@stackreplay/share";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TerminalLandscape } from "../components/share/terminal-landscape";
import { buildRecap } from "./recap";
import { terminalShareV2 } from "./share-v2";
import {
  CARD_SIZES,
  cardLayout,
  cardMetrics,
  cardTextHeight,
  cardTitle,
  DEFAULT_SELECTIONS,
  largestEmptyHorizontalBand,
  makeCard,
  wrapCardText,
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
    expect(card.currentStreak ?? card.streak).toBe(recap.streak || recap.longestStreak);
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
        headline: false,
      },
      "light",
      undefined,
      123,
    );
    expect(card).toEqual({ theme: "light", start: recap.start, end: recap.end });
  });
  it("prints the chosen headline only when the toggle is on and carries it in the link", async () => {
    const headline = "Claude Opus 5.5 accounted for 33% of your tokens";
    const on = makeCard(recap, DEFAULT_SELECTIONS, "dark", undefined, 123, undefined, headline);
    expect(on.headline).toBe(headline);
    for (const format of ["landscape", "square", "story"] as const)
      expect(cardLayout(on, format).texts.some((t) => t.id === "headline")).toBe(true);
    const decoded = await decodeAnyShareToken(await encodeShareTokenV2(terminalShareV2(on)));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.snapshot).toEqual(terminalShareV2(on));
    const off = makeCard(
      recap,
      { ...DEFAULT_SELECTIONS, headline: false },
      "dark",
      undefined,
      123,
      undefined,
      headline,
    );
    expect(off.headline).toBeUndefined();
    for (const format of ["landscape", "square", "story"] as const)
      expect(cardLayout(off, format).texts.some((t) => t.id === "headline")).toBe(false);
  });
  it("wraps a headline to at most two lines without dropping words", () => {
    const long =
      "Claude Opus 5.5 accounted for 33% of your tokens and saved $109,765 at list prices";
    expect(long.length).toBeLessThanOrEqual(90);
    for (const [format, size] of [
      ["landscape", 30],
      ["square", 36],
      ["story", 44],
    ] as const) {
      const lines = wrapCardText(long, CARD_SIZES[format][0] - 112, size);
      expect(lines.length).toBeLessThanOrEqual(2);
      expect(lines.join(" ")).toBe(long);
    }
  });
  it("draws the headline into the server share image, and nothing when absent", () => {
    const headline = "Cache reads saved $109,765 at list prices";
    const on = makeCard(
      recap,
      DEFAULT_SELECTIONS,
      "dark",
      undefined,
      undefined,
      undefined,
      headline,
    );
    const html = renderToStaticMarkup(createElement(TerminalLandscape, { card: on }));
    expect(html).toContain(headline);
    const off = makeCard(
      recap,
      { ...DEFAULT_SELECTIONS, headline: false },
      "dark",
      undefined,
      undefined,
      undefined,
      headline,
    );
    expect(renderToStaticMarkup(createElement(TerminalLandscape, { card: off }))).not.toContain(
      "Cache reads",
    );
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
      expect(bar.width / 424).toBeCloseTo(card.models![i]!.tokenCount / recap.total);
  });
});

const headline = "47 days in a row with AI, and 6,228 GitHub contributions alongside it";
describe("poster composition", () => {
  const all = Object.fromEntries(
    Object.keys(DEFAULT_SELECTIONS).map((key) => [key, true]),
  ) as typeof DEFAULT_SELECTIONS;
  const githubDays = new Map(recap.days.map((d, i) => [d.date, i % 5 ? i + 1 : 0]));
  for (const format of ["landscape", "square", "story"] as const)
    for (const connected of [false, true])
      for (const selected of [DEFAULT_SELECTIONS, all, { ...all, speed: false }])
        for (const withHeadline of [false, true])
          it(`${format}, GitHub ${connected}, speed ${selected.speed}, headline ${withHeadline}: bounded and filled`, () => {
            const card = makeCard(
              recap,
              selected,
              "dark",
              { text: "33×", monthlyUsd: "300", accounts: 2, days: 30 },
              connected ? 6228 : undefined,
              connected ? githubDays : undefined,
            );
            // Five distinct volume ranks and fourteen timed models stress every region.
            card.models = Array.from({ length: 5 }, (_, i) => ({
              id: `model-${i}`,
              tokenCount: recap.total / (i + 2),
              family: "openai",
            }));
            if (selected.speed)
              card.speeds = Array.from({ length: 14 }, (_, i) => ({
                id: `model-${i}`,
                median: 100 - i,
              }));
            const layout = cardLayout(card, format, withHeadline ? { headline } : {});
            const [width, height] = CARD_SIZES[format];
            const regions = [
              ...layout.texts.map((t) => ({
                id: t.id,
                x: t.align === "right" ? t.x - t.width : t.x,
                y: t.y,
                width: t.width,
                height: cardTextHeight(t),
              })),
              ...layout.bars,
              ...layout.activityBars,
            ];
            for (const a of regions) {
              expect(a.x, a.id).toBeGreaterThanOrEqual(0);
              expect(a.x + a.width, a.id).toBeLessThanOrEqual(width);
              expect(a.y + a.height, a.id).toBeLessThan(height);
            }
            for (let i = 0; i < regions.length; i++)
              for (const b of regions.slice(i + 1)) {
                const a = regions[i]!;
                expect(
                  a.x < b.x + b.width &&
                    a.x + a.width > b.x &&
                    a.y < b.y + b.height &&
                    a.y + a.height > b.y,
                  `${a.id} / ${b.id}`,
                ).toBe(false);
              }
            // 15% allows deliberate breathing room, but rejects the former 33-60% blank bands.
            expect(largestEmptyHorizontalBand(regions, height) / height).toBeLessThan(0.15);
            expect(layout.activityBars.some((b) => b.id.startsWith("token-day-"))).toBe(true);
            expect(layout.activityBars.some((b) => b.id.startsWith("github-day-"))).toBe(connected);
            const headlineText = layout.texts.find((t) => t.id === "headline");
            expect(Boolean(headlineText)).toBe(withHeadline);
            if (headlineText) {
              const minimum = format === "story" ? 44 : format === "square" ? 36 : 30;
              expect(headlineText.size).toBeGreaterThanOrEqual(minimum);
              expect(headlineText.lines?.length ?? 1).toBeLessThanOrEqual(2);
              expect(headlineText.lines?.join(" ")).toBe(headline);
            }
          });
  it("keeps clear space between the story stats grid and the chart header with default toggles", () => {
    for (const connected of [false, true])
      for (const withHeadline of [false, true]) {
        const card = makeCard(
          recap,
          DEFAULT_SELECTIONS,
          "dark",
          undefined,
          connected ? 6228 : undefined,
          connected ? githubDays : undefined,
        );
        const layout = cardLayout(card, "story", withHeadline ? { headline } : {});
        const stats = layout.texts.filter(
          (t) => t.id.startsWith("stat-") || t.id.startsWith("label-"),
        );
        expect(stats.length).toBeGreaterThan(0);
        const bottom = Math.max(...stats.map((t) => t.y + cardTextHeight(t)));
        const heading = layout.texts.find((t) => t.id === "activity-heading");
        expect(heading, `heading missing (GitHub ${connected})`).toBeDefined();
        expect(
          heading!.y - bottom,
          `gap (GitHub ${connected}, headline ${withHeadline})`,
        ).toBeGreaterThanOrEqual(24);
      }
  });
  it("measures horizontal gaps after merging overlapping regions and including canvas edges", () => {
    expect(
      largestEmptyHorizontalBand(
        [
          { y: 10, height: 30 },
          { y: 25, height: 40 },
          { y: 80, height: 10 },
        ],
        100,
      ),
    ).toBe(15);
    expect(largestEmptyHorizontalBand([], 100)).toBe(100);
  });
  it("aligns real GitHub activity with token days and excludes it when deselected", async () => {
    const card = makeCard(recap, DEFAULT_SELECTIONS, "light", undefined, 6228, githubDays);
    expect(card.githubSpark?.length).toBe(card.spark?.length);
    expect(card.githubSpark?.[0]).toBe(0);
    expect(Math.max(...card.githubSpark!)).toBe(1000);
    const decoded = await decodeAnyShareToken(await encodeShareTokenV2(terminalShareV2(card)));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.snapshot).toEqual(terminalShareV2(card));
    expect(
      makeCard(recap, { ...DEFAULT_SELECTIONS, github: false }, "dark", undefined, 6228, githubDays)
        .githubSpark,
    ).toBeUndefined();
    expect(
      makeCard(recap, DEFAULT_SELECTIONS, "dark", undefined, 6228).githubSpark,
    ).toBeUndefined();
  });
});

describe("readable activity and period stats", () => {
  it("prints explicit colored legends and visible independently scaled GitHub bars in every format", () => {
    for (const theme of ["dark", "light"] as const)
      for (const format of ["landscape", "square", "story"] as const) {
        const layout = cardLayout(
          {
            theme,
            start: "2026-09-01",
            end: "2026-09-30",
            totalTokens: 100,
            spark: [1000, 100, 0],
            github: 12,
            githubSpark: [1, 10, 0],
            headline: "47 days in a row with AI, and counting",
          },
          format,
        );
        const orange = layout.texts.find((t) => t.id === "activity-heading")!;
        const green = layout.texts.find((t) => t.id === "github-heading")!;
        expect(orange.text).toBe("■ AI TOKENS / DAY");
        expect(green.text).toBe("■ GITHUB CONTRIBUTIONS / DAY");
        expect(orange.color).toBe(theme === "dark" ? "#ff6a1f" : "#e24e00");
        expect(green.color).toBe(theme === "dark" ? "#4ac26b" : "#238636");
        const bars = layout.activityBars.filter((b) => b.id.startsWith("github-day-"));
        expect(bars).toHaveLength(2);
        expect(Math.min(...bars.map((b) => b.height))).toBeGreaterThanOrEqual(4);
        expect(bars[1]!.height).toBeGreaterThan(20);
        expect(
          cardMetrics({ theme, start: "2026-09-01", end: "2026-09-30", github: 12 }),
        ).toContainEqual({ label: "GITHUB CONTRIBUTIONS", value: "12" });
      }
  });
  it("draws actual server color swatches rather than missing font glyphs", () => {
    const html = renderToStaticMarkup(
      createElement(TerminalLandscape, {
        card: {
          theme: "dark",
          start: "2026-09-01",
          end: "2026-09-30",
          spark: [1000],
          github: 1,
          githubSpark: [1000],
        },
      }),
    );
    expect(html).toContain("AI TOKENS / DAY");
    expect(html).toContain("GITHUB CONTRIBUTIONS / DAY");
    expect(html).not.toContain("■");
    expect(html).toContain("width:9px;height:9px");
    expect(html).toContain('id="terminal-grid"');
  });
  it("uses active period days, ongoing all-history streaks, and preserves old links", async () => {
    const period = { ...recap, period: "30" as const, streak: 47, longestStreak: 47 };
    const card = makeCard(period, DEFAULT_SELECTIONS, "dark");
    expect(cardMetrics(card)).toContainEqual({
      label: "DAYS WITH AI",
      value: `${recap.days.filter((d) => d.records > 0).length}/${recap.days.length}`,
    });
    expect(card.streak).toBeUndefined();
    expect(card.currentStreak).toBeUndefined();
    const decoded = await decodeAnyShareToken(await encodeShareTokenV2(terminalShareV2(card)));
    expect(decoded.ok && decoded.snapshot).toEqual(terminalShareV2(card));
    expect(
      cardMetrics(makeCard({ ...period, period: "all" }, DEFAULT_SELECTIONS, "dark")),
    ).toContainEqual({ label: "CURRENT STREAK", value: "47 days" });
    expect(
      cardMetrics({ theme: "dark", start: recap.start, end: recap.end, streak: 47 }),
    ).toContainEqual({ label: "LONGEST STREAK", value: "47 days" });
  });
});
