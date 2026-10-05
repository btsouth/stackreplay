import { selectCatalogOption } from "./public-controls";
import { expect, test } from "@playwright/test";

test("model decision pages expose pricing conditions without opening evidence", async ({
  page,
}) => {
  await page.goto("/models/claude-sonnet-5-5");
  const pricing = page.getByRole("region", { name: "Additional token pricing" });
  await expect(pricing).toContainText("Cache writes · 5 minutes");
  await expect(pricing).toContainText("$2.5");
  await expect(pricing).toContainText("Cache writes · 1 hour");
  await expect(pricing).toContainText("$4");
  const practical = page.getByRole("region", { name: "Practical model details" });
  await expect(practical).toContainText("September 28, 2027");
  await expect(practical).toContainText("512 tokens");
  await expect(page.locator("details[open]")).toHaveCount(0);
  await page.goto("/models/gpt-6-sol");
  await expect(page.getByTestId("model-rate-table")).toContainText("Above 272K");
  await expect(page.getByRole("region", { name: "Practical model details" })).toContainText(
    "Batch and Flex",
  );
});

test("input ceilings, reasoning and exact-model gaps remain distinct", async ({ page }) => {
  await page.goto("/models/gemini-3-8-flash");
  const specs = page.getByRole("region", { name: "Model specifications" });
  await expect(specs).toContainText("Maximum input");
  await expect(specs).not.toContainText("Context window");
  await expect(specs).toContainText("1,048,576");
  await page.goto("/models/kimi-k3");
  await expect(page.getByRole("region", { name: "Model specifications" })).toContainText(
    "1,048,576",
  );
  await expect(page.getByRole("region", { name: "Practical model details" })).toContainText(
    "at least $1",
  );
  await page.goto("/models/deepseek-v4-flash");
  await expect(page.getByRole("region", { name: "Practical model details" })).toContainText(
    "original model is retired",
  );
  await expect(page.getByRole("region", { name: "Practical model details" })).toContainText(
    "not the original recorded model",
  );
});

test("model comparison uses the published input label and corrected capability filters", async ({
  page,
}) => {
  await page.goto("/models");
  await page.getByLabel("Find a model, family name or exact alias").fill("Gemini 3.8 Flash");
  await page.getByRole("checkbox", { name: "Compare Gemini 3.8 Flash", exact: true }).check();
  const selected = page.getByRole("region", { name: "Selected model specifications" });
  await expect(selected.getByRole("row", { name: /^Context/u })).toContainText("1.05M max input");
  await page.getByLabel("Find a model, family name or exact alias").fill("Kimi K3");
  await selectCatalogOption(page.getByLabel("Capability"), "Video input");
  await expect(page.getByTestId("model-row")).toContainText("Kimi K3");
  await page.getByLabel("Find a model, family name or exact alias").fill("Nano Banana Pro");
  await selectCatalogOption(page.getByLabel("Capability"), "Tool calling");
  await expect(page.getByTestId("model-row")).toHaveCount(0);
});

test("promotional rates carry the provider's label and its regular rate", async ({ page }) => {
  await page.goto("/models/minimax-m3");
  await expect(page.getByTestId("promotion-note")).toContainText("Permanent 50% discount");
  const rates = page.getByTestId("model-rate-table");
  await expect(rates.getByRole("row", { name: /^Promotional rate\b.*\$0\.30/u })).toBeVisible();
  await expect(rates.getByRole("row", { name: /^Regular rate\b.*\$0\.60/u })).toBeVisible();
  await expect(rates).toContainText("$4.80");
  await expect(page.getByTestId("model-glance").getByTestId("promo-tag")).toHaveCount(2);
  await page.goto("/models/gemini-3-8-flash");
  await expect(page.getByTestId("model-rate-table")).toContainText(
    "Regular rate from January 1, 2027",
  );
  await page.goto("/models/longcat-2-0");
  await expect(
    page.getByTestId("model-rate-table").getByRole("row", { name: /^Regular rate\b.*\$0\.75/u }),
  ).toBeVisible();
  await page.goto("/models/gpt-5-6-sol");
  await expect(page.getByTestId("promotion-note")).toContainText("No regular rate is published.");
  await page.goto("/models/claude-sonnet-5-5");
  await expect(page.getByTestId("promotion-note")).toHaveCount(0);
  await expect(page.getByTestId("promo-tag")).toHaveCount(0);
});

test("rate labels only appear in the stacked phone layout", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/models/minimax-m3");
  const label = page.getByTestId("model-rate-table").locator(".market-table-label").first();
  await expect(label).toBeHidden();
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(label).toBeVisible();
});
