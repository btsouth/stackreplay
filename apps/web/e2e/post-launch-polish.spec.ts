import { expect, test } from "@playwright/test";
import { importDemo } from "./helpers";

test("home copy scopes history and API value", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await expect(hero).toContainText("supported history");
  await expect(hero).toContainText("covered calls");
  await expect(hero).not.toContainText("every model call");
});

test("missing pages have one public shell and conditional saved-workload copy", async ({
  page,
}) => {
  for (const path of ["/this-page-does-not-exist", "/plans/no-such-plan"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main")).toContainText("If you saved a workload");
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
  }
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
  await expect(page.getByTestId("ready-preview").getByTestId("value-figure")).toBeVisible();
  await expect(page.getByTestId("ready-preview")).toContainText("published API list prices");
  await page.getByTestId("open-workload").click();
  await expect(page.getByTestId("workload-opening").getByTestId("value-figure")).toBeVisible();
  await expect(page.getByTestId("workload-opening")).toContainText(/demo|synthetic/iu);
});

test("mobile analysis control ends before the Share section", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importDemo(page, "moderate");
  await page.getByTestId("open-workload").click();
  await expect(page.getByTestId("measure-bar")).toBeVisible();
  await page.getByTestId("section-pressure").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("measure-bar")).toBeInViewport();
  await page.locator("#share").scrollIntoViewIfNeeded();
  await expect(page.locator("#share")).toBeInViewport();
  const bar = await page.getByTestId("measure-bar").boundingBox();
  expect(bar).not.toBeNull();
  expect((bar?.y ?? 0) + (bar?.height ?? 0)).toBeLessThan(0);
});

test("plan names wrap inside the Settings selector at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/settings");
  const labels = page.getByTestId("settings-plans").locator("label");
  await expect(labels.first()).toBeVisible();
  const measures = await labels.evaluateAll((nodes) =>
    nodes.map((label) => {
      const name = label.querySelector("span");
      return {
        name: name?.textContent ?? "",
        overflow: (name?.scrollWidth ?? 0) > (name?.clientWidth ?? 0) + 1,
        truncated: name?.classList.contains("truncate") ?? false,
      };
    }),
  );
  expect(measures.length).toBeGreaterThan(0);
  expect(measures.every((item) => !item.overflow && !item.truncated)).toBe(true);
});
