import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoReplayImport, waitForWorkload } from "./helpers";

test("featured rates keep deliberate Claude and OpenAI pairs on the same price scale", async ({
  page,
}) => {
  await page.goto("/models");
  const chart = page.getByRole("group", { name: "output price comparison" });
  const pairs = chart.getByTestId("price-comparison-pair");
  await expect(pairs).toHaveCount(4);
  await expect(pairs.nth(0)).toContainText("Claude Fable 5.1");
  await expect(pairs.nth(0)).toContainText("GPT-6 Astra");
  await expect(pairs.nth(1)).toContainText("Claude Opus 5.5");
  await expect(pairs.nth(1)).toContainText("GPT-6.1 Sol");
  await expect(chart.locator('[data-model-id="gpt-6-1-sol"]')).toHaveAttribute(
    "href",
    "/models/gpt-6-1-sol",
  );
  await expect(pairs.nth(2)).toContainText("Claude Sonnet 5.5");
  await expect(pairs.nth(2)).toContainText("GPT-5.6 Terra");
  await expect(pairs.nth(3)).toContainText("Claude Haiku 4.5");
  await expect(pairs.nth(3)).toContainText("GPT-6 Luna");
  await expect(chart.getByRole("link")).toHaveCount(14);
  for (const model of ["Grok 4.7", "Gemini 3.8 Flash", "GLM 5.3 Flash", "Kimi K3"])
    await expect(chart).toContainText(model);
  await expect(chart).not.toContainText("Composer");
  await expect(chart).toContainText("GLM 5.3");
  await expect(chart).toContainText("DeepSeek-V4.1-Flash");
  await expect(page.getByTestId("price-chart-scale")).toHaveText("Shared scale: $0 to $50");
  // Half the price must occupy half the actual bar width, including across columns.
  const width = async (id: string) =>
    (await chart.locator(`[data-model-id="${id}"] .market-price-bar-fill`).boundingBox())?.width ??
    0;
  expect((await width("gpt-6-1-sol")) / (await width("claude-opus-5-5"))).toBeCloseTo(0.5, 1);
  expect((await width("glm-5-3")) / (await width("claude-opus-5-5"))).toBeCloseTo(0.22, 1);
  await page.getByRole("button", { name: "Input", exact: true }).click();
  await expect(page.getByTestId("price-chart-scale")).toHaveText("Shared scale: $0 to $10");
  await expect(page.getByText("Shorter bar = lower input price")).toBeVisible();
});

test("the model library leads with the coding shortlist but keeps every model discoverable", async ({
  page,
}) => {
  await page.goto("/models");
  await expect(page.getByLabel("Order by")).toHaveValue("featured");
  const rows = page.getByTestId("model-row");
  await expect(rows.nth(0)).toContainText("Claude Opus 5.5");
  await expect(rows.nth(1)).toContainText("GPT-6.1 Sol");
  await expect(rows.nth(2)).toContainText("Claude Sonnet 5.5");
  await expect(rows.nth(3)).toContainText("GPT-5.6 Terra");
  await expect(rows.nth(0)).not.toContainText("Gemini");
  await expect(page.getByTestId("model-table")).not.toContainText("Composer");
  await page.getByLabel("Find a model, family name or exact alias").fill("Gemini");
  await expect(rows.first()).toContainText("Gemini");
  // Searching the library does not unexpectedly replace the featured comparison.
  await expect(page.getByRole("group", { name: "output price comparison" })).toContainText(
    "Gemini 3.8 Flash",
  );
  await page.getByLabel("Find a model, family name or exact alias").fill("Composer 2.5");
  await expect(rows).toHaveCount(1);
  await page.getByLabel("Find a model, family name or exact alias").clear();
  await page.getByLabel("Order by").selectOption("name");
  await expect(rows.first()).toContainText("Amazon Nova 2 Lite");
});

test("selected comparisons sort by the active price category, highest first", async ({ page }) => {
  await page.goto("/models");
  await page.getByRole("checkbox", { name: "Compare GLM 5.3", exact: true }).check();
  await page.getByRole("checkbox", { name: "Compare Claude Opus 5.5", exact: true }).check();
  await expect(
    page.getByRole("group", { name: "output price comparison" }).getByRole("link").first(),
  ).toContainText("Opus");
  await page.getByRole("button", { name: "Cache read", exact: true }).click();
  await expect(
    page.getByRole("group", { name: "cacheRead price comparison" }).getByRole("link").first(),
  ).toContainText("GLM 5.3");
  await expect(page.getByTestId("price-chart-scale")).toHaveText("Shared scale: $0 to $0.26");
});

test("subscription discovery filters sourced tools and opens a selected comparison", async ({
  page,
}) => {
  await page.goto("/plans");
  await page.getByLabel("Works with").selectOption("Cline");
  await expect(page.getByTestId("plan-card")).toHaveCount(1);
  await expect(page.getByTestId("plan-card")).toContainText("ClinePass");
  await expect(page.getByTestId("plan-card")).toContainText("$9.99");
  await page.getByRole("link", { name: "Compare plans →" }).click();
  await expect(page.getByTestId("compare-target").first()).toContainText("ClinePass");
  await page.goto("/compare?left=clinepass&right=opencode-go");
  await expect(page.getByTestId("compare-target").nth(1)).toContainText("OpenCode Go");
  await expect(page.getByTestId("compare-row-usage")).not.toContainText(
    "Provider does not publish a numeric allowance.",
  );
});

test("newly listed plans have navigable price and evidence", async ({ page }) => {
  for (const id of [
    "command-code-goat",
    "clinepass",
    "opencode-go",
    "opencode-go-plus",
    "ollama-cloud-pro",
    "ollama-cloud-max",
    "kiro-pro",
  ]) {
    const response = await page.goto(`/plans/${id}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Published subscription price", { exact: true })).toBeVisible();
    await page.getByText("Published terms, sources & history", { exact: true }).click();
    await expect(page.getByTestId("source-list").first()).toBeVisible();
  }
});

test("model selection compares token categories without assigning missing prices", async ({
  page,
}) => {
  await page.goto("/models");
  await page.getByRole("checkbox", { name: "Compare Claude Opus 5.5", exact: true }).check();
  const chart = page.getByRole("group", { name: "output price comparison" });
  await expect(chart.getByRole("link")).toHaveCount(1);
  await expect(chart).toContainText("$20");
  await page.getByRole("button", { name: "Cache read", exact: true }).click();
  await expect(page.getByRole("group", { name: "cacheRead price comparison" })).toContainText(
    "$0.2",
  );
  await page.getByRole("button", { name: "Clear comparison" }).click();
  await page.getByLabel("Find a model, family name or exact alias").fill("Sonnet 5.5");
  await expect(page.getByTestId("model-row")).toHaveCount(1);
  await expect(page.getByTestId("model-row")).toContainText("$2");
  await expect(page.getByTestId("model-row")).toContainText("$10");
  await expect(page.getByTestId("model-row")).toContainText("$0.2");
  await expect(page.getByTestId("model-row")).not.toContainText("Not verified");
  await expect(page.getByTestId("model-row").getByRole("checkbox")).toHaveCount(1);
  await page.getByTestId("model-row").getByRole("link", { name: "Explore model" }).click();
  const evidence = page
    .locator("details")
    .filter({ has: page.getByText("Pricing, assumptions & evidence", { exact: true }) });
  await evidence.locator("summary").click();
  await expect(evidence).toContainText("Cache write $2.5");
  await expect(evidence).toContainText("Cache write $4");
  await expect(evidence).not.toContainText("Not verified");
});

for (const theme of ["dark", "light"] as const) {
  test(`market discovery remains accessible in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    for (const path of [
      "/models",
      "/plans",
      "/models/claude-opus-5-5",
      "/plans/ollama-cloud-max",
      "/changelog",
    ]) {
      await page.goto(path);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
        path,
      ).toBeLessThanOrEqual(1);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations, path).toEqual([]);
    }
  });
}

test("native Sonnet 5.5 history receives the published cache-duration range", async ({ page }) => {
  await gotoReplayImport(page);
  const record = JSON.stringify({
    type: "assistant",
    uuid: "synthetic-sonnet55",
    sessionId: "synthetic-session",
    timestamp: "2026-09-28T19:52:00Z",
    message: {
      id: "synthetic-sonnet55-response",
      model: "claude-sonnet-5-5",
      stop_reason: "end_turn",
      usage: {
        input_tokens: 100000,
        output_tokens: 100000,
        cache_read_input_tokens: 300000,
        cache_creation_input_tokens: 500000,
      },
    },
  });
  await page.getByTestId("source-file-input").setInputFiles({
    name: "synthetic-sonnet55.jsonl",
    mimeType: "application/x-ndjson",
    buffer: Buffer.from(record),
  });
  await waitForWorkload(page);
  await expect(page.getByTestId("overview-api-total")).toHaveText("$2.51 – $3.26");
  await expect(page.getByTestId("overview-scale")).toContainText("100%");
});

test("model capabilities filter and selected specifications are useful without opening evidence", async ({
  page,
}) => {
  await page.goto("/models");
  await page
    .getByRole("combobox", { name: "Capability", exact: true })
    .selectOption("long-context");
  await page.getByLabel("Find a model, family name or exact alias").fill("Sonnet 5.5");
  await expect(page.getByTestId("model-row")).toContainText("1M context");
  await page.getByRole("checkbox", { name: "Compare Claude Sonnet 5.5", exact: true }).check();
  await expect(page.getByRole("region", { name: "Selected model specifications" })).toContainText(
    "128K",
  );
  await page.getByTestId("model-row").getByRole("link", { name: "Explore model" }).click();
  await expect(page.getByRole("region", { name: "Model specifications" })).toContainText("128,000");
  await expect(
    page.locator(".market-capabilities").getByText("Tool calling", { exact: true }),
  ).toBeVisible();
});

test("special pricing and practical subscription terms have specific explanations", async ({
  page,
}) => {
  await page.goto("/models/composer-2-5");
  await expect(page.getByTestId("pricing-note")).toContainText("Cursor on-demand");
  await expect(page.getByTestId("pricing-note")).toContainText("$15 output");
  await expect(page.getByText("Not verified", { exact: true })).toHaveCount(0);
  await page.goto("/models/nano-banana-pro");
  await expect(page.getByTestId("pricing-note")).toContainText("$120");
  await page.goto("/plans/anthropic-claude-max-5x");
  await expect(page.locator(".market-description")).toContainText("5× Pro");
  await expect(page.getByTestId("published-subscription-terms")).toContainText(
    "Sessions reset every five hours",
  );
  await page.goto("/plans/openai-chatgpt-pro-20x");
  // The pause is plan history now: visible by default, scoped to new subscribers.
  const history = page.getByTestId("plan-history");
  await expect(history).toBeVisible();
  await expect(history).toContainText("New subscriptions paused");
  await expect(history).toContainText("Existing subscribers not affected");
  await expect(
    page.getByText("ChatGPT · ChatGPT Work · Codex", { exact: true }).first(),
  ).toBeVisible();
});

test("discovery includes deeper model access and supports comparing product-only models", async ({
  page,
}) => {
  await page.goto("/plans");
  await page.getByLabel("Find a plan", { exact: true }).fill("Sonnet 4.6");
  await expect(page.getByTestId("plan-results")).toContainText("Claude Max 5x");
  await page.goto("/models");
  await page.getByLabel("Find a model, family name or exact alias").fill("Composer 2.5");
  await page.getByRole("checkbox", { name: "Compare Composer 2.5", exact: true }).check();
  await expect(page.getByRole("region", { name: "Selected model specifications" })).toContainText(
    "200K",
  );
  const chart = page.getByRole("group", { name: "output price comparison" });
  await expect(chart).toContainText("See details");
  await expect(chart.locator(".market-price-bar-fill")).toHaveCount(0);
});
