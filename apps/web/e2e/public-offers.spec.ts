import { selectCatalogOption, expectCatalogSelection } from "./public-controls";
import { expect, test } from "@playwright/test";
import { importDemo, setRulesAsOf } from "./helpers";

for (const [id, name] of [
  ["kiro-pro", "Kiro Pro"],
  ["cursor-teams-standard", "Cursor Teams Standard"],
  ["devin-teams", "Devin Teams"],
] as const) {
  test(`detail client navigation preserves ${id} in Compare`, async ({ page }) => {
    await page.goto(`/plans/${id}`);
    const compareLink = page.getByRole("link", { name: "Compare this plan ↗", exact: true });
    await expect(compareLink).toHaveAttribute(
      "href",
      `/compare?left=${id}&right=openai-chatgpt-pro`,
    );
    await compareLink.click();
    await expect(page).toHaveURL(new RegExp(`/compare\\?left=${id}&right=`));
    // Streamed Suspense content can contain hidden copies of these controls.
    // Role locators exclude them and still reject duplicate accessible controls.
    await expectCatalogSelection(page.getByRole("combobox", { name: "First plan", exact: true }), id);
    await expect(page.getByTestId("compare-target").first()).toContainText(name);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/plans/${id}$`));
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/compare\\?left=${id}&right=openai-chatgpt-pro$`));
    await expectCatalogSelection(page.getByRole("combobox", { name: "First plan", exact: true }), id);
    await selectCatalogOption(page
      .getByRole("combobox", { name: "Second plan", exact: true }), "google-code-assist-standard");
    await expect(page).toHaveURL(/right=google-code-assist-standard/u);
    await expect(page.getByTestId("compare-target").nth(1)).toContainText(
      "Gemini Code Assist Standard",
    );
    await page
      .getByTestId("compare-target")
      .first()
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/plans/${id}$`));
    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/compare\\?left=${id}&right=google-code-assist-standard$`),
    );
    await expectCatalogSelection(page.getByRole("combobox", { name: "First plan", exact: true }), id);
    await expectCatalogSelection(page.getByRole("combobox", { name: "Second plan", exact: true }), "google-code-assist-standard");
    if (id === "devin-teams") {
      await expect(page.getByTestId("compare-target").first()).toContainText(
        "$80/month base + $40/month per full developer seat",
      );
      await expect(page.locator('a[href="/app/scan?target=devin-teams"]')).toHaveCount(0);
    }
  });
}

test("Devin Teams seat estimate is bounded to its accepted published formula", async ({ page }) => {
  await page.goto("/plans/devin-teams");
  const calculator = page.getByTestId("full-developer-seat-calculator");
  const seats = calculator.getByLabel("Full developer seats");

  await expect(calculator).toBeVisible();
  await expect(calculator).toContainText("Seat cost calculator");
  await expect(calculator).toContainText("Estimate your monthly team fee");
  await expect(calculator).toContainText(
    "Enter the number of full developer seats to see the published monthly fee.",
  );
  await expect(calculator).toContainText("Use a whole number of seats.");
  await expect(calculator).toContainText("Published formula");
  await expect(seats).toHaveValue("1");
  await expect(calculator).toContainText("$80 + 1 × $40");
  await expect(calculator.getByTestId("seat-estimate-total")).toContainText("$120");

  for (const [value, message] of [
    ["-1", "Seat count cannot be negative."],
    ["1.5", "Use a whole number of full developer seats."],
    ["", "Enter the number of full developer seats."],
    ["one", "Use digits only for the number of full developer seats."],
    ["Infinity", "Use digits only for the number of full developer seats."],
  ] as const) {
    await seats.fill(value);
    await expect(seats).toHaveAttribute("aria-invalid", "true");
    await expect(calculator).toContainText(message);
    await expect(calculator).not.toContainText("NaN");
  }

  await seats.fill("0");
  await expect(calculator.getByTestId("seat-estimate-total")).toContainText("$80");
  await expect(calculator).toContainText(
    "Zero seats does not establish that a zero-seat purchase is available.",
  );

  await seats.fill("5");
  await expect(seats).not.toHaveAttribute("aria-invalid", "true");
  await expect(calculator.getByTestId("seat-estimate-total")).toContainText("$280");
  await expect(calculator).toContainText(
    "Illustration based on the published monthly fee. Taxes, discounts and contract terms are not included.",
  );
  await expect(calculator).toContainText("Published offer observed Oct 3, 2026");
  await expect(calculator.getByRole("link", { name: /Devin pricing and FAQ/u })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByText("Teams fee", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Published offer only; workload replay is unavailable.", { exact: true }),
  ).toBeVisible();
});

test("a full sibling comparison preserves the detail history entry", async ({ page }) => {
  await page.goto("/plans/devin-teams");
  await page.locator('a[href="/compare?left=devin-teams&right=devin-pro"]').click();
  await expect(page).toHaveURL(/\/compare\?left=devin-teams&right=devin-pro$/u);
  await expectCatalogSelection(page.getByRole("combobox", { name: "First plan", exact: true }), "devin-teams");
  await expectCatalogSelection(page.getByRole("combobox", { name: "Second plan", exact: true }), "devin-pro");
  await page.goBack();
  await expect(page).toHaveURL(/\/plans\/devin-teams$/u);
  await page.goForward();
  await expect(page).toHaveURL(/\/compare\?left=devin-teams&right=devin-pro$/u);
  await expectCatalogSelection(page.getByRole("combobox", { name: "First plan", exact: true }), "devin-teams");
  await expectCatalogSelection(page.getByRole("combobox", { name: "Second plan", exact: true }), "devin-pro");
});

test("shared comparison normalization preserves its hash and restored choices", async ({
  page,
}) => {
  await page.goto("/compare?left=devin-teams#limits");
  await expect(page).toHaveURL(/\/compare\?left=devin-teams&right=openai-chatgpt-pro#limits$/u);
  await expectCatalogSelection(page.getByRole("combobox", { name: "First plan", exact: true }), "devin-teams");
  await selectCatalogOption(page.getByRole("combobox", { name: "Second plan", exact: true }), "devin-pro");
  await expect(page).toHaveURL(/\/compare\?left=devin-teams&right=devin-pro#limits$/u);
  await page
    .getByTestId("compare-target")
    .first()
    .getByRole("link", { name: "Devin Teams", exact: true })
    .click();
  await expect(page).toHaveURL(/\/plans\/devin-teams$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/compare\?left=devin-teams&right=devin-pro#limits$/u);
  await expectCatalogSelection(page.getByRole("combobox", { name: "First plan", exact: true }), "devin-teams");
  await expectCatalogSelection(page.getByRole("combobox", { name: "Second plan", exact: true }), "devin-pro");
  await page.goto("/compare?left=unknown&right=devin-pro&third=unknown#limits");
  await expect(page).toHaveURL(/\/compare\?left=anthropic-claude-max-20x&right=devin-pro#limits$/u);
  await expectCatalogSelection(page.getByRole("combobox", { name: "First plan", exact: true }), "anthropic-claude-max-20x");
  await expectCatalogSelection(page.getByRole("combobox", { name: "Second plan", exact: true }), "devin-pro");
});

test("explicit public offer Replay targets cannot run or select another plan", async ({ page }) => {
  await importDemo(page, "moderate");
  for (const id of [
    "devin-free",
    "devin-pro",
    "devin-max",
    "devin-teams",
    "google-code-assist-standard",
    "google-code-assist-enterprise",
  ]) {
    await page.goto(`/app/plans?section=replay&mode=custom&target=${id}`);
    await setRulesAsOf(page, "2026-10-03");
    await expect(page.getByTestId("run-replay")).toBeDisabled();
    await expect(page.locator('[data-testid^="plan-"][aria-pressed="true"]')).toHaveCount(0);
    await expect(page.getByTestId("replay-result")).toHaveCount(0);
  }
});
