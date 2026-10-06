import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { importDemo } from "./helpers";

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

  test("recap and stats desktop dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await shoot(page, "stats-desktop-dark");
    const id = new URL(page.url()).searchParams.get("import");
    await page.goto(`/app/recap?import=${id}`);
    await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
    await shoot(page, "recap-desktop-dark");
  });

  test("recap mobile dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile capture");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    const id = new URL(page.url()).searchParams.get("import");
    await page.goto(`/app/recap?import=${id}`);
    await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
    await shoot(page, "recap-mobile-dark");
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
      // A share link is created in the app from a recap; the capture starts
      // there instead of from a homepage example.
      await importDemo(page, "moderate");
      const id = new URL(page.url()).searchParams.get("import");
      await page.goto(`/app/recap?import=${id}`);
      await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
      await page.getByTestId("recap-share-create").click();
      await page.getByTestId("recap-share-open").click();
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
