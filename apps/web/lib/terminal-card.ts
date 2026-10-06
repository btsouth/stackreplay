import type { ShareWorkloadV2 } from "@stackreplay/share";
import type { Recap } from "./recap";
import {
  compact,
  dateLabel,
  dollars,
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
  speed: true,
  github: true,
  streak: false,
  models: false,
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
    work = p.workhorse,
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
    ...(selected.speed && work && top.some((m) => m.id === work.id)
      ? { speed: { id: work.id, median: work.median, replies: work.n } }
      : selected.speed && work && r.models.some((m) => m.id === work.id && m.family !== "other")
        ? { speed: { id: work.id, median: work.median, replies: work.n } }
        : {}),
    ...(selected.github && github !== undefined ? { github } : {}),
    ...(selected.streak ? { streak: r.longestStreak } : {}),
    ...(selected.models ? { models: top.map((m) => ({ id: m.id, tokenCount: m.total })) } : {}),
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
    ...(card.speed
      ? [
          {
            label: `${cardName(card.speed.id).toUpperCase()} SPEED`,
            value: `${card.speed.median.toFixed(1)} tok/s`,
          },
        ]
      : []),
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
    : card.speed
      ? `${card.speed.median.toFixed(1)} tok/s`
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
export function cardLayout(
  card: PublicCard,
  format: CardFormat,
  speeds?: { name: string; median: number }[],
) {
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
  const board = square && card.speed && speeds?.length;
  const title = square && card.speed ? card.speed.median.toFixed(1) : cardTitle(card);
  add("hero", title, pad, story ? 230 : square ? 140 : 104, story ? 260 : 156, width, {
    tight: true,
  });
  add(
    "caption",
    square && card.speed
      ? `TOK/S · ${cardName(card.speed.id).toUpperCase()}`
      : card.totalTokens !== undefined
        ? "TOKENS OF AI CODING"
        : "YOUR AI CODING",
    pad,
    story ? 520 : square ? 316 : 278,
    story ? 30 : 22,
    width,
    { dim: true },
  );
  const metrics = board
    ? [
        ...(card.totalTokens !== undefined
          ? [{ label: "TOTAL TOKENS", value: compact(card.totalTokens) }]
          : []),
        ...cardMetrics(card).filter((m) => !m.label.endsWith(" SPEED")),
      ]
    : cardMetrics(card);
  const columns = story ? 2 : 3,
    step = story ? 188 : square ? 92 : 80;
  const metricY = story ? 650 : square ? (board ? 680 : 460) : 430;
  metrics.slice(0, 6).forEach((m, i) => {
    const x = pad + ((i % columns) * width) / columns,
      y = metricY + Math.floor(i / columns) * step,
      cellWidth = width / columns - 28;
    add(`stat-${i}`, m.value, x, y, story ? 72 : 32, cellWidth, { tight: true });
    add(`label-${i}`, m.label, x, y + (story ? 88 : 42), story ? 24 : 14, cellWidth, { dim: true });
  });
  if (board)
    speeds!.slice(0, 5).forEach((s, i) => {
      add(`speed-name-${i}`, s.name, pad, 405 + i * 48, 24, width - 150, { font: "sans" });
      add(`speed-value-${i}`, s.median.toFixed(1), w - pad, 405 + i * 48, 28, 130, {
        align: "right",
        signal: true,
        tight: true,
      });
    });
  const models = card.models?.slice(0, story ? 5 : 3) ?? [];
  if (models.length)
    models.forEach((m, i) => {
      // Landscape models take the sparkline's region, above the stats.
      const x = format === "landscape" ? pad + (i * width) / 3 : pad;
      const y = story ? 1470 + i * 64 : square ? 884 + i * 36 : 332;
      const cellWidth = format === "landscape" ? width / 3 - 24 : width;
      add(
        `model-name-${i}`,
        cardName(m.id),
        x,
        y,
        story ? 36 : square ? 22 : 20,
        format === "landscape" ? cellWidth : cellWidth - 210,
        { font: "sans", dim: unresolvedModel(m.id) },
      );
      add(
        `model-value-${i}`,
        compact(m.tokenCount),
        format === "landscape" ? x : w - pad,
        format === "landscape" ? y + 32 : y,
        story ? 36 : square ? 22 : 22,
        format === "landscape" ? cellWidth : 190,
        { align: format === "landscape" ? "left" : "right", dim: true, tight: true },
      );
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
  const spark =
    !board && card.spark?.length && !(format === "landscape" && models.length)
      ? { x: pad, y: story ? 1280 : square ? 370 : 390, width, height: story ? 140 : 72 }
      : undefined;
  return { texts, spark, models };
}

/** Draw and return the actual measured text boxes for the export overlap check. */
export function drawCard(
  canvas: HTMLCanvasElement,
  card: PublicCard,
  format: CardFormat,
  speeds?: { name: string; median: number }[],
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
  const layout = cardLayout(card, format, speeds);
  if (layout.spark && card.spark) {
    const s = layout.spark,
      slot = s.width / card.spark.length;
    card.spark.forEach((v, i) => {
      ctx.fillStyle = signal;
      const bh = Math.max(2, (v / 1000) * s.height);
      ctx.fillRect(s.x + i * slot, s.y - bh, slot * 0.7, bh);
    });
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
export async function renderTerminalCard(
  card: PublicCard,
  format: CardFormat,
  speeds?: { name: string; median: number }[],
): Promise<Blob> {
  await document.fonts.ready;
  await document.fonts.load(
    `500 24px ${getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono")}`,
  );
  const canvas = document.createElement("canvas");
  drawCard(canvas, card, format, speeds);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(Error("Image export failed"))), "image/png"),
  );
}
