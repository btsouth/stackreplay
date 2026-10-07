import type { ShareWorkloadV2 } from "@stackreplay/share";
import type { Recap } from "./recap";
import {
  compact,
  dateLabel,
  dollars,
  familyColor,
  modelDisplayName,
  presentation,
  tokenSplit,
  unresolvedModel,
} from "./terminal-presentation";
import type { PaidFigure } from "./use-paid-multiplier";
export type CardFormat = "landscape" | "square" | "story";
export type CardToggle =
  | "tokens"
  | "usd"
  | "speed"
  | "github"
  | "streak"
  | "models"
  | "peakHour"
  | "paidMultiplier"
  | "headline";
export type CardSelections = Record<CardToggle, boolean>;
export const DEFAULT_SELECTIONS: CardSelections = {
  tokens: true,
  usd: true,
  speed: false,
  github: true,
  streak: true,
  models: true,
  peakHour: false,
  paidMultiplier: false,
  headline: true,
};
export type PublicCard = NonNullable<ShareWorkloadV2["card"]>;
export const CARD_SIZES = {
  landscape: [1200, 630],
  square: [1080, 1080],
  story: [1080, 1920],
} as const;
// Sum each run of days so no active day is skipped on long ranges.
function buckets(values: number[], step: number): number[] {
  const out: number[] = [];
  values.forEach((v, i) => {
    const k = Math.floor(i / step);
    out[k] = (out[k] ?? 0) + v;
  });
  return out;
}
// Scale to 0..1000, keeping every nonzero bucket at 1 or more so it still draws.
function scaled(values: number[]): number[] {
  const max = Math.max(1, ...values);
  return values.map((v) => (v > 0 ? Math.max(1, Math.round((v / max) * 1000)) : 0));
}
export function makeCard(
  r: Recap,
  selected: CardSelections,
  theme: "dark" | "light",
  paid?: PaidFigure,
  github?: number,
  githubDays?: ReadonlyMap<string, number>,
  headline?: string,
): PublicCard {
  const p = presentation(r),
    top = p.top.slice(0, 5);
  const step = Math.max(1, Math.ceil(p.days.length / 64));
  const tokenBuckets = buckets(
      p.days.map((d) => d.total),
      step,
    ),
    githubBuckets = buckets(
      p.days.map((d) => githubDays?.get(d.date) ?? 0),
      step,
    );
  const insight = headline?.trim();
  const split = tokenSplit(r);
  return {
    theme,
    start: r.start,
    end: r.end,
    ...(selected.tokens
      ? {
          totalTokens: r.total,
          ...(split ? { cacheShare: Math.round(split.cacheShare * 100) } : {}),
          spark: scaled(tokenBuckets),
        }
      : {}),
    ...(selected.usd && r.priced
      ? { usd: r.usd, pricedRequests: r.priced, requests: r.records }
      : {}),
    ...(selected.speed && p.speeds.length
      ? { speeds: p.speeds.map((m) => ({ id: m.id, median: m.median })) }
      : {}),
    ...(selected.github && github !== undefined
      ? {
          github,
          ...(githubDays
            ? {
                githubSpark: scaled(githubBuckets),
              }
            : {}),
        }
      : {}),
    ...(selected.streak
      ? r.period === "all"
        ? r.streak > 0
          ? { currentStreak: r.streak }
          : { streak: r.longestStreak }
        : { aiDays: { active: r.days.filter((d) => d.records > 0).length, total: r.days.length } }
      : {}),
    ...(selected.models
      ? { models: top.map((m) => ({ id: m.id, tokenCount: m.total, family: m.family })) }
      : {}),
    ...(selected.peakHour ? { peakHour: p.peakHour } : {}),
    ...(selected.paidMultiplier && paid
      ? { paidMultiplier: Number(paid.text.replace("×", "")) }
      : {}),
    ...(selected.headline && insight ? { headline: insight } : {}),
  };
}
export function cardName(id: string): string {
  return modelDisplayName(id);
}
export function cardMetrics(card: PublicCard) {
  return [
    ...(card.usd !== undefined ? [{ label: "API VALUE", value: dollars(card.usd) }] : []),
    ...(card.github !== undefined
      ? [{ label: "GITHUB CONTRIBUTIONS", value: card.github.toLocaleString("en-US") }]
      : []),
    ...(card.aiDays !== undefined
      ? [{ label: "DAYS WITH AI", value: `${card.aiDays.active}/${card.aiDays.total}` }]
      : []),
    ...(card.currentStreak !== undefined
      ? [{ label: "CURRENT STREAK", value: `${card.currentStreak} days` }]
      : []),
    ...(card.streak !== undefined
      ? [{ label: "LONGEST STREAK", value: `${card.streak} days` }]
      : []),
    ...(card.peakHour !== undefined
      ? [{ label: "PEAK HOUR", value: `${String(card.peakHour).padStart(2, "0")}:00` }]
      : []),
    ...(card.paidMultiplier !== undefined
      ? [{ label: "VS. PLAN PRICE", value: `${card.paidMultiplier}×` }]
      : []),
  ];
}
export function cardTitle(card: PublicCard) {
  return card.totalTokens !== undefined
    ? compact(card.totalTokens)
    : card.usd !== undefined
      ? dollars(card.usd)
      : "AI CODING";
}
export function cardPeriod(card: PublicCard) {
  return `${dateLabel(card.start).toUpperCase()} to ${dateLabel(card.end, true).toUpperCase()}`;
}
export interface CardText {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  width: number;
  align?: "left" | "right";
  font?: "sans" | "mono";
  dim?: boolean;
  signal?: boolean;
  color?: string;
  tight?: boolean;
  /** Pre-wrapped lines for short multi-line copy; absent for single-line text. */
  lines?: string[];
}
/** Reserved height for a text region, counting every wrapped line. */
export function cardTextHeight(t: Pick<CardText, "size" | "lines">) {
  return t.lines ? t.size * 1.16 * t.lines.length : t.size;
}
/** Wraps a short headline into at most `maxLines` lines for the given box. */
export function wrapCardText(text: string, width: number, size: number, maxLines = 2): string[] {
  const perLine = Math.max(1, Math.floor(width / (size * 0.52)));
  const words = text.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > perLine) {
      if (lines.length >= maxLines - 1) {
        current = candidate;
        continue;
      }
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines.length ? lines.slice(0, maxLines) : [text];
}
export interface CardTextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface CardRenderOptions {
  /** One line supplied by the caller; absent until the headline toggle is available. */
  headline?: string;
}
export interface CardBar extends CardTextBox {
  color: string;
}
/** Largest gap between actual content bounds; decorative backgrounds do not count. */
export function largestEmptyHorizontalBand(
  regions: Pick<CardTextBox, "y" | "height">[],
  height: number,
) {
  let bottom = 0,
    largest = 0;
  for (const region of [...regions].sort((a, b) => a.y - b.y)) {
    const top = Math.max(0, Math.min(height, region.y));
    largest = Math.max(largest, top - bottom);
    bottom = Math.max(bottom, Math.min(height, region.y + region.height));
  }
  return Math.max(largest, height - bottom);
}
/** Whole-percent pricing coverage label for the selected dollar figure. */
export function cardCoverage(card: PublicCard) {
  if (card.usd === undefined) return undefined;
  return card.pricedRequests !== undefined && card.requests
    ? `${Math.round((card.pricedRequests / card.requests) * 100)}% PRICED`
    : "COVERAGE UNREPORTED";
}
/** Explicit, bounded regions shared by canvas and the public image renderer. */
export function cardLayout(card: PublicCard, format: CardFormat, options: CardRenderOptions = {}) {
  const [w, h] = CARD_SIZES[format];
  const story = format === "story",
    square = format === "square",
    landscape = !story && !square;
  const pad = 56,
    width = w - pad * 2;
  // Every format keeps its smallest labels readable, so the card survives a
  // phone feed unchanged. Landscape is sparse: one lead figure and up to five
  // supporting readouts, with no model or speed list.
  const small = story ? 26 : square ? 20 : 18;
  const texts: CardText[] = [],
    bars: CardBar[] = [],
    activityBars: CardBar[] = [];
  const add = (
    id: string,
    text: string,
    x: number,
    y: number,
    size: number,
    boxWidth: number,
    extra: Partial<CardText> = {},
  ) => texts.push({ id, text, x, y, size, width: boxWidth, ...extra });
  add("brand", "STACKREPLAY", pad + 32, story ? 64 : 36, story ? 28 : 20, 300, { dim: true });
  add(
    "period",
    cardPeriod(card),
    story ? pad : w - pad,
    story ? 112 : 38,
    story ? 26 : square ? 20 : 18,
    story ? width : width - 380,
    { dim: true, align: story ? "left" : "right" },
  );
  const headlineText = (options.headline?.trim() || card.headline?.trim() || "").trim();
  // The story card has less width for a trailing word; keep the shorter, true form.
  const storyEveryDay = story
    ? headlineText.match(/^You used AI every day of this (\d+)-day period$/iu)
    : null;
  const storyHeadline = storyEveryDay ? `AI on all ${storyEveryDay[1]} days` : headlineText;
  const headlineSize = story ? 44 : square ? 36 : 30;
  const headlineLines = storyHeadline ? wrapCardText(storyHeadline, width, headlineSize) : [];
  const hasHeadline = headlineLines.length > 0;
  if (hasHeadline)
    add("headline", storyHeadline, pad, story ? 178 : square ? 80 : 78, headlineSize, width, {
      font: "sans",
      lines: headlineLines,
    });
  const metrics = cardMetrics(card);
  // Landscape with models: hero left, ranked models right, a full-width chart,
  // then one row of readouts. Without models the readouts take the right half.
  const landscapeSpeeds = landscape && (card.speeds?.length ?? (card.speed ? 1 : 0)) > 0;
  const wide = landscape && ((card.models?.length ?? 0) > 0 || landscapeSpeeds);
  const speeds = card.speeds ?? (card.speed ? [card.speed] : []),
    dense = speeds.length > 0 || metrics.length > 4;
  const heroY = story
    ? hasHeadline
      ? 300
      : 210
    : square
      ? hasHeadline
        ? 176
        : 138
      : wide
        ? hasHeadline
          ? 136
          : 104
        : hasHeadline
          ? 168
          : 120;
  const heroSize = story
    ? hasHeadline
      ? 150
      : 260
    : square
      ? hasHeadline
        ? 132
        : 156
      : wide
        ? hasHeadline
          ? 100
          : 124
        : hasHeadline
          ? 104
          : 144;
  const heroWidth = wide ? 580 : landscape ? 620 : square ? 490 : width;
  add("hero", cardTitle(card), pad, heroY, heroSize, heroWidth, { tight: true });
  const captionText =
    card.totalTokens !== undefined
      ? `TOKENS OF AI CODING${card.cacheShare !== undefined ? ` · ${card.cacheShare}% CACHED CONTEXT` : ""}`
      : "YOUR AI CODING";
  add("caption", captionText, pad, heroY + heroSize + 8, story ? 30 : square ? 22 : 20, heroWidth, {
    dim: true,
  });
  // Landscape spends the right half on the readouts; square and story keep the
  // ranked model list beside the hero.
  // With the speed board selected, landscape gives its right column to speed.
  const models = wide
    ? landscapeSpeeds
      ? []
      : (card.models?.slice(0, 4) ?? [])
    : landscape
      ? []
      : (card.models?.slice(0, 5) ?? []);
  const modelX = wide ? 680 : square ? 600 : pad;
  const modelWidth = wide ? w - pad - 680 : square ? 424 : width;
  const modelY = story
    ? hasHeadline
      ? dense
        ? 560
        : 600
      : dense
        ? 638
        : 674
    : square
      ? hasHeadline
        ? 214
        : 182
      : heroY + 40;
  const modelStep = story ? (dense ? 84 : 110) : wide ? 42 : 58;
  const modelSize = story ? (dense ? 40 : 44) : wide ? 22 : 24;
  if (models.length)
    add(
      "models-heading",
      "TOP MODELS",
      modelX,
      story ? modelY - 56 : modelY - 42,
      story ? 26 : 20,
      modelWidth,
      { dim: true },
    );
  const total = card.totalTokens ?? models.reduce((sum, m) => sum + m.tokenCount, 0);
  models.forEach((m, i) => {
    const y = modelY + i * modelStep,
      valueWidth = story ? 180 : 100;
    add(
      `model-name-${i}`,
      `${i + 1}. ${cardName(m.id)}`,
      modelX,
      y,
      modelSize,
      modelWidth - valueWidth - 20,
      { font: "sans", dim: unresolvedModel(m.id) },
    );
    add(`model-value-${i}`, compact(m.tokenCount), modelX + modelWidth, y, modelSize, valueWidth, {
      align: "right",
      dim: true,
      tight: true,
    });
    bars.push({
      id: `model-bar-${i}`,
      x: modelX,
      y: y + (story ? 60 : wide ? 30 : 36),
      width: modelWidth * Math.min(1, m.tokenCount / Math.max(1, total)),
      height: story ? 8 : 5,
      color: familyColor(m.family ?? "other")!,
    });
  });
  if (landscapeSpeeds) {
    add("speed-heading", "SPEED · MEDIAN TOK/S", modelX, modelY - 42, 20, modelWidth, {
      dim: true,
    });
    speeds.slice(0, 4).forEach((speed, i) => {
      const y = modelY + i * modelStep;
      add(`speed-name-${i}`, cardName(speed.id), modelX, y, modelSize, modelWidth - 120, {
        font: "sans",
        dim: unresolvedModel(speed.id),
      });
      add(`speed-value-${i}`, speed.median.toFixed(1), modelX + modelWidth, y, modelSize, 100, {
        align: "right",
        dim: true,
        tight: true,
      });
    });
  }
  let statsBottom = 0;
  const footerY = h - (story ? 68 : 44);
  // Wide landscape: readouts in one row (two if many are chosen) above the footer.
  const statColumns = Math.min(Math.max(1, metrics.length), 4),
    statRows = Math.ceil(metrics.length / statColumns),
    statValueSize = statRows > 1 ? 28 : 38,
    statStep = statValueSize + 8 + 18 + (statRows > 1 ? 10 : 0),
    statsTop = footerY - 18 - statRows * statStep;
  if (wide) {
    metrics.forEach((m, i) => {
      const x = pad + ((i % statColumns) * width) / statColumns,
        y = statsTop + Math.floor(i / statColumns) * statStep,
        cellWidth = width / statColumns - 20;
      add(`stat-${i}`, m.value, x, y, statValueSize, cellWidth, { tight: true });
      add(`label-${i}`, m.label, x, y + statValueSize + 8, 18, cellWidth, { dim: true });
      statsBottom = Math.max(statsBottom, y + statValueSize + 8 + 18);
    });
  } else if (landscape) {
    // One readout per row in the right half, scaled to the count that was chosen.
    const columnX = 680,
      columnWidth = w - pad - columnX,
      top = hasHeadline ? 170 : 120,
      bottom = 470,
      rows = Math.max(1, metrics.length),
      rowHeight = (bottom - top) / rows,
      valueSize = Math.max(24, Math.min(72, Math.floor(rowHeight) - 40)),
      labelSize = 18;
    metrics.forEach((m, i) => {
      const y = top + i * rowHeight;
      add(`stat-${i}`, m.value, columnX, y, valueSize, columnWidth, { tight: true });
      add(`label-${i}`, m.label, columnX, y + valueSize + 8, labelSize, columnWidth, { dim: true });
      statsBottom = Math.max(statsBottom, y + valueSize + 8 + labelSize);
    });
  } else {
    const columns = square ? Math.min(Math.max(1, metrics.length), 3) : 2;
    const metricY = story ? (hasHeadline ? (dense ? 1000 : 1300) : dense ? 1070 : 1270) : 520;
    const rows = Math.ceil(metrics.length / columns);
    const metricSize = story ? (dense ? 60 : 72) : rows > 1 ? 34 : 54;
    const metricStep = story ? (dense ? 112 : 140) : metricSize + 34;
    const labelSize = story ? 26 : 20;
    metrics.forEach((m, i) => {
      const x = pad + ((i % columns) * width) / columns,
        y = metricY + Math.floor(i / columns) * metricStep;
      const cellWidth = width / columns - 20;
      const labelY = y + metricSize + (story ? 12 : 10);
      add(`stat-${i}`, m.value, x, y, metricSize, cellWidth, { tight: true });
      add(`label-${i}`, m.label, x, labelY, labelSize, cellWidth, { dim: true });
      statsBottom = Math.max(statsBottom, labelY + labelSize);
    });
  }
  if (!landscape && speeds.length) {
    const headingY = story ? (hasHeadline ? 1330 : 1412) : 680;
    const topY = headingY + (story ? 38 : 32);
    const available = story ? 142 : 118;
    const cols = 3,
      rows = Math.ceil(speeds.length / cols);
    const rowHeight = Math.min(story ? 28 : 26, available / rows);
    const size = story ? Math.max(26, rowHeight - 2) : Math.min(20, rowHeight - 3);
    const speedWidth = width;
    add("speed-heading", "SPEED BOARD · MEDIAN TOK/S", pad, headingY, story ? 26 : 20, speedWidth, {
      dim: true,
    });
    speeds.forEach((speed, i) => {
      const x = pad + ((i % cols) * speedWidth) / cols,
        y = topY + Math.floor(i / cols) * rowHeight;
      const cellWidth = speedWidth / cols - 18,
        valueWidth = story ? 62 : 52;
      add(`speed-name-${i}`, cardName(speed.id), x, y, size, cellWidth - valueWidth - 8, {
        font: "sans",
      });
      add(`speed-value-${i}`, speed.median.toFixed(1), x + cellWidth, y, size, valueWidth, {
        align: "right",
        dim: true,
        tight: true,
      });
    });
  }
  // Activity has its own region, including when models and speed are selected.
  const tokenSeries = card.spark ?? [],
    githubSeries = card.github !== undefined ? (card.githubSpark ?? []) : [];
  const connected = githubSeries.length > 0;
  const rightRows = landscapeSpeeds ? Math.min(4, speeds.length) : models.length;
  const lastModelBottom = rightRows ? modelY + (rightRows - 1) * modelStep + 36 : 0;
  const activityY = wide
    ? Math.max(heroY + heroSize + 48, lastModelBottom + 16)
    : landscape
      ? 380
      : story
        ? Math.max(
            hasHeadline ? (speeds.length ? 1550 : 1560) : speeds.length ? 1630 : 1560,
            statsBottom + 24,
          )
        : square
          ? speeds.length
            ? 858
            : 680
          : hasHeadline
            ? 406
            : 348;
  const chartWidth = landscape && !wide ? 620 : width;
  const chartTop = wide
    ? activityY + 30
    : landscape
      ? 404
      : activityY + (story ? 46 : square ? 42 : 24);
  const chartBottom = wide
      ? statsTop - 22
      : landscape
        ? 520
        : story
          ? 1800
          : square
            ? 976
            : hasHeadline
              ? 510
              : 500,
    chartHeight = chartBottom - chartTop;
  const tokenHeight = tokenSeries.length ? (connected ? (chartHeight - 4) * 0.55 : chartHeight) : 0,
    baseline = chartTop + tokenHeight;
  const signal = card.theme === "dark" ? "#ff6a1f" : "#e24e00";
  const green = card.theme === "dark" ? "#4ac26b" : "#238636";
  if (tokenSeries.length || connected) {
    add(
      "activity-heading",
      tokenSeries.length ? "■ AI TOKENS / DAY" : "■ GITHUB CONTRIBUTIONS / DAY",
      pad,
      activityY,
      small,
      tokenSeries.length && connected ? chartWidth * 0.4 : chartWidth,
      { color: tokenSeries.length ? signal : green },
    );
    if (tokenSeries.length && connected)
      add(
        "github-heading",
        "■ GITHUB CONTRIBUTIONS / DAY",
        pad + chartWidth * 0.4,
        activityY,
        small,
        chartWidth * 0.6,
        { color: green },
      );
  }
  const githubMax = Math.max(1, ...githubSeries);
  const githubHeight = Math.max(0, chartBottom - baseline - 4);
  tokenSeries.forEach((value, i) => {
    if (!value) return;
    const slot = chartWidth / tokenSeries.length,
      bh = Math.max(Math.min(4, tokenHeight), (value / 1000) * tokenHeight);
    activityBars.push({
      id: `token-day-${i}`,
      x: pad + i * slot,
      y: baseline - bh,
      width: slot * 0.7,
      height: bh,
      color: signal,
    });
  });
  githubSeries.forEach((value, i) => {
    if (!value) return;
    const slot = chartWidth / githubSeries.length,
      bh = Math.max(Math.min(4, githubHeight), (value / githubMax) * githubHeight);
    activityBars.push({
      id: `github-day-${i}`,
      x: pad + i * slot,
      y: baseline + 4,
      width: slot * 0.7,
      height: bh,
      color: green,
    });
  });
  const footerBrandY = footerY;
  const coverage = cardCoverage(card);
  const oneLineFooter = !story && coverage !== undefined;
  add(
    "footer-brand",
    "STACKREPLAY.COM",
    pad,
    footerBrandY,
    story ? 26 : square ? 20 : 18,
    oneLineFooter ? width * 0.28 : width / 2,
    {
      dim: true,
    },
  );
  add(
    "footer-note",
    oneLineFooter
      ? `LIST-PRICE ESTIMATE · ${coverage} · NOT A BILL`
      : "REPORTED USAGE · NOT A BILL",
    w - pad,
    footerBrandY,
    story ? 26 : square ? 20 : 18,
    oneLineFooter ? width * 0.68 : width / 2,
    {
      dim: true,
      align: "right",
    },
  );
  if (coverage !== undefined && !oneLineFooter)
    add(
      "footer-coverage",
      `API LIST-PRICE ESTIMATE · ${coverage}`,
      w - pad,
      footerBrandY - (story ? 32 : 28),
      story ? 26 : square ? 20 : 18,
      width,
      { dim: true, align: "right" },
    );
  return { texts, models, bars, activityBars, chart: { top: chartTop, bottom: chartBottom } };
}

/** Draw and return the actual measured text boxes for the export overlap check. */
export function drawCard(
  canvas: HTMLCanvasElement,
  card: PublicCard,
  format: CardFormat,
  options: CardRenderOptions = {},
): CardTextBox[] {
  const [w, h] = CARD_SIZES[format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Canvas unavailable");
  const dark = card.theme === "dark",
    bg = dark ? "#08090a" : "#f3f2ed",
    fg = dark ? "#eceee9" : "#121413",
    dim = dark ? "#8d9691" : "#5c625e",
    line = dark ? "#1c2022" : "#dedcd3",
    signal = dark ? "#ff6a1f" : "#e24e00";
  const style = getComputedStyle(document.documentElement);
  const mono = style.getPropertyValue("--font-geist-mono").trim() || "monospace",
    sans = style.getPropertyValue("--font-geist-sans").trim() || "sans-serif";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h * 0.6);
    ctx.stroke();
  }
  for (let y = 0; y < h * 0.6; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.fillStyle = signal;
  ctx.fillRect(56, format === "story" ? 69 : 39, 18, 18);
  const layout = cardLayout(card, format, options);
  for (const bar of [...layout.bars, ...layout.activityBars]) {
    ctx.fillStyle = bar.color;
    ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
  }
  const boxes: CardTextBox[] = [];
  ctx.textBaseline = "top";
  for (const t of layout.texts) {
    const font = t.font === "sans" ? sans : mono;
    let size = t.size;
    ctx.fillStyle = t.color ?? (t.signal ? signal : t.dim ? dim : fg);
    ctx.textAlign = "left";
    if (t.lines && t.lines.length) {
      const measureLines = () => {
        ctx.font = `500 ${size}px ${font}`;
        return t.lines!.map((line) => ctx.measureText(line).width);
      };
      let widths = measureLines();
      let widest = Math.max(...widths);
      if (widest > t.width) {
        size *= t.width / widest;
        widths = measureLines();
        widest = Math.max(...widths);
      }
      const lineStep = size * 1.16;
      const x = t.align === "right" ? t.x - widest : t.x;
      t.lines.forEach((line, i) => {
        ctx.font = `500 ${size}px ${font}`;
        ctx.fillText(line, x, t.y + i * lineStep);
      });
      ctx.font = `500 ${size}px ${font}`;
      const first = ctx.measureText(t.lines[0]!);
      const last = ctx.measureText(t.lines[t.lines.length - 1]!);
      boxes.push({
        id: t.id,
        x,
        y: t.y - first.actualBoundingBoxAscent,
        width: widest,
        height:
          (t.lines.length - 1) * lineStep +
          first.actualBoundingBoxAscent +
          last.actualBoundingBoxDescent,
      });
      continue;
    }
    const measure = () => {
      ctx.font = `500 ${size}px ${font}`;
      return ctx.measureText(t.text).width - (t.tight && t.text.includes(".") ? size * 0.24 : 0);
    };
    let width = measure();
    if (width > t.width) {
      size *= t.width / width;
      width = measure();
    }
    ctx.fillStyle = t.color ?? (t.signal ? signal : t.dim ? dim : fg);
    ctx.textAlign = "left";
    let x = t.align === "right" ? t.x - width : t.x;
    const left = x;
    if (t.tight && t.text.includes(".")) {
      const dot = t.text.indexOf("."),
        a = t.text.slice(0, dot),
        b = t.text.slice(dot + 1);
      ctx.fillText(a, x, t.y);
      x += ctx.measureText(a).width - size * 0.12;
      ctx.fillText(".", x, t.y);
      x += ctx.measureText(".").width - size * 0.12;
      ctx.fillText(b, x, t.y);
    } else ctx.fillText(t.text, x, t.y);
    const measured = ctx.measureText(t.text);
    boxes.push({
      id: t.id,
      x: left,
      y: t.y - measured.actualBoundingBoxAscent,
      width,
      height: measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent,
    });
  }
  canvas.dataset.textBoxes = JSON.stringify(boxes);
  canvas.dataset.activityBand = JSON.stringify(layout.chart);
  canvas.dataset.emptyBand = String(
    largestEmptyHorizontalBand([...boxes, ...layout.bars, ...layout.activityBars], h),
  );
  return boxes;
}
export async function renderTerminalCard(
  card: PublicCard,
  format: CardFormat,
  options: CardRenderOptions = {},
): Promise<Blob> {
  await document.fonts.ready;
  await document.fonts.load(
    `500 24px ${getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono")}`,
  );
  const canvas = document.createElement("canvas");
  drawCard(canvas, card, format, options);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(Error("Image export failed"))), "image/png"),
  );
}
