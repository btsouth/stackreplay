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
  await expect(page.getByRole("region", { name: "Additional token pricing" })).toContainText(
    "Above 272K",
  );
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
  await expect(page.getByRole("region", { name: "Selected model specifications" })).toContainText(
    "max input tokens",
  );
  await page.getByLabel("Find a model, family name or exact alias").fill("Kimi K3");
  await page.getByLabel("Capability", { exact: true }).selectOption("Video input");
  await expect(page.getByTestId("model-row")).toContainText("Kimi K3");
  await page.getByLabel("Find a model, family name or exact alias").fill("Nano Banana Pro");
  await page.getByLabel("Capability", { exact: true }).selectOption("Tool calling");
  await expect(page.getByTestId("model-row")).toHaveCount(0);
});
