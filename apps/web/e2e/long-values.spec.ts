import { expect, type Page, test } from "@playwright/test";
import { stackReplayExportV1Schema } from "@stackreplay/schema";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { gotoImport } from "./helpers";

const modelId = `provider/${"long-model-id-".repeat(14)}`;
const workloadNames = [
  `${"first-observed-workload-".repeat(5)}.stackreplay.json`,
  `${"second-observed-workload-".repeat(5)}.stackreplay.json`,
];

function validWorkload(): Buffer {
  const demo = buildDemoExport("moderate");
  const exported = stackReplayExportV1Schema.parse({
    ...demo,
    events: demo.events.map((event, index) =>
      index === 0 ? { ...event, model: { rawName: modelId } } : event,
    ),
  });
  return Buffer.from(JSON.stringify(exported));
}

async function expectInsideViewport(page: Page, testId: string): Promise<void> {
  const box = await page.getByTestId(testId).first().boundingBox();
  if (box === null) throw new Error(`${testId} has no visible box`);
  expect(box.x, `${testId} left edge`).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, `${testId} right edge`).toBeLessThanOrEqual(390);
}

test("schema-valid long workload and model identities remain usable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  const file = validWorkload();
  for (const name of workloadNames) {
    await page.getByTestId("import-file-input").setInputFiles({
      name,
      mimeType: "application/json",
      buffer: file,
    });
    await expect(page.getByTestId("import-summary")).toContainText(modelId);
    await expect(page.getByTestId("intake-models")).toContainText(modelId);
    await expect(page.getByTestId("stored-imports")).toContainText(name.replace(/\.json$/u, ""));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expectInsideViewport(page, "import-summary");
    await expectInsideViewport(page, "stored-import-actions");
  }

  const rows = page.getByTestId("stored-imports").getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.getByRole("link", { name: /^Replay first-observed-workload/u })).toBeVisible();
  await expect(
    rows.getByRole("button", { name: /^Delete second-observed-workload/u }),
  ).toBeVisible();

  await page.goto("/app/replay");
  await expect(page.getByTestId("workload-strip")).toBeVisible();
  const select = page.getByTestId("workload-select");
  await expect(select).toBeVisible();
  await expect(select.locator("option")).toHaveCount(2);
  await expect(page.getByTestId("model-identities")).toContainText(modelId);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expectInsideViewport(page, "workload-select");
  await expectInsideViewport(page, "run-replay");
  const otherValue = await select.locator("option").first().getAttribute("value");
  if (otherValue === null) throw new Error("stored workload has no select value");
  await select.selectOption(otherValue);
  await expect(select).toHaveValue(otherValue);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
