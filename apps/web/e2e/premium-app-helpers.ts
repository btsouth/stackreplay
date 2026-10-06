import { expect, type Page } from "@playwright/test";
import { type DemoPreset, gotoImport, visitImportManager } from "./helpers";

export * from "./helpers";

/** B1 route wording. The shared Stage A helper stays unchanged. */
export async function importDemo(page: Page, preset: DemoPreset): Promise<void> {
  await gotoImport(page);
  await page.getByTestId(`demo-${preset}`).click();
  await waitForWorkload(page);
}

export async function waitForWorkload(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/app\/(?:recap|stats)\?import=/u, { timeout: 60_000 });
  if (new URL(page.url()).pathname === "/app/recap") {
    // Historical billing fixtures can fall outside the recap default period.
    await page.getByRole("radio", { name: "All time", exact: true }).check();
    await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "all", {
      timeout: 60_000,
    });
    await page
      .getByRole("link", { name: "Explore your stats" })
      .evaluate((link: HTMLAnchorElement) => link.click());
  }
  await expect(page).toHaveURL(/\/app\/stats\?import=/u);
  await expect(page.getByTestId("stats-ready")).toBeVisible({ timeout: 60_000 });
}

export async function visitPlanSuggestions(page: Page): Promise<void> {
  const scan = new URL(page.url()).searchParams.get("import");
  await page
    .getByRole("banner")
    .locator(`a[href="/app/plans${scan ? `?import=${scan}` : ""}"]`)
    .first()
    .evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page.getByTestId("plans-ready")).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("heading", { name: "What else would fit", exact: true }),
  ).toBeVisible();
}

export async function visitReplay(page: Page): Promise<void> {
  await waitForWorkload(page);
  await visitPlanSuggestions(page);
  await page
    .locator("[data-testid^=alternative-]")
    .first()
    .getByRole("link", { name: "See details", exact: true })
    .click();
  await expect(page.getByTestId("plan-detail")).toBeVisible();
}

export async function inspectLatestImport(page: Page): Promise<void> {
  await waitForWorkload(page);
  await visitImportManager(page);
  await page.getByTestId("import-details").first().locator(":scope > summary").click();
}
