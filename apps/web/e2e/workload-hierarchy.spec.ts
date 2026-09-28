import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoImport } from "./helpers";

for (const theme of ["dark", "light"] as const) {
  test(`configured review leads with economics and projects in ${theme}`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((theme) => localStorage.setItem("stackreplay-theme", theme), theme);
    await gotoImport(page);
    await page.getByTestId("demo-billing").click();
    await expect(page.getByTestId("market-total")).toHaveText("$23.73 – $24.39");
    await page.getByTestId("open-workload").click();
    await expect(page.getByTestId("review-state")).toContainText("Complete billing-period review");
    await expect(page.getByTestId("review-editor")).not.toHaveAttribute("open", "");
    await expect(page.getByLabel("Review start date")).not.toBeVisible();
    await expect(page.getByTestId("review-bar")).toContainText("$120.00 confirmed");
    await expect(page.getByTestId("review-confirmed-spend")).toBeInViewport();
    await expect(page.getByTestId("market-total")).toBeInViewport();
    await expect(page.getByTestId("economic-ratio")).toContainText("0.20×");
    await expect(page.getByTestId("review-evidence")).not.toHaveAttribute("open", "");
    await expect(page.getByTestId("review-conclusion")).not.toBeVisible();
    await expect(page.getByText("Price snapshot:", { exact: false })).not.toBeVisible();
    if (info.project.name === "desktop") {
      const projects = await page.getByTestId("section-projects").boundingBox();
      expect(projects?.y).toBeLessThan(720);
    }
    const order = await page
      .locator(
        '[data-testid="economic-hero"], [data-testid="section-projects"], [aria-label="Current API market"], [data-testid="review-evidence"]',
      )
      .evaluateAll((elements) =>
        elements.map((el) => el.getAttribute("data-testid") ?? el.getAttribute("aria-label")),
      );
    expect(order).toEqual([
      "economic-hero",
      "section-projects",
      "Current API market",
      "review-evidence",
    ]);
    await page.getByTestId("range-explanation").locator("summary").click();
    await expect(page.getByTestId("range-explanation")).toContainText(
      "both published cache-write scenarios",
    );
    await page.getByTestId("range-explanation").locator("summary").click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByTestId("review-bar").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Review start date")).toBeVisible();
    await page.getByLabel("Review start date").fill("2026-09-02");
    await page.getByRole("button", { name: "Apply review period" }).click();
    await expect(page.getByTestId("review-state")).toHaveText("Partial review");
    await expect(page.getByLabel("Confirm history covers this review period")).not.toBeChecked();
    await expect(page.getByTestId("economic-ratio")).toHaveCount(0);
    await expect(page.getByTestId("review-editor")).toHaveAttribute("open", "");
  });
}
