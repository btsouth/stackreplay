import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { gotoImport } from "./helpers";

for (const [source, destination, section] of [
  ["workload", "stats", undefined],
  ["stack", "plans", undefined],
  ["import", "scan", undefined],
  ["replay", "plans", "replay"],
  ["compare", "plans", "compare"],
] as const) {
  test(`legacy ${source} keeps query values and fragment`, async ({ page }) => {
    const query = new URLSearchParams({
      import: "missing-local",
      target: "catalog-plan",
      api: "anthropic",
      scope: "claude-code,codex",
      mode: "custom",
      stack: "plan-one:2,plan-two:3",
      view: "billing",
      decision: "stack",
      future: "a+b",
    });
    query.append("tag", "one");
    query.append("tag", "two");
    query.append("section", "old-value");
    query.append("section", "future-value");
    await page.goto(`/app/${source}?${query}#premium-anchor`);
    await expect(page).toHaveURL(new RegExp(`/app/${destination}\\?`));
    const url = new URL(page.url());
    for (const [key, value] of query) expect(url.searchParams.getAll(key)).toContain(value);
    expect(url.hash).toBe("#premium-anchor");
    if (section) {
      expect(url.searchParams.get("section")).toBe(section);
    }
    expect(await page.getByRole("main").count()).toBe(1);
  });
}

test("Plans details and comparison keep the selected history and browser navigation", async ({
  page,
}) => {
  await gotoImport(page);
  await page.getByTestId("demo-moderate").click();
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
  const id = new URL(page.url()).searchParams.get("import");
  await page.goto(`/app/plans?import=${id}&period=all&future=preserve-me`);
  const cards = page.locator("[data-testid^=alternative-]");
  await expect(cards.first()).toBeVisible({ timeout: 60_000 });
  await cards.first().getByRole("link", { name: "See details", exact: true }).click();
  await expect(page.getByTestId("plan-detail")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("import")).toBe(id);
  expect(new URL(page.url()).searchParams.get("future")).toBe("preserve-me");
  await page.goBack();
  await expect(page.locator(".plan-headline")).toBeVisible();
  await cards.nth(0).getByRole("checkbox").focus();
  await page.keyboard.press("Space");
  await expect(cards.nth(0).getByRole("checkbox")).toBeChecked();
  await expect(cards.nth(0).getByRole("checkbox")).toBeFocused();
  await cards.nth(1).getByRole("checkbox").check();
  await page.getByRole("link", { name: "Compare 2 plans", exact: true }).click();
  await expect(page.getByTestId("plans-comparison").locator("article")).toHaveCount(2);
  await page.goBack();
  await expect(page.locator(".plan-headline")).toBeVisible();
  await page.goForward();
  await expect(page.getByTestId("plans-comparison").locator("article")).toHaveCount(2);
});

test("legacy plan and stack details keep tool choice and quantities, with a path back", async ({
  page,
}) => {
  await gotoImport(page);
  await page.getByTestId("demo-moderate").click();
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
  const id = new URL(page.url()).searchParams.get("import");
  await page.goto(
    `/app/replay?import=${id}&target=anthropic-claude-max-5x&scope=claude-code&period=all`,
  );
  await expect(page.getByTestId("plan-detail")).toBeVisible({ timeout: 60000 });
  await expect(page.getByText("Claude Code only.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to your plans", exact: true }).click();
  await expect(page.locator(".plan-headline")).toBeVisible({ timeout: 60000 });
  expect(new URL(page.url()).searchParams.has("scope")).toBe(false);
  await page.goto(
    `/app/replay?import=${id}&stack=anthropic-claude-max-5x*2,openai-chatgpt-pro&period=all`,
  );
  await expect(page.getByRole("heading", { name: "Your proposed plans", exact: true })).toBeVisible(
    { timeout: 60000 },
  );
  await expect(
    page.getByTestId("alternative-anthropic-claude-max-5x").getByRole("heading"),
  ).toHaveText("Claude Max 5x × 2");
  await expect(
    page.getByTestId("alternative-anthropic-claude-max-5x").locator(".plan-price"),
  ).toContainText("$200");
  await page.getByRole("link", { name: "Back to your plans", exact: true }).click();
  await expect(page.locator(".plan-headline")).toBeVisible({ timeout: 60000 });
  expect(new URL(page.url()).searchParams.has("stack")).toBe(false);
});

test("saved and temporary scans keep a path through recap, Stats and Plans", async ({ page }) => {
  await gotoImport(page);
  await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
  await page.getByRole("checkbox", { name: "Save this scan in this browser" }).uncheck();
  await page.getByTestId("import-file-input").setInputFiles({
    name: "sample.stackreplay.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(buildDemoExport("moderate"))),
  });
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
  const id = new URL(page.url()).searchParams.get("import");
  await page.getByRole("link", { name: "Explore your stats" }).click();
  await expect(page).toHaveURL(/\/app\/stats\?import=/u);
  await expect(page.getByTestId("stats-ready")).toBeVisible();
  // Client links retain the in-memory import. A full page navigation would intentionally discard it.
  if (
    !(await page.getByRole("banner").getByRole("link", { name: "Plans", exact: true }).isVisible())
  )
    await page.getByRole("button", { name: "Open menu" }).click();
  const destination = page
    .getByRole("link", { name: "Plans", exact: true })
    .filter({ visible: true });
  await destination.click();
  await expect(page.getByTestId("plans-ready")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("import")).toBe(id);
  await expect(page.getByTestId("plans-ready")).not.toContainText(
    "That workload is no longer stored",
  );
});

test("design controls support keyboard selection, tab panels and sorting", async ({ page }) => {
  await page.goto("/design");
  const select = page.getByRole("combobox", { name: "History" });
  await select.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.getByRole("option", { name: "Fictional sample" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Another sample" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(select).toContainText("Another sample");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(select).toBeFocused();
  await select.click();
  await expect(select).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(select).toBeFocused();
  const radio = page.getByRole("radio", { name: "30 days" });
  await radio.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "90 days" })).toBeChecked();
  const tab = page.getByRole("tab", { name: "Story", exact: true });
  await tab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Details", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tabpanel")).toContainText("Your stats");
  const table = page.getByRole("table", { name: "Fictional coding activity" });
  await table.getByRole("button", { name: /Sessions/u }).click();
  await expect(table.getByRole("columnheader", { name: /Sessions/u })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  await expect(table.locator("tbody tr").first()).toContainText("Codex");
  await table.getByRole("button", { name: /Sessions/u }).click();
  await expect(table.locator("tbody tr").first()).toContainText("Claude Code");
});

for (const theme of ["dark", "light"] as const) {
  test(`shared headers, catalog and primitives are accessible in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    for (const path of ["/", "/catalog", "/design", "/app/plans", "/app/scan"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  });
}

test("public and app mobile menus trap focus, close on Escape and return focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/app/scan"]) {
    await page.goto(path);
    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    if (path === "/") {
      for (const name of ["Models", "Providers", "Benchmarks", "Plans", "Compare", "Updates"]) {
        await expect(dialog.getByRole("link", { name, exact: true })).toBeVisible();
      }
    }
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      await expect
        .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
        .toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(dialog).toBeHidden();
    await page.setViewportSize({ width: 390, height: 844 });
  }
});
