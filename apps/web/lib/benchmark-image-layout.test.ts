import { benchmarkEditions } from "@stackreplay/benchmarks";
import { describe, expect, it } from "vitest";
import { buildBenchmarkExport } from "./benchmark-export";
import { imageTextSizes, paginateBenchmarkImages, wrapImageText } from "./benchmark-image-layout";
import { parseBenchmarkState } from "./benchmark-state";
import { loadPublicCatalog } from "./public-catalog";

const models = loadPublicCatalog().models;
const ids = [
  "claude-sonnet-5-5",
  "claude-opus-5-5",
  "qwen-3-8-max-0902",
  "gpt-6-1-sol",
  "gemini-4-argon",
  "grok-4-7",
];
const measure = (text: string, style: keyof typeof imageTextSizes) =>
  Array.from(text).length * imageTextSizes[style] * 0.6;
const exportFor = (query: string) => {
  const state = parseBenchmarkState(
    new URLSearchParams(query),
    models.map((model) => model.id),
  );
  return {
    state,
    payload: buildBenchmarkExport({
      editions: benchmarkEditions,
      models,
      state,
      origin: "https://stackreplay.com",
    }),
  };
};

describe("readable benchmark image pagination", () => {
  it.each(Array.from({ length: 6 }, (_, i) => i + 1))(
    "preserves every ordered row × model cell once for %i models",
    (count) => {
      const { payload, state } = exportFor(`models=${ids.slice(0, count).join(",")}`);
      const before = JSON.stringify({ payload, state });
      const pages = paginateBenchmarkImages(payload, measure);
      const seen = new Map<string, number>();
      for (const [index, page] of pages.entries()) {
        expect(page.index).toBe(index);
        expect(page.models).toEqual(
          payload.models.slice(page.modelStart, page.modelStart + page.models.length),
        );
        expect(page.rows).toEqual(
          payload.rows.slice(page.rowStart, page.rowStart + page.rows.length),
        );
        expect(page.models.length).toBeLessThanOrEqual(3);
        expect(
          page.texts.some((text) => text.text === `Page ${index + 1} of ${pages.length}`),
        ).toBe(true);
        const sources = new Set<string>();
        page.rows.forEach((row, rowIndex) => {
          page.models.forEach((model) => {
            const cell = row.cells.find((cell) => cell.modelId === model.id);
            const key = `${page.rowStart + rowIndex}/${model.id}`;
            seen.set(key, (seen.get(key) ?? 0) + 1);
            if (cell?.observation) sources.add(cell.observation.sourceSetId);
            expect(
              page.texts.some((text) => text.text === (cell?.displayValue ?? "Not reported")),
            ).toBe(true);
            if (cell?.displayValue)
              expect(
                page.texts
                  .filter((text) => text.text === cell.displayValue)
                  .some((text) => text.highlighted === row.highlightedModelIds.includes(model.id)),
              ).toBe(true);
          });
        });
        expect(page.sources.map((source) => source.id).sort()).toEqual([...sources].sort());
        for (const source of page.sources) {
          expect(
            page.texts.some(
              (text) =>
                text.text.includes(source.redistribution.rationale) &&
                text.text.includes(source.redistribution.termsUrl) &&
                text.text.includes(source.methodologySummary),
            ),
          ).toBe(true);
        }
        for (const block of page.texts) {
          expect(block.lines.join("")).toBe(block.text.replaceAll("\n", ""));
          expect(
            block.y + block.lines.length * (imageTextSizes[block.style] + 8),
          ).toBeLessThanOrEqual(page.height);
          for (const line of block.lines)
            expect(block.x + measure(line, block.style)).toBeLessThanOrEqual(page.width - 48);
        }
      }
      expect(seen.size).toBe(payload.rows.length * count);
      expect([...seen.values()].every((value) => value === 1)).toBe(true);
      for (const rowIndex of payload.rows.keys())
        for (const model of payload.models) expect(seen.get(`${rowIndex}/${model.id}`)).toBe(1);
      expect(JSON.stringify({ payload, state })).toBe(before);
      for (const modelStart of [...new Set(pages.map((page) => page.modelStart))]) {
        expect(
          pages.filter((page) => page.modelStart === modelStart).flatMap((page) => page.rows),
        ).toEqual(payload.rows);
      }
      expect(pages.some((page) => page.rowStart > 0)).toBe(true);
      if (count > 3) expect(pages.some((page) => page.modelStart === 3)).toBe(true);
    },
  );

  it.each([
    "edition=2026-09-30-v1&models=gemini-4-argon,gpt-6-astra&category=security&source=google-deepmind-argon-2026-09-30",
    "edition=2026-09-30-v2&models=gpt-6-1-sol&category=coding&observation=openai-sol-2026-09-29-high.deep-swe-v1-1.gpt-6-1-sol",
    "source=google-deepmind-argon-2026-09-30&models=gemini-4-argon,gpt-6-astra,claude-fable-5-1,claude-opus-5-5",
    "models=claude-sonnet-5-5,claude-opus-5-5,qwen-3-8-max-0902&category=science&coverage=shared",
  ])("retains resolved editions, filters, source sheets and pins: %s", (query) => {
    const { payload } = exportFor(query);
    const pages = paginateBenchmarkImages(payload, measure);
    expect(pages.filter((page) => page.modelStart === 0).flatMap((page) => page.rows)).toEqual(
      payload.rows,
    );
    expect(
      pages.every((page) => page.texts.some((text) => text.text.includes(payload.comparisonUrl))),
    ).toBe(true);
    expect(
      pages.every((page) => page.texts.some((text) => text.text.includes(payload.edition))),
    ).toBe(true);
  });

  it("keeps exact Epoch precision, null gaps and highlights across model slices", () => {
    const { payload } = exportFor(`models=${ids.join(",")}&category=science`);
    const pages = paginateBenchmarkImages(payload, measure);
    const exact = ["95.5808080808080800%", "90.5934343434343400%", "92.297979797979800%"];
    exact.forEach((score) => {
      expect(pages.flatMap((page) => page.texts).some((text) => text.text === score)).toBe(true);
    });
    const row = payload.rows.find(
      (row) => row.definition.id === "epoch-gpqa-diamond-revision-unreported",
    );
    expect(
      row?.cells.slice(3).every((cell) => cell.value === null && cell.displayValue === null),
    ).toBe(true);
    expect(row?.highlightedModelIds).toEqual(["claude-sonnet-5-5"]);
  });

  it("renders truthful empty sheets for all model slices without sources or invented scores", () => {
    const { payload } = exportFor(`models=${ids.join(",")}&category=science&coverage=shared`);
    expect(payload.rows).toEqual([]);
    const pages = paginateBenchmarkImages(payload, measure);
    expect(pages).toHaveLength(2);
    expect(pages.flatMap((page) => page.models)).toEqual(payload.models);
    for (const page of pages) {
      expect(page.sources).toEqual([]);
      expect(page.rows).toEqual([]);
      expect(
        page.texts.some((text) => text.text.startsWith("No reported evidence in this view.")),
      ).toBe(true);
      expect(page.texts.some((text) => text.style === "score")).toBe(false);
    }
  });

  it("wraps long exact labels and URLs without losing characters or squeezing text", () => {
    const { payload } = exportFor("models=claude-sonnet-5-5&category=science");
    const model = payload.models[0];
    const row = payload.rows[0];
    if (!model || !row) throw new Error("Missing resolved test evidence");
    model.name = "Model ".repeat(100);
    row.definition.name = "Benchmark ".repeat(100);
    payload.comparisonUrl += `&long=${"abcd".repeat(1500)}`;
    const pages = paginateBenchmarkImages(payload, measure);
    expect(pages.some((page) => page.height > 2400)).toBe(true);
    expect(
      pages[0]?.texts.find((text) => text.text.includes(payload.comparisonUrl))?.lines.join(""),
    ).toContain(payload.comparisonUrl);
    const url = `https://example.com/${"word".repeat(200)}`;
    expect(wrapImageText(url, 120, "note", measure).join("")).toBe(url);
  });
});
