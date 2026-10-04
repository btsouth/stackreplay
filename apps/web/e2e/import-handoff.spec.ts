import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { CLAUDE_CODE_SESSION } from "../../../packages/adapters/src/fixtures/content";
import { captureRequests, gotoImport, visitImportManager, waitForWorkload } from "./helpers";

const portable = {
  name: "synthetic.stackreplay.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(buildDemoExport("moderate"))),
};

for (const theme of ["dark", "light"] as const) {
  test(`completion is a brief factual handoff, without a second decision in ${theme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await gotoImport(page);
    await page.clock.install({ time: new Date("2026-09-27T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-09-27T12:00:01Z"));
    await page.getByTestId("import-file-input").setInputFiles(portable);
    const completion = page.getByTestId("import-summary");
    await expect(completion).toBeVisible();
    await expect(completion).toContainText("900");
    await expect(completion).toContainText("known tokens");
    await expect(completion).toContainText("projects");
    await expect(completion).toContainText("Sep");
    await expect(completion).toContainText("Claude Code");
    await expect(completion).toContainText("Opening your recap");
    await expect(completion.getByRole("link")).toHaveCount(0);
    await expect(page.getByTestId("stored-imports")).toBeHidden();
    await expect(page.getByTestId("import-dropzone")).toBeHidden();
    await expect(page.getByTestId("market-total")).toHaveCount(0);
    await expect(page.getByTestId("ready-preview")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.clock.runFor(799);
    await expect(page).toHaveURL(/\/app\/import$/u);
    await page.clock.resume();
    await waitForWorkload(page);
    await expect(page.getByTestId("overview-api-total")).toHaveText("$5.93 – $6.10");
    await expect(page.getByTestId("overview-scale")).toContainText("900");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.reload();
    await expect(page.getByTestId("overview-scale")).toContainText("900");
    await visitImportManager(page);
    await expect(page.getByTestId("stored-imports").locator(":scope > li")).toHaveCount(1);
    await expect(page.getByTestId("import-details")).not.toHaveAttribute("open");
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/app\/import$/u);
  });
}

test("harmless ignored files stay in Import details after native automatic handoff", async ({
  page,
}) => {
  const requests = captureRequests(page);
  await gotoImport(page);
  await page.getByTestId("source-file-input").setInputFiles([
    {
      name: "session.jsonl",
      mimeType: "application/jsonl",
      buffer: Buffer.from(CLAUDE_CODE_SESSION),
    },
    { name: "README.txt", mimeType: "text/plain", buffer: Buffer.from("PRIVATE_IMPORT_NOTE") },
  ]);
  await waitForWorkload(page);
  await expect(page.getByTestId("partial-scan")).toHaveCount(0);
  await expect(page.getByTestId("workload-hero")).not.toContainText(/skipped|README/u);
  await visitImportManager(page);
  await expect(page.getByText("README.txt", { exact: true })).toBeHidden();
  await page.getByTestId("import-details").locator(":scope > summary").click();
  await expect(page.getByTestId("intake-review")).toContainText("README.txt");
  expect(requests.filter((request) => request.body)).toEqual([]);
  expect(JSON.stringify(requests)).not.toContain("PRIVATE_IMPORT_NOTE");
});

test("leaving during completion cancels the pending handoff", async ({ page }) => {
  await gotoImport(page);
  await page.clock.install({ time: new Date("2026-09-27T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-09-27T12:00:01Z"));
  await page.getByTestId("import-file-input").setInputFiles(portable);
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page
    .locator('a[href="/app/settings"]')
    .first()
    .evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page).toHaveURL(/\/app\/settings$/u);
  await page.clock.runFor(1500);
  await expect(page).toHaveURL(/\/app\/settings$/u);
});

test("temporary workloads survive client-side handoff without being persisted", async ({
  page,
}) => {
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).uncheck();
  await page.getByTestId("import-file-input").setInputFiles(portable);
  await waitForWorkload(page);
  await expect(
    page.getByText("Not saved in this browser. This workload is available only until reload."),
  ).toBeVisible();
  await expect(page.getByTestId("overview-api-total")).toHaveText("$5.93 – $6.10");
  await page.reload();
  await expect(page.getByTestId("automatic-workload")).toHaveCount(0);
});

test("a plan selected before Import remains available after automatic analysis", async ({
  page,
}) => {
  await page.goto("/app/import?target=github-copilot-pro-plus");
  await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
  await page.getByTestId("import-file-input").setInputFiles(portable);
  await waitForWorkload(page);
  await page.getByTestId("overview-evidence").locator(":scope > summary").click();
  await page.getByTestId("selected-plan-replay").click();
  await expect(page.getByTestId("plan-github-copilot-pro-plus")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
