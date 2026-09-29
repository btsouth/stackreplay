import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => `${violation.id}: ${violation.nodes.length} node(s)`),
  ).toEqual([]);
}

const targets = (page: Page) => page.getByTestId("compare-target");

for (const theme of ["dark", "light"] as const) {
  test.describe(`compare page in ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
    });

    test("a shared link opens its plans, and changes stay shareable", async ({ page }) => {
      await page.goto("/compare?left=clinepass&right=opencode-go&third=command-code-pro");
      await expect(targets(page)).toHaveCount(3);
      await expect(targets(page).nth(0)).toContainText("ClinePass");
      await expect(targets(page).nth(2)).toContainText("Command Code Pro");
      await expect(page.getByTestId("compare-model-summary")).toContainText("in all three");
      await page
        .getByRole("button", { name: "Remove Command Code Pro from the comparison" })
        .click();
      await expect(targets(page)).toHaveCount(2);
      await expect(page).toHaveURL(/\/compare\?left=clinepass&right=opencode-go$/u);
      await page.getByRole("button", { name: "+ Add a third plan" }).click();
      await expect(targets(page)).toHaveCount(3);
      await expect(page).toHaveURL(/[?&]third=/u);
      await page.getByLabel("Second plan").selectOption("opencode-go-plus");
      await expect(page).toHaveURL(/[?&]right=opencode-go-plus(&|$)/u);
      await expect(
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).resolves.toBe(true);
      await expectNoSeriousViolations(page);
    });

    test("shows matching statements once and links models to their pages", async ({ page }) => {
      await page.goto("/compare");
      await expect(page.getByTestId("compare-row-simulation")).toContainText("Same for both plans");
      const matrix = page.getByTestId("compare-model-matrix");
      await matrix.getByRole("link", { name: "Claude Opus 5.5", exact: true }).click();
      await expect(page).toHaveURL(/\/models\/claude-opus-5-5$/u);
    });
  });
}

test("a popular comparison opens its plans from the compare page itself", async ({ page }) => {
  await page.goto("/compare?left=clinepass&right=opencode-go");
  await expect(targets(page).nth(0)).toContainText("ClinePass");
  const link = page
    .getByRole("complementary", { name: "Popular comparisons" })
    .getByRole("link")
    .first();
  const [left = "", right = ""] = (await link.innerText()).replace("↗", "").trim().split(" vs ");
  await link.click();
  await expect(page).toHaveURL(
    /\/compare\?left=anthropic-claude-max-20x&right=openai-chatgpt-pro$/u,
  );
  await expect(targets(page).nth(0)).toContainText(left);
  await expect(targets(page).nth(1)).toContainText(right);
});

test("a shared comparison never flashes the default pair before it applies", async ({ page }) => {
  // With scripts blocked the page never hydrates; only the server HTML and the
  // inline bootstrap run, which is what a visitor sees on first paint.
  await page.route(/\.js(\?|$)/u, (route) => route.abort());
  await page.goto("/compare?left=clinepass&right=opencode-go");
  await expect(page.getByTestId("compare-table")).toBeHidden();
  // If the explorer never hydrates, the default pair comes back instead of staying hidden.
  await expect(page.getByTestId("compare-table")).toBeVisible({ timeout: 8_000 });
  await page.goto("/compare");
  await expect(page.getByTestId("compare-table")).toBeVisible();
});

test.describe("compare page on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("three plans stack without widening the page", async ({ page }) => {
    await page.goto("/compare?left=anthropic-claude-pro&right=openai-chatgpt-plus&third=clinepass");
    await expect(targets(page)).toHaveCount(3);
    await expect(page.getByTestId("compare-model-matrix")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
});
