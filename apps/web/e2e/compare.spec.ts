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
      const mobileDisclosure = page.getByTestId("compare-mobile-model-matrix-details");
      const matrix = (await mobileDisclosure.isVisible())
        ? page.getByTestId("compare-mobile-model-matrix")
        : page.getByTestId("compare-model-matrix");
      if (await mobileDisclosure.isVisible()) {
        await mobileDisclosure.getByText("Compare model access", { exact: true }).click();
      }
      await matrix.getByRole("link", { name: "Claude Opus 5.5", exact: true }).click();
      await expect(page).toHaveURL(/\/models\/claude-opus-5-5$/u);
    });

    test("duplicate selections stay explicit and recoverable", async ({ page }) => {
      await page.goto("/compare?left=kiro-pro&right=devin-teams");
      await page.getByLabel("Second plan").selectOption("kiro-pro");
      await expect(page.getByText("Choose different plans to see a comparison.")).toBeVisible();
      await expect(page.getByTestId("compare-table")).toHaveCount(0);
      await expect(page).toHaveURL(/left=kiro-pro&right=kiro-pro/u);
      await page.getByLabel("Second plan").selectOption("devin-teams");
      await expect(page.getByTestId("compare-table")).toBeVisible();
    });
  });
}

test("a featured comparison opens its plans from the compare page itself", async ({ page }) => {
  await page.goto("/compare?left=clinepass&right=opencode-go");
  await expect(targets(page).nth(0)).toContainText("ClinePass");
  const link = page
    .getByRole("complementary", { name: "Featured comparisons" })
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
  await expect(targets(page).nth(0)).toContainText("Claude Max 20x");
  await expect(targets(page).nth(1)).toContainText("ChatGPT Pro");
  await page.goto("/compare");
  await expect(page.getByTestId("compare-table")).toBeVisible();
});

test.describe("compare page on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("three plans stack as named summaries with model access in native disclosure", async ({
    page,
  }) => {
    await page.goto("/compare?left=anthropic-claude-pro&right=openai-chatgpt-plus&third=clinepass");
    await expect(targets(page)).toHaveCount(3);
    const summaries = page.getByTestId("compare-compact-summary");
    await expect(summaries).toHaveCount(3);
    await expect(summaries.nth(0)).toBeVisible();
    await expect(summaries.nth(0)).toContainText("Apps & tools");
    await expect(summaries.nth(0)).toContainText("Included allowance");
    await expect(summaries.nth(0)).toContainText("After the limit");
    await expect(summaries.nth(0)).toContainText("Billing & qualifications");
    await expect(page.getByTestId("compare-model-matrix")).toBeHidden();
    await expect(page.getByTestId("compare-mobile-model-matrix")).toBeHidden();
    const modelAccess = page.getByText("Compare model access", { exact: true });
    await modelAccess.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("compare-mobile-model-matrix")).toBeVisible();
    await expectNoSeriousViolations(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });

  test("public offer qualifications stay visible in compact summaries", async ({ page }) => {
    await page.goto("/compare?left=kiro-pro&right=devin-teams&third=google-code-assist-enterprise");
    const targets = page.getByTestId("compare-target");
    const summaries = page.getByTestId("compare-compact-summary");
    await expect(targets.nth(1)).toContainText(
      "$80/month base + $40/month per full developer seat",
    );
    await expect(summaries.nth(1)).toContainText(
      "Up to 200 users is the published team-size statement, not 200 included full developer seats.",
    );
    await expect(summaries.nth(1)).toContainText("numeric capacity is not published");
    await expect(summaries.nth(1)).toContainText(
      "earlier terms and introduction date are not established",
    );
    await expect(targets.nth(2)).toContainText("must contact sales");
    await page.setViewportSize({ width: 320, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
});
