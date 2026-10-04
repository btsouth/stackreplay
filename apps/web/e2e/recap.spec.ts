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
    await page.getByLabel("Recap period").selectOption("90");
    await expect(page.getByTestId("recap-ready")).toBeVisible();
    await page.getByLabel("Recap period").selectOption("all");
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
