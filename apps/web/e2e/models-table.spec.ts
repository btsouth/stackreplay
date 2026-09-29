import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious.map((violation) => `${violation.id}: ${violation.nodes.length} node(s)`)).toEqual(
    [],
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

const rows = (page: Page) => page.getByTestId("model-table-row");
const cellTexts = (page: Page, column: number) =>
  rows(page).evaluateAll(
    (elements, index) =>
      elements.map(
        (row) => (row.children[index] as HTMLElement | undefined)?.innerText.trim() ?? "",
      ),
    column,
  );
const INPUT = 2;
const CONTEXT = 5;
const PLANS = 8;
const amount = (text: string) => Number(text.replace(/[$,]/gu, ""));

for (const theme of ["dark", "light"] as const) {
  test.describe(`models table in ${theme}`, () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
    });

    test("switches to a shareable table view", async ({ page }) => {
      await page.goto("/models");
      await expect(page.getByTestId("model-data-table")).toHaveCount(0);
      await page.getByRole("button", { name: "Table", exact: true }).click();
      await expect(page).toHaveURL(/[?&]view=table/u);
      const table = page.getByTestId("model-data-table");
      await expect(table).toBeVisible();
      for (const header of [
        "Model",
        "Developer",
        "Input $/1M",
        "Output $/1M",
        "Cache read $/1M",
        "Context tokens",
        "Max output tokens",
        "Reasoning",
        "Plans",
      ])
        await expect(table.getByRole("columnheader", { name: header })).toBeVisible();
      await expect(
        table.locator('[data-model-id="nemotron-3-ultra"]').getByText("Not published").first(),
      ).toBeVisible();
      await expect(table.getByRole("link", { name: "MiniMax M3", exact: true })).toHaveAttribute(
        "href",
        "/models/minimax-m3",
      );
      await page.reload();
      await expect(page.getByTestId("model-data-table")).toBeVisible();
      await expect(page.getByRole("button", { name: "Table", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousViolations(page);
      await page.getByRole("button", { name: "Cards", exact: true }).click();
      await expect(page).not.toHaveURL(/view=table/u);
      await expect(page.getByTestId("model-row").first()).toBeVisible();
    });

    test("sorts numeric columns both ways with unpublished values last", async ({ page }) => {
      await page.goto("/models?view=table");
      const input = page.getByRole("columnheader", { name: "Input $/1M" });
      await expect(input).toHaveAttribute("aria-sort", "none");
      await input.getByRole("button").click();
      await expect(input).toHaveAttribute("aria-sort", "ascending");
      let values = await cellTexts(page, INPUT);
      let published = values.filter((value) => !value.includes("Not published")).map(amount);
      expect(published.length).toBeGreaterThan(5);
      expect(published).toEqual([...published].sort((a, b) => a - b));
      expect(values.slice(published.length).every((value) => value.includes("Not published"))).toBe(
        true,
      );
      await input.getByRole("button").click();
      await expect(input).toHaveAttribute("aria-sort", "descending");
      values = await cellTexts(page, INPUT);
      published = values.filter((value) => !value.includes("Not published")).map(amount);
      expect(published).toEqual([...published].sort((a, b) => b - a));
      expect(values.slice(published.length).every((value) => value.includes("Not published"))).toBe(
        true,
      );

      const context = page.getByRole("columnheader", { name: "Context tokens" });
      await context.getByRole("button").click();
      await expect(context).toHaveAttribute("aria-sort", "descending");
      await expect(input).toHaveAttribute("aria-sort", "none");
      const contexts = await cellTexts(page, CONTEXT);
      expect(contexts.at(-1)).toContain("Not published");
      await expect(page.getByLabel("Order by")).toHaveValue("context");
    });

    test("filters by subscription access and published API price", async ({ page }) => {
      await page.goto("/models?view=table");
      const total = await rows(page).count();
      await page.getByLabel("Included in a subscription").check();
      const plans = (await cellTexts(page, PLANS)).map(amount);
      expect(plans.length).toBeGreaterThan(0);
      expect(plans.length).toBeLessThanOrEqual(total);
      expect(plans.every((count) => count > 0)).toBe(true);
      await page.getByLabel("Included in a subscription").uncheck();
      await page.getByLabel("Published API price").check();
      const inputs = await cellTexts(page, INPUT);
      expect(inputs.length).toBeLessThan(total);
      await expect(page.locator('[data-model-id="nemotron-3-ultra"]')).toHaveCount(0);
      await page.getByLabel("Find a model, family name or exact alias").fill("no such model");
      await expect(page.getByTestId("model-empty")).toContainText("No models match these filters.");
      await page.getByRole("button", { name: "Clear filters" }).click();
      await expect(page.getByLabel("Published API price")).not.toBeChecked();
      await expect(rows(page)).toHaveCount(total);
      await page.getByLabel("Published API price").check();
      await page.getByLabel("Order by").selectOption("maxOutput");
      await page.getByRole("button", { name: "Cards", exact: true }).click();
      await expect(page.getByTestId("model-row").first()).toBeVisible();
      await expect(page.getByTestId("model-plan-count").first()).toHaveText(/^In \d+ plans?$/u);
    });

    test("model page shows key figures and copies the exact API id", async ({
      page,
      context,
      browserName,
    }) => {
      test.skip(browserName !== "chromium", "Clipboard permissions are Chromium-specific.");
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto("/models/minimax-m3");
      const glance = page.getByTestId("model-glance");
      await expect(glance).toContainText("Input $/1M$0.3");
      await expect(glance).toContainText("Output $/1M$1.2");
      await expect(glance).toContainText("Context1M");
      await expect(glance).toContainText("ReasoningYes");
      const planLink = glance.getByRole("link", { name: /\d+ plans/u });
      await expect(planLink).toHaveAttribute("href", "#where-to-use");
      const listed = await page.getByTestId("model-plan-list").getByRole("link").count();
      await expect(planLink).toHaveText(`${listed} plans`);
      await page.getByRole("button", { name: "Copy API model id" }).click();
      await expect(page.getByTestId("copy-api-id-status")).toHaveText("Copied");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("MiniMax-M3");
      // Harness aliases are identity records, not API ids.
      await expect(page.getByLabel("API model ids")).not.toContainText("minimax/minimax-m3");
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousViolations(page);

      // Unpublished figures are left out rather than shown empty.
      await page.goto("/models/nemotron-3-ultra");
      await expect(page.getByTestId("model-glance")).not.toContainText("Input");
      await expect(page.getByTestId("model-glance")).not.toContainText("Max output");
      await expect(page.getByTestId("model-glance")).toContainText("Context1M");
    });
  });

  test.describe(`models table on a phone in ${theme}`, () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test("stacks each row with labels and keeps the page width", async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
      await page.goto("/models?view=table");
      const first = rows(page).first();
      await expect(first).toBeVisible();
      await expect(first.getByText("Input $/1M")).toBeVisible();
      await expect(first.getByText("Included in plans")).toBeVisible();
      const box = await first.boundingBox();
      expect(box?.width ?? 0).toBeLessThanOrEqual(390);
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousViolations(page);
      await page.goto("/models/qwen-3-8-max");
      await expect(page.getByTestId("model-glance")).toBeVisible();
      await expect(page.getByRole("button", { name: "Copy API model id" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousViolations(page);
    });
  });
}
