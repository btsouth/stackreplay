import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoImport, importDemo, openReviewEditor, waitForWorkload } from "./helpers";

for (const theme of ["dark", "light"] as const) {
  test(`automatic overview delivers economics before any setup in ${theme}`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((theme) => localStorage.setItem("stackreplay-theme", theme), theme);
    await importDemo(page, "moderate");
    await waitForWorkload(page);
    await expect(page.getByTestId("overview-api-total")).toHaveText("$5.93 – $6.10");
    await expect(page.getByTestId("overview-scale")).toContainText("900");
    await expect(page.getByTestId("overview-scale")).toContainText("100%");
    await expect(page.getByLabel("Review start date")).not.toBeVisible();
    await expect(page.getByTestId("billing-panel")).not.toBeVisible();
    await expect(page.getByTestId("billing-action")).toHaveText("Compare against what I paid →");
    await expect(page.getByTestId("overview-evidence")).not.toHaveAttribute("open", "");
    await expect(page.getByTestId("overview-api-total")).toBeInViewport();
    if (info.project.name === "desktop")
      expect((await page.getByTestId("section-projects").boundingBox())?.y).toBeLessThan(720);
    expect(
      await page
        .locator(
          '[data-testid="workload-hero"], [data-testid="section-projects"], [data-testid="overview-models"], [data-testid="overview-evidence"]',
        )
        .evaluateAll((elements) => elements.map((el) => el.getAttribute("data-testid"))),
    ).toEqual(["workload-hero", "section-projects", "overview-models", "overview-evidence"]);
    await page.getByTestId("overview-range").locator("summary").click();
    await expect(page.getByTestId("overview-range")).toContainText(
      "Both published cache-write scenarios",
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByTestId("billing-action").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Review start date")).toBeVisible();
    await page.getByRole("button", { name: "Back to workload overview" }).click();
    await expect(page.getByTestId("billing-action")).toBeFocused();
  });
}

test("saved complete billing augments the overview without taking over its scope", async ({
  page,
}) => {
  await gotoImport(page);
  await page.getByTestId("demo-billing").click();
  await expect(page.getByTestId("market-total")).toHaveText("$23.73 – $24.39");
  await waitForWorkload(page);
  await expect(page.getByTestId("billing-summary-bar")).toContainText("$120.00 confirmed");
  await expect(page.getByTestId("billing-panel")).not.toBeVisible();
  await expect(page.getByTestId("overview-api-total")).toHaveText("$23.73 – $24.39");
  await openReviewEditor(page);
  await page.getByLabel("Review start date").fill("2026-09-02");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByLabel("Confirm history covers this review period")).not.toBeChecked();
  await expect(page.getByTestId("review-state")).toHaveText("Partial review");
  await expect(page.getByTestId("overview-api-total")).toHaveText("$23.73 – $24.39");
  await expect(page.getByTestId("overview-scale")).toContainText("3,600");
});
