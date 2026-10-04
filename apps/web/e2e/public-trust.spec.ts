import { expect, test } from "@playwright/test";

const routes = [
  ["/", "StackReplay: explore AI models, providers and plans"],
  ["/models", "Models"],
  ["/models/gpt-6-1-sol", "GPT-6.1 Sol"],
  ["/plans", "Subscriptions"],
  ["/plans/clinepass", "ClinePass"],
  ["/benchmarks", "Model benchmarks"],
  ["/compare", "Compare plans"],
  ["/methodology", "Methodology"],
  ["/changelog", "AI updates"],
];

for (const [path, title] of routes)
  test(`social metadata describes ${path}`, async ({ page }) => {
    await page.goto(path ?? "/");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title ?? "");
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `https://stackreplay.com${path === "/" ? "" : path}`,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      path === "/" ? /^https:\/\/stackreplay\.com\/?$/ : `https://stackreplay.com${path}`,
    );
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      description ?? "",
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      title ?? "",
    );
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
      "content",
      description ?? "",
    );
  });

test("home states scoped checks and methodology starts with catalog evidence", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toContainText("Your logs never leave your browser");
  await expect(page.locator("main")).toContainText("Illustrative comparison");
  await page.goto("/methodology");
  await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(
    "What the catalog covers",
  );
  await page.getByRole("link", { name: "Workload replay and accounting details" }).click();
  await expect(page).toHaveURL(/#replay-methodology$/);
  await expect(
    page.getByRole("heading", { name: "Workload replay and accounting", exact: true }),
  ).toBeVisible();
});
