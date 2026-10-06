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
): PublicCard {
  const p = presentation(r),
    top = p.top.slice(0, 5);
  const max = Math.max(1, ...p.days.map((d) => d.total));
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
    ...(selected.github && github !== undefined ? { github } : {}),
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
/** Explicit, bounded regions are shared by canvas and the public image renderer. */
export function cardLayout(card: PublicCard, format: CardFormat) {
  const [w, h] = CARD_SIZES[format];
  const story = format === "story",
    square = format === "square",
    pad = 56,
    width = w - pad * 2;
  const texts: CardText[] = [];
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
  const speeds = card.speeds ?? (card.speed ? [card.speed] : []);
  add("hero", cardTitle(card), pad, story ? 230 : square ? 140 : 104, story ? 260 : 156, width, {
    tight: true,
  });
  add(
    "caption",
    card.totalTokens !== undefined ? "TOKENS OF AI CODING" : "YOUR AI CODING",
    pad,
    story ? 520 : square ? 316 : 278,
    story ? 30 : 22,
    width,
    { dim: true },
  );
  const metrics = cardMetrics(card);
  const columns = story ? 2 : 3,
    step = story ? 120 : square ? 78 : 80;
  const metricY = story ? 1150 : square ? 700 : 430;
  metrics.forEach((m, i) => {
    const x = pad + ((i % columns) * width) / columns,
      y = metricY + Math.floor(i / columns) * step,
      cellWidth = width / columns - 28;
    add(`stat-${i}`, m.value, x, y, story ? 64 : 32, cellWidth, { tight: true });
    add(`label-${i}`, m.label, x, y + (story ? 76 : 42), story ? 22 : 14, cellWidth, { dim: true });
  });
  // A landscape speed board replaces the model/sparkline strip, never a metric or hero.
  const models = card.models?.slice(0, format === "landscape" ? 3 : 5) ?? [];
  const bars: { x: number; y: number; width: number; height: number; color: string }[] = [];
  if (models.length && !(format === "landscape" && speeds.length)) {
    if (format !== "landscape")
      add("models-heading", "TOP MODELS", pad, story ? 620 : 370, story ? 24 : 16, width, {
        dim: true,
      });
    models.forEach((m, i) => {
      const landscape = format === "landscape";
      const x = landscape ? pad + (i * width) / 3 : pad;
      const y = story ? 680 + i * 92 : square ? 410 + i * 52 : 332;
      const cellWidth = landscape ? width / 3 - 24 : width;
      add(
        `model-name-${i}`,
        cardName(m.id),
        x,
        y,
        story ? 36 : square ? 24 : 20,
        landscape ? cellWidth : cellWidth - 210,
        { font: "sans", dim: unresolvedModel(m.id) },
      );
      add(
        `model-value-${i}`,
        compact(m.tokenCount),
        landscape ? x : w - pad,
        landscape ? y + 32 : y,
        story ? 36 : square ? 24 : 22,
        landscape ? cellWidth : 190,
        { align: landscape ? "left" : "right", dim: true, tight: true },
      );
      if (!landscape) {
        const total = card.totalTokens ?? models.reduce((sum, model) => sum + model.tokenCount, 0);
        bars.push({
          x,
          y: y + (story ? 52 : 34),
          width: cellWidth * Math.min(1, m.tokenCount / Math.max(1, total)),
          height: story ? 8 : 5,
          color: familyColor(m.family ?? "other")!,
        });
      }
    });
  }
  if (speeds.length) {
    const headingY = story ? 1540 : square ? 860 : 316;
    const topY = headingY + (story ? 46 : square ? 32 : 26);
    const available = story ? 270 : square ? 118 : 68;
    const cols = format === "landscape" || speeds.length > 10 ? 3 : 2;
    const rows = Math.ceil(speeds.length / cols);
    const rowHeight = Math.min(story ? 44 : 30, available / rows);
    const size = Math.min(story ? 28 : square ? 20 : 18, rowHeight - 3);
    add(
      "speed-heading",
      "SPEED BOARD · MEDIAN TOK/S",
      pad,
      headingY,
      story ? 24 : square ? 16 : 14,
      width,
      { dim: true },
    );
    speeds.forEach((speed, i) => {
      const x = pad + ((i % cols) * width) / cols;
      const y = topY + Math.floor(i / cols) * rowHeight;
      const cellWidth = width / cols - 24;
      const valueWidth = Math.min(100, cellWidth * 0.3);
      add(`speed-name-${i}`, cardName(speed.id), x, y, size, cellWidth - valueWidth - 12, {
        font: "sans",
      });
      add(`speed-value-${i}`, speed.median.toFixed(1), x + cellWidth, y, size, valueWidth, {
        align: "right",
        dim: true,
        tight: true,
      });
    });
  }
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
  const spark =
    !speeds.length && card.spark?.length && !models.length
      ? { x: pad, y: story ? 1100 : square ? 620 : 390, width, height: story ? 140 : 72 }
      : undefined;
  return { texts, spark, models, bars };
}

/** Draw and return the actual measured text boxes for the export overlap check. */
export function drawCard(
  canvas: HTMLCanvasElement,
  card: PublicCard,
  format: CardFormat,
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
  const layout = cardLayout(card, format);
  if (layout.spark && card.spark) {
    const s = layout.spark,
      slot = s.width / card.spark.length;
    card.spark.forEach((v, i) => {
      ctx.fillStyle = signal;
      const bh = Math.max(2, (v / 1000) * s.height);
      ctx.fillRect(s.x + i * slot, s.y - bh, slot * 0.7, bh);
    });
  }
  for (const bar of layout.bars) {
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
  return boxes;
}
export async function renderTerminalCard(card: PublicCard, format: CardFormat): Promise<Blob> {
  await document.fonts.ready;
  await document.fonts.load(
    `500 24px ${getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono")}`,
  );
  const canvas = document.createElement("canvas");
  drawCard(canvas, card, format);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(Error("Image export failed"))), "image/png"),
  );
}
