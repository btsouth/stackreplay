import { expect, test } from "@playwright/test";
import { importDemo } from "./helpers";

/**
 * Moving around the product keeps its context: the address holds what Replay
 * and Compare were showing, Settings feeds the plans Compare uses, and clearing
 * everything asks first.
 */

test("Back and Forward return to the same Replay target and Compare decision", async ({
  page,
}, info) => {
  await importDemo(page, "multistack");
  await page.goto("/app/replay");
  await page.getByTestId("plan-example-cloud-pro").click();
  await expect(page).toHaveURL(/target=example-cloud-pro/u);

  await page.goto("/app/compare");
  await page.getByTestId("compare-decision-stack").click();
  await expect(page).toHaveURL(/decision=stack/u);

  await page.goBack();
  await expect(page).toHaveURL(/\/app\/replay\?.*target=example-cloud-pro/u);
  await expect(page.getByTestId("plan-example-cloud-pro")).toHaveAttribute("aria-pressed", "true");

  await page.goForward();
  await expect(page.getByTestId("stack-comparison")).toBeVisible();

  // A reload keeps the decision too.
  await page.reload();
  await expect(page.getByTestId("stack-comparison")).toBeVisible({ timeout: 30_000 });
  if (info.project.name === "desktop")
    await expect(
      page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Compare" }),
    ).toHaveAttribute("aria-current", "page");
});

test("plans chosen in Settings are the stack Compare uses", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/settings");
  await page.getByTestId("settings-plan-anthropic-claude-max-20x").check();
  await expect(page.getByTestId("settings-plans-summary")).toHaveText("Claude Max 20x");
  await page.goto("/app/compare");
  await page.getByTestId("compare-decision-stack").click();
  await expect(page.getByTestId("compare-price")).toContainText("Claude Max 20x");
});

test("clearing local data asks first and can be kept", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/import");
  await page.getByTestId("clear-local-data").click();
  const confirmation = page.getByTestId("clear-local-data-confirmation");
  await expect(confirmation).toContainText("cannot be undone");
  await confirmation.getByRole("button", { name: "Keep my workloads" }).click();
  await expect(page.getByTestId("stored-imports")).toBeVisible();
  await expect(page.getByTestId("clear-local-data-confirmation")).toHaveCount(0);
});

test("a first visit to the app opens Import; a saved workload opens Workload", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/import$/u);
  await importDemo(page, "moderate");
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/workload$/u);
  await expect(page.getByTestId("workload-opening")).toBeVisible();
});
