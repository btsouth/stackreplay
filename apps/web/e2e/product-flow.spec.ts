import { expect, test } from "@playwright/test";
import { stackWorkloadLongHistoryFile } from "./fixtures/stack-workload";
import { gotoImport, importDemo, waitForWorkload } from "./premium-app-helpers";

/**
 * Moving around the product keeps its context: the address holds the period a
 * page was showing, Settings keeps what you pay, and clearing everything asks
 * first.
 */

test("Back and Forward return to the same period on Stats", async ({ page }) => {
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "synthetic-long-history.stackreplay.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(stackWorkloadLongHistoryFile({ scale: 100 }))),
  });
  await waitForWorkload(page);
  await page.getByRole("radio", { name: "90 days", exact: true }).check();
  await expect(page).toHaveURL(/period=90/u);
  await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "90");

  await page.goto("/app/settings");
  await expect(page.getByTestId("settings-saved")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/recap\?.*period=90/u);
  await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "90");

  await page.goForward();
  await expect(page.getByTestId("settings-saved")).toBeVisible();
});

test("plans entered in Settings are kept and listed with their quantities", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/settings");
  await page.getByRole("combobox", { name: "Add a plan" }).click();
  await page.getByRole("option", { name: /^Claude Max 20x ·/u }).click();
  await expect(page.getByTestId("what-you-pay-summary")).toHaveText("Claude Max 20x");
  await expect(page.getByTestId("what-you-pay-total")).toHaveText("1 account · $200/month total");
  await page.reload();
  await expect(page.getByTestId("what-you-pay-summary")).toHaveText("Claude Max 20x");
});

test("clearing local data asks first and can be kept", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/scan");
  await page.getByTestId("clear-local-data").click();
  const confirmation = page.getByTestId("clear-local-data-confirmation");
  await expect(confirmation).toContainText("cannot be undone");
  await confirmation.getByRole("button", { name: "Keep my scans" }).click();
  await expect(page.getByTestId("stored-imports")).toBeVisible();
  await expect(page.getByTestId("clear-local-data-confirmation")).toHaveCount(0);
});

test("a first visit opens Scan; a saved scan opens Recap", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/scan$/u);
  await importDemo(page, "moderate");
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/recap$/u);
  await expect(page.getByTestId("recap-ready")).toBeVisible();
});
