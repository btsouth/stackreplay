import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { loadPublicBenchmarks } from "@/lib/public-benchmarks";
import { ModelBenchmarks } from "./model-benchmarks";

const data = loadPublicBenchmarks();
describe("model benchmark source dates", () => {
  it.each([
    ["kimi-k3", "Publication date unreported", "88.3%"],
    ["qwen-3-8-max", "Published Aug 3, 2026", "86.6%"],
    ["claude-sonnet-5-5", "Archive checked Oct 4, 2026", "95.5808080808080800%"],
    ["claude-opus-5-5", "Archive checked Oct 4, 2026", "90.5934343434343400%"],
    ["qwen-3-8-max-0902", "Archive checked Oct 4, 2026", "92.297979797979800%"],
  ])("labels %s publication separately from its check", (modelId, label, score) => {
    const html = renderToStaticMarkup(createElement(ModelBenchmarks, { data, modelId }));
    expect(html).toContain(label);
    expect(html).toContain(score);
    expect(html).toContain("<dt>Checked</dt><dd>Oct 4, 2026</dd>");
    expect(html).toContain("edition=2026-10-04-v5");
    if (modelId === "kimi-k3") {
      expect(html).toContain("<h3>Moonshot AI · Publication date unreported</h3>");
      expect(html).not.toContain("Published Oct 4");
      expect(html).toContain("do not establish article publication");
    }
  });
});

describe("model benchmark evidence state", () => {
  it("states when an exact release has no admitted evidence and links to valid coverage", () => {
    const html = renderToStaticMarkup(
      createElement(ModelBenchmarks, { data, modelId: "nemotron-3-ultra" }),
    );
    expect(html).toContain("No benchmark evidence recorded for this exact release.");
    expect(html).toContain(
      '<a href="/benchmarks?edition=2026-10-04-v5">Open benchmark sheet →</a>',
    );
    expect(html).not.toContain("models=nemotron-3-ultra");
    expect(html).not.toContain("No scores published");
  });

  it("keeps populated evidence and its exact-release sheet link", () => {
    const html = renderToStaticMarkup(
      createElement(ModelBenchmarks, { data, modelId: "gemini-4-argon" }),
    );
    expect(html).toContain("Google DeepMind");
    expect(html).toContain("Open benchmark sheet →");
    expect(html).toContain("models=gemini-4-argon");
    expect(html).not.toContain("No benchmark evidence recorded for this exact release.");
  });
});
