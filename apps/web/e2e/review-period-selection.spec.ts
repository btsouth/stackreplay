import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { buildDemoExport } from "../../../packages/test-fixtures/src/demo-workload";
import { chooseOption } from "./app-select-helpers";
import { gotoImport, openReviewEditor, waitForWorkload } from "./premium-app-helpers";

for (const theme of ["dark", "light"] as const) {
  test(`35-day import prices the full import before optional billing in ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("stackreplay-theme", theme);
      localStorage.setItem(
        "stackreplay.current-stack",
        JSON.stringify(["plan:anthropic-claude-max-5x"]),
      );
    }, theme);
    const file = buildDemoExport("moderate");
    const base = file.events.find((e) => e.model.rawName.startsWith("claude"));
    if (!base) throw Error("Missing fixture model");
    file.collectorVersion = "synthetic-period-selection-test";
    file.detectedSources = file.detectedSources.map(({ note: _note, ...s }) => s);
    file.events = ["2026-08-24", "2026-09-18", "2026-09-27"].map((date, i) => ({
      ...base,
      id: `response-${i}`,
      occurredAt: `${date}T12:00:00Z`,
      source: { ...base.source, adapterId: "claude-code", resourceInstanceId: "primary" },
    }));
    await gotoImport(page);
    await page.getByTestId("import-file-input").setInputFiles({
      name: "35-days.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(file)),
    });
    await expect(page.getByTestId("import-summary")).toBeVisible();
    await waitForWorkload(page);
    await expect(page.getByTestId("overview-api-total")).toContainText("$");
    await expect(page.getByTestId("overview-period")).toContainText("35 days");
    await expect(page.getByLabel("Review start date")).not.toBeVisible();
    await openReviewEditor(page);
    const market = page.getByTestId("market-decision");
    await expect(
      market.getByRole("heading", { name: "Choose a review period", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("imported-history-span")).toContainText("35 days");
    await expect(page.getByLabel("Review start date")).toBeVisible();
    await expect(page.getByLabel("Review end date")).toBeVisible();
    await expect(page.getByLabel("Local source account")).toBeVisible();
    await page.getByLabel("Review period source").click();
    await expect(page.getByRole("option", { name: /Use recorded history span/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("market-total")).toHaveCount(0);
    await expect(page.getByTestId("decision-difference")).not.toBeVisible();
    await expect(market).not.toContainText("Full total unavailable");
    await openReviewEditor(page);
    await chooseOption(page.getByLabel("Local source account"), "primary");
    await expect(page.getByLabel("Local account label")).toBeVisible();
    await page.getByRole("button", { name: "Apply review period" }).click();
    await expect(market.getByRole("alert")).toContainText("1 to 31 days");
    await openReviewEditor(page);
    await page.getByLabel("Review start date").fill("2026-08-19");
    await openReviewEditor(page);
    await page.getByLabel("Review end date").fill("2026-09-19");
    await page.getByRole("button", { name: "Apply review period" }).click();
    await expect(page.getByTestId("market-total")).toContainText("$");
    await expect(page.getByTestId("review-history")).toContainText("2 recorded calls");
    await expect(page.getByLabel("Confirm history covers this review period")).not.toBeChecked();
    await page.getByLabel("Confirm history covers this review period").check();
    await openReviewEditor(page);
    await page.getByTestId("market-subscriptions").locator(":scope > summary").click();
    const form = page.getByRole("form", { name: /Claude Max 5x billing facts/ });
    await form.getByLabel(/cycle start/).fill("2026-08-19");
    await form.getByLabel(/cycle end/).fill("2026-09-19");
    await form.getByLabel(/amount paid/).fill("87");
    await form.getByRole("button", { name: "Save local billing facts" }).click();
    await expect(page.getByTestId("review-state")).toHaveText("Complete billing-period review");
    await page.reload();
    await openReviewEditor(page);
    await expect(
      page.getByRole("button", { name: /Use billing cycle.*Claude Max 5x/ }),
    ).toBeVisible();
    await openReviewEditor(page);
    await page.getByRole("button", { name: /Use billing cycle.*Claude Max 5x/ }).click();
    await expect(page.getByLabel("Review start date")).toHaveValue("2026-08-19");
    await expect(page.getByLabel("Review end date")).toHaveValue("2026-09-19");
    await expect(page.getByTestId("review-confirmed-spend")).toHaveText("$87.00");
    await expect(page.getByTestId("decision-fixed-spend")).toHaveText("$100.00 / month");
    await page.getByLabel("Confirm history covers this review period").check();
    await openReviewEditor(page);
    await page.getByLabel("Review start date").fill("2026-08-20");
    await page.getByRole("button", { name: "Apply review period" }).click();
    await expect(page.getByLabel("Confirm history covers this review period")).not.toBeChecked();
    await expect(page.getByTestId("review-state")).toHaveText("Partial review");
    // Invalid drafts do not replace the last applied period or start another calculation.
    await openReviewEditor(page);
    await page.getByLabel("Review start date").fill("2026-08-01");
    await page.getByRole("button", { name: "Apply review period" }).click();
    await expect(market.getByRole("alert")).toContainText("1 to 31 days");
    await expect(page.getByTestId("review-period")).toContainText("Aug 20");
    expect(
      await page.getByTestId("review-setup").evaluate((el) => {
        const state = document.querySelector('[data-testid="review-state"]');
        return !!state && !!(el.compareDocumentPosition(state) & Node.DOCUMENT_POSITION_FOLLOWING);
      }),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).include('[data-testid="market-decision"]').analyze())
        .violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
