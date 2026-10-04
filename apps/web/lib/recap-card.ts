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
/** Only visible aggregate facts enter the image. No account, path, prompt or session identity. */
export async function renderRecapCard(
  recap: Recap,
  portrait: boolean,
  multiplierText?: string,
  sample = false,
): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = portrait ? 1080 : 1200;
  canvas.height = portrait ? 1350 : 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable.");
  const w = canvas.width,
    h = canvas.height,
    pad = 68;
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => styles.getPropertyValue(name).trim();
  const paletteColor = (name: string) => token(`--${name}`);
  ctx.fillStyle = paletteColor("recap-card-bg");
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createLinearGradient(0, h, w, 0);
  glow.addColorStop(0, paletteColor("recap-card-bg"));
  glow.addColorStop(1, paletteColor("recap-card-material"));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = `${paletteColor("recap-card-accent")}24`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(w * 0.88, h * 0.2, w * 0.55, h * 0.5, -0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textBaseline = "top";
  const font = getComputedStyle(document.body).fontFamily;
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color = paletteColor("recap-card-text"),
    weight = 500,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillText(value, x, y);
  };
  text("↺ StackReplay", pad, 55, portrait ? 32 : 25, paletteColor("recap-card-text"), 650);
  text(
    sample ? "Alex’s sample replay" : "My coding recap",
    portrait ? 700 : 930,
    62,
    portrait ? 23 : 17,
    paletteColor("recap-card-muted"),
  );
  text(
    `${recap.start} → ${recap.end}`,
    pad,
    portrait ? 120 : 105,
    portrait ? 22 : 18,
    paletteColor("recap-card-muted"),
  );
  text(
    compactNumber(recap.totalKnown ? recap.total : recap.records),
    pad,
    portrait ? 208 : 165,
    portrait ? 164 : 126,
    paletteColor("recap-card-text"),
    700,
  );
  text(
    recap.totalKnown ? "total tokens processed" : "logged activity records",
    pad,
    portrait ? 389 : 298,
    portrait ? 38 : 25,
    paletteColor("recap-card-muted"),
  );
  if (recap.priced) {
    text(
      recapUsd(recap.usd),
      pad,
      portrait ? 466 : 349,
      portrait ? 77 : 40,
      paletteColor("recap-card-money"),
      650,
    );
    text(
      "of AI coding at API prices",
      pad,
      portrait ? 554 : 398,
      portrait ? 31 : 22,
      paletteColor("recap-card-muted"),
    );
  }
  if (multiplierText && recap.priced)
    text(
      multiplierText,
      pad,
      portrait ? 611 : 438,
      portrait ? 32 : 22,
      paletteColor("recap-card-accent"),
      600,
    );
  const stats = [
    [compactNumber(recap.sessions), "sessions"],
    [String(recap.days.filter((d) => d.records).length), "active days"],
    [`${recap.longestStreak} days`, "longest streak (all time)"],
  ];
  const statY = portrait ? 705 : 505;
  stats.forEach(([value, label], i) => {
    const x = pad + i * (portrait ? (w - pad * 2) / 3 : 210);
    text(value ?? "", x, statY, portrait ? 52 : 32, paletteColor("recap-card-text"), 650);
    text(
      label ?? "",
      x,
      statY + (portrait ? 63 : 42),
      portrait ? 20 : 14,
      paletteColor("recap-card-muted"),
    );
  });
  const models = topRecapModels(recap.models);
  const modelX = portrait ? pad : 748,
    modelY = portrait ? 850 : 173,
    modelWidth = w - pad - modelX;
  text(
    "Your most played",
    modelX,
    modelY,
    portrait ? 28 : 22,
    paletteColor("recap-card-muted"),
    600,
  );
  text(
    "Total tokens",
    modelX,
    modelY + (portrait ? 39 : 31),
    portrait ? 20 : 15,
    paletteColor("recap-card-muted"),
  );
  models.forEach((model, i) => {
    const y = modelY + (portrait ? 87 : 77) + i * (portrait ? 67 : 58),
      size = portrait ? 28 : 20,
      tokens = compactNumber(model.total);
    ctx.font = `600 ${size}px ${font}`;
    const tokenWidth = ctx.measureText(tokens).width,
      nameWidth = modelWidth - tokenWidth - 30;
    let name = model.name;
    if (ctx.measureText(name).width > nameWidth) {
      const chars = Array.from(name);
      while (chars.length && ctx.measureText(`${chars.join("")}…`).width > nameWidth) chars.pop();
      name = `${chars.join("")}…`;
    }
    text(name, modelX, y, size, paletteColor("recap-card-text"), 600);
    text(tokens, modelX + modelWidth - tokenWidth, y, size, paletteColor("recap-card-muted"), 600);
    ctx.fillStyle = paletteColor("recap-card-track");
    ctx.fillRect(modelX, y + (portrait ? 39 : 30), modelWidth, portrait ? 8 : 6);
    ctx.fillStyle = token(
      (familyColors[model.family] ?? "var(--developer-other)")
        .slice(4, -1)
        .replace("--developer-", "--recap-developer-"),
    );
    ctx.fillRect(
      modelX,
      y + (portrait ? 39 : 30),
      modelWidth * (model.total / Math.max(1, models[0]?.total ?? 1)),
      portrait ? 8 : 6,
    );
  });
  if (!models.length)
    text(
      "No resolved models with logged tokens",
      modelX,
      modelY + 85,
      portrait ? 22 : 16,
      paletteColor("recap-card-muted"),
    );
  text(
    sample
      ? "Fictional sample. Illustrative values."
      : "Reported tokens. API estimate. Local history.",
    pad,
    h - 42,
    portrait ? 19 : 15,
    paletteColor("recap-card-muted"),
  );
  text(
    "stackreplay.com",
    w - pad - (portrait ? 193 : 155),
    h - 42,
    portrait ? 19 : 15,
    paletteColor("recap-card-muted"),
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not export image."))),
      "image/png",
    ),
  );
}
