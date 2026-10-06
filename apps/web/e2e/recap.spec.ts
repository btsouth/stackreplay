import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { stackWorkloadFile } from "./fixtures/stack-workload";
import { captureRequests, gotoImport } from "./premium-app-helpers";
const fixture = {
  name: "synthetic.stackreplay.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(stackWorkloadFile({ scale: 100 }))),
};
for (const temporary of [false, true])
  test(`scan opens the full private overview (${temporary ? "temporary" : "saved"})`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
    const requests = captureRequests(page);
    await gotoImport(page);
    if (temporary)
      await page.getByRole("checkbox", { name: "Save this scan in this browser" }).uncheck();
    await page.getByTestId("import-file-input").setInputFiles(fixture);
    await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole("heading", { name: "Your AI coding, all of it." })).toBeVisible();
    for (const title of [
      "Tokens in, code out",
      "Speed",
      "Models",
      "Value",
      "Rhythm",
      "Your stack",
      "Debuts",
      "Share",
    ])
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.locator("details")).toHaveCount(0);
    await page.getByRole("radio", { name: "30 days" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "90 days" })).toBeChecked();
    await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "90");
    await page.getByRole("radio", { name: "All time" }).check();
    await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "all");
    const id = new URL(page.url()).searchParams.get("import");
    if (!temporary) {
      await page.reload();
      await expect(page.getByTestId("recap-ready")).toBeVisible();
      expect(new URL(page.url()).searchParams.get("import")).toBe(id);
    }
    for (const [format, size] of [
      ["landscape", [1200, 630]],
      ["square", [1080, 1080]],
      ["story", [1080, 1920]],
    ] as const) {
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: `Download ${format} PNG`, exact: true }).click();
      const path = await (await download).path();
      const bytes = await readFile(path!);
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual(size);
    }
    expect(requests.filter((r) => r.body)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
test("empty history offers one scan action", async ({ page }) => {
  await page.goto("/app/recap");
  await expect(
    page.getByTestId("recap-empty").getByRole("link", { name: /Scan my history/ }),
  ).toBeVisible();
  await expect(page.getByTestId("recap-ready")).toHaveCount(0);
});
test("the legacy Stats URL keeps every query parameter", async ({ page }) => {
  await page.goto("/app/stats?period=all&import=missing&tag=a&tag=b");
  await expect(page).toHaveURL(/\/app\/recap\?period=all&import=missing&tag=a&tag=b/);
  await expect(page.getByRole("alert")).toContainText("no longer stored");
});
test("Settings plan prices drive the opt-in paid comparison", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles(fixture);
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
  const id = new URL(page.url()).searchParams.get("import");
  const api = Number(
    (await page.getByTestId("recap-value").locator(".v").innerText()).replace(/[$,]/g, ""),
  );
  await expect(page.getByTestId("recap-paid")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Set your plan price ↗" })).toBeVisible();
  await page.goto("/app/settings#what-you-pay");
  await page.getByRole("combobox", { name: "Add a plan" }).click();
  await page.getByRole("option", { name: /^Claude Max 5x ·/ }).click();
  await expect(page.getByTestId("what-you-pay-total")).toContainText("$100/month");
  await page.goto(`/app/recap?import=${id}`);
  await expect(page.getByTestId("recap-paid")).toBeVisible({ timeout: 60000 });
  const ratio = (api * 30.4) / (100 * 30);
  await expect(page.getByTestId("recap-paid").locator(".v")).toHaveText(
    ratio >= 9.95 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1)}×`,
  );
  await expect(page.getByRole("button", { name: "WHAT YOU PAID", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
