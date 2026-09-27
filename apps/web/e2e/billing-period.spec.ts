import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { buildDemoExport } from "../../../packages/test-fixtures/src/demo-workload";
import { gotoImport, importDemo } from "./helpers";

async function completeDemo(page: import("@playwright/test").Page) {
  await gotoImport(page);
  await page.getByTestId("demo-billing").click();
  await expect(page.getByTestId("market-total")).toHaveText("$23.73 – $24.39", { timeout: 30_000 });
  await page.getByTestId("open-workload").click();
  await expect(page).toHaveURL(/\/app\/workload/u);
  await expect(page.getByTestId("review-state")).toHaveText("Billing-period review");
}

for (const theme of ["dark", "light"] as const) {
  test(`D2 complete synthetic period is accessible and visible in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await page.addInitScript((theme) => localStorage.setItem("stackreplay-theme", theme), theme);
    await completeDemo(page);
    await expect(page.getByTestId("review-period")).toHaveText("Sep 1, 2026 – Sep 30, 2026");
    await expect(page.getByTestId("review-history")).toContainText("3,600 recorded calls");
    await expect(page.getByTestId("review-confirmed-spend")).toHaveText("$120.00");
    await expect(page.getByTestId("decision-difference")).toHaveText("$95.61 – $96.27");
    await expect(page.getByTestId("review-conclusion")).toContainText(
      "does not prove the subscriptions were unnecessary",
    );
    await expect(page.getByTestId("market-decision")).toContainText(
      "Synthetic demo workload and billing data",
    );
    await page.getByTestId("review-setup").locator("summary").click();
    await page.getByTestId("market-subscriptions").locator(":scope > summary").click();
    const axe = await new AxeBuilder({ page }).include('[data-testid="market-decision"]').analyze();
    expect(axe.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByLabel("Confirm history covers this review period").focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("review-state")).toHaveText("Partial review");
    await expect(page.getByTestId("decision-difference")).toHaveText("Not directly comparable yet");
    await page.keyboard.press("Space");
    await expect(page.getByTestId("review-state")).toHaveText("Billing-period review");
  });
}

test("D2 billing edits are cheap and mismatched cycles remain partial through Compare and reload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    (window as unknown as { runs: number }).runs = 0;
    Worker.prototype.postMessage = function (message, ...args: unknown[]) {
      if (message?.type === "API_MARKET") (window as unknown as { runs: number }).runs++;
      return original.call(this, message, ...(args as [StructuredSerializeOptions]));
    };
  });
  await completeDemo(page);
  const runs = await page.evaluate(() => (window as unknown as { runs: number }).runs);
  await page.getByTestId("market-subscriptions").locator(":scope > summary").click();
  const form = page.getByRole("form", { name: /Claude Max 5x billing facts/ });
  await form.getByRole("textbox", { name: /amount paid/ }).fill("1");
  await form.getByRole("button", { name: "Save local billing facts" }).click();
  await expect(page.getByTestId("review-confirmed-spend")).toHaveText("$21.00");
  await expect(page.getByTestId("decision-fixed-spend")).toHaveText("$120.00 / month");
  await expect(page.getByTestId("review-conclusion")).toContainText(
    "every burst without interruption",
  );
  expect(await page.evaluate(() => (window as unknown as { runs: number }).runs)).toBe(runs);
  await form.getByLabel(/cycle start/).fill("2026-09-04");
  await form.getByLabel(/cycle end/).fill("2026-10-04");
  await form.getByRole("button", { name: "Save local billing facts" }).click();
  await expect(page.getByTestId("review-conclusion")).toContainText(
    "do not share this full billing period",
  );
  await expect(page.getByTestId("review-confirmed-spend")).toHaveText("$20.00");
  expect(await page.evaluate(() => (window as unknown as { runs: number }).runs)).toBe(runs);
  await page.getByTestId("workload-compare-cta").click();
  await expect(page.getByTestId("review-state")).toHaveText("Partial review");
  await expect(page.getByTestId("decision-difference")).toHaveText("Not directly comparable yet");
  expect(await page.evaluate(() => (window as unknown as { runs: number }).runs)).toBe(runs);
  await page.reload();
  await expect(page.getByTestId("review-confirmed-spend")).toHaveText("$20.00");
});

test("D2 seven-day history stays partial inside a month and selected periods filter in the Worker", async ({
  page,
}) => {
  await importDemo(page, "moderate");
  await page.getByTestId("open-workload").click();
  await expect(page).toHaveURL(/\/app\/workload/u);
  await page.getByTestId("review-setup").locator("summary").click();
  await page.getByLabel("Review period source").selectOption("custom");
  await page.getByLabel("Review start date").fill("2026-09-01");
  await page.getByLabel("Review end date").fill("2026-10-01");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByTestId("review-history")).toContainText(
    "spans 7 days of this 30-day review period",
  );
  await expect(page.getByTestId("market-total")).toHaveText("$5.93 – $6.10");
  await expect(page.getByTestId("decision-difference")).toHaveText("Not directly comparable yet");
  await page.getByLabel("Review start date").fill("2026-09-14");
  await page.getByLabel("Review end date").fill("2026-09-15");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByTestId("review-history")).toContainText("outside this selected period");
  await expect(page.getByTestId("review-history")).not.toContainText("900 recorded calls");
  await expect(page.getByTestId("share-headline")).toContainText("Not directly comparable yet");
  await page.getByLabel("Review start date").fill("2026-08-01");
  await page.getByLabel("Review end date").fill("2026-09-01");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByTestId("review-conclusion")).toContainText("No recorded calls");
  await expect(page.getByTestId("market-total")).toHaveText("Full total unavailable");
});

test("D2 share hides paid amounts by default and includes them only after an explicit opt-in", async ({
  page,
}) => {
  await completeDemo(page);
  await expect(page.getByTestId("share-preview")).toContainText(
    "Local paid amounts are not included",
  );
  await expect(page.getByTestId("share-preview")).not.toContainText("$120");
  await expect(page.getByTestId("share-preview")).toContainText("Review dates not shared");
  await page.getByTestId("share-include-review").check();
  await expect(page.getByTestId("share-preview")).toContainText("2026-09-01");
  await page.getByTestId("share-include-paid").check();
  await expect(page.getByTestId("share-preview")).toContainText("$120");
  await expect(page.getByTestId("share-preview")).toContainText(
    "Difference for this review period",
  );
  await page.getByTestId("share-create").click();
  const fallback = page.getByTestId("share-use-long-link");
  await expect(page.getByTestId("share-open").or(fallback)).toBeVisible({ timeout: 15_000 });
  if (await fallback.isVisible()) await fallback.click();
  const href = await page.getByTestId("share-open").getAttribute("href");
  if (!href) throw new Error("share link missing");
  await page.goto(href);
  await expect(page.locator("main")).toContainText("locally confirmed fixed spend");
  await expect(page.locator("main")).toContainText("not independently verified");
  await expect(page.locator("main")).toContainText(/synthetic/i);
});

test("D2 reviews a normal import with locally confirmed full-cycle spend, without uploading billing", async ({
  page,
}) => {
  const outbound: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") outbound.push(request.url());
  });
  await page.addInitScript(() => {
    const selected = ["plan:anthropic-claude-max-5x", "plan:openai-chatgpt-plus"];
    localStorage.setItem("stackreplay.current-stack", JSON.stringify(selected));
    localStorage.setItem(
      "stackreplay.billing-review.v1",
      JSON.stringify({
        version: 1,
        reviews: {},
        billing: Object.fromEntries(
          selected.map((key, i) => [
            key,
            {
              cycle: { start: "2026-08-01", end: "2026-09-01" },
              paid: i ? "20" : "100",
              provenance: "local-user",
            },
          ]),
        ),
      }),
    );
  });
  const file = buildDemoExport("billing");
  file.events = file.events.map((event) => ({
    ...event,
    occurredAt: new Date(Date.parse(event.occurredAt) - 31 * 86400000).toISOString(),
  }));
  file.range = { from: file.events[0]?.occurredAt ?? "", to: file.events.at(-1)?.occurredAt ?? "" };
  file.collectorVersion = "normal-import-path-test";
  file.detectedSources = file.detectedSources.map(({ note: _note, ...source }) => source);
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "billing-review-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page.getByTestId("open-workload").click();
  await expect(page).toHaveURL(/\/app\/workload/u);
  await page.getByTestId("review-setup").locator("summary").click();
  await page.getByLabel("Review period source").selectOption("plan:anthropic-claude-max-5x");
  await expect(page.getByTestId("review-period")).toHaveText("Aug 1, 2026 – Aug 31, 2026");
  await expect(page.getByTestId("review-state")).toHaveText("Partial review");
  await page.getByLabel("Confirm history covers this review period").check();
  await expect(page.getByTestId("review-state")).toHaveText("Billing-period review");
  await expect(page.getByTestId("review-conclusion")).toContainText(
    "You paid $120.00 in confirmed fixed subscriptions",
  );
  await expect(page.getByTestId("market-total")).toHaveText("$23.73 – $24.39");
  expect(outbound).toEqual([]);
});

test("D2 can choose a single offset cycle and preserves calls outside it", async ({ page }) => {
  await completeDemo(page);
  await page.getByTestId("market-subscriptions").locator(":scope > summary").click();
  await page.getByRole("checkbox", { name: /ChatGPT Plus/ }).uncheck();
  const form = page.getByRole("form", { name: /Claude Max 5x billing facts/ });
  await form.getByLabel(/cycle start/).fill("2026-09-04");
  await form.getByLabel(/cycle end/).fill("2026-10-04");
  await form.getByRole("button", { name: "Save local billing facts" }).click();
  await page.getByTestId("review-setup").locator("summary").click();
  await page.getByLabel("Review period source").selectOption("plan:anthropic-claude-max-5x");
  await expect(page.getByTestId("review-period")).toHaveText("Sep 4, 2026 – Oct 3, 2026");
  await expect(page.getByTestId("review-history")).toContainText("3,240 recorded calls");
  await expect(page.getByTestId("review-history")).toContainText("360 imported calls fall outside");
  await expect(page.getByTestId("review-state")).toHaveText("Partial review");
  await expect(page.getByTestId("decision-difference")).toHaveText("Not directly comparable yet");
});
