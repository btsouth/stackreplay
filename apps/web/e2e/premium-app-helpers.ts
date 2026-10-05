import { expect, type Page } from "@playwright/test";
import { gotoImport, visitImportManager, type DemoPreset } from "./helpers";
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
    await page.getByRole("link", { name: "Explore your stats" }).click();
  }
  await expect(page.getByTestId("automatic-workload")).toBeVisible({ timeout: 60_000 });
}

export async function visitPlanSuggestions(page: Page): Promise<void> {
  const scan = new URL(page.url()).searchParams.get("import");
  await page
    .getByRole("banner")
    .locator(`a[href="/app/plans${scan ? `?import=${scan}` : ""}"]`)
    .first()
    .evaluate((link: HTMLAnchorElement) => link.click());
  await expect(
    page
      .getByRole("navigation", { name: "Your plan tools" })
      .getByRole("link", { name: "Your plans", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("navigation", { name: "Your plan tools" })
    .getByRole("link", { name: "Try a change", exact: true })
    .click();
  await expect(page.getByTestId("build-own")).toBeVisible();
}

export async function visitReplay(page: Page): Promise<void> {
  await waitForWorkload(page);
  await visitPlanSuggestions(page);
  await page.getByTestId("build-own").click();
  await expect(page.getByTestId("run-replay")).toBeVisible();
}

export async function inspectLatestImport(page: Page): Promise<void> {
  await waitForWorkload(page);
  await visitImportManager(page);
  await page.getByTestId("import-details").first().locator(":scope > summary").click();
}
