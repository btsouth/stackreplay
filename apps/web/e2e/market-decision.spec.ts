import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { importDemo, openBillingReview, openReviewEditor, openReviewEvidence } from "./helpers";

for (const theme of ["dark", "light"] as const) {
  test(`D1 same-scope API decision, receipts and subscriptions in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
    await importDemo(page, "moderate");
    await expect(page.getByTestId("legacy-cache-assumption")).toContainText("5-minute assumption");
    await page.getByTestId("open-workload").click();
    await openBillingReview(page);
    const market = page.getByTestId("market-decision");
    await expect(market.getByTestId("market-total")).toHaveText("$5.93 – $6.10", {
      timeout: 30_000,
    });
    await expect(market.getByTestId("market-coverage")).toContainText("900 / 900 calls recognized");
    await expect(market.getByTestId("market-coverage")).toContainText(
      "900 / 900 recorded calls modeled and priced",
    );
    await expect(market).toContainText("261 calls");
    await expect(market).toContainText("not an historical API invoice");
    await openReviewEvidence(page);
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
    await openReviewEditor(page);
    await market.getByTestId("market-subscriptions").locator(":scope > summary").click();
    await expect(market.getByTestId("market-subscriptions").getByRole("checkbox")).toHaveCount(10);
    await market.getByRole("checkbox", { name: "Claude Max 5x", exact: false }).focus();
    await page.keyboard.press("Space");
    await market.getByRole("checkbox", { name: "ChatGPT Plus", exact: false }).check();
    await expect(market.getByTestId("decision-fixed-spend")).toHaveText("$120.00 / month");
    await expect(market.getByTestId("decision-difference")).toHaveText(
      "Not directly comparable yet",
    );
    await expect(market).toContainText("does not establish equivalent product experience");
    for (let i = 0; i < 6; i++) await market.getByRole("checkbox").nth(i).check();
    expect(await market.getByRole("checkbox", { checked: true }).count()).toBeGreaterThan(4);
    await expect(market.getByTestId("market-current-spend")).not.toContainText("$0.00");
    const amount = await market.getByTestId("market-current-spend").textContent();
    await expect(market).toContainText("kept outside the API assignment");
    const axe = await new AxeBuilder({ page }).include('[data-testid="market-decision"]').analyze();
    expect(axe.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByTestId("review-evidence").locator(":scope > summary").click();
    await page.getByTestId("workload-insights").locator('a[href="#pressure"]').click();
    await expect(page.getByTestId("overview-evidence")).toHaveAttribute("open", "");
    await expect(page.locator("#pressure")).toBeVisible();
    // Reload via Compare: the saved synthetic workload and current stack remain browser-local.
    await page.goto("/app/compare");
    await expect(market.getByTestId("market-total")).toHaveText("$5.93 – $6.10");
    await page.getByRole("link", { name: /Full admitted API equivalent/ }).click();
    await expect(market.getByTestId("market-total")).toHaveText("$5.93 – $6.10", {
      timeout: 30_000,
    });
    await openReviewEditor(page);
    await market.getByTestId("market-subscriptions").locator(":scope > summary").click();
    await expect(market.getByTestId("market-current-spend")).toHaveText(amount ?? "");
  });
}

test("replacing a workload cannot publish the previous market result", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.getByTestId("open-workload").click();
  await openBillingReview(page);
  await page.goto("/app/import");
  await page.getByTestId("demo-multistack").click();
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page.getByTestId("open-workload").click();
  await openBillingReview(page);
  await expect(page.getByTestId("market-total")).toHaveText(
    "Pricing incomplete for this workload",
    {
      timeout: 30_000,
    },
  );
  await expect(page.getByTestId("market-coverage")).not.toContainText("900 / 900");
});

test("the import answer, Workload, Compare and aggregate share use one decision", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    (window as unknown as { marketRuns: number }).marketRuns = 0;
    Worker.prototype.postMessage = function (message, ...args: unknown[]) {
      if (message?.type === "API_MARKET")
        (window as unknown as { marketRuns: number }).marketRuns++;
      return original.call(this, message, ...(args as [StructuredSerializeOptions]));
    };
  });
  await importDemo(page, "moderate");
  await expect(page.getByTestId("market-total")).toHaveText("$5.93 – $6.10");
  await expect(page.getByTestId("legacy-import")).not.toHaveAttribute("open", "");
  await page.getByTestId("open-workload").click();
  await openBillingReview(page);
  await expect(page.getByTestId("market-total")).toHaveText("$5.93 – $6.10");
  await expect(page.getByTestId("share-figure")).toContainText("$5.93 – $6.10");
  await expect(page.getByTestId("share-headline")).toContainText(
    "900 / 900 recorded calls modeled",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId("workload-compare-cta").click();
  await expect(page.getByTestId("market-total")).toHaveText("$5.93 – $6.10");
  expect(await page.evaluate(() => (window as unknown as { marketRuns: number }).marketRuns)).toBe(
    1,
  );
});

test("a newer scoped replay interrupts a pending market answer visibly", async ({ page }) => {
  // Hold only the market request to deterministically exercise concurrent analysis,
  // without a slow device or a large private history. All other Worker work is real.
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message, ...args: unknown[]) {
      if (message?.type === "API_MARKET") return;
      return original.call(this, message, ...(args as [StructuredSerializeOptions]));
    };
  });
  await importDemo(page, "moderate");
  await page.goto("/app/compare");
  await page.getByTestId("legacy-compare").locator(":scope > summary").click();
  await page.getByTestId("compare-decision-claude").click();
  await expect(page.getByTestId("market-total")).toHaveText("Calculation unavailable");
  await expect(page.getByTestId("market-decision")).toContainText("A newer analysis interrupted");
  await expect(page.getByTestId("market-decision").getByRole("status")).toHaveCount(0);
});
