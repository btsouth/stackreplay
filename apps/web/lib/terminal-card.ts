import type { ShareWorkloadV2 } from "@stackreplay/share";
import type { Recap } from "./recap";
import {
  compact,
  dateLabel,
  dollars,
  familyColor,
  modelDisplayName,
  presentation,
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
  | "paidMultiplier";
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
};
export type PublicCard = NonNullable<ShareWorkloadV2["card"]>;
export const CARD_SIZES = {
  landscape: [1200, 630],
  square: [1080, 1080],
  story: [1080, 1920],
} as const;
export function makeCard(
  r: Recap,
  selected: CardSelections,
  theme: "dark" | "light",
  paid?: PaidFigure,
  github?: number,
  githubDays?: ReadonlyMap<string, number>,
): PublicCard {
  const p = presentation(r),
    top = p.top.slice(0, 5);
  const max = Math.max(1, ...p.days.map((d) => d.total));
  const githubMax = Math.max(1, ...p.days.map((d) => githubDays?.get(d.date) ?? 0));
  const step = Math.max(1, Math.ceil(p.days.length / 64));
  return {
    theme,
    start: r.start,
    end: r.end,
    ...(selected.tokens
      ? {
          totalTokens: r.total,
          spark: p.days
            .filter((_, i) => i % step === 0)
            .map((d) => Math.round((d.total / max) * 1000)),
        }
      : {}),
    ...(selected.usd && r.priced ? { usd: r.usd } : {}),
    ...(selected.speed && p.speeds.length
      ? { speeds: p.speeds.map((m) => ({ id: m.id, median: m.median })) }
      : {}),
    ...(selected.github && github !== undefined
      ? {
          github,
          ...(githubDays
            ? {
                githubSpark: p.days
                  .filter((_, i) => i % step === 0)
                  .map((d) => Math.round(((githubDays.get(d.date) ?? 0) / githubMax) * 1000)),
              }
            : {}),
        }
      : {}),
    ...(selected.streak ? { streak: r.longestStreak } : {}),
    ...(selected.models
      ? { models: top.map((m) => ({ id: m.id, tokenCount: m.total, family: m.family })) }
      : {}),
    ...(selected.peakHour ? { peakHour: p.peakHour } : {}),
    ...(selected.paidMultiplier && paid
      ? { paidMultiplier: Number(paid.text.replace("×", "")) }
      : {}),
  };
}
export function cardName(id: string): string {
  return modelDisplayName(id);
}
export function cardMetrics(card: PublicCard) {
  return [
    ...(card.usd !== undefined ? [{ label: "API VALUE", value: dollars(card.usd) }] : []),
    ...(card.github !== undefined
      ? [{ label: "CONTRIBUTIONS", value: card.github.toLocaleString("en-US") }]
      : []),
    ...(card.streak !== undefined
      ? [{ label: "LONGEST STREAK", value: `${card.streak} days` }]
      : []),
    ...(card.peakHour !== undefined
      ? [{ label: "PEAK HOUR", value: `${String(card.peakHour).padStart(2, "0")}:00` }]
      : []),
    ...(card.paidMultiplier !== undefined
      ? [{ label: "VS. WHAT YOU PAID", value: `${card.paidMultiplier}×` }]
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
  tight?: boolean;
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
/** Explicit, bounded regions shared by canvas and the public image renderer. */
export function cardLayout(card: PublicCard, format: CardFormat, options: CardRenderOptions = {}) {
  const [w, h] = CARD_SIZES[format];
  const story = format === "story",
    square = format === "square",
    landscape = !story && !square;
  const pad = 56,
    width = w - pad * 2;
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
    story ? 24 : 18,
    story ? width : width - 380,
    { dim: true, align: story ? "left" : "right" },
  );
  if (options.headline?.trim())
    add(
      "headline",
      options.headline.trim(),
      pad,
      story ? 178 : 80,
      story ? 26 : square ? 20 : 18,
      width,
      { font: "sans" },
    );
  const metrics = cardMetrics(card);
  const speeds = card.speeds ?? (card.speed ? [card.speed] : []),
    dense = speeds.length > 0 || metrics.length > 4;
  const heroY = story
    ? options.headline
      ? 236
      : 210
    : square
      ? 138
      : options.headline
        ? 118
        : 100;
  add(
    "hero",
    cardTitle(card),
    pad,
    heroY,
    story ? 260 : square ? 156 : 144,
    story ? width : square ? 490 : 600,
    { tight: true },
  );
  add(
    "caption",
    card.totalTokens !== undefined ? "TOKENS OF AI CODING" : "YOUR AI CODING",
    pad,
    story ? heroY + 282 : square ? 318 : 270,
    story ? 30 : square ? 22 : 20,
    story ? width : square ? 490 : 600,
    { dim: true },
  );
  const models = card.models?.slice(0, 5) ?? [];
  const modelX = landscape ? 716 : square ? 600 : pad;
  const modelWidth = landscape ? 428 : square ? 424 : width;
  const modelY = story ? (dense ? 638 : 674) : square ? 182 : 140;
  const modelStep = story ? (dense ? 84 : 110) : square ? 58 : 43;
  const modelSize = story ? (dense ? 40 : 44) : square ? 24 : 20;
  if (models.length)
    add(
      "models-heading",
      "TOP MODELS",
      modelX,
      story ? modelY - 56 : modelY - 42,
      story ? 24 : 16,
      modelWidth,
      { dim: true },
    );
  const total = card.totalTokens ?? models.reduce((sum, m) => sum + m.tokenCount, 0);
  models.forEach((m, i) => {
    const y = modelY + i * modelStep,
      valueWidth = story ? 180 : square ? 100 : 80;
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
      y: y + (story ? 60 : square ? 36 : 28),
      width: modelWidth * Math.min(1, m.tokenCount / Math.max(1, total)),
      height: story ? 8 : 5,
      color: familyColor(m.family ?? "other")!,
    });
  });
  const columns = story ? 2 : Math.max(1, metrics.length);
  const metricY = story ? (dense ? 1070 : 1270) : square ? 520 : 514;
  const metricStep = story ? (dense ? 112 : 140) : 0;
  const metricSize = story ? (dense ? 60 : 72) : square ? (metrics.length > 3 ? 36 : 54) : 34;
  metrics.forEach((m, i) => {
    const x = pad + ((i % columns) * width) / columns,
      y = metricY + Math.floor(i / columns) * metricStep;
    const cellWidth = width / columns - 20;
    add(`stat-${i}`, m.value, x, y, metricSize, cellWidth, { tight: true });
    add(
      `label-${i}`,
      m.label,
      x,
      y + metricSize + (story ? 12 : 10),
      story ? 22 : square ? 16 : 13,
      cellWidth,
      { dim: true },
    );
  });
  if (speeds.length) {
    const headingY = story ? 1412 : square ? 634 : 300;
    const topY = headingY + (story ? 38 : square ? 32 : 26);
    const available = story ? 142 : square ? 118 : 78;
    const cols = 3,
      rows = Math.ceil(speeds.length / cols);
    const rowHeight = Math.min(story ? 28 : square ? 26 : 20, available / rows);
    const size = Math.min(story ? 23 : square ? 20 : 16, rowHeight - 3);
    const speedWidth = landscape ? 624 : width;
    add(
      "speed-heading",
      "SPEED BOARD · MEDIAN TOK/S",
      pad,
      headingY,
      story ? 22 : square ? 18 : 14,
      speedWidth,
      { dim: true },
    );
    speeds.forEach((speed, i) => {
      const x = pad + ((i % cols) * speedWidth) / cols,
        y = topY + Math.floor(i / cols) * rowHeight;
      const cellWidth = speedWidth / cols - 18,
        valueWidth = story ? 62 : square ? 52 : 38;
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
  const activityY = story
    ? speeds.length
      ? 1630
      : 1560
    : square
      ? speeds.length
        ? 800
        : 658
      : speeds.length
        ? 408
        : 348;
  const chartTop = activityY + (story ? 46 : square ? 42 : 28);
  const chartBottom = story ? 1800 : square ? 976 : 490,
    chartHeight = chartBottom - chartTop;
  const tokenHeight = tokenSeries.length ? (connected ? chartHeight * 0.67 : chartHeight) : 0,
    baseline = chartTop + tokenHeight;
  if (tokenSeries.length || connected) {
    add(
      "activity-heading",
      tokenSeries.length ? "TOKENS / DAY" : "GITHUB / DAY",
      pad,
      activityY,
      story ? 24 : square ? 18 : 14,
      width / 2,
      { dim: true },
    );
    if (tokenSeries.length && connected)
      add(
        "github-heading",
        "GITHUB / DAY ↓",
        w - pad,
        activityY,
        story ? 24 : square ? 18 : 14,
        width / 2,
        { align: "right", dim: true },
      );
  }
  const signal = card.theme === "dark" ? "#ff6a1f" : "#e24e00";
  const green = card.theme === "dark" ? "#4ac26b" : "#238636";
  tokenSeries.forEach((value, i) => {
    if (!value) return;
    const slot = width / tokenSeries.length,
      bh = (value / 1000) * tokenHeight;
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
    const slot = width / githubSeries.length,
      bh = (value / 1000) * (chartHeight - tokenHeight);
    activityBars.push({
      id: `github-day-${i}`,
      x: pad + i * slot,
      y: baseline + 3,
      width: slot * 0.7,
      height: Math.max(0, bh - 3),
      color: green,
    });
  });
  add("footer-brand", "STACKREPLAY.COM", pad, h - (story ? 68 : 44), story ? 24 : 16, width / 2, {
    dim: true,
  });
  add(
    "footer-note",
    "REPORTED USAGE · NOT A BILL",
    w - pad,
    h - (story ? 68 : 44),
    story ? 21 : 14,
    width / 2,
    { dim: true, align: "right" },
  );
  return { texts, models, bars, activityBars };
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
    const measure = () => {
      ctx.font = `500 ${size}px ${font}`;
      return ctx.measureText(t.text).width - (t.tight && t.text.includes(".") ? size * 0.24 : 0);
    };
    let width = measure();
    if (width > t.width) {
      size *= t.width / width;
      width = measure();
    }
    ctx.fillStyle = t.signal ? signal : t.dim ? dim : fg;
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
