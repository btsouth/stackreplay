import type { Recap } from "./recap";
export const compactNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
export const recapUsd = (value: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
/** Only explicitly displayed aggregate facts enter the canvas. No account, path, prompt or session identity. */
export async function renderRecapCard(recap: Recap, portrait: boolean): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = portrait ? 1080 : 1200;
  canvas.height = portrait ? 1350 : 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable.");
  const w = canvas.width;
  const h = canvas.height;
  const pad = 68;
  ctx.fillStyle = "#151d25";
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.9, h * 0.12, 0, w * 0.9, h * 0.12, w * 0.7);
  glow.addColorStop(0, "#2d514c");
  glow.addColorStop(1, "#151d25");
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
  text("STACKREPLAY  /  MY CODING RECAP", pad, 60, 20, "#bbd3c9", 600);
  text(`${recap.start}  →  ${recap.end}`, pad, portrait ? 116 : 102, 18, "#a7b6bc");
  const heroY = portrait ? 230 : 164;
  const range = recap.usdHigh !== recap.usd;
  const hero = recap.priced
    ? recapUsd(recap.usd)
    : compactNumber(recap.outputKnown ? recap.output : recap.records);
  text(hero, pad, heroY, portrait ? 154 : 116, "#f6f2e9", 700);
  text(
    recap.priced
      ? range
        ? `to ${recapUsd(recap.usdHigh)} of API-priced work`
        : "of API-priced work"
      : recap.outputKnown
        ? "logged output tokens"
        : "logged activity records",
    pad,
    heroY + (portrait ? 174 : 128),
    portrait ? 38 : 28,
    "#bbd3c9",
  );
  if (recap.priced)
    text(
      `${Math.round((recap.priced / recap.records) * 100)}% of usage records priced · list-price estimate`,
      pad,
      heroY + (portrait ? 238 : 168),
      portrait ? 21 : 17,
      "#a7b6bc",
    );
  const stats = [
    ...(recap.outputKnown
      ? [
          [
            compactNumber(recap.output),
            recap.outputKnown < recap.records ? "REPORTED OUTPUT TOKENS" : "OUTPUT TOKENS",
          ],
        ]
      : []),
    ...(recap.sessions ? [[compactNumber(recap.sessions), "NATIVE SESSIONS"]] : []),
    [`${String(recap.longestStreak)} days`, "LONGEST STREAK"],
  ];
  const statY = portrait ? 625 : 433;
  stats.forEach(([value, label], i) => {
    const x = pad + (portrait ? 0 : i * 350);
    const y = statY + (portrait ? i * 156 : 0);
    text(value ?? "", x, y, portrait ? 66 : 48, "#f6f2e9", 700);
    text(label ?? "", x, y + (portrait ? 80 : 62), 16, "#a7b6bc", 600);
  });
  // Each line is a day of activity, a visual signature derived from this period.
  const chartX = portrait ? 700 : pad;
  const chartY = portrait ? 650 : 555;
  const chartW = portrait ? 270 : w - pad * 2;
  const chartH = portrait ? 395 : 28;
  const activity = portrait
    ? Array.from({ length: Math.ceil(recap.days.length / 7) }, (_, i) => ({
        records: recap.days.slice(i * 7, i * 7 + 7).reduce((sum, day) => sum + day.records, 0),
      }))
    : recap.days;
  const activityMax = Math.max(1, ...activity.map((day) => day.records));
  activity.forEach((d, i) => {
    const bw = chartW / activity.length;
    ctx.fillStyle = d.records ? "#8dbba8" : "#33434a";
    const bh = d.records ? Math.max(3, chartH * Math.sqrt(d.records / activityMax)) : 2;
    ctx.fillRect(chartX + i * bw, chartY + chartH - bh, Math.max(1, bw - 2), bh);
  });
  text("Local history. A personal snapshot.", pad, h - 42, 16, "#a7b6bc");
  text("stackreplay.app", w - pad - 170, h - 42, 16, "#bbd3c9");
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not export image."))),
      "image/png",
    ),
  );
}
