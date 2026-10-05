import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { expectCatalogSelection, selectCatalogOption } from "./public-controls";

async function expectNoSeriousViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious.map((violation) => `${violation.id}: ${violation.nodes.length} node(s)`)).toEqual(
    [],
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

/** Both layouts are server-rendered; the explorer drops the unused one once it hydrates. */
async function openModels(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("radio", { name: "Table", exact: true })).toBeEnabled();
  await expect(page.locator("[data-layout-pending]")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

// Headless Chromium overlays scrollbars, while the native 320px check used a
// classic 15px scrollbar. Constrain the root to the resulting 305px content
// width so the regression reproduces the layout that ships in desktop Chrome.
const MOBILE_MODEL_VIEWPORT = { width: 320, height: 568 } as const;
const CLASSIC_SCROLLBAR_WIDTH = 15;
const MOBILE_MODEL_CONTENT_WIDTH = MOBILE_MODEL_VIEWPORT.width - CLASSIC_SCROLLBAR_WIDTH;

const rows = (page: Page) => page.getByTestId("model-table-row");
const cellTexts = (page: Page, column: number) =>
  rows(page).evaluateAll(
    (elements, index) =>
      elements.map(
        (row) => (row.children[index] as HTMLElement | undefined)?.innerText.trim() ?? "",
      ),
    column,
  );
const INPUT = 2;
const OUTPUT = 3;
const CONTEXT = 5;
const PLANS = 8;
const RELEASED = 9;
const amount = (text: string) => Number(text.replace(/[$,]/gu, ""));

for (const theme of ["dark", "light"] as const) {
  test.describe(`models discovery at 320px in ${theme}`, () => {
    test("keeps the spotlight facts available and brings search into the first viewport", async ({
      page,
    }) => {
      await page.setViewportSize(MOBILE_MODEL_VIEWPORT);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
      await openModels(page, "/models");
      await page.addStyleTag({
        content: `html { width: ${MOBILE_MODEL_CONTENT_WIDTH}px; }`,
      });
      const layout = await page.evaluate(() => ({
        innerWidth,
        rootWidth: document.documentElement.getBoundingClientRect().width,
      }));
      expect(layout.innerWidth).toBe(MOBILE_MODEL_VIEWPORT.width);
      expect(layout.rootWidth).toBe(MOBILE_MODEL_CONTENT_WIDTH);
      const spotlight = page.locator(".market-feature");
      const pricing = spotlight.locator("p").filter({ hasText: "Published API rates:" });
      await expect(pricing).toContainText("$2 input, $10 output and $0.20 cache reads");
      await expect(pricing).toContainText("Inspect pricing and cache-write options.");
      const pricingMetrics = await pricing.evaluate((element) => ({
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      }));
      expect(pricingMetrics.fontSize).toBeGreaterThanOrEqual(12.8);
      const search = page.getByLabel("Find a model, family name or exact alias");
      const searchControl = page.locator('label:has(> input[type="search"])');
      await expect(search).toBeVisible();
      await expect(searchControl).toBeVisible();
      const searchControlBox = await searchControl.boundingBox();
      expect(
        (searchControlBox?.x ?? Infinity) + (searchControlBox?.width ?? Infinity),
      ).toBeLessThanOrEqual(MOBILE_MODEL_CONTENT_WIDTH);
      expect(
        (searchControlBox?.y ?? Infinity) + (searchControlBox?.height ?? Infinity),
      ).toBeLessThanOrEqual(MOBILE_MODEL_VIEWPORT.height);
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousViolations(page);
    });
  });

  test.describe(`models table in ${theme}`, () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
    });

    test("switches to a shareable table view", async ({ page }) => {
      await openModels(page, "/models");
      await expect(page.getByTestId("model-data-table")).toHaveCount(0);
      await page.getByRole("radio", { name: "Table", exact: true }).click();
      await expect(page).toHaveURL(/[?&]view=table/u);
      const table = page.getByTestId("model-data-table");
      await expect(table).toBeVisible();
      for (const header of [
        "Model",
        "Developer",
        "Input $/1M",
        "Output $/1M",
        "Cache read $/1M",
        "Context tokens",
        "Max output tokens",
        "Reasoning",
        "Included in plans",
        "Released",
      ])
        await expect(table.getByRole("columnheader", { name: header })).toBeVisible();
      await expect(
        table.locator('[data-model-id="nemotron-3-ultra"]').getByText("Not published").first(),
      ).toBeVisible();
      await expect(table.getByRole("link", { name: "MiniMax M3", exact: true })).toHaveAttribute(
        "href",
        "/models/minimax-m3",
      );
      await page.reload();
      await expect(page.getByTestId("model-data-table")).toBeVisible();
      await expect(page.getByRole("radio", { name: "Table", exact: true })).toBeChecked();
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousViolations(page);
      await page.getByRole("radio", { name: "Cards", exact: true }).click();
      await expect(page).not.toHaveURL(/view=table/u);
      await expect(page.getByTestId("model-row").first()).toBeVisible();
    });

    test("sorts numeric columns both ways with unpublished values last", async ({ page }) => {
      await openModels(page, "/models?view=table");
      const input = page.getByRole("columnheader", { name: "Input $/1M" });
      await expect(input).toHaveAttribute("aria-sort", "none");
      await input.getByRole("button").click();
      await expect(input).toHaveAttribute("aria-sort", "ascending");
      let values = await cellTexts(page, INPUT);
      let published = values.filter((value) => !value.includes("Not published")).map(amount);
      expect(published.length).toBeGreaterThan(5);
      expect(published).toEqual([...published].sort((a, b) => a - b));
      expect(values.slice(published.length).every((value) => value.includes("Not published"))).toBe(
        true,
      );
      await input.getByRole("button").click();
      await expect(input).toHaveAttribute("aria-sort", "descending");
      values = await cellTexts(page, INPUT);
      published = values.filter((value) => !value.includes("Not published")).map(amount);
      expect(published).toEqual([...published].sort((a, b) => b - a));
      expect(values.slice(published.length).every((value) => value.includes("Not published"))).toBe(
        true,
      );

      const context = page.getByRole("columnheader", { name: "Context tokens" });
      await context.getByRole("button").click();
      await expect(context).toHaveAttribute("aria-sort", "descending");
      await expect(input).toHaveAttribute("aria-sort", "none");
      const contexts = await cellTexts(page, CONTEXT);
      expect(contexts.at(-1)).toContain("Not published");
      await expectCatalogSelection(page.getByLabel("Order by"), "context");
      await expectCatalogSelection(page.getByLabel("Direction"), "descending");
    });

    test("sorts sourced release dates both ways and preserves the URL", async ({ page }) => {
      await openModels(page, "/models?view=table");
      const released = page.getByRole("columnheader", { name: "Released", exact: true });
      await released.getByRole("button").click();
      await expect(released).toHaveAttribute("aria-sort", "descending");
      await expectCatalogSelection(page.getByLabel("Order by"), "releaseDate");
      await expectCatalogSelection(page.getByLabel("Direction"), "descending");
      await expect(page).toHaveURL(/[?&]sort=releaseDate(&|$)/u);
      const dates = await cellTexts(page, RELEASED);
      const published = dates.filter((value) => !value.includes("Not recorded"));
      expect(published.length).toBeGreaterThan(20);
      expect(published).toEqual([...published].sort().reverse());
      expect(dates.slice(published.length).every((value) => value.includes("Not recorded"))).toBe(
        true,
      );
      await released.getByRole("button").click();
      await expect(released).toHaveAttribute("aria-sort", "ascending");
      await expect(page).toHaveURL(/[?&]dir=asc(&|$)/u);
      await page.reload();
      await expect(released).toHaveAttribute("aria-sort", "ascending");
      const older = (await cellTexts(page, RELEASED)).filter(
        (value) => !value.includes("Not recorded"),
      );
      expect(older).toEqual([...older].sort());
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousViolations(page);
      await page.goto("/models/gpt-oss-120b");
      await expect(page.locator('time[datetime="2025-08-05"]')).toHaveText("2025-08-05");
      await page.getByText("Pricing, assumptions & evidence", { exact: true }).click();
      await expect(
        page.getByRole("link", { name: "OpenAI release announcement for both GPT-OSS models" }),
      ).toBeVisible();
    });

    test("keeps the direction control and column headers in sync", async ({ page }) => {
      await openModels(page, "/models?view=table");
      const direction = page.getByLabel("Direction");
      await expect(direction).toBeDisabled();
      await expectCatalogSelection(direction, "fixed");
      await selectCatalogOption(page.getByLabel("Order by"), "output");
      await expect(direction).toBeEnabled();
      await expectCatalogSelection(direction, "ascending");
      const output = page.getByRole("columnheader", { name: "Output $/1M" });
      await expect(output).toHaveAttribute("aria-sort", "ascending");
      await selectCatalogOption(direction, { label: "High to low" });
      await expect(output).toHaveAttribute("aria-sort", "descending");
      const published = (await cellTexts(page, OUTPUT))
        .filter((value) => !value.includes("Not published"))
        .map(amount);
      expect(published).toEqual([...published].sort((a, b) => b - a));
      await output.getByRole("button").click();
      await expect(output).toHaveAttribute("aria-sort", "ascending");
      await expectCatalogSelection(direction, "ascending");
      await selectCatalogOption(page.getByLabel("Order by"), "name");
      await direction.click();
      await expect(page.getByRole("option")).toHaveText(["A to Z", "Z to A"]);
      await page.keyboard.press("Escape");
    });

    test("shows rates at two decimals or more without dropping published digits", async ({
      page,
    }) => {
      await openModels(page, "/models?view=table");
      const row = (id: string) => page.locator(`[data-model-id="${id}"]`);
      await expect(row("glm-5").locator("td").nth(1)).toContainText("$1.00");
      await expect(row("glm-5").locator("td").nth(3)).toContainText("$0.20");
      await expect(row("mimo-v2-6-flash").locator("td").nth(3)).toContainText("$0.0028");
      await expect(row("qwen-3-8-max").locator("td").nth(5)).toContainText("131K");
    });

    test("renders the requested layout before the page hydrates", async ({ page }) => {
      // With scripts blocked the page never hydrates; only the server HTML and the
      // inline layout bootstrap run, which is what a visitor sees on first paint.
      await page.route(/\.js(\?|$)/u, (route) => route.abort());
      await page.goto("/models?view=table");
      await expect(page.getByTestId("model-data-table")).toBeVisible();
      await expect(page.getByTestId("model-row").first()).toBeHidden();
      await page.goto("/models");
      await expect(page.getByTestId("model-row").first()).toBeVisible();
      await expect(page.getByTestId("model-data-table")).toBeHidden();
      // A shared filtered link holds its results back rather than flashing the default list.
      await page.goto("/models?view=table&sort=input");
      await expect(page.getByTestId("model-data-table")).toBeHidden();
      await expect(page.getByRole("region", { name: "Published API rates" })).toBeVisible();
      // If the explorer never hydrates, the default list comes back instead of staying hidden.
      await expect(page.getByTestId("model-data-table")).toBeVisible({ timeout: 8_000 });
    });

    test("keeps filters and order in a shareable URL", async ({ page }) => {
      await openModels(page, "/models?view=table&developer=minimax&sort=input&dir=desc&included=1");
      await expectCatalogSelection(page.getByLabel("Developer"), "minimax");
      await expectCatalogSelection(page.getByLabel("Order by"), "input");
      await expectCatalogSelection(page.getByLabel("Direction"), "descending");
      await expect(page.getByLabel("Included in a subscription")).toBeChecked();
      await expect(page.getByRole("columnheader", { name: "Input $/1M" })).toHaveAttribute(
        "aria-sort",
        "descending",
      );
      expect((await cellTexts(page, 1)).every((name) => name === "MiniMax")).toBe(true);
      await selectCatalogOption(page.getByLabel("Order by"), "context");
      await expect(page).toHaveURL(/[?&]sort=context(&|$)/u);
      await expect(page).not.toHaveURL(/dir=/u);
      await page.getByRole("radio", { name: "Cards", exact: true }).click();
      await expect(page).not.toHaveURL(/view=/u);
      await selectCatalogOption(page.getByLabel("Developer"), "all");
      await page.getByLabel("Included in a subscription").uncheck();
      await selectCatalogOption(page.getByLabel("Order by"), "featured");
      await expect(page).toHaveURL(/\/models$/u);
    });

    test("filters by subscription access and published API price", async ({ page }) => {
      await openModels(page, "/models?view=table");
      const total = await rows(page).count();
      await page.getByLabel("Included in a subscription").check();
      const plans = (await cellTexts(page, PLANS)).map(amount);
      expect(plans.length).toBeGreaterThan(0);
      expect(plans.length).toBeLessThanOrEqual(total);
      expect(plans.every((count) => count > 0)).toBe(true);
      await page.getByLabel("Included in a subscription").uncheck();
      await page.getByLabel("Published API price").check();
      const inputs = await cellTexts(page, INPUT);
      expect(inputs.length).toBeLessThan(total);
      await expect(page.locator('[data-model-id="nemotron-3-ultra"]')).toHaveCount(0);
      await page.getByLabel("Find a model, family name or exact alias").fill("no such model");
      await expect(page.getByTestId("model-empty")).toContainText("No models match these filters.");
      await page.getByRole("button", { name: "Clear filters" }).click();
      await expect(page.getByLabel("Published API price")).not.toBeChecked();
      await expect(rows(page)).toHaveCount(total);
      await page.getByLabel("Published API price").check();
      await selectCatalogOption(page.getByLabel("Order by"), "maxOutput");
      await page.getByRole("radio", { name: "Cards", exact: true }).click();
      await expect(page.getByTestId("model-row").first()).toBeVisible();
      await expect(page.getByTestId("model-plan-count").first()).toHaveText(/^In \d+ plans?$/u);
    });

    test("model page shows key figures and copies the exact API id", async ({
      page,
      context,
      browserName,
    }) => {
      test.skip(browserName !== "chromium", "Clipboard permissions are Chromium-specific.");
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto("/models/minimax-m3");
      const glance = page.getByTestId("model-glance");
      await expect(glance).toContainText("Input $/1M$0.30");
      await expect(glance).toContainText("Output $/1M$1.20");
      await expect(glance).toContainText("Context1M");
      await expect(glance).toContainText("ReasoningYes");
      const planLink = glance.getByRole("link", { name: /\d+ plans/u });
      await expect(planLink).toHaveAttribute("href", "#where-to-use");
      const listed = await page.getByTestId("model-plan-list").getByRole("link").count();
      await expect(planLink).toHaveText(`${listed} plans`);
      await page.getByRole("button", { name: "Copy model identifier" }).click();
      await expect(page.getByTestId("copy-api-id-status")).toHaveText("Copied");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("MiniMax-M3");
      // Harness aliases are identity records, not provider-issued identifiers.
      await expect(page.getByLabel("Model identifiers")).not.toContainText("minimax/minimax-m3");
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousViolations(page);

      // Unpublished figures are left out rather than shown empty.
      await page.goto("/models/nemotron-3-ultra");
      await expect(page.getByTestId("model-glance")).not.toContainText("Input");
      await expect(page.getByTestId("model-glance")).not.toContainText("Max output");
      await expect(page.getByTestId("model-glance")).toContainText("Context1M");
    });

    test("model access rows keep paid-seat and fixed billing bases", async ({ page }) => {
      await page.goto("/models/claude-opus-5-5");
      const paidSeat = page.locator(
        '[data-testid="model-plan-row"][data-plan-id="cursor-teams-standard"]',
      );
      await expect(paidSeat).toContainText("Cursor Teams Standard");
      await expect(paidSeat).toContainText("$40 per paid user / month");
      await expect(paidSeat).toContainText(
        "Per paid user; monthly pools reset each billing cycle.",
      );
      await expect(paidSeat).toContainText("Absolute pool sizes, annual commitment");

      const fixed = page.locator(
        '[data-testid="model-plan-row"][data-plan-id="anthropic-claude-pro"]',
      );
      await expect(fixed).toContainText("$20 / month");
      await expect(fixed).not.toContainText("per paid user");

      await page.goto("/models/claude-sonnet-4-5");
      const free = page.locator('[data-testid="model-plan-row"][data-plan-id="kiro-free"]');
      await expect(free).toContainText("Kiro Free");
      await expect(free).toContainText("Free");
      await expect(free).not.toContainText("$0 / month");
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousViolations(page);
    });

    test("labels weight and API identifiers neutrally and copies each exact id", async ({
      page,
      context,
      browserName,
    }) => {
      test.skip(browserName !== "chromium", "Clipboard permissions are Chromium-specific.");
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      for (const [path, identifier] of [
        ["/models/llama-4-maverick", "meta-llama/Llama-4-Maverick-17B-128E-Instruct"],
        ["/models/mistral-large-3", "mistral-large-2512"],
      ] as const) {
        await page.goto(path);
        const identifiers = page.getByLabel("Model identifiers");
        await expect(identifiers).toContainText(identifier);
        await expect(identifiers.getByText("Model identifier", { exact: true })).toBeVisible();
        const copy = identifiers.getByRole("button", { name: "Copy model identifier" });
        await expect(copy).toHaveCount(1);
        await copy.click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(identifier);
      }
    });
  });

  test.describe(`models table on a phone in ${theme}`, () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test("stacks each row with labels and keeps the page width", async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
      await openModels(page, "/models?view=table");
      const first = rows(page).first();
      await expect(first).toBeVisible();
      await expect(first.getByText("Input $/1M")).toBeVisible();
      await expect(first.getByText("Included in plans")).toBeVisible();
      // Headers stay for screen readers; their sort buttons are not focusable here.
      const input = page.getByRole("columnheader", { name: "Input $/1M" });
      await expect(input).toHaveCount(1);
      await expect(input.getByRole("button")).toBeHidden();
      await selectCatalogOption(page.getByLabel("Order by"), "input");
      await selectCatalogOption(page.getByLabel("Direction"), "descending");
      await expect(input).toHaveAttribute("aria-sort", "descending");
      const published = (await cellTexts(page, INPUT))
        .filter((value) => !value.includes("Not published"))
        .map((value) => amount(value.replace("Input $/1M", "")));
      expect(published.length).toBeGreaterThan(5);
      expect(published).toEqual([...published].sort((a, b) => b - a));
      await selectCatalogOption(page.getByLabel("Order by"), "releaseDate");
      await expectCatalogSelection(page.getByLabel("Direction"), "descending");
      await expect(first.getByText("Released", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Released", exact: true }),
      ).toHaveAttribute("aria-sort", "descending");
      const dates = (await cellTexts(page, RELEASED))
        .filter((value) => !value.includes("Not recorded"))
        .map((value) => value.replace("Released", "").trim());
      expect(dates).toEqual([...dates].sort().reverse());
      // Return to the numeric sort for the card-layout assertion below.
      await selectCatalogOption(page.getByLabel("Order by"), "input");
      await selectCatalogOption(page.getByLabel("Direction"), "descending");
      const box = await first.boundingBox();
      expect(box?.width ?? 0).toBeLessThanOrEqual(390);
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousViolations(page);
      await page.getByRole("radio", { name: "Cards", exact: true }).click();
      const firstCard = page.getByTestId("model-row").first();
      await expect(firstCard).toContainText("Base API rate · USD / 1M tokens");
      await expect(firstCard).toContainText("Input $/1M");
      await selectCatalogOption(page.getByLabel("Direction"), "ascending");
      const cardInputs = await page
        .getByTestId("model-row")
        .evaluateAll((cards) =>
          cards.map((card) => card.querySelector(".market-rate")?.textContent ?? ""),
        );
      const cardPrices = cardInputs.filter((value) => value.startsWith("$")).map(amount);
      expect(cardPrices.length).toBeGreaterThan(5);
      expect(cardPrices).toEqual([...cardPrices].sort((a, b) => a - b));
      await page.goto("/models/qwen-3-8-max");
      await expect(page.getByTestId("model-glance")).toBeVisible();
      await expect(page.getByRole("button", { name: "Copy model identifier" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousViolations(page);
    });
  });
}
