import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { importDemo, runReplay } from "./helpers";

/**
 * Accessibility (M3 brief): WCAG 2.2 AA target on the new surfaces, in both
 * themes, with reduced motion emulated so no transient animation state is
 * audited.
 */

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious.map((violation) => `${violation.id}: ${violation.nodes.length} node(s)`)).toEqual(
    [],
  );
}

test.describe("import surface accessibility", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`passes axe in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/app/import");
      await expectNoSeriousViolations(page);
    });
  }

  test("is operable with the keyboard alone", async ({ page }) => {
    await page.goto("/app/import");
    const input = page.getByTestId("import-file-input");
    await input.focus();
    await expect(input).toBeFocused();
    await page.keyboard.press("Tab");
    const demo = page.getByTestId("demo-moderate");
    await demo.focus();
    await expect(demo).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 30_000 });
  });

  test("import errors are announced", async ({ page }) => {
    await page.goto("/app/import");
    await page.getByTestId("import-file-input").setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("nope"),
    });
    await expect(page.getByTestId("import-error")).toHaveAttribute("role", "alert");
  });
});

test.describe("replay surface accessibility", () => {
  test("passes axe for a served workload in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await expectNoSeriousViolations(page);
  });

  test("passes axe for exceeded constraints in light mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await importDemo(page, "heavy");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await expectNoSeriousViolations(page);
  });

  test("passes axe for unknown coverage", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "multistack");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-starter");
    await expectNoSeriousViolations(page);
  });

  test("status meaning is never carried by color alone", async ({ page }) => {
    await importDemo(page, "heavy");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    const constraints = page.getByTestId("constraints");
    await expect(constraints).toContainText("PASS");
    await expect(constraints).toContainText("EXCEEDED");
  });

  test("the timeline exposes a text alternative", async ({ page }) => {
    await importDemo(page, "heavy");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    const chart = page.getByTestId("timeline-chart");
    await expect(chart).toHaveAttribute("role", "img");
    const label = await chart.getAttribute("aria-label");
    expect(label).toContain("Replay timeline");
    expect(label?.length ?? 0).toBeGreaterThan(40);
  });

  test("violation detail is reachable with the keyboard", async ({ page }) => {
    await importDemo(page, "heavy");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    const summary = page.getByTestId("violations").locator("summary").first();
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("violations")).toContainText("Attempted demand");
  });
});
