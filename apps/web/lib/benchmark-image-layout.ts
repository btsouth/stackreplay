import { evidenceLabel } from "@stackreplay/benchmarks";
import type { BenchmarkExport } from "./benchmark-export";

export const imageWidth = 1600;
const margin = 48;
const contentWidth = imageWidth - margin * 2;
const definitionWidth = 420;
const targetHeight = 2400;
export type ImageTextStyle = "brand" | "title" | "heading" | "score" | "body" | "note";
export const imageTextSizes: Record<ImageTextStyle, number> = {
  brand: 20,
  title: 36,
  heading: 24,
  score: 26,
  body: 22,
  note: 18,
};
export type MeasureImageText = (text: string, style: ImageTextStyle) => number;
export interface ImageText {
  text: string;
  lines: string[];
  x: number;
  y: number;
  style: ImageTextStyle;
  highlighted: boolean;
}
type ExportRow = BenchmarkExport["rows"][number];
type Source = BenchmarkExport["fullProvenance"]["data"]["sourceSets"][number];
export interface BenchmarkImagePage {
  index: number;
  pageLabelY: number;
  width: number;
  height: number;
  modelStart: number;
  rowStart: number;
  models: BenchmarkExport["models"];
  rows: ExportRow[];
  sources: Source[];
  texts: ImageText[];
  bands: { y: number; height: number }[];
}

/** Break only at measured boundaries; retain every character, including long URLs. */
export function wrapImageText(
  text: string,
  width: number,
  style: ImageTextStyle,
  measure: MeasureImageText,
): string[] {
  const result: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const character of Array.from(paragraph)) {
      if (measure(character, style) > width)
        throw new Error("Image text cannot fit at a readable size.");
      if (line && measure(line + character, style) > width) {
        const space = line.lastIndexOf(" ");
        if (space >= 0) {
          result.push(line.slice(0, space + 1));
          line = line.slice(space + 1);
        } else {
          result.push(line);
          line = "";
        }
      }
      // A carried word may fill the line too; never squeeze or clip it.
      if (line && measure(line + character, style) > width) {
        result.push(line);
        line = "";
      }
      line += character;
    }
    result.push(line);
  }
  return result;
}

function pageSources(payload: BenchmarkExport, rows: ExportRow[], modelIds: Set<string>) {
  const ids = new Set(
    rows.flatMap((row) =>
      row.cells.flatMap((cell) =>
        modelIds.has(cell.modelId) && cell.observation ? [cell.observation.sourceSetId] : [],
      ),
    ),
  );
  return payload.fullProvenance.data.sourceSets.filter((source) => ids.has(source.id));
}

function sourceText(source: Source) {
  return [
    `${source.evaluator} · ${source.title} · ${evidenceLabel(source.evidenceClass)}`,
    `Source date ${source.publishedAt}. Rights checked ${source.redistribution.checkedAt}.`,
    `Original source: ${source.sourceUrl}`,
    source.methodologySummary,
    ...source.limitations,
    `Redistribution basis: ${source.redistribution.basis}. ${source.redistribution.rationale}`,
    `Terms: ${source.redistribution.termsUrl}`,
  ].join("\n");
}

function composePage(
  payload: BenchmarkExport,
  modelStart: number,
  models: BenchmarkExport["models"],
  rowStart: number,
  rows: ExportRow[],
  measure: MeasureImageText,
): BenchmarkImagePage {
  const sources = pageSources(payload, rows, new Set(models.map((model) => model.id)));
  const page: BenchmarkImagePage = {
    index: 0,
    pageLabelY: 0,
    width: imageWidth,
    height: 0,
    modelStart,
    rowStart,
    models,
    rows,
    sources,
    texts: [],
    bands: [],
  };
  function text(
    value: string,
    x: number,
    y: number,
    width: number,
    style: ImageTextStyle = "body",
    highlighted = false,
  ) {
    const lines = wrapImageText(value, width, style, measure);
    page.texts.push({ text: value, lines, x, y, style, highlighted });
    return y + lines.length * (imageTextSizes[style] + 8);
  }
  let y = text("STACKREPLAY / BENCHMARK EVIDENCE", margin, margin, contentWidth, "brand");
  y = text("Selected model comparison", margin, y + 12, contentWidth, "title");
  y = text(
    `Edition ${payload.edition} · Category ${payload.requested.category} · Coverage ${payload.requested.coverage} · ${payload.requested.sourceSetId ? `Source sheet ${payload.requested.sourceSetId}` : "Model comparison"} · ${payload.requested.observationIds.length} explicit observation pins`,
    margin,
    y + 8,
    contentWidth,
    "note",
  );
  // Space reserved for final page count, which cannot change pagination.
  page.pageLabelY = y + 4;
  y += 32;
  y = text(
    `Models ${modelStart + 1}–${modelStart + models.length} of ${payload.models.length}; rows ${rows.length ? `${rowStart + 1}–${rowStart + rows.length}` : "0"} of ${payload.rows.length}. This page shows only this slice of the selection.`,
    margin,
    y,
    contentWidth,
    "note",
  );
  y = text(
    `Exact comparison and full evidence (JSON): ${payload.comparisonUrl}`,
    margin,
    y + 8,
    contentWidth,
    "note",
  );
  y = text(
    "Reported scores checked against original publications; not reproduced by StackReplay. Highlighted = highest reported value (lowest where lower is better), including ties across the full selection. Setups may differ; no overall ranking. Not reported means missing evidence, never zero.",
    margin,
    y + 10,
    contentWidth,
    "note",
  );
  const modelWidth = (contentWidth - definitionWidth) / models.length;
  y += 24;
  let headerEnd = text("Exact benchmark / setup", margin + 12, y, definitionWidth - 24, "heading");
  models.forEach((model, i) => {
    headerEnd = Math.max(
      headerEnd,
      text(
        model.name,
        margin + definitionWidth + i * modelWidth + 12,
        y,
        modelWidth - 24,
        "heading",
      ),
    );
  });
  y = headerEnd + 20;
  if (!rows.length) {
    y =
      text(
        "No reported evidence in this view. No scores or source coverage are asserted for this selection.",
        margin,
        y + 24,
        contentWidth,
        "heading",
      ) + 24;
  }
  rows.forEach((row) => {
    const top = y;
    const d = row.definition;
    let end = text(
      `${d.name}${d.variant ? ` · ${d.variant}` : ""}\n${d.description}\nVersion: ${d.version ?? "Not reported"}\nSubset: ${d.taskSubset ?? "Not reported"}\nMetric: ${d.metric}\nUnit: ${d.unit} · ${d.higherIsBetter ? "Higher" : "Lower"} is better\nCategory: ${d.category}\n${row.setupLabel}`,
      margin + 12,
      top + 12,
      definitionWidth - 24,
      "body",
    );
    models.forEach((model, i) => {
      const cell = row.cells.find((cell) => cell.modelId === model.id);
      if (!cell) throw new Error("The resolved export is missing a model cell.");
      const x = margin + definitionWidth + i * modelWidth + 12;
      const width = modelWidth - 24;
      const highlighted = row.highlightedModelIds.includes(model.id);
      let cellEnd = text(
        cell.displayValue ?? "Not reported",
        x,
        top + 12,
        width,
        "score",
        highlighted,
      );
      if (cell.observation) {
        const o = cell.observation;
        const sourceIndex = sources.findIndex((source) => source.id === o.sourceSetId);
        if (sourceIndex < 0) throw new Error("The resolved export is missing source attribution.");
        cellEnd = text(
          `S${sourceIndex + 1} · ${o.evaluator} · ${evidenceLabel(o.evidenceClass)}\nChecked ${o.checkedAt}\nOrigin: ${o.originLabel} (${o.evaluationOrigin.replaceAll("_", " ")})\nEffort: ${o.effort ?? "Not reported"}\nHarness: ${o.harness ?? "Not reported"}\nTools: ${o.tools ?? "Not reported"}\nFallback: ${o.fallback ?? "Not reported"}\nProvider: ${o.provider ?? "Not reported"}${o.uncertainty ? `\n${o.uncertainty}` : ""}`,
          x,
          cellEnd + 8,
          width,
          "note",
        );
      }
      end = Math.max(end, cellEnd);
    });
    y = end + 20;
    page.bands.push({ y: top, height: y - top });
  });
  if (sources.length) {
    y = text("Sources used on this page", margin, y + 24, contentWidth, "heading") + 12;
    // Identical disclosures can share attribution without repeating long license text.
    const groups = new Map<string, number[]>();
    sources.forEach((source, i) => {
      const disclosure = sourceText(source);
      groups.set(disclosure, [...(groups.get(disclosure) ?? []), i + 1]);
    });
    for (const [disclosure, refs] of groups) {
      y =
        text(
          `${refs.map((index) => `S${index}`).join(", ")} · ${disclosure}`,
          margin,
          y,
          contentWidth,
          "note",
        ) + 18;
    }
  }
  page.height = Math.ceil(y + margin);
  return page;
}

/** Pure measured pagination over the resolved JSON contract; never re-resolve evidence. */
export function paginateBenchmarkImages(
  payload: BenchmarkExport,
  measure: MeasureImageText,
): BenchmarkImagePage[] {
  if (!payload.models.length) throw new Error("Select at least one model to export images.");
  const pages: BenchmarkImagePage[] = [];
  for (let modelStart = 0; modelStart < payload.models.length; modelStart += 3) {
    const models = payload.models.slice(modelStart, modelStart + 3);
    if (!payload.rows.length) {
      pages.push(composePage(payload, modelStart, models, 0, [], measure));
      continue;
    }
    let rowStart = 0;
    while (rowStart < payload.rows.length) {
      let count = 1;
      let page = composePage(
        payload,
        modelStart,
        models,
        rowStart,
        payload.rows.slice(rowStart, rowStart + count),
        measure,
      );
      while (rowStart + count < payload.rows.length) {
        const candidate = composePage(
          payload,
          modelStart,
          models,
          rowStart,
          payload.rows.slice(rowStart, rowStart + count + 1),
          measure,
        );
        if (candidate.height > targetHeight) break;
        page = candidate;
        count++;
      }
      // Exceptionally long labels grow a single-row sheet, rather than disappearing.
      if (page.height > 16384)
        throw new Error(
          "This evidence is too long for a readable PNG. Download JSON for the full comparison.",
        );
      pages.push(page);
      rowStart += count;
    }
  }
  pages.forEach((page, index) => {
    page.index = index;
    page.texts.splice(3, 0, {
      text: `Page ${index + 1} of ${pages.length}`,
      lines: [`Page ${index + 1} of ${pages.length}`],
      x: margin,
      y: page.pageLabelY,
      style: "note",
      highlighted: false,
    });
  });
  return pages;
}
