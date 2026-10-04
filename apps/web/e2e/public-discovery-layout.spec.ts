import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function accessible(page: Page) {
  await expect(page).toHaveTitle(/StackReplay/u);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}
async function before(page: Page, first: string, second: string) {
  expect(
    await page.evaluate(
      ({ a, b }) => {
        const first = document.querySelector(a);
        const second = document.querySelector(b);
        return Boolean(
          first &&
            second &&
            first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      },
      { a: first, b: second },
    ),
  ).toBe(true);
}
async function capture(page: Page, name: string) {
  if (!process.env.STACKREPLAY_DISCOVERY_SCREENSHOTS) return;
  await page.screenshot({ path: `${process.env.STACKREPLAY_DISCOVERY_SCREENSHOTS}/${name}.png` });
  await page.screenshot({
    path: `${process.env.STACKREPLAY_DISCOVERY_SCREENSHOTS}/${name}-full.png`,
    fullPage: true,
  });
}

test.beforeEach(async ({ page, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 390 : 1440, height: isMobile ? 844 : 900 });
  await page.emulateMedia({ colorScheme: isMobile ? "dark" : "light", reducedMotion: "reduce" });
});

test("model discovery leads with controls and keeps the full rate comparison reachable", async ({
  page,
  isMobile,
}) => {
  await page.goto("/models");
  await expect(page.locator("[data-layout-pending]")).toHaveCount(0);
  await before(page, ".market-filters", "#published-api-rates");
  for (const label of ["Find a model, family name or exact alias", "Developer", "Capability"]) {
    const box = await page.getByLabel(label).boundingBox();
    expect(box).not.toBeNull();
    expect((box?.y ?? Infinity) + (box?.height ?? 0)).toBeLessThanOrEqual(isMobile ? 844 : 900);
  }
  await capture(page, `${isMobile ? "mobile-dark" : "desktop-light"}-models`);
  await accessible(page);
  const jump = page.getByRole("link", { name: "Compare published API rates ↓", exact: true });
  await jump.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#published-api-rates$/u);
  await expect(page.getByRole("region", { name: "Published API rates" })).toBeInViewport();
  await expect(page.getByTestId("price-comparison-pair")).toHaveCount(4);
});

test("provider discovery uses recorded roles and keyboard coverage disclosures", async ({
  page,
  isMobile,
}) => {
  await page.goto("/providers");
  await expect(page.getByLabel("Find a provider")).toBeEnabled();
  await capture(page, `${isMobile ? "mobile-dark" : "desktop-light"}-providers`);
  const row = page
    .getByTestId("provider-row")
    .filter({ has: page.getByRole("link", { name: "Anthropic ↗", exact: true }) });
  await expect(row).toContainText("Model developer · API access provider · Plan publisher");
  const details = row.locator("details");
  await expect(details).not.toHaveAttribute("open");
  await details.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await expect(details).toContainText("Legacy developed releases");
  await expect(details).toContainText("Family records");
  await expect(details).toContainText("Releases with recorded API access");
  await expect(details).toContainText("Accepted updates");
  await accessible(page);
  await page.keyboard.press("Space");
  await expect(details).not.toHaveAttribute("open");
});

test("provider hubs put useful records first and preserve empty section jumps", async ({
  page,
  isMobile,
}) => {
  await page.goto(isMobile ? "/providers/devin" : "/providers/anthropic");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    isMobile ? "Devin" : "Anthropic",
  );
  await capture(page, isMobile ? "mobile-dark-devin" : "desktop-light-anthropic");
  if (isMobile) {
    await before(page, "#published-plans", "#developed-models");
    await expect(page.getByTestId("provider-plan").first()).toBeInViewport();
    await expect(page.getByTestId("provider-plan")).toHaveCount(4);
  } else {
    await before(page, "#developed-models", "#published-plans");
    await expect(page.getByTestId("provider-model").first()).toBeInViewport();
  }
  await accessible(page);
  for (const id of [
    "developed-models",
    "recorded-api",
    "published-plans",
    "provider-updates",
    "provider-sources",
  ]) {
    const jump = page
      .getByRole("navigation", { name: "Provider sections" })
      .locator(`a[href="#${id}"]`);
    await jump.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`#${id}$`, "u"));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

test("shared models preserve filters, results and hash through reload and navigation history", async ({
  page,
}) => {
  await page.goto("/models?view=table&developer=anthropic&sort=input&dir=desc#published-api-rates");
  const path = new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash;
  await expect(page.getByLabel("Developer")).toHaveValue("anthropic");
  await expect(page.getByLabel("Order by")).toHaveValue("input");
  const rows = page.getByTestId("model-table-row");
  await expect(rows.first()).toBeVisible();
  const names = await rows.locator("th a").allTextContents();
  expect(names.length).toBeGreaterThan(0);
  await page.reload();
  await expect(rows.first()).toBeVisible();
  expect(await rows.locator("th a").allTextContents()).toEqual(names);
  const destination = await rows.first().getByRole("link").first().getAttribute("href");
  expect(destination).not.toBeNull();
  await rows.first().getByRole("link").first().click();
  await expect(page).toHaveURL(new URL(destination ?? "", page.url()).href);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}$`, "u"));
  await expect(page.getByLabel("Developer")).toHaveValue("anthropic");
  await expect(rows.first()).toBeVisible();
  expect(await rows.locator("th a").allTextContents()).toEqual(names);
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("public discovery and hubs stay within 320px in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const theme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const path of ["/models", "/providers", "/providers/anthropic", "/providers/devin"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${path} ${theme}`,
      ).toBe(true);
    }
  }
});

test("homepage leads with discovery, preserves keyboard routes and puts sourced updates below", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await before(page, '[data-testid="home-model-comparison"]', '[data-testid="market-pulse"]');
  await before(page, 'tbody[data-group="price"]', 'tbody[data-group="benchmarks"]');
  await before(page, 'tbody[data-group="limits"]', 'tbody[data-group="benchmarks"]');
  await before(page, 'tbody[data-group="access"]', 'tbody[data-group="benchmarks"]');
  await expect(page.getByTestId("home-model-comparison")).toContainText("Editorial selection");
  await expect(page.getByTestId("home-trust")).toContainText("never uploaded");
  const rail = page.getByRole("navigation", { name: "Explore the AI market" });
  await expect(rail.getByRole("link")).toHaveCount(3);
  await expect(rail).toBeInViewport();
  await capture(page, `${isMobile ? "mobile-dark" : "desktop-light"}-home`);
  await accessible(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /skip to content/iu })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  for (const name of ["Explore models", "Explore providers", "Compare plans"]) {
    await page.keyboard.press("Tab");
    await expect(rail.getByRole("link", { name, exact: true })).toBeFocused();
  }
  for (const [name, path] of [
    ["Explore models", "/models"],
    ["Explore providers", "/providers"],
    ["Compare plans", "/compare"],
  ] as const) {
    const link = rail.getByRole("link", { name, exact: true });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new URL(path, page.url()).href);
    await expect(page.getByTestId("home-hero")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/#main-content$/u);
    await expect(page.getByTestId("home-hero")).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(new URL(path, page.url()).href);
    await expect(page.getByTestId("home-hero")).toHaveCount(0);
    await page.goBack();
    await expect(page.getByTestId("home-hero")).toBeVisible();
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
