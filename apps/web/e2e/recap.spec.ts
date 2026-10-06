import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { stackWorkloadFile } from "./fixtures/stack-workload";
import { captureRequests, gotoImport } from "./premium-app-helpers";

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
      await page.getByRole("checkbox", { name: "Save this scan in this browser" }).uncheck();
    await page.getByTestId("import-file-input").setInputFiles(fixture);
    await expect(page).toHaveURL(/\/app\/recap\?import=/u);
    await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole("heading", { name: "Your coding recap." })).toBeVisible();
    await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "30");
    await expect(page.locator(".recap-month")).toBeVisible();
    await page.getByRole("radio", { name: "30 days" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "90 days" })).toBeChecked();
    await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "90");
    await expect(page.locator(".recap-weeks")).toBeVisible();
    await page.getByRole("radio", { name: "All time" }).check();
    await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "all");
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
      const button = page.getByRole("button", { name: new RegExp(label) });
      await button.focus();
      await button.press("Enter");
      const downloaded = await dl;
      const path = await downloaded.path();
      expect(path).toBeTruthy();
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile(path!);
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual(size);
      await expect(button).toBeEnabled();
      await expect(button).toBeFocused();
    }
    expect(requests.filter((r) => r.body)).toEqual([]);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
test("empty state has a direct scan action", async ({ page }) => {
  await page.goto("/app/recap");
  await expect(page.getByRole("link", { name: "Scan my history" })).toBeVisible();
  await expect(page.getByTestId("recap-ready")).toHaveCount(0);
});

async function addPlan(page: Page, name: string) {
  const trigger = page.getByRole("combobox", { name: "Add a plan" });
  await trigger.click();
  await page.getByRole("option", { name: new RegExp(`^${name} ·`, "u") }).click();
}

test("what you pay in Settings drives Nx what you paid in the recap and Stats", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles(fixture);
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
  const id = new URL(page.url()).searchParams.get("import");
  const api = Number((await page.locator(".recap-cost-number").innerText()).replace(/[$,]/gu, ""));
  // Nothing about plans or payment shows until a plan is entered.
  await expect(page.locator(".recap-plan-comparison")).toHaveCount(0);
  await expect(page.getByTestId("recap-ready")).not.toContainText(/what you paid/iu);

  await page.goto("/app/settings#what-you-pay");
  await expect(page.getByTestId("what-you-pay-empty")).toBeVisible();
  await addPlan(page, "Claude Max 5x");
  await page.getByRole("button", { name: "More Claude Max 5x accounts" }).click();
  await expect(page.getByTestId("what-you-pay-summary")).toHaveText("Claude Max 5x ×2");
  await expect(page.getByTestId("what-you-pay-total")).toHaveText("2 accounts · $200/month total");
  await addPlan(page, "ChatGPT Pro 100");
  await expect(page.getByTestId("what-you-pay-summary")).toHaveText(
    "Claude Max 5x ×2 · ChatGPT Pro 100",
  );
  await expect(page.getByTestId("what-you-pay-total")).toHaveText("3 accounts · $300/month total");

  // 30 days: the $300 a month is prorated to 30 of 30.4 days.
  const expected = (days: number) => {
    const ratio = (api * 30.4) / (300 * days);
    return ratio >= 9.95 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1)}×`;
  };
  await page.goto(`/app/recap?import=${id}`);
  await expect(page.getByTestId("recap-paid").locator("strong")).toHaveText(
    `${expected(30)} what you paid`,
  );
  await page.getByRole("radio", { name: "90 days", exact: true }).check();
  await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "90");
  await expect(page.getByTestId("recap-paid")).toContainText("what you paid");
  await page.goto(`/app/stats?import=${id}&period=30`);
  await expect(page.getByTestId("overview-paid")).toHaveText(expected(30));
  await page.reload();
  await expect(page.getByTestId("overview-paid")).toHaveText(expected(30));

  await page.goto("/app/settings#what-you-pay");
  await page.getByRole("button", { name: "Remove Claude Max 5x" }).click();
  await page.getByRole("button", { name: "Remove ChatGPT Pro 100" }).click();
  await expect(page.getByTestId("what-you-pay-empty")).toBeVisible();
  await page.goto(`/app/stats?import=${id}`);
  await expect(page.getByTestId("stats-ready")).toBeVisible();
  await expect(page.getByTestId("overview-paid")).toHaveCount(0);
});

test("streaks use full local history while the period scopes totals", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await gotoImport(page);
  const workload = stackWorkloadFile();
  const base = workload.events[0]!;
  workload.events = Array.from({ length: 120 }, (_, i) => ({
    ...base,
    id: `streak-day-${i}`,
    occurredAt: new Date(Date.parse("2026-10-04T08:00:00Z") - i * 86400000).toISOString(),
    usage: { inputTokens: 1, outputTokens: 1 },
    source: { ...base.source, nativeEventHash: `streak-record-${i}` },
  })).reverse();
  await page.getByTestId("import-file-input").setInputFiles({
    name: "synthetic-streak.stackreplay.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(workload)),
  });
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
  const streak = page
    .locator(".recap-fact-strip > div")
    .filter({ has: page.getByText("current streak", { exact: true }) });
  for (const period of ["30 days", "90 days", "All time"]) {
    await page.getByRole("radio", { name: period, exact: true }).check();
    await expect(streak.locator("strong")).toHaveText("120");
    await expect(page.locator(".recap-activity .recap-section-heading p")).toHaveText(
      "120 days · longest streak (all time)",
    );
  }
  await page.getByLabel("What counts as an active day").click();
  await expect(page.locator(".recap-info:has(:popover-open)")).toContainText("first and last seen");
  await expect(page.locator(".recap-info:has(:popover-open)")).toContainText(
    "Current streak counts back from today",
  );
});
