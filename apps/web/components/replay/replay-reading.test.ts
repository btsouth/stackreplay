import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { projectReplay, replayWithReceipt } from "@stackreplay/replay-engine";
import type { ExecutionTargetV1 } from "@stackreplay/schema";
import { buildArchetypeExport, type WorkloadArchetypeId } from "@stackreplay/test-fixtures";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copyDefects } from "@/lib/copy-lint";
import { ReplayReading } from "./replay-reading";

/**
 * The Replay reading, rendered for real replays of the archetype workloads and
 * read as text. These are the statements the product audit found false or
 * garbled; each is held to what the engine actually established.
 */

const catalog = loadBundledCatalog();

function render(
  archetype: WorkloadArchetypeId,
  target: ExecutionTargetV1,
  only?: (rawName: string) => boolean,
): string {
  const events = buildArchetypeExport(archetype).events.filter(
    (event) => only === undefined || only(event.model.rawName),
  );
  const { result, receipt, priceability } = replayWithReceipt({
    events,
    target,
    catalog,
    context: { rulesAsOf: "2026-09-23" },
  });
  const projection = projectReplay(result, catalog);
  const html = renderToStaticMarkup(
    createElement(ReplayReading, {
      projection,
      importId: undefined,
      targetName: projection.target.label,
      priceability,
      receipt,
    }),
  );
  return html
    .replace(/<[^>]+>/gu, " ")
    .replace(/&#x27;/gu, "'")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ");
}

const cases: [string, WorkloadArchetypeId, ExecutionTargetV1][] = [
  ["mixed on the OpenAI API", "mixed", { type: "api", providerId: "openai" }],
  ["Claude-only on the Anthropic API", "claude-only", { type: "api", providerId: "anthropic" }],
  ["mixed on Copilot Pro", "mixed", { type: "subscription", planId: "github-copilot-pro" }],
  [
    "Claude-only on Copilot Pro",
    "claude-only",
    { type: "subscription", planId: "github-copilot-pro" },
  ],
  ["mixed on Copilot Pro+", "mixed", { type: "subscription", planId: "github-copilot-pro-plus" }],
  [
    "mixed on Claude Max 20x",
    "mixed",
    { type: "subscription", planId: "anthropic-claude-max-20x" },
  ],
];

describe("Replay reading copy", () => {
  it.each(cases)("%s reads cleanly", (_name, archetype, target) => {
    const text = render(archetype, target);
    expect(copyDefects(text)).toEqual([]);
    expect(text).not.toMatch(/would have fit/iu);
    expect(text).not.toMatch(/All modeled numeric constraints satisfied/iu);
  });

  it("does not offer the resolved-only scope when other gaps would still block the cost", () => {
    const text = render("mixed", { type: "api", providerId: "openai" });
    expect(text).not.toMatch(/complete priced scope/u);
    expect(text).toMatch(/models OpenAI doesn't offer/u);
  });

  it("does not call a plan's numeric limits satisfied when it runs almost none of the work", () => {
    // Claude Opus 4.8 is not on Copilot Pro: the plan runs none of this work.
    const text = render(
      "claude-only",
      { type: "subscription", planId: "github-copilot-pro" },
      (name) => name === "claude-opus-4-8",
    );
    expect(text).toMatch(/No limit was reached, because .* runs none of the recorded models/u);
  });

  it("explains a Direct API figure with a price table that adds up to it", () => {
    const text = render("claude-only", { type: "api", providerId: "anthropic" });
    expect(text).toMatch(/Published-rate equivalent \$[\d,]+\.\d\d/u);
    expect(text).toMatch(/How \$[\d,]+\.\d\d adds up/u);
  });
});
