import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { createShareToken, importDemo, runReplay } from "./helpers";

/**
 * Deterministic screenshots for human review (M3 brief).
 *
 * Only synthetic demo data is ever captured. Output goes to
 * STACKREPLAY_SCREENSHOT_DIR when set (audit runs keep shots outside tracked
 * source), and to the git-ignored test-results directory otherwise.
 */

const outputDir = process.env.STACKREPLAY_SCREENSHOT_DIR ?? join("test-results", "screenshots");

async function shoot(page: Page, name: string) {
  await mkdir(outputDir, { recursive: true });
  await page.screenshot({ path: join(outputDir, `${name}.png`), fullPage: true });
}

/**
 * The result chart loads after the result itself (the charting code is a
 * dynamic import). A screenshot taken on result visibility alone captures an
 * empty chart box, so replay shots wait for the rendered chart first.
 */
async function awaitChart(page: Page) {
  await expect(page.getByTestId("timeline-chart").locator("svg")).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("M3 screenshots", () => {
  test("import desktop dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await shoot(page, "import-desktop-dark");
  });

  test("import desktop light", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop capture");
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await shoot(page, "import-desktop-light");
  });

  test("replay desktop dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await awaitChart(page);
    await shoot(page, "replay-desktop-dark");
  });

  test("replay desktop light", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop capture");
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await awaitChart(page);
    await shoot(page, "replay-desktop-light");
  });

  test("replay mobile dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await awaitChart(page);
    await shoot(page, "replay-mobile-dark");
  });

  test("replay mobile light", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile capture");
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await awaitChart(page);
    await shoot(page, "replay-mobile-light");
  });

  test("replay with exceeded constraints", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "heavy");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await awaitChart(page);
    await shoot(page, "replay-exceeded-desktop-dark");
  });

  test("replay with unknown coverage", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "multistack");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-starter");
    await awaitChart(page);
    await shoot(page, "replay-unknown-desktop-dark");
  });
});

/**
 * M4 screenshots: the public site and a shared result, in both themes, plus a
 * mobile capture. Public pages render the sourced catalog, so these shots are
 * also a visual record of what the launch catalog actually publishes.
 */
test.describe("M4 screenshots", () => {
  const publicPages = [
    { path: "/", name: "home" },
    { path: "/plans", name: "plans" },
    { path: "/methodology", name: "methodology" },
    { path: "/changelog", name: "changelog" },
  ] as const;

  for (const theme of ["dark", "light"] as const) {
    for (const page_ of publicPages) {
      test(`${page_.name} desktop ${theme}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "desktop", "desktop capture");
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.goto(page_.path);
        await shoot(page, `${page_.name}-desktop-${theme}`);
      });
    }

    test(`plan detail desktop ${theme}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "desktop capture");
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/plans");
      const first = page.getByTestId("plan-card").first().getByRole("link").first();
      test.skip((await page.getByTestId("plan-card").count()) === 0, "no catalogued plan");
      await first.click();
      await shoot(page, `plan-detail-desktop-${theme}`);
    });

    test(`share page desktop ${theme}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "desktop capture");
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      // A share link is created in the app from a real replay; the capture
      // starts there instead of from a homepage example.
      await importDemo(page, "moderate");
      await page.goto("/app/replay");
      await runReplay(page, "example-cloud-pro");
      const token = await createShareToken(page);
      await page.goto(`/s/${token}`);
      await expect(page.getByTestId("share-card-v2")).toBeVisible();
      await shoot(page, `share-desktop-${theme}`);
    });
  }

  test("home mobile dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/");
    await shoot(page, "home-mobile-dark");
  });

  test("plans mobile dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/plans");
    await shoot(page, "plans-mobile-dark");
  });
});
