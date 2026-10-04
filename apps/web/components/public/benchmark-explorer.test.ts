import { benchmarkEditions } from "@stackreplay/benchmarks";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseBenchmarkState } from "@/lib/benchmark-state";
import { loadPublicBenchmarks } from "@/lib/public-benchmarks";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { BenchmarkExplorer, reportedModelIds, reportedScoresSelection } from "./benchmark-explorer";

const data = loadPublicBenchmarks();
const models = loadPublicCatalog().models.map((model) => ({
  id: model.id,
  name: model.name,
  developer: model.developerName ?? "Unknown",
}));

describe("benchmark empty selection", () => {
  it("names unscored models and offers an explicit selection change", () => {
    const initial = parseBenchmarkState(
      new URLSearchParams("models=qwen-3-8-max,kimi-k3&coverage=all"),
      models.map((m) => m.id),
    );
    const html = renderToStaticMarkup(
      createElement(BenchmarkExplorer, {
        data,
        editions: { [initial.edition]: data },
        models,
        initial,
      }),
    );
    expect(initial.modelIds).toEqual(["qwen-3-8-max", "kimi-k3"]);
    expect(html).toContain("Qwen 3.8 Max, Kimi K3: no reported scores in this edition.");
    expect(html).toContain("Your models stay selected until you choose another selection.");
    expect(html).toContain("Show models with reported scores");
    expect(html).toContain("No verified scores yet");
    expect(html).not.toContain('aria-describedby="benchmark-selection-error"');
  });

  it("explicit recovery loads scored models and clears source and observation pins", () => {
    const patch = reportedScoresSelection(data, models);
    expect(patch).toMatchObject({
      category: "all",
      coverage: "all",
      sourceSetId: undefined,
      observationIds: [],
    });
    expect(patch.modelIds?.length).toBeGreaterThan(0);
    expect(patch.modelIds?.length).toBeLessThanOrEqual(6);
    expect(patch.modelIds).not.toContain("kimi-k3");
    expect(patch.modelIds).not.toContain("qwen-3-8-max");
    expect(patch.modelIds?.every((id) => reportedModelIds(data, models).includes(id))).toBe(true);
  });
});

describe("benchmark evidence presentation", () => {
  function render(query: string) {
    return renderToStaticMarkup(
      createElement(BenchmarkExplorer, {
        data,
        editions: benchmarkEditions,
        models,
        initial: parseBenchmarkState(
          new URLSearchParams(query),
          models.map((model) => model.id),
        ),
      }),
    );
  }

  it("summarizes the category-filtered view before controls and preserves source attribution", () => {
    const html = render("models=gemini-4-argon,gpt-6-1-sol&category=security");
    const header = html.slice(0, html.indexOf('<div class="bench-toolbar">'));
    expect(header).toContain(
      "Developer reported · Checked against original publications; not reproduced by StackReplay.",
    );
    expect(header).toContain("Google DeepMind");
    expect(header).not.toContain("Multiple sources");
    expect(header).toContain("Published Sep 30, 2026");
    expect(header).toContain("Latest check Sep 30, 2026");
    expect(header).toContain("<strong>1</strong> reported");
    expect(html).toContain(`href="${data.sourceSets[0]?.redistribution.termsUrl}"`);
    expect(html).toContain("Redistribution terms ↗");
    expect(html).toContain("Download JSON");
  });

  it("summarizes real mixed evidence and removes hidden Epoch dates and sources", () => {
    const trio = "claude-sonnet-5-5,claude-opus-5-5,qwen-3-8-max-0902";
    const headerFor = (query: string) => {
      const html = render(query);
      return html.slice(0, html.indexOf('<div class="bench-toolbar">'));
    };
    const mixed = headerFor(`models=${trio}`);
    expect(mixed).toContain("Mixed evidence:");
    expect(mixed).toContain("Developer reported");
    expect(mixed).toContain("Independent evaluation");
    expect(mixed).toContain("Latest check Oct 4, 2026");
    const coding = headerFor(`models=${trio}&category=coding`);
    expect(coding).not.toContain("Independent evaluation");
    expect(coding).not.toContain("Epoch AI");
    expect(coding).toContain("Latest check Sep 30, 2026");
    const science = render(`models=${trio}&category=science&coverage=shared`);
    expect(science).toContain("Different or unreported setups");
    expect(science).toContain("95.5808080808080800%");
    const empty = headerFor(`models=${trio},gpt-6-1-sol&category=science&coverage=shared`);
    expect(empty).toContain("No reported evidence in this view.");
    expect(empty).not.toContain("Latest check");
  });

  it.each([
    "edition=unavailable",
    "source=unavailable",
    "observation=unavailable",
    "models=unknown",
  ])("does not label fallback evidence as a requested selection: %s", (query) => {
    const html = render(query);
    const header = html.slice(0, html.indexOf('<div class="bench-toolbar">'));
    expect(header).toContain("Evidence unavailable for this selection.");
    expect(header).not.toContain("Developer reported");
    expect(header).not.toContain("Latest check");
    expect(header).toContain("<strong>0</strong> reported");
    expect(html).toContain('aria-describedby="benchmark-selection-error"');
    expect(html).toMatch(
      /<button[^>]+disabled=""[^>]+aria-describedby="benchmark-selection-error"[^>]*>Download JSON/,
    );
    expect(html).not.toContain("<tbody>");
    expect(html).toContain("Comparison unavailable");
    expect(html).toContain("No benchmark coverage is asserted for this selection.");
    expect(html).toContain("Show current edition with reported scores");
    expect(html).not.toContain("No reported benchmarks for this selection.");
    expect(html).not.toContain("no reported scores in this edition");
    expect(html).not.toContain("No verified scores yet");
    if (query === "edition=unavailable") {
      expect(html).toContain("Requested edition unavailable");
      expect(html).toContain("Coverage unknown for this edition");
      expect(html).not.toContain("Redistribution terms ↗");
      expect(html).not.toContain("Developer reported");
    } else {
      expect(html).toContain("Coverage unavailable for this selection");
    }
  });

  it("does not claim an evidence class or date for a valid empty category", () => {
    const html = render("models=gpt-6-1-sol&category=security");
    const header = html.slice(0, html.indexOf('<div class="bench-toolbar">'));
    expect(header).toContain("No reported evidence in this view.");
    expect(header).not.toContain("Developer reported");
    expect(header).not.toContain("Latest check");
    expect(html).not.toContain('aria-describedby="benchmark-selection-error"');
  });
});
