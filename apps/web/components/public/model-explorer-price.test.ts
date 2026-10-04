import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { marketDiscovery } from "@/lib/market-discovery";
import { modelPlanCounts } from "@/lib/model-library";
import { ModelExplorer } from "./model-explorer";

const { catalog, prices } = marketDiscovery("2026-10-03");
const selectedIds: readonly string[] = ["mimo-v2-6-flash", "nemotron-3-ultra"];
const selected = catalog.models.filter((model) => selectedIds.includes(model.id));

const html = renderToStaticMarkup(
  createElement(ModelExplorer, {
    models: selected,
    prices,
    planCounts: modelPlanCounts(selected),
  }),
);

function renderedCard(modelId: string) {
  const marker = `data-model-id="${modelId}"`;
  const markerIndex = html.lastIndexOf(marker);
  const start = markerIndex < 0 ? -1 : html.lastIndexOf("<article", markerIndex);
  const end = markerIndex < 0 ? -1 : html.indexOf("</article>", markerIndex);
  if (start < 0 || end < 0) throw new Error(`Missing rendered model card ${modelId}`);
  return html.slice(start, end + "</article>".length);
}

describe("model explorer card prices", () => {
  it("labels base API units and keeps published precision", () => {
    const card = renderedCard("mimo-v2-6-flash");
    expect(card).toContain("Base API rate · USD / 1M tokens");
    expect(card).toContain("Input $/1M");
    expect(card).toContain("Cache read $/1M");
    expect(card).toContain("$0.0028");
  });

  it("keeps an unpublished card explicitly contextual rather than showing zero or a unitless rate", () => {
    const card = renderedCard("nemotron-3-ultra");
    expect(card).toContain("Pricing context");
    expect(card).toContain(
      "NVIDIA offers a free trial endpoint on build.nvidia.com and does not publish its own per-token API rate.",
    );
    expect(card).not.toContain("Input $/1M");
    expect(card).not.toContain("$0");
  });
});
