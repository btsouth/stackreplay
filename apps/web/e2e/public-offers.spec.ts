import { expect, test } from "@playwright/test";
import { importDemo, setRulesAsOf } from "./helpers";

for (const [id, name] of [
  ["kiro-pro", "Kiro Pro"],
  ["cursor-teams-standard", "Cursor Teams Standard"],
  ["devin-teams", "Devin Teams"],
] as const) {
  test(`detail client navigation preserves ${id} in Compare`, async ({ page }) => {
    await page.goto(`/plans/${id}`);
    await page.getByRole("link", { name: "Compare this plan ↗", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/compare\\?left=${id}&right=`));
    await expect(page.getByLabel("First plan")).toHaveValue(id);
    await expect(page.getByTestId("compare-target").first()).toContainText(name);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/plans/${id}$`));
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/compare\\?left=${id}&right=openai-chatgpt-pro$`));
    await expect(page.getByLabel("First plan")).toHaveValue(id);
    await page.getByLabel("Second plan").selectOption("google-code-assist-standard");
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
    await expect(page.getByLabel("First plan")).toHaveValue(id);
    await expect(page.getByLabel("Second plan")).toHaveValue("google-code-assist-standard");
    if (id === "devin-teams") {
      await expect(page.getByTestId("compare-target").first()).toContainText(
        "$80/month base + $40/month per full developer seat",
      );
      await expect(page.locator('a[href="/app/import?target=devin-teams"]')).toHaveCount(0);
    }
  });
}

test("a full sibling comparison preserves the detail history entry", async ({ page }) => {
  await page.goto("/plans/devin-teams");
  await page.locator('a[href="/compare?left=devin-teams&right=devin-pro"]').click();
  await expect(page).toHaveURL(/\/compare\?left=devin-teams&right=devin-pro$/u);
  await expect(page.getByLabel("First plan")).toHaveValue("devin-teams");
  await expect(page.getByLabel("Second plan")).toHaveValue("devin-pro");
  await page.goBack();
  await expect(page).toHaveURL(/\/plans\/devin-teams$/u);
  await page.goForward();
  await expect(page).toHaveURL(/\/compare\?left=devin-teams&right=devin-pro$/u);
  await expect(page.getByLabel("First plan")).toHaveValue("devin-teams");
  await expect(page.getByLabel("Second plan")).toHaveValue("devin-pro");
});

test("shared comparison normalization preserves its hash and restored choices", async ({
  page,
}) => {
  await page.goto("/compare?left=devin-teams#limits");
  await expect(page).toHaveURL(/\/compare\?left=devin-teams&right=openai-chatgpt-pro#limits$/u);
  await expect(page.getByLabel("First plan")).toHaveValue("devin-teams");
  await page.getByLabel("Second plan").selectOption("devin-pro");
  await expect(page).toHaveURL(/\/compare\?left=devin-teams&right=devin-pro#limits$/u);
  await page
    .getByTestId("compare-target")
    .first()
    .getByRole("link", { name: "Devin Teams", exact: true })
    .click();
  await expect(page).toHaveURL(/\/plans\/devin-teams$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/compare\?left=devin-teams&right=devin-pro#limits$/u);
  await expect(page.getByLabel("First plan")).toHaveValue("devin-teams");
  await expect(page.getByLabel("Second plan")).toHaveValue("devin-pro");
  await page.goto("/compare?left=unknown&right=devin-pro&third=unknown#limits");
  await expect(page).toHaveURL(/\/compare\?left=anthropic-claude-max-20x&right=devin-pro#limits$/u);
  await expect(page.getByLabel("First plan")).toHaveValue("anthropic-claude-max-20x");
  await expect(page.getByLabel("Second plan")).toHaveValue("devin-pro");
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
    await page.goto(`/app/replay?mode=custom&target=${id}`);
    await setRulesAsOf(page, "2026-10-03");
    await expect(page.getByTestId("run-replay")).toBeDisabled();
    await expect(page.locator('[data-testid^="plan-"][aria-pressed="true"]')).toHaveCount(0);
    await expect(page.getByTestId("replay-result")).toHaveCount(0);
  }
});
