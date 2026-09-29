import { expect, test } from "@playwright/test";

test("Command Code comparison and plan expose the provider lineup", async ({ page }) => {
  await page.goto("/compare?left=command-code-max-20x&right=command-code-goat");
  await expect(page.getByText("Claude Fable 5.1", { exact: false }).first()).toBeVisible();
  await page.getByRole("link", { name: "Full lineup & access conditions" }).first().click();
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
