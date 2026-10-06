import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { stackWorkloadFile } from "./fixtures/stack-workload";
import { gotoImport } from "./premium-app-helpers";

const fixture = {
  name: "fictional-month.stackreplay.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(stackWorkloadFile({ scale: 100 }))),
};
async function load(page: Page, temporary = false) {
  await page.clock.install({ time: new Date("2026-10-05T12:00:00Z") });
  await gotoImport(page);
  if (temporary)
    await page.getByRole("checkbox", { name: "Save this scan in this browser" }).uncheck();
  await page.getByTestId("import-file-input").setInputFiles(fixture);
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
  return new URL(page.url()).searchParams.get("import");
}
async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "App navigation" })
    .getByRole("link", { name: name === "Recap" ? "OVERVIEW" : "SETTINGS", exact: true })
    .click();
}
test("Settings exports a scan and deletes only the selected one after confirmation", async ({
  page,
}) => {
  const id = await load(page);
  await navigate(page, "Settings");
  const scan = page.getByTestId(`settings-scan-${id}`);
  const download = page.waitForEvent("download");
  await scan.getByRole("button", { name: "Export scan", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("history.stackreplay.json");
  await expect(scan).toContainText(/KB export|MB export/);
  await scan.getByRole("button", { name: "Delete scan", exact: true }).click();
  await scan.getByRole("button", { name: "Keep scan" }).click();
  await expect(scan).toBeVisible();
  await scan.getByRole("button", { name: "Delete scan", exact: true }).click();
  await scan.getByRole("button", { name: "Yes, delete this scan" }).click();
  await expect(scan).toHaveCount(0);
  await expect(page.getByTestId("settings-saved")).toContainText("No scans saved here yet");
  await page.reload();
  await expect(page.getByTestId("settings-saved")).toContainText("No scans saved here yet");
});

for (const theme of ["dark", "light"] as const)
  for (const width of [1440, 390, 320])
    test(`terminal overview fits ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((theme) => localStorage.setItem("stackreplay-theme", theme), theme);
      const id = await load(page);
      for (const route of ["recap", "settings", "scan"]) {
        await page.goto(`/app/${route}?import=${id}`);
        await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
        if (route === "recap")
          await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(violations).toEqual([]);
      }
    });
