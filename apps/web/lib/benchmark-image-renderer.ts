import type { BenchmarkExport } from "./benchmark-export";
import {
  type BenchmarkImagePage,
  type ImageTextStyle,
  imageTextSizes,
  paginateBenchmarkImages,
} from "./benchmark-image-layout";

function font(style: ImageTextStyle) {
  return `${style === "title" || style === "heading" || style === "score" ? 600 : 400} ${imageTextSizes[style]}px ${style === "score" ? "monospace" : "Arial, sans-serif"}`;
}

export function prepareBenchmarkImages(payload: BenchmarkExport) {
  const context = document.createElement("canvas").getContext("2d");
  if (!context)
    throw new Error("Image export is unavailable in this browser. Download JSON instead.");
  return paginateBenchmarkImages(payload, (text, style) => {
    context.font = font(style);
    return context.measureText(text).width;
  });
}

/** StackReplay draws its own sheet. No DOM screenshots, remote artwork or network calls. */
export async function renderBenchmarkImage(page: BenchmarkImagePage): Promise<Blob> {
  // Yield once so navigation and the rendering status can paint before PNG work.
  await new Promise<void>((resolve) => window.setTimeout(resolve, 16));
  const canvas = document.createElement("canvas");
  canvas.width = page.width;
  canvas.height = page.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable in this browser. Download JSON instead.");
  ctx.fillStyle = "#fafaf7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  page.bands.forEach((band, i) => {
    ctx.fillStyle = i % 2 === 0 ? "#eeefe9" : "#fafaf7";
    ctx.fillRect(48, band.y, page.width - 96, band.height);
    ctx.fillStyle = "#c9cec3";
    ctx.fillRect(48, band.y + band.height - 1, page.width - 96, 1);
  });
  ctx.textBaseline = "top";
  for (const block of page.texts) {
    ctx.font = font(block.style);
    ctx.fillStyle = block.highlighted || block.style === "brand" ? "#275639" : "#202b24";
    block.lines.forEach((line, i) => {
      const y = block.y + i * (imageTextSizes[block.style] + 8);
      ctx.fillText(line, block.x, y);
      if (block.highlighted)
        ctx.fillRect(block.x, y + imageTextSizes[block.style] + 3, ctx.measureText(line).width, 2);
    });
  }
  try {
    // Native asynchronous PNG encoders can stall after a browser download.
    // Encode this bounded sheet synchronously, then keep only its PNG Blob.
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
