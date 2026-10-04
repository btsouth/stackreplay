import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { stackWorkloadFile } from "./fixtures/stack-workload";
import { captureRequests, gotoImport } from "./helpers";

const fixture = {
  name: "synthetic.stackreplay.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(stackWorkloadFile({ scale: 100 }))),
};
for (const temporary of [false, true])
  test(`scan opens a private recap (${temporary ? "temporary" : "saved"})`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
    const requests = captureRequests(page);
    await gotoImport(page);
    if (temporary)
      await page
        .getByRole("checkbox", { name: "Save normalized workload on this browser" })
        .uncheck();
    await page.getByTestId("import-file-input").setInputFiles(fixture);
    await expect(page).toHaveURL(/\/app\/recap\?import=/u);
    await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole("heading", { name: "Your coding recap." })).toBeVisible();
    await page.getByRole("radio", { name: "90 days" }).check();
    await expect(page.getByTestId("recap-ready")).toBeVisible();
    await page.getByRole("radio", { name: "All time" }).check();
    await expect(page.getByTestId("recap-ready")).toBeVisible();
    const id = new URL(page.url()).searchParams.get("import");
    if (!temporary) {
      await page.reload();
      await expect(page.getByTestId("recap-ready")).toBeVisible();
      expect(new URL(page.url()).searchParams.get("import")).toBe(id);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole("radio", { name: "All time" }).check();
    await expect(page.locator(".recap-year-grid")).toBeVisible();
    const cell = await page.locator(".recap-calendar-week > div").first().boundingBox();
    expect(cell).toBeTruthy();
    expect(Math.abs(cell!.width - cell!.height)).toBeLessThan(1);
    expect(cell!.width).toBeLessThanOrEqual(26);
    for (const [label, size] of [
      ["Download landscape", [1200, 630]],
      ["Download portrait", [1080, 1350]],
    ] as const) {
      const dl = page.waitForEvent("download");
      await page.getByRole("button", { name: new RegExp(label) }).click();
      const downloaded = await dl;
      const path = await downloaded.path();
      expect(path).toBeTruthy();
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile(path!);
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual(size);
    }
    expect(requests.filter((r) => r.body)).toEqual([]);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
test("empty state has a direct scan action", async ({ page }) => {
  await page.goto("/app/recap");
  await expect(page.getByRole("link", { name: "Find my AI histories" })).toBeVisible();
  await expect(page.getByTestId("recap-ready")).toHaveCount(0);
});

test("payment comparison requires confirmation and persists local choices", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await gotoImport(page);
  await page.evaluate(() =>
    localStorage.setItem(
      "stackreplay.account-identity.v1",
      JSON.stringify({
        version: 1,
        accounts: {
          ["claude-code:sr_" + "a".repeat(32)]: {
            account: "ca_" + "b".repeat(32),
            organizationType: "claude_max",
            rateLimitTier: "default_claude_max_5x",
          },
        },
      }),
    ),
  );
  await page.getByTestId("import-file-input").setInputFiles(fixture);
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
  await expect(page.locator(".recap-hero-caption")).toContainText("of AI coding at API prices");
  await expect(page.locator(".recap-plan-comparison")).toHaveCount(0);
  await expect(page.getByLabel("Show what I paid")).not.toBeChecked();
  await page.getByLabel("Show what I paid").check();
  await expect(page.getByRole("checkbox", { name: /Max 5/u })).toBeChecked();
  await expect(page.locator(".recap-payment-total").first()).toContainText("$100/month");
  await expect(page.locator(".recap-plan-comparison")).toHaveCount(0);
  await page.getByRole("button", { name: "Confirm what I paid" }).click();
  await expect(page.locator(".recap-plan-comparison")).toContainText("× what I paid");
  await page.reload();
  await expect(page.getByTestId("recap-ready")).toBeVisible();
  await expect(page.getByLabel("Show what I paid")).toBeChecked();
  await expect(page.locator(".recap-plan-comparison")).toContainText("× what I paid");
  await page.getByText("Confirm your plans", { exact: true }).click();
  await page.getByRole("checkbox", { name: /ChatGPT Plus/u }).check();
  await expect(page.locator(".recap-plan-comparison")).toHaveCount(0);
  await expect(page.locator(".recap-payment-total").first()).toContainText("$120/month");
  await page.getByRole("button", { name: "Confirm what I paid" }).click();
  await expect(page.locator(".recap-plan-comparison")).toContainText("× what I paid");
  await page.getByLabel("Show what I paid").uncheck();
  await expect(page.locator(".recap-plan-comparison")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Show what I paid")).not.toBeChecked();
  await page.getByLabel("Show what I paid").check();
  await page.getByText("Confirm your plans", { exact: true }).click();
  await page.getByRole("checkbox", { name: /ChatGPT Plus/u }).uncheck();
  await page.getByRole("checkbox", { name: /Max 5/u }).uncheck();
  await page.reload();
  await expect(page.getByTestId("recap-ready")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Max 5/u })).not.toBeChecked();
  await expect(page.locator(".recap-plan-comparison")).toHaveCount(0);
});
