import { expect, type Page, test } from "@playwright/test";
import { importDemo } from "./helpers";

/**
 * Direct API target (M4C): the same workload priced at a provider's published
 * list prices, with no plan, allowance or admission involved.
 */

test("runs a replay against a provider's list prices", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runApiReplay(page, "example-cloud");

  // The result is an API result: no allowance constraints, and the card says so
  // instead of showing an empty table or a plan-era heading.
  await expect(page.getByTestId("api-no-constraints")).toBeVisible();
  await expect(page.getByTestId("constraints")).toHaveCount(0);
  await expect(page.getByTestId("violations")).toHaveCount(0);

  // The disclosure names the provider and the target kind, not a plan version.
  await expect(page.getByTestId("replay-target-stack")).toContainText("Direct API provider");
  await expect(page.getByTestId("replay-target-stack")).toContainText("example-cloud");

  // The timeline is described as activity, not as failure windows.
  await expect(page.getByTestId("timeline-note")).toContainText("rejects nothing");
  await expect(page.getByTestId("timeline-chart")).toBeVisible({ timeout: 30_000 });

  // No plan price is displayed anywhere for an API target.
  await expect(page.getByTestId("replay-result")).not.toContainText("Plan cost");
  // The details row names the target reference for what it is. "Plan version:
  // example-cloud" would be a plan the replay never used.
  await expect(page.getByTestId("replay-result")).toContainText("Direct API provider");
  await expect(page.getByTestId("replay-result")).not.toContainText("Plan version");
  await expect(page.getByTestId("replay-result")).not.toContainText("per month");
});

test("states a Direct API summary instead of plan rules", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runApiReplay(page, "example-cloud");

  await expect(page.getByTestId("headline-status")).toContainText(/Fully served|Partly served/);
  // The demo workload is fully priced against example-cloud, so a cost appears
  // on the API basis.
  const result = page.getByTestId("replay-result");
  await expect(result).toContainText("Cost on this target");
  await expect(result).toContainText("Target cost");
  await expect(result).toContainText("api list price");
});

test("explains an unpriced provider instead of inventing a cost", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  // anthropic offers catalogued models but no API list prices for them.
  await page.getByTestId("rules-as-of").fill("2026-09-15");
  await page.getByTestId("target-kind-api").click();
  await page.getByTestId("provider-anthropic").click();
  // The picker says up front that this provider's models have no list prices,
  // so a replay here cannot produce a cost rather than producing a wrong one.
  await expect(page.getByTestId("provider-unpriced-note")).toBeVisible();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("api-no-constraints")).toBeVisible();
  await expect(page.getByTestId("replay-result")).not.toContainText("Target cost");
});

test("refuses to share a Direct API result", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runApiReplay(page, "example-cloud");

  const refused = page.getByTestId("share-refused");
  await expect(refused).toBeVisible();
  await expect(refused).toContainText("Direct API");
  await expect(page.getByTestId("share-create")).toBeDisabled();
});

/** Runs a Direct API replay against a provider and waits for the result. */
async function runApiReplay(page: Page, providerId: string, rulesAsOf = "2026-09-15") {
  await page.getByTestId("rules-as-of").fill(rulesAsOf);
  await page.getByTestId("target-kind-api").click();
  await page.getByTestId(`provider-${providerId}`).click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
}
