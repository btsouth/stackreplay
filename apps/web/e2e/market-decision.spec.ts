import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { importDemo } from "./helpers";

for (const theme of ["dark", "light"] as const) {
  test(`D0 same-scope API decision, receipts and subscriptions in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
    await importDemo(page, "moderate");
    await expect(page.getByTestId("legacy-cache-assumption")).toContainText("5-minute assumption");
    await page.getByTestId("open-workload").click();
    const market = page.getByTestId("market-decision");
    await expect(market.getByTestId("market-total")).toHaveText("$5.93 – $6.10", {
      timeout: 30_000,
    });
    await expect(market.getByTestId("market-coverage")).toContainText("900 / 900 calls retained");
    await expect(market.getByTestId("market-coverage")).toContainText("900 priced calls");
    await expect(market).toContainText("261 calls");
    await expect(market).toContainText("not your actual bill");
    await market.getByTestId("market-calculation").locator(":scope > summary").click();
    await market
      .getByTestId("market-calculation")
      .getByText("5-minute cache-write assumption · feasible", { exact: true })
      .click();
    await expect(market).toContainText("Exact USD total: 5.93358645");
    await expect(market).toContainText("No source duration was observed");
    await expect(market).toContainText("gpt-5-6-sol-promotion-d0");
    await market.getByText("OpenAI API: GPT-5.6 Sol · pricing sources", { exact: true }).click();
    await expect(market.getByRole("link").filter({ hasText: "promotion" }).first()).toHaveAttribute(
      "href",
      /openai\.com/,
    );
    await market.getByTestId("market-subscriptions").locator(":scope > summary").click();
    await expect(market.getByRole("checkbox")).toHaveCount(10);
    await market.getByRole("checkbox").first().check();
    await expect(market.getByTestId("market-current-spend")).not.toContainText("$0.00");
    const amount = await market.getByTestId("market-current-spend").textContent();
    await expect(market).toContainText("kept outside the API assignment");
    const axe = await new AxeBuilder({ page }).include('[data-testid="market-decision"]').analyze();
    expect(axe.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    // Reload via Compare: the saved synthetic workload and current stack remain browser-local.
    await page.goto("/app/compare");
    await page.getByRole("link", { name: /Full admitted API equivalent/ }).click();
    await expect(market.getByTestId("market-total")).toHaveText("$5.93 – $6.10", {
      timeout: 30_000,
    });
    await market.getByTestId("market-subscriptions").locator(":scope > summary").click();
    await expect(market.getByTestId("market-current-spend")).toHaveText(amount ?? "");
  });
}

test("replacing a workload cannot publish the previous market result", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.getByTestId("open-workload").click();
  await page.goto("/app/import");
  await page.getByTestId("demo-multistack").click();
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page.getByTestId("open-workload").click();
  await expect(page.getByTestId("market-total")).toHaveText("Full total unavailable", {
    timeout: 30_000,
  });
  await expect(page.getByTestId("market-coverage")).not.toContainText("900 / 900");
});
