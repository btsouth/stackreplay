import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { type Page, test } from "@playwright/test";
import { importDemo, runReplay } from "./helpers";

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
    await shoot(page, "replay-desktop-dark");
  });

  test("replay desktop light", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop capture");
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await shoot(page, "replay-desktop-light");
  });

  test("replay mobile dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await shoot(page, "replay-mobile-dark");
  });

  test("replay mobile light", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile capture");
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await shoot(page, "replay-mobile-light");
  });

  test("replay with exceeded constraints", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "heavy");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await shoot(page, "replay-exceeded-desktop-dark");
  });

  test("replay with unknown coverage", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "multistack");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-starter");
    await shoot(page, "replay-unknown-desktop-dark");
  });
});
