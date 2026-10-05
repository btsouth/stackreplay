import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectCatalogSelection, selectCatalogOption } from "./public-controls";

test.use({ deviceScaleFactor: 1 });

const routes = [
  ["catalog", "/catalog"],
  ["models", "/models"],
  ["model", "/models/claude-sonnet-5-5"],
  ["providers", "/providers"],
  ["provider", "/providers/anthropic"],
  ["plans", "/plans"],
  ["plan", "/plans/anthropic-claude-pro"],
  ["benchmarks", "/benchmarks"],
  ["compare", "/compare"],
  ["updates", "/changelog"],
  ["update", "/changelog/google-argon-launch-results"],
  ["methodology", "/methodology"],
  ["root-404", "/not-a-real-page"],
  ["public-404", "/models/not-a-model"],
  ["models-empty", "/models?q=no-model-matches-zz"],
  ["providers-empty", "/providers?scope=all&q=no-provider-matches-zz"],
  ["updates-empty", "/changelog?provider=mistral"],
  ["benchmark-gap", "/benchmarks?models=nemotron-3-ultra"],
  ["benchmark-error", "/benchmarks?edition=unavailable-edition"],
  ["model-unpublished", "/models/gemini-4-argon"],
  ["compare-unknown-capacity", "/compare?left=devin-teams&right=opencode-go"],
] as const;
for (const theme of ["dark", "light"] as const) {
  for (const [name, path] of routes)
    test(`${name} is readable and accessible in ${theme}`, async ({ page, isMobile }) => {
      const width = isMobile ? 390 : 1440;
      await page.setViewportSize({ width, height: isMobile ? 844 : 1000 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
      const response = await page.goto(path);
      expect(await page.evaluate(() => innerWidth)).toBe(width);
      expect(response?.status(), path).toBe(name.includes("404") ? 404 : 200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      await expect(page.locator("select")).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path,
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        result.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${path}: ${v.id}`),
      ).toEqual([]);
      const directory = process.env.STACKREPLAY_PUBLIC_CAPTURE_DIR;
      if (directory) {
        await mkdir(directory, { recursive: true });
        await page.screenshot({
          path: join(directory, `${name}-${width}-${theme}.png`),
          fullPage: true,
        });
        await page.screenshot({ path: join(directory, `${name}-${width}-${theme}-opening.png`) });
      }
    });
}

test("plan filters and model comparison survive a detail-page visit", async ({ page }) => {
  await page.goto("/plans");
  await page.getByLabel("Find a plan").fill("Claude");
  await selectCatalogOption(page.getByRole("combobox", { name: "Order by", exact: true }), "price");
  await page.getByTestId("plan-card").first().getByRole("link", { name: "Explore plan" }).click();
  await expect(page).toHaveURL(/\/plans\/[^/?#]+$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/plans$/u);
  await expect(page.getByLabel("Find a plan")).toHaveValue("Claude");
  await expectCatalogSelection(
    page.getByRole("combobox", { name: "Order by", exact: true }),
    "price",
  );
  await page.goto("/models");
  const card = page.getByTestId("model-row").first();
  await card.getByRole("checkbox").check();
  await card.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/models\/[^/?#]+$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/models$/u);
  await expect(page.getByTestId("model-row").first().getByRole("checkbox")).toBeChecked();
});

test("catalog listbox supports keyboard selection, Escape and focus return", async ({ page }) => {
  await page.goto("/models");
  const developer = page.getByRole("combobox", { name: "Developer", exact: true });
  await expect(developer).toBeEnabled();
  await developer.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(developer).toBeFocused();
  await developer.press("ArrowDown");
  await page.getByRole("option", { name: "Anthropic", exact: true }).click();
  await expect(page).toHaveURL(/[?&]developer=anthropic/u);
  await page.reload();
  await expectCatalogSelection(
    page.getByRole("combobox", { name: "Developer", exact: true }),
    "anthropic",
  );
});
