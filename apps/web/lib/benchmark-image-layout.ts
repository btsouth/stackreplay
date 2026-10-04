import { evidenceLabel } from "@stackreplay/benchmarks";
import type { BenchmarkExport } from "./benchmark-export";
import { benchmarkSourceDate, isLegacyEpochArchiveSource } from "./benchmark-source-date";

export const imageWidth = 1600;
const margin = 48;
const contentWidth = imageWidth - margin * 2;
const definitionWidth = 420;
const targetHeight = 2400;
export type ImageTextStyle = "brand" | "title" | "heading" | "score" | "body" | "note";
export const imageTextSizes: Record<ImageTextStyle, number> = {
  brand: 20,
  title: 44,
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
  const epoch = isLegacyEpochArchiveSource(source);
  return [
    `${source.evaluator} · ${source.title} · ${evidenceLabel(source.evidenceClass)}`,
    `${benchmarkSourceDate(source, "iso")} · Rights checked ${source.redistribution.checkedAt}`,
    `Original source: ${source.sourceUrl}`,
    `Terms: ${source.redistribution.termsUrl}`,
    ...(epoch
      ? [
          "Epoch AI, Capabilities & benchmarking: https://epoch.ai/benchmarks · CC BY 4.0: https://creativecommons.org/licenses/by/4.0/",
          "Selected Epoch-run Diamond records: accuracy fractions converted to percentages; no endorsement implied. License applies to these selected records only.",
          "Archive date is not a run publication date. Original run publication and completion dates are unknown. Configuration labels do not establish equal effort; run-specific setup is unreported.",
        ]
      : []),
  ].join("\n");
}

function compactObservation(observation: NonNullable<ExportRow["cells"][number]["observation"]>) {
  const origin = {
    reporter_computed: "Reporter-run",
    external_result_reported: "External result",
    not_reported: "Origin unreported",
  }[observation.evaluationOrigin];
  const effortLabels: Record<string, string> = {
    "Highest Gemini thinking setting unless otherwise noted": "Highest thinking (unless noted)",
    "Maximum available reasoning; best available reported result when maximum-setting results are unavailable":
      "Max if available; otherwise best reported",
  };
  const effort =
    !observation.effort || observation.effort.startsWith("Not ")
      ? "Effort unreported"
      : `Effort: ${(effortLabels[observation.effort] ?? observation.effort).replace(" (Epoch source configuration label)", " (source label)")}`;
  // Preserve known tools/fallback differences. Full setup and uncertainty stay linked.
  return [
    origin,
    effort,
    observation.tools ? `Tools: ${observation.tools}` : "",
    observation.fallback ? `Fallback: ${observation.fallback}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
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
  let y = text("STACKREPLAY / BENCHMARKS", margin, margin, contentWidth, "brand");
  y = text("Selected model comparison", margin, y + 16, contentWidth, "title");
  y = text(
    `Edition ${payload.edition} · ${payload.requested.category === "all" ? "All categories" : payload.requested.category} · ${payload.requested.coverage === "shared" ? "Shared coverage" : "All reported coverage"}${payload.requested.sourceSetId ? ` · Source sheet: ${payload.requested.sourceSetId}` : ""}`,
    margin,
    y + 12,
    contentWidth,
    "note",
  );
  // Space reserved for the final count, independent of pagination.
  page.pageLabelY = y + 8;
  y += 42;
  y = text(
    `Models ${modelStart + 1}–${modelStart + models.length} of ${payload.models.length} · Rows ${rows.length ? `${rowStart + 1}–${rowStart + rows.length}` : "0"} of ${payload.rows.length}. This page shows only this slice of the selection.`,
    margin,
    y,
    contentWidth,
    "note",
  );
  const modelWidth = (contentWidth - definitionWidth) / models.length;
  y += 24;
  let headerEnd = text("Benchmark / setup", margin + 12, y, definitionWidth - 24, "heading");
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
      `${d.name}${d.variant ? ` · ${d.variant}` : ""}`,
      margin + 12,
      top + 16,
      definitionWidth - 24,
      "body",
    );
    end = text(
      `Version ${d.version ?? "unreported"} · Subset ${d.taskSubset ?? "unreported"}\n${d.metric} · ${d.unit} · ${d.higherIsBetter ? "Higher" : "Lower"} is better\n${row.setupLabel}`,
      margin + 12,
      end + 4,
      definitionWidth - 24,
      "note",
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
          `S${sourceIndex + 1} · Checked ${o.checkedAt}\n${compactObservation(o)}`,
          x,
          cellEnd + 8,
          width,
          "note",
        );
      }
      end = Math.max(end, cellEnd);
    });
    y = end + 18;
    page.bands.push({ y: top, height: y - top });
  });
  y = text(
    "Reported evidence; not reproduced by StackReplay. Setups may differ. Highlighted = best numeric value across the full selection, including ties; no overall ranking. Not reported means missing evidence, never zero.",
    margin,
    y + 24,
    contentWidth,
    "note",
  );
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
  y = text(
    "Exact comparison / full setup, uncertainty and provenance (JSON)",
    margin,
    y + 12,
    contentWidth,
    "heading",
  );
  y = text(payload.comparisonUrl, margin, y + 8, contentWidth, "note");
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
