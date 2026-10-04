import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const OPENCODE_USAGE_FACTS = [/\$15–\$60 monthly usage/u, /\$60–\$240 monthly usage/u] as const;

async function expectVisibleOpenCodeUsageFacts(page: Page): Promise<void> {
  const comparison = page.getByTestId("compare-table").filter({ visible: true }).last();
  await expect(comparison).toBeVisible();
  for (const fact of OPENCODE_USAGE_FACTS) {
    await expect(comparison.getByText(fact).filter({ visible: true }).first()).toBeVisible();
  }
}

for (const theme of ["dark", "light"] as const)
  test(`OpenCode decision facts are usable in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
    await page.goto("/compare?left=opencode-go&right=opencode-go-plus");
    await expectVisibleOpenCodeUsageFacts(page);
    const comparison = page.getByTestId("compare-table").filter({ visible: true }).last();
    const privacyFact = comparison
      .getByText(/Muse Spark Contributor permits training/)
      .filter({ visible: true })
      .first();
    const compactPolicySummary = comparison
      .getByText("Published terms & policy", { exact: true })
      .filter({ visible: true })
      .first();
    if (!(await privacyFact.isVisible())) {
      await expect(compactPolicySummary).toBeVisible();
      await compactPolicySummary.click();
    }
    await expect(privacyFact).toBeVisible();
    await page.goto("/plans/opencode-go#usage");
    const terms = page.getByTestId("published-subscription-terms");
    await terms.getByRole("searchbox", { name: "Find in allowance by model" }).fill("Kimi K3");
    await expect(terms.getByTestId("published-allowances")).toContainText("$3");
    await expect(terms.getByTestId("published-allowances")).toContainText("$15");
    await terms.getByText("Token accounting rates", { exact: true }).click();
    await terms
      .getByRole("searchbox", { name: "Find in token accounting rates" })
      .fill("GPT 6 Luna");
    await expect(terms.getByTestId("published-rates")).toContainText("> 272K tokens");
    await terms.getByText("Provider request estimates", { exact: true }).click();
    await expect(terms.getByTestId("published-requests")).toContainText(
      "not guaranteed request quotas",
    );
    expect(
      (
        await new AxeBuilder({ page })
          .include('[data-testid="published-subscription-terms"]')
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
