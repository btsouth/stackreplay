import { expect, test } from "@playwright/test";
import { importDemo } from "./helpers";

test("home copy scopes history and API value", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toContainText("Illustrative comparison");
  await expect(page.locator("main")).toContainText("estimate, not a bill or savings");
  await expect(page.locator("main")).toContainText("fictional sample");
  await expect(page.locator("main")).not.toContainText("every model call");
});

test("missing pages have one public shell and conditional saved-workload copy", async ({
  page,
}) => {
  for (const path of ["/this-page-does-not-exist", "/plans/no-such-plan"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main")).toContainText("This address may have moved");
    await expect(page.locator("main")).not.toContainText("Your saved history");
    await expect(
      page.locator("main").getByRole("link", { name: "Open my recap", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
  }
});

test("missing pages offer the saved recap when local history exists", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/this-page-does-not-exist");
  await expect(page.locator("main")).toContainText("Your saved history is still in this browser.");
  await expect(
    page.locator("main").getByRole("link", { name: "Open my recap", exact: true }),
  ).toBeVisible();
});

test("a direct public 404 restores the saved theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => localStorage.setItem("stackreplay-theme", "dark"));
  await page.goto("/plans/no-such-plan");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/u);
});

test("Moderate week leads with a sourced list-price value and stays labelled demo", async ({
  page,
}) => {
  await importDemo(page, "moderate");
  await expect(page.getByTestId("recap-ready")).toContainText("Fictional demo");
  const id = new URL(page.url()).searchParams.get("import");
  await page.goto(`/app/recap?import=${id}`);
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("recap-value").locator(".v")).toBeVisible();
  await expect(page.getByTestId("recap-value")).toContainText("AT LIST PRICES");
});

test("plan names wrap inside What you pay at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/settings");
  await page.getByRole("combobox", { name: "Add a plan" }).click();
  const names = await page.getByRole("option").allInnerTexts();
  const longest = names.reduce((a, b) => (b.length > a.length ? b : a), "");
  await page.getByRole("option", { name: longest, exact: true }).click();
  const row = page.getByTestId("what-you-pay").locator("li").first();
  await expect(row).toBeVisible();
  const measure = await row
    .locator("span")
    .first()
    .evaluate((name) => ({
      overflow: name.scrollWidth > name.clientWidth + 1,
      truncated: name.classList.contains("truncate"),
    }));
  expect(measure).toEqual({ overflow: false, truncated: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
