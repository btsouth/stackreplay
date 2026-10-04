import type { BenchmarkExport } from "./benchmark-export";
import {
  type BenchmarkImagePage,
  type ImageTextStyle,
  imageTextSizes,
  paginateBenchmarkImages,
} from "./benchmark-image-layout";

type ImageFonts = Record<ImageTextStyle, string>;
const measuredFonts = new WeakMap<BenchmarkImagePage, ImageFonts>();

export async function prepareBenchmarkImages(payload: BenchmarkExport) {
  const styles = getComputedStyle(document.documentElement);
  // Load only app faces. Next's optional local Arial fallback may not exist.
  const sans = styles.getPropertyValue("--font-geist-sans").split(",")[0]?.trim();
  const mono = styles.getPropertyValue("--font-geist-mono").split(",")[0]?.trim();
  if (!sans || !mono) throw new Error("App fonts are unavailable. Try again or download JSON.");
  const fonts = Object.fromEntries(
    Object.entries(imageTextSizes).map(([style, size]) => [
      style,
      `${style === "title" || style === "heading" || style === "score" ? 600 : 400} ${size}px ${style === "score" || style === "brand" ? mono : sans}`,
    ]),
  ) as ImageFonts;
  // Load the full same-origin app faces for the actual characters, not the OG subset.
  const characters = [...new Set(Array.from(`${JSON.stringify(payload)}–·×`))].join("");
  try {
    await Promise.all(Object.values(fonts).map((font) => document.fonts.load(font, characters)));
  } catch {
    throw new Error("Could not load app fonts. Try again or download JSON.");
  }
  await document.fonts.ready;
  const context = document.createElement("canvas").getContext("2d");
  if (!context)
    throw new Error("Image export is unavailable in this browser. Download JSON instead.");
  const pages = paginateBenchmarkImages(payload, (text, style) => {
    context.font = fonts[style];
    return context.measureText(text).width;
  });
  pages.forEach((page) => {
    measuredFonts.set(page, fonts);
  });
  return pages;
}

/** StackReplay draws its own sheet with same-origin app fonts; no remote artwork. */
export async function renderBenchmarkImage(page: BenchmarkImagePage): Promise<Blob> {
  // Yield once so navigation and the rendering status can paint before PNG work.
  await new Promise<void>((resolve) => window.setTimeout(resolve, 16));
  const canvas = document.createElement("canvas");
  canvas.width = page.width;
  canvas.height = page.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable in this browser. Download JSON instead.");
  const fonts = measuredFonts.get(page);
  if (!fonts) throw new Error("Prepare this comparison again before rendering.");
  ctx.fillStyle = "oklch(0.978 0.008 83)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  page.bands.forEach((band, i) => {
    ctx.fillStyle = i % 2 === 0 ? "oklch(0.955 0.011 83)" : "oklch(0.978 0.008 83)";
    ctx.fillRect(48, band.y, page.width - 96, band.height);
    ctx.fillStyle = "oklch(0.87 0.012 83)";
    ctx.fillRect(48, band.y + band.height - 1, page.width - 96, 1);
  });
  ctx.textBaseline = "top";
  for (const block of page.texts) {
    ctx.font = fonts[block.style];
    ctx.fillStyle =
      block.highlighted || block.style === "brand" ? "oklch(0.5 0.16 258)" : "oklch(0.22 0.012 67)";
    block.lines.forEach((line, i) => {
      const y = block.y + i * (imageTextSizes[block.style] + 8);
      ctx.fillText(line, block.x, y);
      if (block.highlighted)
        ctx.fillRect(block.x, y + imageTextSizes[block.style] + 3, ctx.measureText(line).width, 2);
    });
  }
  try {
    // Encode this bounded sheet locally, then retain only its PNG Blob.
    const data = canvas.toDataURL("image/png");
    if (!data.startsWith("data:image/png;base64,")) throw new Error("PNG encoding unavailable");
    const bytes = Uint8Array.from(atob(data.slice(data.indexOf(",") + 1)), (character) =>
      character.charCodeAt(0),
    );
    return new Blob([bytes], { type: "image/png" });
  } catch {
    throw new Error("Could not create this PNG. Try again or download JSON.");
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
