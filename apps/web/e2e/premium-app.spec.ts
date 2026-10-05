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
  if (await page.getByRole("button", { name: "Open menu" }).isVisible()) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name, exact: true }).click();
  } else await page.getByRole("banner").getByRole("link", { name, exact: true }).click();
}

test("a temporary scan remains usable through recap, Stats and Plans", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") requests.push(request.url());
  });
  const id = await load(page, true);
  await navigate(page, "Stats");
  await expect(page.getByTestId("overview-api-total")).toContainText("$");
  expect(new URL(page.url()).searchParams.get("import")).toBe(id);
  await navigate(page, "Plans");
  await expect(page.getByTestId("stack-workload-value")).toContainText("3,600", {
    timeout: 60_000,
  });
  await expect(page.getByText("Ready for this visit", { exact: true })).toBeVisible();
  await expect(page.getByTestId("edit-family-claude")).toBeEnabled();
  await page
    .getByRole("navigation", { name: "Your plan tools" })
    .getByRole("link", { name: "Try a change" })
    .click();
  await expect(page.getByTestId("build-own")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("import")).toBe(id);
  await page.goBack();
  await expect(page.getByTestId("my-stack")).toBeVisible();
  await navigate(page, "Settings");
  await expect(page.getByTestId(`settings-scan-${id}`)).toContainText("Temporary, until reload");
  expect(requests).toEqual([]);
});

test("recap keeps the chosen period on reload and aligns with the shared shell", async ({
  page,
}) => {
  await load(page);
  await page.getByRole("radio", { name: "All time", exact: true }).check();
  await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "all");
  await page.reload();
  await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "all");
  const chosenImport = new URL(page.url()).searchParams.get("import");
  await page.goto(`/app/recap?import=${chosenImport}`);
  await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "all");
  const alignment = await page.evaluate(() => {
    const content = document.querySelector(".recap-page")?.getBoundingClientRect();
    const brand = document.querySelector("header a")?.getBoundingClientRect();
    return Math.abs((content?.left ?? 1000) - (brand?.left ?? 0));
  });
  expect(alignment).toBeLessThan(2);
  await page.getByRole("button", { name: "What counts as an active day" }).first().click();
  await expect(page.locator(".recap-info:has(:popover-open)")).toContainText("local timezone");
  await page.keyboard.press("Escape");
  await expect(page.locator(".recap-info:has(:popover-open)")).toHaveCount(0);
});

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

for (const theme of ["dark", "light"] as const) {
  test(`first-time app pages offer recovery in ${theme}`, async ({ page }) => {
    await page.addInitScript((theme) => localStorage.setItem("stackreplay-theme", theme), theme);
    for (const route of ["stats", "recap", "plans", "settings", "scan"]) {
      await page.goto(`/app/${route}`);
      await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("main")).not.toContainText("Restoring your recorded work");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
  for (const width of [1440, 390, 320]) {
    test(`populated app pages fit ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((theme) => localStorage.setItem("stackreplay-theme", theme), theme);
      await load(page);
      for (const destination of ["Stats", "Plans", "Settings", "Recap"]) {
        await navigate(page, destination);
        await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("main select")).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(violations).toEqual([]);
      }
    });
  }
}

test("Plans names the selected fictional history", async ({ page }) => {
  await gotoImport(page);
  await page.getByTestId("demo-moderate").click();
  await expect(page.getByTestId("recap-ready")).toBeVisible();
  await navigate(page, "Plans");
  await expect(page.getByTestId("stack-workload")).toContainText("Fictional demo · 900 calls");
  await expect(page.getByTestId("stack-workload")).not.toContainText("No workload selected");
});
