import { expect, test } from "@playwright/test";
import { importDemo, runReplay } from "./helpers";

/**
 * Replay route states (M3 brief): no workload, ready, replaying, full coverage,
 * partial coverage, exceeded constraints, unknown coverage, unsupported model,
 * low confidence, violation detail.
 */

test("direct navigation without an import shows an intentional empty state", async ({ page }) => {
  await page.goto("/app/replay");
  await expect(page.getByTestId("replay-empty")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No workload yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Import a workload" })).toBeVisible();
});

test("replays a demo workload with full coverage", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  await expect(page.getByTestId("headline-status")).toContainText(/Fully served|Partly served/);
  await expect(page.getByTestId("coverage-requests")).toHaveAttribute("data-status", "known");
  await expect(page.getByTestId("coverage-requests")).toContainText("%");
  await expect(page.getByTestId("confidence-factors")).toBeVisible();
});

test("shows exceeded constraints with violation detail and a timeline", async ({ page }) => {
  await importDemo(page, "heavy");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  const constraints = page.getByTestId("constraints");
  await expect(constraints).toContainText("EXCEEDED");
  await expect(constraints).toContainText("attempted");
  // Enum values are humanized for display: no raw underscores leak through.
  // This covers constraint detail rows AND the result warnings (the
  // LATCH_TRIGGERED warning text also embeds the enum).
  await expect(constraints).toContainText("latch until reset");
  await expect(constraints).not.toContainText("until_reset");
  await expect(page.getByTestId("replay-warnings")).toContainText("latch until reset rule");
  await expect(page.getByTestId("replay-warnings")).not.toContainText("until_reset");

  const violations = page.getByTestId("violations");
  await expect(violations).toBeVisible();
  await violations.locator("summary").first().click();
  await expect(violations).toContainText("Attempted demand");
  await expect(violations).toContainText("Affected events");
  await expect(violations).toContainText(
    /latched until the window reset|individual requests rejected|served, billed as overage|recorded only/,
  );

  await expect(page.getByTestId("replay-timeline")).toBeVisible();
  await expect(page.getByTestId("timeline-chart")).toBeVisible();
});

test("keeps unknown coverage visibly unknown instead of 0% or 100%", async ({ page }) => {
  await importDemo(page, "multistack");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");

  const requests = page.getByTestId("coverage-requests");
  await expect(requests).toHaveAttribute("data-status", "unknown");
  await expect(requests).toContainText("UNKNOWN");
  await expect(requests).not.toContainText("%");

  const constraints = page.getByTestId("constraints");
  await expect(constraints).toContainText("UNKNOWN");
});

test("lists models the target does not serve", async ({ page }) => {
  await importDemo(page, "multistack");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");
  await expect(page.getByTestId("unsupported-models")).toBeVisible();
  await expect(page.getByTestId("unsupported-models")).toContainText(
    /unresolved|not_supported|excluded/,
  );
});

test("shows the rules instant and the plan version used", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter", "2026-09-15");
  await expect(page.getByTestId("replay-result")).toContainText("2026-09-15");
  await expect(page.getByTestId("replay-result")).toContainText("example-cloud-starter@2026-09-15");
});

test("plan picker is searchable and keyboard operable", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");

  await page.getByTestId("plan-search").fill("example-cloud-pro");
  await expect(page.getByTestId("plan-list").getByRole("button")).toHaveCount(1);

  await page.getByTestId("plan-search").fill("");
  const firstOption = page.getByTestId("plan-list").getByRole("button").first();
  await firstOption.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("plan-list").getByRole("button").nth(1)).toBeFocused();
  await expect(page.getByTestId("plan-list").getByRole("button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a replay can be re-run for a different target without leaving the page", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");
  const firstHeadline = await page.getByTestId("headline-status").textContent();

  await page.getByTestId("plan-example-cloud-pro").click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
  const secondHeadline = await page.getByTestId("headline-status").textContent();

  expect(secondHeadline).not.toBe(firstHeadline);
  await expect(page.getByTestId("replay-result")).toContainText("example-cloud-pro");
});

test("the share panel discloses what a link reveals before one is created", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");

  const panel = page.getByTestId("share-panel");
  await expect(panel).toBeVisible();
  // Creation-time disclosure: possession of the URL is access, and the payload is not
  // encrypted. It must not read as a security guarantee.
  await expect(page.getByTestId("share-disclosure")).toHaveText(
    /Anyone with this link can read the aggregate numbers it contains\. The link is not encrypted\./u,
  );
  await expect(panel).not.toContainText(/tamper-proof|authenticat|signed|verif/u);

  await panel.getByTestId("share-create").click();
  const url = page.getByTestId("share-url");
  await expect(url).toBeVisible();
  expect(await url.textContent()).toContain("/s/");
  await expect(page.getByTestId("share-open")).toBeVisible();
});
