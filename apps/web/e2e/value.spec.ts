import { expect, type Page, test } from "@playwright/test";
import { buildArchetypeExport, type WorkloadArchetypeId } from "@stackreplay/test-fixtures";
import { gotoImport, openReviewEvidence, openWorkloadTools, waitForWorkload } from "./helpers";

// These legacy receipt fixtures use a known accepted rate date, not the runner's clock.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-27T12:00:00Z"));
});

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
  await waitForWorkload(page);
}

test("automatic handoff opens Workload with economics and inspectable valuation", async ({
  page,
}) => {
  await importArchetype(page, "mixed");
  await openReviewEvidence(page);
  await page.getByTestId("legacy-workload").evaluate((el: HTMLDetailsElement) => {
    el.open = true;
  });
  const preview = page.getByTestId("workload-opening");
  await expect(preview.getByTestId("value-figure")).toHaveText(/^\$[\d,]+\.\d\d$/u, {
    timeout: 60_000,
  });
  await expect(preview.getByTestId("value-caption")).toHaveText(
    "at published API list prices · not what you paid",
  );
  await expect(preview.getByTestId("value-scope")).toContainText("of 5,000 included calls");
  await expect(preview.getByTestId("value-left-out")).toContainText("DeepSeek");
  await expect(preview.getByTestId("value-left-out")).toContainText(
    "model IDs StackReplay couldn't resolve",
  );
  await expect(preview.getByTestId("workload-hero")).toContainText("Claude Code");
  await expect(preview.getByTestId("model-mix")).toBeVisible();
});

test("the workload opens with its value, scope, tool split and comparative facts", async ({
  page,
}) => {
  await importArchetype(page, "mixed");
  await page.goto("/app/workload");
  const opening = page.getByTestId("workload-opening");
  await openReviewEvidence(page);
  await page.getByTestId("legacy-workload").evaluate((el: HTMLDetailsElement) => {
    el.open = true;
  });
  await expect(opening.getByTestId("value-figure")).toBeVisible({ timeout: 60_000 });
  // Longer imports now price automatically; billing is optional.
  await expect(opening.getByTestId("overview-api-total")).toContainText("$");
  await expect(opening.getByLabel("Review start date")).not.toBeVisible();
  await opening
    .getByRole("region", { name: "Published API valuation", exact: true })
    .evaluate((section) => section.scrollIntoView({ block: "start" }));
  await expect(opening.getByTestId("value-figure")).toBeInViewport();
  await expect(opening.getByTestId("value-caption")).toBeInViewport();
  await expect(opening.getByTestId("value-scope")).toContainText("included calls priced");
  await expect(opening.getByTestId("model-mix")).toBeVisible();
  await expect(page.getByTestId("workload-insights")).toHaveCount(0);
  await openWorkloadTools(page);
  await expect(page.getByTestId("workload-replay-cta")).toBeVisible();
  await expect(page.getByTestId("overview-evidence").getByTestId("model-mix")).toHaveCount(0);

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
  await openReviewEvidence(page);
  const figure = page.getByTestId("workload-opening").getByTestId("value-figure");
  await expect(figure).toHaveText(/^\$[\d,]+\.\d\d$/u, { timeout: 60_000 });
  const value = (await figure.textContent()) ?? "";
  await expect(page.getByTestId("value-left-out")).toHaveCount(0);

  await openWorkloadTools(page);
  await page.getByTestId("next-api").click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("verdict-figure")).toHaveText(value, { timeout: 60_000 });
});

test("earlier analytical pricing remains explicitly prorated, with the arithmetic", async ({
  page,
}) => {
  await importArchetype(page, "mixed");
  await page.goto("/app/workload");
  await openReviewEvidence(page);
  await page.getByTestId("legacy-workload").evaluate((el: HTMLDetailsElement) => {
    el.open = true;
  });
  await openWorkloadTools(page);
  const spend = page.getByTestId("current-spend");
  await expect(spend).toBeVisible({ timeout: 60_000 });
  await spend.locator(":scope > summary").click();
  await page.getByTestId("spend-plan:anthropic-claude-max-20x").check();
  await page.getByTestId("spend-plan:openai-chatgpt-pro").check();
  await expect(page.getByTestId("current-spend-sentence")).toContainText(
    /^Analytical fixed-price allocation: \$[\d,]+\.\d\d for the \d+ days this workload covers; at published API list prices the same work is worth \$[\d,]+\.\d\d, which is not what you paid\./u,
  );
  await expect(page.getByTestId("current-spend-arithmetic")).toContainText(
    "Claude Max 20x: $200.00 per month ×",
  );
  await expect(page.getByTestId("current-spend")).not.toContainText(/sav(e|ing)/iu);
  const apiValue =
    (await page.getByTestId("workload-opening").getByTestId("value-figure").textContent()) ?? "";
  // The whole-stack decision reuses the configured plans and the canonical API value.
  await page.goto("/app/compare");
  await page.getByTestId("legacy-compare").evaluate((el: HTMLDetailsElement) => {
    el.open = true;
  });
  await page.getByTestId("compare-decision-stack").click();
  await expect(page.getByTestId("compare-price")).toContainText("Claude Max 20x");
  await expect(page.getByTestId("compare-price")).toContainText("ChatGPT Pro");
  await expect(page.getByTestId("compare-price")).toContainText(apiValue);
});
