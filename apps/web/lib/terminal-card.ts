import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { ShareWorkloadV2 } from "@stackreplay/share";
import type { Recap } from "./recap";
import { compact, dateLabel, dollars, modelName, presentation } from "./terminal-presentation";
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
  const step = Math.max(1, Math.ceil(p.days.length / 120));
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
  return modelName(loadBundledCatalog().models[id]?.name ?? "Unreported model");
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
export function drawCard(
  canvas: HTMLCanvasElement,
  card: PublicCard,
  format: CardFormat,
  speeds?: { name: string; median: number }[],
) {
  const [w, h] = CARD_SIZES[format];
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d");
  if (!context) throw Error("Canvas unavailable");
  const ctx: CanvasRenderingContext2D = context;
  const dark = card.theme === "dark",
    bg = dark ? "#08090a" : "#f3f2ed",
    fg = dark ? "#eceee9" : "#121413",
    dim = dark ? "#8d9691" : "#5c625e",
    line = dark ? "#1c2022" : "#dedcd3",
    signal = dark ? "#ff6a1f" : "#e24e00";
  const mono = getComputedStyle(canvas).getPropertyValue("--font-geist-mono").trim() || "monospace";
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
  function text(
    value: string,
    x: number,
    y: number,
    size: number,
    color = fg,
    align: CanvasTextAlign = "left",
  ) {
    ctx.font = `500 ${size}px ${mono}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  }
  const pad = 56;
  ctx.fillStyle = signal;
  ctx.fillRect(pad, pad - 19, 18, 18);
  text("STACKREPLAY", pad + 32, pad, 20, dim);
  text(format === "square" ? "SPEED" : cardPeriod(card), w - pad, pad, 18, dim, "right");
  const square = format === "square",
    story = format === "story";
  const title = square && card.speed ? card.speed.median.toFixed(1) : cardTitle(card);
  const heroY = story ? 560 : square ? 280 : 252;
  text(title, pad, heroY, square ? 158 : story ? 190 : 156);
  text(
    square && card.speed
      ? `TOK/S · ${cardName(card.speed.id).toUpperCase()}`
      : card.totalTokens !== undefined
        ? "TOKENS OF AI CODING"
        : "YOUR AI CODING",
    pad,
    heroY + 48,
    22,
    dim,
  );
  if (square && card.speed)
    text(`${card.speed.replies.toLocaleString("en-US")} REPLIES`, pad, heroY + 82, 20, dim);
  if (!square && card.spark?.length) {
    const sparkY = story ? 840 : 395,
      sw = w - pad * 2,
      slot = sw / card.spark.length;
    card.spark.forEach((v, i) => {
      ctx.fillStyle = signal;
      ctx.fillRect(
        pad + i * slot,
        sparkY - Math.max(2, (v / 1000) * 72),
        slot * 0.7,
        Math.max(2, (v / 1000) * 72),
      );
    });
  }
  const metrics = cardMetrics(card);
  const metricY = story ? 1010 : square ? 480 : 438;
  if (square && card.speed && speeds?.length) {
    speeds.slice(0, 7).forEach((s, i) => {
      const y = metricY + i * 64;
      text(s.name, pad, y, 24);
      text(s.median.toFixed(1), w - pad, y, 28, signal, "right");
    });
  } else
    metrics.forEach((m, i) => {
      const columns = story ? 1 : 3,
        x = pad + ((i % columns) * (w - pad * 2)) / columns,
        y = metricY + Math.floor(i / columns) * (story ? 116 : 70);
      text(m.value, x, y + 22, story ? 42 : 32);
      text(m.label, x, y + 49, story ? 19 : 14, dim);
    });
  if (card.models?.length) {
    const y = story ? 1510 : square ? 970 : 580;
    text(
      card.models
        .slice(0, story ? 5 : 3)
        .map((m) => `${cardName(m.id)} ${compact(m.tokenCount)}`)
        .join(" · "),
      pad,
      y,
      story ? 20 : 14,
      dim,
    );
  }
  text("STACKREPLAY.COM", pad, h - 34, 16, dim);
  text("REPORTED USAGE · NOT A BILL", w - pad, h - 34, 14, dim, "right");
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
