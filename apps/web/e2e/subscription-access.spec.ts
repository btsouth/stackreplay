import { expect, test } from "@playwright/test";

test("Command Code comparison and plan expose the provider lineup", async ({ page }) => {
  await page.goto("/compare?left=command-code-max-20x&right=command-code-goat");
  const comparison = page
    .getByTestId("compare-table")
    .filter({ hasText: "Command Code Max 20×" })
    .filter({ visible: true })
    .last();
  await expect(comparison).toBeVisible();
  const compactMatrixDisclosure = comparison.getByTestId("compare-mobile-model-matrix-details");
  const mobile = await compactMatrixDisclosure.isVisible();
  const matrix = mobile
    ? compactMatrixDisclosure.getByTestId("compare-mobile-model-matrix")
    : comparison.getByTestId("compare-model-matrix");
  const matrixDisclosure = mobile
    ? compactMatrixDisclosure
    : comparison.getByTestId("compare-row-model-matrix");
  if (mobile) {
    await expect(comparison.getByTestId("compare-model-matrix")).toBeHidden();
    await expect(matrix).toBeHidden();
    await compactMatrixDisclosure.getByText("Compare model access", { exact: true }).click();
  }
  await expect(matrix).toBeVisible();
  await matrixDisclosure.getByRole("button", { name: /^Show all \d+ models/u }).click();
  await expect(matrix.getByRole("link", { name: "Claude Fable 5.1", exact: true })).toBeVisible();
  await expect(matrix.getByRole("rowheader", { name: "MiMo V2.6 Pro UltraSpeed" })).toBeVisible();
  const lineupLink = comparison
    .getByRole("link", { name: "Full lineup & access conditions" })
    .filter({ visible: true })
    .first();
  if (mobile) {
    const compactSummary = comparison
      .getByTestId("compare-compact-summary")
      .filter({ visible: true })
      .first();
    await compactSummary.getByText("Models & access", { exact: true }).click();
  }
  await expect(lineupLink).toBeVisible();
  await lineupLink.click();
  await expect(
    page.getByRole("heading", { name: "Command Code Max 20×", exact: true }),
  ).toBeVisible();
  await page.getByRole("searchbox", { name: "Find a model in this plan" }).fill("MiMo");
  await expect(page.getByText("MiMo V2.6 Pro", { exact: true })).toBeVisible();
  await expect(page.getByText("MiMo V2.6 Pro UltraSpeed", { exact: true })).toBeVisible();
  await expect(page.getByText("No published model matches")).toHaveCount(0);
});

test("subscription search includes models without replay identities", async ({ page }) => {
  await page.goto("/plans");
  await page.getByRole("searchbox", { name: "Find a plan" }).fill("MiMo");
  await expect(page.getByRole("heading", { name: "ClinePass", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Command Code Max 20×", exact: true }),
  ).toBeVisible();
});

test("Claude Pro shows credit-only Fable access separately", async ({ page }) => {
  await page.goto("/plans/anthropic-claude-pro");
  const section = page.getByTestId("subscription-model-access");
  await expect(section.getByRole("heading", { name: "Usage credits only" })).toBeVisible();
  await expect(section.getByText("Not included in the Pro subscription allowance.")).toBeVisible();
  await expect(section.getByText("Claude Sonnet 5.5", { exact: true })).toBeVisible();
});
