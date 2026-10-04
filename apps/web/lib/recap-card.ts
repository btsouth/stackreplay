import { familyColors, type Recap, topRecapModels } from "./recap";
export const compactNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
export const recapUsd = (value: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
/** Preserve chronology, omitting only full inactive weeks before the first activity. */
export function activityDays(days: Recap["days"]): Recap["days"] {
  const first = days.findIndex((day) => day.records > 0);
  if (first <= 0) return days;
  const weekday = new Date(`${days[first]!.date}T00:00:00Z`).getUTCDay();
  return days.slice(Math.max(0, first - weekday));
}
/** Only explicitly displayed aggregate facts enter the canvas. No account, path, prompt or session identity. */
export async function renderRecapCard(
  recap: Recap,
  portrait: boolean,
  multiplierText?: string,
): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = portrait ? 1080 : 1200;
  canvas.height = portrait ? 1350 : 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable.");
  const w = canvas.width;
  const h = canvas.height;
  const pad = 68;
  ctx.fillStyle = "#171223";
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.9, h * 0.12, 0, w * 0.9, h * 0.12, w * 0.7);
  glow.addColorStop(0, "#513662");
  glow.addColorStop(1, "#171223");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "top";
  const font = getComputedStyle(document.body).fontFamily;
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color = "#f6f2e9",
    weight = 500,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillText(value, x, y);
  };
  text("STACKREPLAY  /  MY CODING RECAP", pad, 60, 20, "#c9bfdc", 600);
  text(`${recap.start}  →  ${recap.end}`, pad, portrait ? 116 : 102, 18, "#b7adca");
  const heroY = portrait ? 230 : 164;
  const hero = compactNumber(recap.totalKnown ? recap.total : recap.records);
  text(hero, pad, heroY, portrait ? 154 : 116, "#f6f2e9", 700);
  text(
    recap.totalKnown ? "total tokens processed" : "logged activity records",
    pad,
    heroY + (portrait ? 174 : 128),
    portrait ? 38 : 28,
    "#c9bfdc",
  );
  if (recap.priced)
    text(
      `${recapUsd(recap.usd)} of AI coding at API prices`,
      pad,
      portrait ? 454 : 340,
      portrait ? 34 : 25,
      "#c9bfdc",
      600,
    );
  if (multiplierText && recap.priced)
    text(multiplierText, pad, portrait ? 508 : 387, portrait ? 32 : 24, "#d3f99b", 700);
  const stats = [
    ...(recap.totalKnown ? [[compactNumber(recap.total), "TOTAL TOKENS"]] : []),
    ...(recap.sessions ? [[compactNumber(recap.sessions), "SESSIONS"]] : []),
    [`${String(recap.longestStreak)} days`, "LONGEST STREAK"],
  ];
  const statY = portrait ? 576 : 450;
  stats.forEach(([value, label], i) => {
    const x = pad + i * ((portrait ? w - pad * 2 : 610) / 3);
    const y = statY;
    text(value ?? "", x, y, portrait ? 57 : 38, "#f6f2e9", 700);
    text(label ?? "", x, y + (portrait ? 76 : 54), portrait ? 16 : 13, "#b7adca", 600);
  });
  const models = topRecapModels(recap.models);
  const modelX = portrait ? pad : 748;
  const modelY = portrait ? 760 : 170;
  const modelWidth = portrait ? w - pad * 2 : w - pad - modelX;
  text("TOP MODELS", modelX, modelY, portrait ? 28 : 20, "#c9bfdc", 700);
  text("Total tokens", modelX, modelY + (portrait ? 43 : 32), portrait ? 22 : 16, "#b7adca");
  const rowHeight = portrait ? 82 : 64;
  models.forEach((model, i) => {
    const y = modelY + (portrait ? 100 : 76) + i * rowHeight;
    const size = portrait ? 30 : 20;
    const tokens = compactNumber(model.total);
    ctx.font = `600 ${size}px ${font}`;
    const tokenWidth = ctx.measureText(tokens).width;
    const nameWidth = modelWidth - tokenWidth - (portrait ? 38 : 24);
    let name = model.name;
    if (ctx.measureText(name).width > nameWidth) {
      const chars = Array.from(name);
      while (chars.length && ctx.measureText(`${chars.join("")}…`).width > nameWidth) chars.pop();
      name = `${chars.join("")}…`;
    }
    text(name, modelX, y, size, "#f6f2e9", 600);
    text(tokens, modelX + modelWidth - tokenWidth, y, size, "#c9bfdc", 600);
    const barY = y + (portrait ? 44 : 32);
    const barHeight = portrait ? 10 : 7;
    ctx.fillStyle = "#392e4b";
    ctx.fillRect(modelX, barY, modelWidth, barHeight);
    ctx.fillStyle = familyColors[model.family] ?? familyColors.other ?? "#a6a28e";
    ctx.fillRect(modelX, barY, modelWidth * (model.total / models[0]!.total), barHeight);
  });
  if (!models.length)
    text(
      "No resolved models with total tokens",
      modelX,
      modelY + 80,
      portrait ? 22 : 16,
      "#b7adca",
    );
  text("Local history. A personal snapshot.", pad, h - 42, 16, "#b7adca");
  text("stackreplay.com", w - pad - 170, h - 42, 16, "#c9bfdc");
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not export image."))),
      "image/png",
    ),
  );
}
