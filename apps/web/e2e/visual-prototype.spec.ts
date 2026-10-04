import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("stackreplay-theme", "light"));
});
test("homepage chart, complete rows and mobile metrics stay usable", async ({ page, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 390 : 1440, height: isMobile ? 844 : 900 });
  await page.goto("/");
  await expect(page.getByLabel("Chart benchmark")).toHaveValue("deep-swe-v1-1");
  await expect(page.locator(".v-chart-foot")).toContainText("7 models plotted");
  await expect(page.locator(".v-table-scroll tbody tr").first()).toContainText("Claude Opus 5.5");
  await expect(page.locator(".v-table-scroll tbody tr").first()).toContainText("$4.00");
  if (isMobile) {
    await expect(page.locator(".v-mobile-chart")).toBeVisible();
    await expect(page.locator(".v-mobile-chart")).toContainText("$0.2625 / 1M tokens");
    await expect(
      page.locator(".v-table-scroll tbody tr").first().locator('[data-label="Output / 1M"]'),
    ).toBeVisible();
  } else {
    await expect(page.locator(".v-scatter")).toBeVisible();
    await page.locator(".v-scatter a .v-dot").first().click();
    await expect(page.locator(".v-chart-tip")).toBeVisible();
  }
  await page.getByLabel("Chart benchmark").selectOption("terminal-bench-4-0");
  await expect(page.locator(".v-chart-foot")).toContainText("6 models plotted");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).include(".visual").analyze();
  expect(
    results.violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))
      .map((violation) => violation.id),
  ).toEqual([]);
});

test("search and model rows open a shareable comparison", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search models to compare").fill("GPT-6.1");
  await page.getByLabel("Search models to compare").press("Enter");
  await expect(page).toHaveURL(/\/compare\/models\?models=gpt-6-1-sol$/u);
  await expect(
    page.getByRole("heading", { name: "Add one more model to see the comparison." }),
  ).toBeVisible();
  await page.getByLabel("Add a model to compare").fill("Claude Opus 5.5");
  await page.getByLabel("Add a model to compare").press("Enter");
  await expect(page.locator(".v-model-cards article")).toHaveCount(2);
  await expect(page.locator(".v-compare-section").first()).toContainText("$4.00");
  await page.goto("/");
  await page.getByRole("button", { name: "Add Claude Opus 5.5 to compare", exact: true }).click();
  await page.getByRole("button", { name: "Add GPT-6.1 Sol to compare", exact: true }).click();
  await page.locator(".v-compare-tray").getByRole("link", { name: "Compare models →" }).click();
  await expect(page).toHaveURL(/models=claude-opus-5-5,gpt-6-1-sol/u);
  await expect(page.locator(".v-model-cards article")).toHaveCount(2);
});

test("comparison preserves selection, shared coverage and browser history", async ({
  page,
  isMobile,
}) => {
  await page.setViewportSize({ width: isMobile ? 390 : 1440, height: isMobile ? 844 : 900 });
  await page.goto("/compare/models?models=gpt-6-1-sol,claude-opus-5-5,deepseek-v4-1-flash");
  await expect(page.locator(".v-model-cards article")).toHaveCount(3);
  await expect(page.locator(".v-benchmark-group")).toHaveCount(1);
  await page.getByRole("checkbox", { name: "Include unshared benchmarks" }).check();
  await expect(page).toHaveURL(/benchmarks=all/u);
  await expect(page.locator(".v-benchmark-group")).toHaveCount(8);
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Include unshared benchmarks" })).toBeChecked();
  await page.getByRole("button", { name: "Remove Claude Opus 5.5", exact: true }).click();
  await expect(page.locator(".v-model-cards article")).toHaveCount(2);
  await page.goBack();
  await expect(page.locator(".v-model-cards article")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).include(".visual").analyze();
  expect(
    results.violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))
      .map((violation) => violation.id),
  ).toEqual([]);
});
