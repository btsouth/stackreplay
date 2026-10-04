import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ModelPage from "@/app/(public)/models/[modelId]/page";

async function renderModelPage(modelId: string) {
  return renderToStaticMarkup(
    await ModelPage({
      params: Promise.resolve({ modelId }),
    }),
  );
}

function renderedPlanRow(html: string, planId: string) {
  const marker = `data-plan-id="${planId}"`;
  const markerIndex = html.indexOf(marker);
  const start = markerIndex < 0 ? -1 : html.lastIndexOf("<a ", markerIndex);
  const end = markerIndex < 0 ? -1 : html.indexOf("</a>", markerIndex);
  if (start < 0 || end < 0) throw new Error(`Missing rendered plan row ${planId}`);
  return html.slice(start, end + "</a>".length);
}

describe("model page plan access prices", () => {
  it("keeps paid-seat, fixed and free billing bases attached to real plan rows", async () => {
    const paidSeat = renderedPlanRow(
      await renderModelPage("claude-opus-5-5"),
      "cursor-teams-standard",
    );
    expect(paidSeat).toContain("$40 per paid user / month");
    expect(paidSeat).toContain(
      "Per paid user; monthly pools reset each billing cycle. A yearly toggle exists, but commitment terms are unpublished.",
    );
    expect(paidSeat).toContain(
      "Absolute pool sizes, annual commitment, minimum seats, trial availability and country eligibility are not published.",
    );

    const fixed = renderedPlanRow(await renderModelPage("claude-opus-5-5"), "anthropic-claude-pro");
    expect(fixed).toContain("$20 / month");
    expect(fixed).not.toContain("per paid user");

    const free = renderedPlanRow(await renderModelPage("claude-sonnet-4-5"), "kiro-free");
    expect(free).toContain(">Free <span");
    expect(free).not.toContain("$0 / month");
  });
});
