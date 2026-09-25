import { expect, type Page, test } from "@playwright/test";
import { buildArchetypeExport, type WorkloadArchetypeId } from "@stackreplay/test-fixtures";
import { gotoImport } from "./helpers";

/**
 * Phase 4: from Workload Ready and the workload's first screen, a person sees
 * what the work is worth at each maker's published rates (never as a bill),
 * what is left out, the tool split, and comparative facts that link to their
 * evidence.
 */

async function importArchetype(page: Page, archetype: WorkloadArchetypeId): Promise<void> {
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page.getByTestId("import-file-input").setInputFiles({
    name: `${archetype}.json`,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(buildArchetypeExport(archetype))),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 60_000 });
}

test("Workload Ready leads with the published-rate value and the strongest fact", async ({
  page,
}) => {
  await importArchetype(page, "mixed");
  const preview = page.getByTestId("ready-preview");
  await expect(preview.getByTestId("value-figure")).toHaveText(/^\$[\d,]+\.\d\d$/u, {
    timeout: 60_000,
  });
  await expect(preview.getByTestId("value-caption")).toHaveText(
    "at published API list prices · not what you paid",
  );
  await expect(preview.getByTestId("value-scope")).toContainText("of 5,000 calls");
  await expect(preview.getByTestId("value-left-out")).toContainText("DeepSeek");
  await expect(preview.getByTestId("value-left-out")).toContainText(
    "model IDs StackReplay couldn't resolve",
  );
  await expect(preview.getByTestId("tool-split")).toContainText("Claude Code");
  await expect(preview.getByTestId("tool-split")).toContainText("Command Code");
  const fact = preview.getByTestId("ready-insight").locator("li").first();
  await expect(fact).toContainText("×");
  await expect(fact.getByRole("link")).toHaveAttribute(
    "href",
    /\/app\/workload\?import=.+#[a-z]+$/u,
  );
});

test("the workload opens with its value, scope, tool split and comparative facts", async ({
  page,
}) => {
  await importArchetype(page, "mixed");
  await page.goto("/app/workload");
  const opening = page.getByTestId("workload-opening");
  await expect(opening.getByTestId("value-figure")).toBeVisible({ timeout: 60_000 });
  await expect(opening.getByTestId("value-figure")).toBeInViewport();
  await expect(opening.getByTestId("value-caption")).toBeInViewport();
  await expect(opening.getByTestId("value-scope")).toContainText("included calls priced");
  await expect(opening.getByTestId("tool-split")).toBeInViewport();

  const facts = opening.getByTestId("workload-insights").locator("li");
  await expect(facts).toHaveCount(3);
  for (const index of [0, 1, 2]) {
    await expect(facts.nth(index)).toContainText("×");
    await expect(facts.nth(index).getByRole("link")).toHaveAttribute("href", /^#[a-z]+$/u);
  }
  await expect(opening.getByRole("link", { name: "Replay part of this workload" })).toHaveCount(0);
  await expect(opening.getByRole("link", { name: /Compare ways to buy this work/u })).toHaveCount(
    0,
  );
  const decision = page.getByTestId("replay-transition");
  await expect(decision.getByTestId("workload-replay-cta")).toHaveText(
    "Replay part of this workload",
  );
  await expect(decision.getByTestId("workload-compare-cta")).toHaveText(
    "Compare ways to buy this work →",
  );
  const narrativeOrder = await page
    .locator(
      '[data-testid="workload-insights"], [data-testid="section-projects"], [data-testid="section-models"], [data-testid="section-chronology"], [data-testid="section-pressure"], [data-testid="section-tokens"], [data-testid="section-sessions"], [data-testid="section-evidence"], [data-testid="replay-transition"]',
    )
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-testid")));
  expect(narrativeOrder).toEqual([
    "workload-insights",
    "section-projects",
    "section-models",
    "section-chronology",
    "section-pressure",
    "section-tokens",
    "section-sessions",
    "section-evidence",
    "replay-transition",
  ]);
  // A fact's link lands on the section that shows it.
  const href = (await facts.first().getByRole("link").getAttribute("href")) ?? "";
  await facts.first().getByRole("link").click();
  await expect(page.locator(href)).toBeInViewport();

  // Every dollar opens to its arithmetic, one receipt per maker.
  await page.getByTestId("value-receipts").locator(":scope > summary").click();
  await expect(page.getByTestId("value-receipts")).toContainText("Anthropic:");
  await expect(page.getByTestId("value-receipts")).toContainText("OpenAI:");
  await expect(page.getByTestId("value-receipt-anthropic")).toBeVisible();
  await expect(page.getByTestId("value-receipt-openai")).toBeVisible();
});

test("a Claude-only value is exactly its Direct API replay", async ({ page }) => {
  await importArchetype(page, "claude-only");
  await page.goto("/app/workload");
  const figure = page.getByTestId("workload-opening").getByTestId("value-figure");
  await expect(figure).toHaveText(/^\$[\d,]+\.\d\d$/u, { timeout: 60_000 });
  const value = (await figure.textContent()) ?? "";
  await expect(page.getByTestId("value-left-out")).toHaveCount(0);

  await page.getByTestId("next-api").click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("verdict-figure")).toHaveText(value, { timeout: 60_000 });
});

test("what you pay today is pro-rated to the recorded days, with the arithmetic", async ({
  page,
}) => {
  await importArchetype(page, "mixed");
  await page.goto("/app/workload");
  const spend = page.getByTestId("current-spend");
  await expect(spend).toBeVisible({ timeout: 60_000 });
  await spend.locator(":scope > summary").click();
  await page.getByTestId("spend-plan:anthropic-claude-max-20x").check();
  await page.getByTestId("spend-plan:openai-chatgpt-pro").check();
  await expect(page.getByTestId("current-spend-sentence")).toContainText(
    /^Your plans cost \$[\d,]+\.\d\d for the \d+ days this workload covers; at published API list prices the same work is worth \$[\d,]+\.\d\d, which is not what you paid\./u,
  );
  await expect(page.getByTestId("current-spend-arithmetic")).toContainText(
    "Claude Max 20x: $200.00 per month ×",
  );
  await expect(page.getByTestId("current-spend")).not.toContainText(/sav(e|ing)/iu);
  const apiValue =
    (await page.getByTestId("workload-opening").getByTestId("value-figure").textContent()) ?? "";
  // The whole-stack decision reuses the configured plans and the canonical API value.
  await page.goto("/app/compare");
  await page.getByTestId("compare-decision-stack").click();
  await expect(page.getByTestId("compare-price")).toContainText("Claude Max 20x");
  await expect(page.getByTestId("compare-price")).toContainText("ChatGPT Pro");
  await expect(page.getByTestId("compare-price")).toContainText(apiValue);
});
