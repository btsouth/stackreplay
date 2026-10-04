import { expect, test } from "@playwright/test";

test("provider discovery shares filters and restores the index through history", async ({
  page,
}) => {
  await page.goto("/providers");
  await expect(page.getByRole("combobox", { name: "View", exact: true })).toHaveValue("featured");
  await expect(page.getByTestId("provider-results")).not.toContainText("Devin");
  await page.getByLabel("Find a provider").fill("Devin");
  await expect(page).toHaveURL(/scope=all&q=Devin/u);
  await expect(page.getByRole("combobox", { name: "View", exact: true })).toHaveValue("all");
  await expect(page.getByTestId("provider-row")).toHaveCount(1);
  await page.getByRole("link", { name: "Devin ↗", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Devin", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/scope=all&q=Devin/u);
  await expect(page.getByLabel("Find a provider")).toHaveValue("Devin");
  await expect(page.getByTestId("provider-row")).toHaveCount(1);
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Devin", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Find a provider")).toHaveValue("Devin");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page).toHaveURL(/\/providers$/u);
  await expect(page.getByRole("combobox", { name: "View", exact: true })).toHaveValue("featured");
});

test("shared provider role and tool filters normalize and label plan scope", async ({ page }) => {
  await page.goto("/providers?role=publisher&q=Devin#directory");
  await expect(page).toHaveURL(/scope=all&q=Devin&role=publisher#directory/u);
  await expect(page.getByLabel("Provider role")).toHaveValue("publisher");
  await expect(page.getByTestId("provider-row")).toHaveCount(1);
  await page.getByLabel("Provider role").selectOption("developer");
  await expect(page.getByTestId("provider-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByLabel("Works with").selectOption({ label: "Claude Code" });
  await expect(page.getByRole("status")).toContainText("Matching published plans for Claude Code");
  await expect(page.getByTestId("provider-results")).toContainText("matching published plans");
  await page.goto("/providers?scope=invalid&role=unknown&tool=unknown&q=mistral");
  await expect(page).toHaveURL(/\/providers\?scope=all&q=mistral$/u);
  await expect(page.getByLabel("Provider role")).toHaveValue("all");
  await expect(page.getByLabel("Works with")).toHaveValue("all");
  await expect(page.getByTestId("provider-row")).toHaveCount(1);
});

test("provider offers preserve compound and licensed units without Replay links", async ({
  page,
}) => {
  await page.goto("/providers/devin");
  await expect(page.getByTestId("provider-plan")).toHaveCount(4);
  await expect(
    page.getByText("$80/month base + $40/month per full developer seat", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("No developed models recorded.", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Informational offer · Workload Replay unavailable.", { exact: true }),
  ).toHaveCount(4);
  await expect(page.locator('a[href^="/app/import?target=devin"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Publisher offer sources" })).toBeVisible();
  await expect(page.getByTestId("source-list")).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto("/providers/google");
  const standard = page
    .getByTestId("provider-plan")
    .filter({ has: page.locator('a[href="/plans/google-code-assist-standard"]') });
  const enterprise = page
    .getByTestId("provider-plan")
    .filter({ has: page.locator('a[href="/plans/google-code-assist-enterprise"]') });
  await expect(standard).toContainText("per licensed user / month");
  await expect(standard).toContainText(
    "$22.80 per licensed user/month with a monthly commitment. Alternative: $19 per licensed user/month with a 12-month commitment, billed monthly.",
  );
  await expect(enterprise).toContainText("per licensed user / month");
  await expect(enterprise).toContainText(
    "$54 per licensed user/month with a monthly commitment. Alternative: $45 per licensed user/month with a 12-month commitment, billed monthly.",
  );
  await expect(standard).toContainText(
    "From September 4, 2026, billing accounts without an active Gemini Code Assist subscription must contact sales. Existing active subscriptions are unaffected.",
  );
  await expect(enterprise).toContainText(
    "From September 4, 2026, billing accounts without an active Gemini Code Assist subscription must contact sales. Existing active subscriptions are unaffected.",
  );
});

test("model-only and empty coverage stays accessible with unknowns and no API summary", async ({
  page,
}) => {
  await page.goto("/providers/mistral");
  await expect(page.getByRole("heading", { name: "Mistral AI", exact: true })).toBeVisible();
  await expect(
    page.getByText("No current public plans or offers recorded.", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Recorded API access", exact: true })
      .getByTestId("provider-model"),
  ).toHaveCount(1);
  await expect(
    page.getByText("No accepted provider updates recorded.", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Developed models", exact: true })
      .getByTestId("provider-model"),
  ).toContainText("Context / max input not recorded");
  await expect(
    page
      .getByRole("region", { name: "Developed models", exact: true })
      .getByTestId("provider-model"),
  ).not.toContainText("per 1M");
  await expect(
    page
      .getByRole("region", { name: "Developed models", exact: true })
      .getByTestId("provider-model")
      .getByRole("link"),
  ).toHaveAttribute("href", /^\/models\//u);
  await page.goto("/providers/alibaba");
  await expect(page.getByTestId("provider-model").first()).toBeVisible();
  const unknown = await page.goto("/providers/unknown-provider");
  expect(unknown?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "There is nothing at this address.", exact: true }),
  ).toBeVisible();
  const synthetic = await page.goto("/providers/example-provider");
  expect(synthetic?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "There is nothing at this address.", exact: true }),
  ).toBeVisible();
});

test("provider updates link the owned permanent events and public navigation", async ({
  page,
  isMobile,
}) => {
  await page.goto("/providers/anthropic");
  await expect(page.getByTestId("provider-model").first()).toBeVisible();
  await expect(page.getByTestId("provider-plan").first()).toBeVisible();
  const update = page.getByTestId("provider-update").first();
  await expect(update).toBeVisible();
  await expect(update.locator('a[target="_blank"]')).toHaveAttribute("href", /^https:\/\//u);
  await update.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/changelog\/[a-z0-9-]+$/u);
  await expect(page.getByTestId("event-detail")).toBeVisible();
  await expect(page.getByRole("link", { name: "All updates from Anthropic" })).toHaveAttribute(
    "href",
    "/changelog?provider=anthropic",
  );
  await page.goto("/providers");
  if (isMobile) {
    const menu = page.getByRole("button", { name: /menu/iu });
    if (await menu.count()) await menu.click();
  }
  await expect(page.getByRole("link", { name: "Providers", exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("provider discovery supports multiword typing and both themes without clipping", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/providers");
  await expect(page.getByRole("combobox", { name: "View", exact: true })).toBeEnabled();
  await page.getByLabel("Find a provider").pressSequentially("Devin Teams", { delay: 40 });
  await expect(page.getByLabel("Find a provider")).toHaveValue("Devin Teams");
  await expect(page.getByTestId("provider-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page).toHaveURL(/\/providers$/u);
  await expect(page.locator("html")).not.toHaveClass(/dark/u);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  if (process.env.STACKREPLAY_PROVIDER_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.STACKREPLAY_PROVIDER_SCREENSHOTS}/${testInfo.project.name}-index-light.png`,
      fullPage: true,
    });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/providers/devin");
  await expect(page.locator("html")).toHaveClass(/dark/u);
  await expect(
    page.getByText("$80/month base + $40/month per full developer seat", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  if (process.env.STACKREPLAY_PROVIDER_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.STACKREPLAY_PROVIDER_SCREENSHOTS}/${testInfo.project.name}-devin-dark.png`,
      fullPage: true,
    });
});
