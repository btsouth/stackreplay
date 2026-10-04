import type { Recap } from "./recap";
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
  planText?: string,
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
  const hero = recap.priced
    ? recapUsd(recap.usd)
    : compactNumber(recap.outputKnown ? recap.output : recap.records);
  text(hero, pad, heroY, portrait ? 154 : 116, "#f6f2e9", 700);
  text(
    recap.priced
      ? "at API list prices"
      : recap.outputKnown
        ? "logged output tokens"
        : "logged activity records",
    pad,
    heroY + (portrait ? 174 : 128),
    portrait ? 38 : 28,
    "#bbd3c9",
  );
  if (planText && recap.priced)
    text(`on ${planText}`, pad, portrait ? 480 : 342, portrait ? 28 : 23, "#bbd3c9");
  const stats = [
    ...(recap.outputKnown ? [[compactNumber(recap.output), "OUTPUT TOKENS"]] : []),
    ...(recap.sessions ? [[compactNumber(recap.sessions), "SESSIONS"]] : []),
    [`${String(recap.longestStreak)} days`, "LONGEST STREAK"],
  ];
  const statY = portrait ? 640 : 423;
  stats.forEach(([value, label], i) => {
    const x = pad + i * ((w - pad * 2) / 3);
    const y = statY;
    text(value ?? "", x, y, portrait ? 57 : 48, "#f6f2e9", 700);
    text(label ?? "", x, y + (portrait ? 76 : 62), 16, "#a7b6bc", 600);
  });
  const days = activityDays(recap.days);
  if (portrait) {
    text("YOUR CODING RHYTHM", pad, 858, 25, "#bbd3c9", 600);
    text("Output tokens by week", pad, 899, 20, "#a7b6bc");
    const first = recap.weeks.findIndex((week) => Object.values(week.families).some((n) => n > 0));
    const weeks = recap.weeks.slice(Math.max(0, first));
    const totals = weeks.map((week) => Object.values(week.families).reduce((a, b) => a + b, 0));
    const max = Math.max(1, ...totals);
    const bw = (w - pad * 2) / Math.max(1, weeks.length);
    totals.forEach((total, i) => {
      ctx.fillStyle = "#8dbba8";
      const height = (total / max) * 265;
      ctx.fillRect(pad + i * bw, 1223 - height, Math.max(1, bw - 8), height);
    });
    text(`${weeks[0]?.date ?? recap.start}  →  ${recap.end}`, pad, 1244, 18, "#a7b6bc");
  } else {
    text("DAILY ACTIVITY", pad, 528, 13, "#a7b6bc", 600);
    const max = Math.max(1, ...days.map((d) => d.records));
    days.forEach((d, i) => {
      const bw = (w - pad * 2) / days.length;
      ctx.fillStyle = d.records ? "#8dbba8" : "#33434a";
      const bh = d.records ? Math.max(3, 28 * Math.sqrt(d.records / max)) : 2;
      ctx.fillRect(pad + i * bw, 581 - bh, Math.max(1, bw - 2), bh);
    });
  }
  text("Local history. A personal snapshot.", pad, h - 42, 16, "#a7b6bc");
  text("stackreplay.com", w - pad - 170, h - 42, 16, "#bbd3c9");
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not export image."))),
      "image/png",
    ),
  );
}
