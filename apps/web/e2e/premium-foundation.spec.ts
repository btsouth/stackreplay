import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { gotoImport } from "./helpers";

const legacyQuery = () => {
  const query = new URLSearchParams({
    import: "missing-local",
    period: "90",
    target: "catalog-plan",
    stack: "plan-one:2,plan-two:3",
    future: "a+b",
  });
  query.append("tag", "one");
  query.append("tag", "two");
  return query;
};

for (const [source, destination] of [
  ["workload", "recap"],
  ["replay", "recap"],
  ["compare", "recap"],
  ["import", "scan"],
] as const) {
  test(`legacy ${source} keeps query values and fragment`, async ({ page }) => {
    const query = legacyQuery();
    await page.goto(`/app/${source}?${query}#premium-anchor`);
    await expect(page).toHaveURL(new RegExp(`/app/${destination}\\?`));
    const url = new URL(page.url());
    for (const [key, value] of query) expect(url.searchParams.getAll(key)).toContain(value);
    expect(url.hash).toBe("#premium-anchor");
    expect(await page.getByRole("main").count()).toBe(1);
  });
}

for (const source of ["plans", "stack"] as const) {
  test(`legacy ${source} opens What you pay and keeps the period`, async ({ page }) => {
    await page.goto(`/app/${source}?${legacyQuery()}#premium-anchor`);
    await expect(page).toHaveURL(/\/app\/settings\?period=90#what-you-pay$/u);
    await expect(page.getByTestId("what-you-pay")).toBeVisible();
    await expect(page.getByTestId("what-you-pay-empty")).toBeVisible();
    expect(await page.getByRole("main").count()).toBe(1);
  });
}

test("saved and temporary scans keep a path through recap, Stats and Settings", async ({
  page,
}) => {
  await gotoImport(page);
  await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
  await page.getByRole("checkbox", { name: "Save this scan in this browser" }).uncheck();
  await page.getByTestId("import-file-input").setInputFiles({
    name: "sample.stackreplay.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(buildDemoExport("moderate"))),
  });
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
  // Client navigation retains the temporary import.
  await page
    .getByRole("navigation", { name: "App navigation" })
    .getByRole("link", { name: "SETTINGS", exact: true })
    .click();
  await expect(page.getByTestId("settings-saved")).toContainText("Temporary, until reload");
});

test("design controls support keyboard selection, tab panels and sorting", async ({ page }) => {
  await page.goto("/design");
  // The public toggle enables after hydration, when keyboard handlers are attached.
  await expect(page.getByRole("button", { name: "Toggle theme" })).toBeEnabled();
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
      await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect((await new AxeBuilder({ page }).analyze()).violations, path).toEqual([]);
    }
  });
}

test("public and app mobile menus trap focus, close on Escape and return focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/"]) {
    await page.goto(path);
    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    if (path === "/") {
      for (const name of ["Models", "Providers", "Benchmarks", "Plans", "Compare", "Updates"]) {
        await expect(
          dialog
            .getByRole("navigation", { name: "Catalog" })
            .getByRole("link", { name, exact: true }),
        ).toBeVisible();
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
