import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { buildDemoExport } from "../../../packages/test-fixtures/src/demo-workload";
import { gotoImport, importDemo, openReviewEditor, openReviewEvidence } from "./helpers";

async function completeDemo(page: import("@playwright/test").Page) {
  await gotoImport(page);
  await page.getByTestId("demo-billing").click();
  await expect(page.getByTestId("market-total")).toHaveText("$23.73 – $24.39", { timeout: 30_000 });
  await page.getByTestId("open-workload").click();
  await expect(page).toHaveURL(/\/app\/workload/u);
  await expect(page.getByTestId("review-state")).toHaveText("Complete billing-period review");
}

for (const theme of ["dark", "light"] as const) {
  test(`D2 complete synthetic period is accessible and visible in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await page.addInitScript((theme) => localStorage.setItem("stackreplay-theme", theme), theme);
    await completeDemo(page);
    await expect(page.getByTestId("review-period")).toHaveText("Sep 1 → Oct 1 · end excluded");
    await expect(page.getByTestId("review-history")).toContainText("3,600 recorded calls");
    await expect(page.getByTestId("review-confirmed-spend")).toHaveText("$120.00");
    await expect(page.getByTestId("decision-difference")).toHaveText("$95.61 – $96.27");
    await expect(page.getByTestId("review-conclusion")).toContainText(
      "does not prove the subscriptions were unnecessary",
    );
    await expect(page.getByTestId("market-decision")).toContainText(
      "Synthetic demo workload and billing data",
    );
    await openReviewEditor(page);
    await page.getByTestId("market-subscriptions").locator(":scope > summary").click();
    const axe = await new AxeBuilder({ page }).include('[data-testid="market-decision"]').analyze();
    expect(axe.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await openReviewEditor(page);
    await page.getByLabel("Confirm history covers this review period").focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("review-state")).toHaveText("Partial review");
    await expect(page.getByTestId("decision-difference")).toHaveText("Not directly comparable yet");
    await page.keyboard.press("Space");
    await expect(page.getByTestId("review-state")).toHaveText("Complete billing-period review");
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
  await openReviewEditor(page);
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
  await expect(page).toHaveURL(/\/app\/compare/u);
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
  await openReviewEditor(page);
  await page.getByLabel("Review period source").selectOption("custom");
  await openReviewEditor(page);
  await page.getByLabel("Review start date").fill("2026-09-01");
  await openReviewEditor(page);
  await page.getByLabel("Review end date").fill("2026-10-01");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByTestId("review-history")).toContainText(
    "spans 7 days of this 30-day review period",
  );
  await expect(page.getByTestId("market-total")).toHaveText("$5.93 – $6.10");
  await expect(page.getByTestId("decision-difference")).toHaveText("Not directly comparable yet");
  await openReviewEditor(page);
  await page.getByLabel("Review start date").fill("2026-09-14");
  await openReviewEditor(page);
  await page.getByLabel("Review end date").fill("2026-09-15");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByTestId("review-history")).toContainText("outside this selected period");
  await expect(page.getByTestId("review-history")).not.toContainText("900 recorded calls");
  await expect(page.getByTestId("share-headline")).toContainText("Not directly comparable yet");
  await openReviewEditor(page);
  await page.getByLabel("Review start date").fill("2026-08-01");
  await openReviewEditor(page);
  await page.getByLabel("Review end date").fill("2026-09-01");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByTestId("review-conclusion")).toContainText("No recorded calls");
  await expect(page.getByTestId("market-total")).toHaveText("Pricing incomplete for this workload");
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
  await openReviewEvidence(page);
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
  await openReviewEditor(page);
  await page.getByLabel("Review period source").selectOption("plan:anthropic-claude-max-5x");
  await expect(page.getByTestId("review-period")).toHaveText("Aug 1 → Sep 1 · end excluded");
  await expect(page.getByTestId("review-state")).toHaveText("Partial review");
  await page.getByLabel("Confirm history covers this review period").check();
  await expect(page.getByTestId("review-state")).toHaveText("Complete billing-period review");
  await expect(page.getByTestId("review-conclusion")).toContainText(
    "You paid $120.00 in confirmed fixed subscriptions",
  );
  await expect(page.getByTestId("market-total")).toHaveText("$23.73 – $24.39");
  const confirmation = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("stackreplay.billing-review.v1") ?? "{}");
    return Object.values(state.reviews)
      .map((r) => (r as { historyConfirmation: unknown }).historyConfirmation)
      .find(Boolean);
  });
  expect(confirmation).toMatchObject({
    provenance: "local-user",
    period: { start: "2026-08-01", end: "2026-09-01" },
  });
  expect((confirmation as { confirmedAt: string }).confirmedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/u);
  expect(outbound).toEqual([]);
});

test("D2 can choose a single offset cycle and preserves calls outside it", async ({ page }) => {
  await completeDemo(page);
  await openReviewEditor(page);
  await page.getByTestId("market-subscriptions").locator(":scope > summary").click();
  await page.getByRole("checkbox", { name: /ChatGPT Plus/ }).uncheck();
  const form = page.getByRole("form", { name: /Claude Max 5x billing facts/ });
  await form.getByLabel(/cycle start/).fill("2026-09-04");
  await form.getByLabel(/cycle end/).fill("2026-10-04");
  await form.getByRole("button", { name: "Save local billing facts" }).click();
  await openReviewEditor(page);
  await page.getByLabel("Review period source").selectOption("plan:anthropic-claude-max-5x");
  await expect(page.getByTestId("review-period")).toHaveText("Sep 4 → Oct 4 · end excluded");
  await expect(page.getByTestId("review-history")).toContainText("3,240 recorded calls");
  await expect(page.getByTestId("review-history")).toContainText("360 imported calls fall outside");
  await expect(page.getByTestId("review-state")).toHaveText("Partial review");
  await expect(page.getByTestId("decision-difference")).toHaveText("Not directly comparable yet");
});

test("D3 keeps a heavy unknown slice visible beside priced economics", async ({ page }) => {
  const file = buildDemoExport("moderate");
  const first = file.events[0];
  if (!first) throw new Error("fixture missing");
  file.events = [
    first,
    {
      ...first,
      id: "unknown-heavy",
      model: { rawName: "unpublished-exact-model" },
      usage: { ...first.usage, inputTokens: 9000000 },
    },
  ];
  file.collectorVersion = "normal-import-path-test";
  file.detectedSources = file.detectedSources.map(({ note: _note, ...source }) => source);
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "partial-pricing.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page.getByTestId("open-workload").click();
  await expect(page).toHaveURL(/\/app\/workload/u);
  const market = page.getByTestId("market-decision");
  await expect(market).toContainText("Current published API equivalent for priced workload");
  await expect(page.getByTestId("market-coverage")).toContainText(
    "1 / 2 recorded calls modeled and priced",
  );
  await expect(page.getByTestId("token-coverage")).toContainText("known processed tokens priced");
  await expect(page.getByTestId("market-total")).not.toHaveText(
    "Pricing incomplete for this workload",
  );
  await expect(page.getByTestId("decision-difference")).toHaveText("Not directly comparable yet");
  await expect(page.getByTestId("share-preview")).toContainText("priced calls only");
  await expect(page.getByTestId("share-preview")).toContainText("may materially change");
  await expect(page.getByLabel("Confirm history covers this review period")).toBeVisible();
});

test("D3 imported collection gaps prevent a history declaration", async ({ page }) => {
  const file = buildDemoExport("moderate");
  file.collectionWarnings = [{ code: "SOURCE_TRUNCATED", message: "synthetic test scan gap" }];
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "scan-gap.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page.getByTestId("open-workload").click();
  await expect(page).toHaveURL(/\/app\/workload/u);
  await expect(page.getByLabel("Confirm history covers this review period")).toBeDisabled();
  await expect(page.getByTestId("review-conclusion")).toContainText("scan gaps");
});

test("D3 large API ranges fit the share preview and review on mobile", async ({ page }) => {
  const file = buildDemoExport("moderate");
  file.events = file.events.map((event) => ({
    ...event,
    model: { rawName: "claude-fable-5" },
    usage: {
      inputTokens: 100000,
      outputTokens: 10000,
      cacheReadTokens: 100000,
      cacheWriteTokens: 100000,
      reasoningTokens: 1000,
      accounting: {
        cacheReadIncludedInInput: false,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: true,
      },
    },
  }));
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "large-range.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page.getByTestId("open-workload").click();
  await expect(page).toHaveURL(/\/app\/workload/u);
  await expect(page.getByTestId("market-total")).toHaveText("$2,565.00 – $3,240.00");
  await expect(page.getByTestId("share-figure")).toContainText("2,565.00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("D4 separates account billing, binds history and reuses the completed result in Compare", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "stackreplay.current-stack",
      JSON.stringify(["plan:anthropic-claude-max-5x"]),
    );
    const original = Worker.prototype.postMessage;
    (window as unknown as { runs: number }).runs = 0;
    Worker.prototype.postMessage = function (message, ...args: unknown[]) {
      if (message?.type === "API_MARKET") (window as unknown as { runs: number }).runs++;
      return original.call(this, message, ...(args as [StructuredSerializeOptions]));
    };
  });
  const file = buildDemoExport("moderate");
  const original = file.events.filter((e) => e.model.rawName.startsWith("claude"));
  file.events = ["primary", "secondary"].flatMap((root) =>
    original.map((e) => ({
      ...e,
      id: `${root}-${e.id}`,
      source: {
        ...e.source,
        adapterId: "claude-code",
        resourceInstanceId: root,
        sessionRoot: `hash-${root}`,
        nativeResponse: { final: true, duplicateRows: 2 },
      },
    })),
  );
  file.collectorVersion = "synthetic-account-fixture";
  file.detectedSources = file.detectedSources.map(({ note: _note, ...source }) => source);
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "synthetic-accounts.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page.getByTestId("open-workload").click();
  await expect(page.getByLabel("Local source account")).toBeVisible();
  await expect(page.getByLabel("Confirm history covers this review period")).toBeDisabled();
  await openReviewEditor(page);
  await page.getByLabel("Local source account").selectOption("primary");
  await expect(page.getByTestId("review-history")).toContainText(
    `${original.length} distinct responses`,
  );
  await page.getByLabel("Local account label").fill("Primary synthetic account");
  await openReviewEditor(page);
  await page.getByTestId("market-subscriptions").locator(":scope > summary").click();
  const form = page.getByRole("form", { name: /Claude Max 5x billing facts/ });
  await form.getByLabel(/cycle start/).fill("2026-09-14");
  await form.getByLabel(/cycle end/).fill("2026-09-21");
  await form.getByLabel(/amount paid/).fill("87");
  await form.getByRole("button", { name: "Save local billing facts" }).click();
  await openReviewEditor(page);
  await page.getByLabel("Review period source").selectOption("plan:anthropic-claude-max-5x");
  await expect(page.getByTestId("review-confirmed-spend")).toHaveText("$87.00");
  await page.getByLabel("Confirm history covers this review period").check();
  await expect(page.getByTestId("review-state")).toHaveText("Complete billing-period review");
  await expect(page.getByTestId("review-conclusion")).toContainText(
    "You paid $87.00 for this confirmed Claude billing cycle",
  );
  await expect(page.getByTestId("share-preview")).not.toContainText("$87");
  await openReviewEvidence(page);
  await page.getByTestId("data-integrity").locator("summary").click();
  await expect(page.getByTestId("data-integrity")).toContainText(
    `Duplicate rows removed: ${(original.length * 2).toLocaleString()}`,
  );
  const total = await page.getByTestId("market-total").innerText();
  const runs = await page.evaluate(() => (window as unknown as { runs: number }).runs);
  await openReviewEditor(page);
  if (
    !(await page.getByTestId("market-subscriptions").evaluate((el: HTMLDetailsElement) => el.open))
  )
    await page.getByTestId("market-subscriptions").locator(":scope > summary").click();
  await form.getByLabel(/amount paid/).fill("88");
  await form.getByRole("button", { name: "Save local billing facts" }).click();
  await expect(page.getByTestId("review-confirmed-spend")).toHaveText("$88.00");
  expect(await page.evaluate(() => (window as unknown as { runs: number }).runs)).toBe(runs);
  await page.getByTestId("workload-compare-cta").click();
  await expect(page).toHaveURL(/\/app\/compare/u);
  await expect(page.getByTestId("review-state")).toHaveText("Complete billing-period review");
  await expect(page.getByTestId("market-total")).toHaveText(total);
  expect(await page.evaluate(() => (window as unknown as { runs: number }).runs)).toBe(runs);
  await openReviewEditor(page);
  await page.getByLabel("Local source account").selectOption("secondary");
  await expect(
    page.getByRole("heading", { name: "Choose a review period", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Confirm history covers this review period")).toHaveCount(0);
  await openReviewEditor(page);
  await page.getByLabel("Local source account").selectOption("primary");
  await expect(page.getByTestId("review-confirmed-spend")).toHaveText("$88.00");
  await expect(page.getByLabel("Confirm history covers this review period")).not.toBeChecked();
  await page.getByLabel("Confirm history covers this review period").check();
  await page.reload();
  await expect(page.getByTestId("review-state")).toHaveText("Complete billing-period review");
  await expect(page.getByTestId("market-total")).toHaveText(total);
  const axe = await new AxeBuilder({ page }).include('[data-testid="market-decision"]').analyze();
  expect(axe.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const theme of ["dark", "light"] as const) {
  test(`D5 local capacity evidence and manual assertions in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await page.addInitScript((theme) => {
      localStorage.setItem("stackreplay-theme", theme);
      localStorage.setItem(
        "stackreplay.current-stack",
        JSON.stringify(["plan:anthropic-claude-max-5x"]),
      );
      const original = Worker.prototype.postMessage;
      (window as unknown as { runs: number }).runs = 0;
      Worker.prototype.postMessage = function (message, ...args: unknown[]) {
        if (message?.type === "API_MARKET") (window as unknown as { runs: number }).runs++;
        return original.call(this, message, ...(args as [StructuredSerializeOptions]));
      };
    }, theme);
    const file = buildDemoExport("moderate");
    file.events = file.events
      .filter((e) => e.model.rawName.startsWith("claude"))
      .map((e) => ({
        ...e,
        source: { ...e.source, adapterId: "claude-code", resourceInstanceId: "main" },
      }));
    file.capacityObservations = {
      methodology: "claude-native-capacity-v1",
      events: [
        {
          id: "synthetic-limit",
          timestamp: "2026-09-16T12:00:00Z",
          resourceInstanceId: "main",
          sessionId: "synthetic-session",
          evidence: "native-client",
          code: "quota_rejected",
          eventType: "hard_limit_reached",
          windowType: "five_hour",
          resetAt: "2026-09-16T13:00:00Z",
          duplicateRows: 1,
        },
      ],
    };
    file.collectorVersion = "synthetic-capacity-test";
    file.detectedSources = file.detectedSources.map(({ note: _note, ...source }) => source);
    await gotoImport(page);
    await page.getByTestId("import-file-input").setInputFiles({
      name: "capacity.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(file)),
    });
    await expect(page.getByTestId("import-summary")).toBeVisible();
    await page.getByTestId("open-workload").click();
    await openReviewEditor(page);
    await page.getByLabel("Local source account").selectOption("main");
    const capacity = page.getByTestId("capacity-evidence");
    await expect(capacity).toContainText("1 direct capacity-limit event");
    await openReviewEvidence(page);
    await page.getByText("Raw capacity evidence", { exact: true }).click();
    await capacity.getByText(/Inspect capacity timeline/).click();
    await expect(capacity).toContainText("Reset shown: 2026-09-16 13:00 UTC");
    await capacity.getByText("Workload before this event", { exact: true }).click();
    await expect(capacity).toContainText("Prior 7 days");
    const runs = await page.evaluate(() => (window as unknown as { runs: number }).runs);
    await openReviewEvidence(page);
    await page.getByText("Add observed interruption", { exact: true }).focus();
    await page.keyboard.press("Enter");
    await capacity.getByLabel("Limit reached at (UTC)").fill("2026-09-17T12:00");
    await capacity.getByLabel("Notes (optional, local only)").fill("Synthetic private note");
    await capacity.getByRole("button", { name: "Confirm and save interruption locally" }).click();
    await expect(capacity.getByTestId("manual-capacity-status")).toContainText(
      "Interruption saved locally",
    );
    await expect(capacity).toContainText("1 additional user-confirmed interruption");
    expect(await page.evaluate(() => (window as unknown as { runs: number }).runs)).toBe(runs);
    await expect(page.getByTestId("share-preview")).not.toContainText("Synthetic private note");
    const axe = await new AxeBuilder({ page })
      .include('[data-testid="observed-capacity"]')
      .analyze();
    expect(axe.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByTestId("workload-compare-cta").click();
    await expect(page).toHaveURL(/\/app\/compare/u);
    await expect(capacity).toContainText("1 additional user-confirmed interruption");
    expect(await page.evaluate(() => (window as unknown as { runs: number }).runs)).toBe(runs);
    await page.reload();
    await expect(capacity).toContainText("1 additional user-confirmed interruption");
  });
}
