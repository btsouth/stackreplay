import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("subscription discovery filters sourced tools and opens a selected comparison", async ({
  page,
}) => {
  await page.goto("/plans");
  await page.getByLabel("Works with").selectOption("Cline");
  await expect(page.getByTestId("plan-card")).toHaveCount(1);
  await expect(page.getByTestId("plan-card")).toContainText("ClinePass");
  await expect(page.getByTestId("plan-card")).toContainText("$9.99");
  await page.getByRole("link", { name: "Compare plans →" }).click();
  await expect(page.getByTestId("compare-target").first()).toContainText("ClinePass");
  await page.goto("/compare?left=clinepass&right=opencode-go");
  await expect(page.getByTestId("compare-target").nth(1)).toContainText("OpenCode Go");
  await expect(page.getByTestId("compare-row-usage")).not.toContainText(
    "Provider does not publish a numeric allowance.",
  );
});

test("newly listed plans have navigable price and evidence", async ({ page }) => {
  for (const id of [
    "command-code-goat",
    "clinepass",
    "opencode-go",
    "opencode-go-plus",
    "ollama-cloud-pro",
    "ollama-cloud-max",
    "kiro-pro",
  ]) {
    const response = await page.goto(`/plans/${id}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Published subscription price", { exact: true })).toBeVisible();
    await page.getByText("Published terms, sources & history", { exact: true }).click();
    await expect(page.getByTestId("source-list").first()).toBeVisible();
  }
});

test("model selection compares token categories without assigning missing prices", async ({
  page,
}) => {
  await page.goto("/models");
  await page.getByRole("checkbox", { name: "Compare Claude Opus 5.5", exact: true }).check();
  const chart = page.getByRole("group", { name: "output price comparison" });
  await expect(chart.getByRole("link")).toHaveCount(1);
  await expect(chart).toContainText("$20");
  await page.getByRole("button", { name: "Cache read", exact: true }).click();
  await expect(page.getByRole("group", { name: "cacheRead price comparison" })).toContainText(
    "$0.2",
  );
  await page.getByRole("button", { name: "Clear comparison" }).click();
  await page.getByLabel("Find a model, family name or exact alias").fill("Sonnet 5.5");
  await expect(page.getByTestId("model-row")).toHaveCount(1);
  await expect(page.getByTestId("model-row")).toContainText("Not verified");
  await expect(page.getByTestId("model-row").getByRole("checkbox")).toHaveCount(0);
});

for (const theme of ["dark", "light"] as const) {
  test(`market discovery remains accessible in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    for (const path of [
      "/models",
      "/plans",
      "/models/claude-opus-5-5",
      "/plans/ollama-cloud-max",
      "/changelog",
    ]) {
      await page.goto(path);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
        path,
      ).toBeLessThanOrEqual(1);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations, path).toEqual([]);
    }
  });
}
