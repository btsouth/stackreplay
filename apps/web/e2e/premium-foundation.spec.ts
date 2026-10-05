import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { buildDemoExport } from "@stackreplay/test-fixtures";

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
    await page.goto(`/app/${source}?${query}#premium-anchor`);
    await expect(page).toHaveURL(new RegExp(`/app/${destination}\\?`));
    const url = new URL(page.url());
    for (const [key, value] of query) expect(url.searchParams.getAll(key)).toContain(value);
    expect(url.hash).toBe("#premium-anchor");
    if (section) expect(url.searchParams.get("section")).toBe(section);
    expect(await page.getByRole("main").count()).toBe(1);
  });
}

test("Plans subviews keep the selected history and browser navigation", async ({ page }) => {
  await page.goto("/app/plans?import=missing-local&future=preserve-me");
  const nav = page.getByRole("navigation", { name: "Your plan tools" });
  await nav.getByRole("link", { name: "Try a change" }).click();
  await expect(page).toHaveURL(/section=replay/u);
  await nav.getByRole("link", { name: "Compare", exact: true }).click();
  await expect(page).toHaveURL(/section=compare/u);
  expect(new URL(page.url()).searchParams.get("import")).toBe("missing-local");
  expect(new URL(page.url()).searchParams.get("future")).toBe("preserve-me");
  await page.goBack();
  await expect(nav.getByRole("link", { name: "Try a change" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.goForward();
  await expect(nav.getByRole("link", { name: "Compare", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("saved and temporary scans keep a path through recap, Stats and Plans", async ({ page }) => {
  await page.goto("/app/scan");
  await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).uncheck();
  await page.getByTestId("import-file-input").setInputFiles({
    name: "sample.stackreplay.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(buildDemoExport("moderate"))),
  });
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
  const id = new URL(page.url()).searchParams.get("import");
  await page.getByRole("link", { name: "Explore workload details" }).click();
  await expect(page).toHaveURL(/\/app\/stats\?import=/u);
  await expect(page.getByTestId("automatic-workload")).toBeVisible();
  // Client links retain the in-memory import. A full page navigation would intentionally discard it.
  if (
    !(await page.getByRole("banner").getByRole("link", { name: "Plans", exact: true }).isVisible())
  )
    await page.getByRole("button", { name: "Open menu" }).click();
  const destination = page
    .getByRole("link", { name: "Plans", exact: true })
    .filter({ visible: true });
  await destination.click();
  await expect(page.getByTestId("my-stack")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("import")).toBe(id);
  await expect(page.getByTestId("my-stack")).not.toContainText("That workload is no longer stored");
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
  await expect(select).toBeFocused();
  await select.click();
  await page.keyboard.press("Escape");
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
