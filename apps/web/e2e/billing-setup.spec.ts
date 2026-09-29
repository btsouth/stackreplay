import { expect, test } from "@playwright/test";
import { buildDemoExport } from "../../../packages/test-fixtures/src/demo-workload";
import { gotoImport, openBillingReview, waitForWorkload } from "./helpers";

test("one billing form selects the same workload dates and retains honest local confirmation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("stackreplay.current-stack"))
      localStorage.setItem(
        "stackreplay.current-stack",
        JSON.stringify(["plan:openai-chatgpt-plus"]),
      );
    const original = Worker.prototype.postMessage;
    (window as unknown as { prices: number }).prices = 0;
    Worker.prototype.postMessage = function (message, ...args: unknown[]) {
      if (message?.type === "API_MARKET") (window as unknown as { prices: number }).prices++;
      return original.call(this, message, ...(args as [StructuredSerializeOptions]));
    };
  });
  const file = buildDemoExport("moderate");
  const base = file.events.find((e) => e.model.rawName.startsWith("claude"));
  if (!base) throw new Error("Fixture requires a Claude response");
  file.collectorVersion = "synthetic-billing-setup";
  file.detectedSources = file.detectedSources.map(({ note: _note, ...s }) => s);
  file.events = ["2026-08-24", "2026-09-18", "2026-09-27"].map((date, i) => ({
    ...base,
    id: `response-${i}`,
    occurredAt: `${date}T12:00:00Z`,
    source: { ...base.source, adapterId: "claude-code", resourceInstanceId: "primary" },
  }));
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "billing-setup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await waitForWorkload(page);
  await openBillingReview(page);
  const form = page.getByRole("form", { name: "Billing cycle comparison" });
  await expect(page.getByLabel("Review start date")).not.toBeVisible();
  await form.getByLabel("Billing account").selectOption("primary");
  await form.getByLabel("Billing subscription").selectOption("plan:anthropic-claude-max-5x");
  await form.getByLabel("Billing cycle start").fill("2026-08-19");
  await form.getByLabel("Billing cycle end").fill("2026-09-27");
  await form.getByLabel("Amount you paid").fill("87");
  await form.getByRole("button", { name: "Compare this billing cycle →" }).click();
  await expect(page.getByTestId("billing-setup").getByRole("alert")).toContainText("1 to 31 days");
  await form.getByLabel("Billing cycle end").fill("2026-09-19");
  await form.getByRole("button", { name: "Compare this billing cycle →" }).click();
  await expect(page.getByTestId("billing-history-confirmation")).toContainText("2 responses");
  await expect(page.getByTestId("review-confirmed-spend")).toHaveText("$87.00");
  const confirmation = page.getByLabel("Confirm history covers this review period");
  await expect(confirmation).not.toBeChecked();
  await confirmation.check();
  await expect(page.getByTestId("billing-summary-bar")).toContainText("$87.00 confirmed");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("stackreplay.current-stack") ?? "[]"),
    ),
  ).toEqual(["plan:openai-chatgpt-plus", "plan:anthropic-claude-max-5x"]);
  await openBillingReview(page);
  const count = await page.evaluate(() => (window as unknown as { prices: number }).prices);
  await form.getByLabel("Amount you paid").fill("88");
  await form.getByRole("button", { name: "Compare this billing cycle →" }).click();
  await expect(page.getByTestId("billing-summary-bar")).toContainText("$88.00 confirmed");
  expect(await page.evaluate(() => (window as unknown as { prices: number }).prices)).toBe(count);
  await page.reload();
  await openBillingReview(page);
  await expect(form.getByLabel("Billing cycle start")).toHaveValue("2026-08-19");
  await expect(form.getByLabel("Billing cycle end")).toHaveValue("2026-09-19");
  await expect(form.getByLabel("Amount you paid")).toHaveValue("88");
  await expect(page.getByRole("button", { name: /Use saved cycle.*Claude Max/ })).toBeVisible();
  await form.getByLabel("Billing cycle start").fill("2026-08-20");
  await form.getByRole("button", { name: "Compare this billing cycle →" }).click();
  await expect(confirmation).not.toBeChecked();
  await expect(page.getByTestId("review-state")).toHaveText("Partial review");
});
