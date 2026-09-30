import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import type { StackReplayExportV1 } from "@stackreplay/schema";
import { stackWorkloadFile } from "./fixtures/stack-workload";
import { captureRequests, gotoImport, WORKLOAD_MARKERS, waitForWorkload } from "./helpers";

const STACK_KEY = "stackreplay.current-stack";
const FULL_STACK = [
  "plan:anthropic-claude-max-20x",
  "plan:openai-chatgpt-pro",
  "plan:command-code-pro",
  "plan:opencode-go",
];

// The fixture month (September 2026) has ended, so its history can be confirmed.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
});

async function importWorkload(page: Page, file: StackReplayExportV1): Promise<string> {
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "stack-workload.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await waitForWorkload(page);
  return new URL(page.url()).searchParams.get("import") ?? "";
}

async function openStack(page: Page, id: string, stack: readonly string[]) {
  await page.evaluate(({ key, stack }) => localStorage.setItem(key, JSON.stringify(stack)), {
    key: STACK_KEY,
    stack,
  });
  await page.goto(`/app/stack?import=${id}`);
  await expect(page.getByTestId("stack-opportunities")).toBeVisible({ timeout: 60_000 });
}

const readStack = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]") as string[], STACK_KEY);

for (const theme of ["dark", "light"] as const)
  test(`My Stack reads a multi-tool workload against what you pay (${theme})`, async ({ page }) => {
    await page.addInitScript((theme) => localStorage.setItem("stackreplay-theme", theme), theme);
    const requests = captureRequests(page);
    const id = await importWorkload(page, stackWorkloadFile({ repeat: 4, scale: 10 }));
    await openStack(page, id, FULL_STACK);

    const summary = page.getByTestId("stack-overview");
    await expect(page.getByTestId("stack-published-total")).toContainText("$330/mo");
    await expect(page.getByTestId("stack-published-total")).toContainText("across 4 subscriptions");
    await expect(page.getByTestId("stack-workload-value")).toContainText("14,400 recorded calls");
    await expect(page.getByTestId("stack-workload-value")).toContainText("every call priced");
    await expect(page.getByTestId("stack-leverage")).toContainText("×");
    // A recorded span is not a billing period: evidence stays estimated.
    await expect(page.getByTestId("stack-leverage")).toContainText("Estimated");
    await expect(page.getByTestId("stack-period")).toContainText("Recorded history");
    await expect(page.getByTestId("stack-period-dates")).toHaveText(
      "Sep 1, 2026 – Sep 30, 2026 · 30 days · UTC",
    );
    await expect(page.getByTestId("stack-period-state")).toContainText("history not confirmed");
    await expect(summary).not.toContainText("NaN");

    // A few findings the data supports, each with its evidence and a test.
    const findings = page.getByTestId("stack-opportunities").locator(":scope > li");
    await expect(findings).toHaveCount(4);
    await expect(page.getByTestId("opportunity-off-lineup")).toContainText("OpenCode Go");
    await expect(page.getByTestId("opportunity-off-lineup")).toContainText("−$10/mo");
    const downgrades = page.getByTestId("opportunity-downgrade");
    await expect(downgrades.first()).toContainText("Claude Max 20x → Claude Max 5x");
    await expect(downgrades.first()).toContainText("Cannot determine");
    await expect(downgrades.nth(1)).toContainText("ChatGPT Pro 100 → ChatGPT Plus");
    await expect(page.getByTestId("opportunity-leverage")).toContainText("Not money saved");

    // Each subscription is a report, not a price card; readable only where history is.
    const claude = page.getByTestId("stack-target-anthropic-claude-max-20x");
    await expect(claude).toContainText("Claude Code · active 30 of 30 days");
    await expect(claude).toContainText("$200/mo");
    await expect(page.getByTestId("stack-outside")).toContainText("Hermes");
    await page.getByTestId("stack-methodology").locator(":scope > summary").click();
    await expect(page.getByTestId("stack-scope-table")).toContainText("Command Code");

    // Audit from the top: content scrolled under the sticky site header is not a target-size fault.
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    for (const width of [1280, 820, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    // Everything above ran locally: no workload content left the browser.
    const outgoing = requests.filter((r) => r.method !== "GET" && r.method !== "HEAD");
    expect(outgoing).toEqual([]);
    for (const request of requests)
      for (const marker of WORKLOAD_MARKERS) expect(request.url).not.toContain(marker);
  });

test("the billing period drives what is measured, shared with Workload's review", async ({
  page,
}) => {
  // Command Code calls sit in August: in the import, outside the September cycle.
  const id = await importWorkload(
    page,
    stackWorkloadFile({ repeat: 4, scale: 10, earlier: ["command-code"] }),
  );
  await openStack(page, id, FULL_STACK);
  await expect(page.getByTestId("stack-period-state")).toContainText(
    "Longer than one billing period",
  );
  await expect(page.getByTestId("stack-leverage")).toContainText("Choose a billing period");
  await expect(page.getByTestId("opportunity-unused")).toHaveCount(0);

  await page.getByTestId("stack-period-edit").click();
  await page.getByLabel("Review period source").selectOption("custom");
  await page.getByLabel("Review start date").fill("2026-09-01");
  await page.getByLabel("Review end date").fill("2026-10-01");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByTestId("stack-period-dates")).toHaveText(
    "Sep 1, 2026 – Sep 30, 2026 · 30 days · UTC",
  );
  const unused = page.getByTestId("opportunity-unused");
  await expect(unused).toContainText("Command Code Pro", { timeout: 60_000 });
  await expect(unused).toContainText(
    "No compatible Command Code activity was found in the imported histories for Sep 1, 2026 – Sep 30, 2026.",
  );
  await expect(unused).toContainText("Estimated");
  await expect(unused).toContainText("−$20/mo");

  const confirm = page.getByLabel("Confirm history covers this review period");
  await expect(confirm).toBeEnabled();
  await confirm.check();
  await expect(page.getByTestId("stack-period-state")).toContainText(
    "History confirmed by you · all imported tools",
  );
  await expect(unused).toContainText("Measured");
  await expect(page.getByTestId("stack-leverage")).toContainText("Measured");
  const choice = await page.evaluate(
    (importId) =>
      JSON.parse(localStorage.getItem("stackreplay.billing-review.v1") ?? "{}").reviews?.[importId],
    id,
  );
  expect(choice).toMatchObject({
    mode: "custom",
    period: { start: "2026-09-01", end: "2026-10-01" },
    historyConfirmation: { importId: id, provenance: "local-user" },
  });

  // Workload's billing-period review reads the same period.
  await page.goto(`/app/workload?import=${id}#api-market`);
  await expect(page.getByTestId("review-period")).toContainText("Sep 1 → Oct 1");

  // A shorter period is labelled; leverage waits for a full month; the old confirmation lapses.
  await page.goto(`/app/stack?import=${id}`);
  await page.getByTestId("stack-period-edit").click();
  await page.getByLabel("Review end date").fill("2026-09-15");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByTestId("stack-leverage")).toContainText("This period covers 14 days");
  await expect(page.getByTestId("stack-period-state")).toContainText("History not confirmed");
});

test("Test a change: exact spend, workload effects, reset, apply with Undo, and Replay", async ({
  page,
}) => {
  const id = await importWorkload(page, stackWorkloadFile({ repeat: 4, scale: 10 }));
  await openStack(page, id, FULL_STACK);
  await page.getByRole("button", { name: "Test $100 plan →" }).click();
  await expect(page.locator("#stack-scenario-heading")).toBeFocused();
  const outcome = page.getByTestId("scenario-outcome");
  await expect(page.getByTestId("scenario-outcome-delta")).toContainText("−$100/mo");
  await expect(outcome).toContainText("Claude Max 20x → Claude Max 5x");
  await expect(outcome).toContainText(
    "Published allowance: 20× Pro session allowance → 5× Pro session allowance",
  );
  await expect(outcome).toContainText(
    "Cannot determine whether every recorded request would fit Claude Max 5x",
  );
  await page.getByRole("button", { name: "Remove OpenCode Go from the proposed stack" }).click();
  await expect(page.getByTestId("scenario-outcome-delta")).toContainText("−$110/mo");
  await expect(outcome).toContainText("Remove OpenCode Go");
  await page.getByTestId("scenario-add").selectOption("plan:cursor-pro");
  // Choosing is not adding: nothing changes until the person adds it.
  await expect(page.getByTestId("scenario-outcome-delta")).toContainText("−$110/mo");
  await page.getByTestId("scenario-add-button").click();
  await expect(outcome).toContainText("StackReplay cannot read Cursor Pro usage history");
  await expect(page.getByTestId("scenario-outcome-delta")).toContainText("−$90/mo");
  // Nothing is written until the person asks.
  expect(await readStack(page)).toEqual(FULL_STACK);
  await page.getByTestId("scenario-reset").click();
  await expect(outcome).toContainText("Change a tier, remove a subscription or add one");
  // A same-family plan added beside a kept plan is an addition, shown as its own row.
  await page.getByTestId("scenario-add").selectOption("plan:anthropic-claude-pro");
  await page.getByTestId("scenario-add-button").click();
  await expect(page.getByTestId("scenario-editor")).toContainText("Claude Pro added");
  await expect(page.getByTestId("scenario-plan-anthropic-claude-max-20x")).toHaveValue(
    "plan:anthropic-claude-max-20x",
  );
  await expect(page.getByTestId("scenario-outcome-delta")).toContainText("+$20/mo");
  await page.getByTestId("scenario-reset").click();

  await page.getByRole("button", { name: "Test $100 plan →" }).click();
  await page.getByTestId("scenario-apply").click();
  expect(await readStack(page)).toEqual([
    "plan:anthropic-claude-max-5x",
    "plan:openai-chatgpt-pro",
    "plan:command-code-pro",
    "plan:opencode-go",
  ]);
  await expect(page.getByTestId("stack-target-anthropic-claude-max-5x")).toBeVisible();
  await page.getByRole("button", { name: "Undo stack update" }).click();
  expect(await readStack(page)).toEqual(FULL_STACK);

  await page.getByRole("button", { name: "Test $100 plan →" }).click();
  await expect(page.getByTestId("scenario-replay")).toHaveAttribute(
    "href",
    `/app/replay?import=${id}&stack=${encodeURIComponent(
      "anthropic-claude-max-5x,openai-chatgpt-pro,command-code-pro,opencode-go",
    )}`,
  );
  await page.getByTestId("scenario-replay").click();
  await expect(page.getByTestId("replay-stack-scenario")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("replay-scenario-outcome-delta")).toContainText("−$100/mo", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("replay-stack-period")).toContainText("Recorded history");
  await page.getByTestId("run-strategy").click();
  const findings = page.getByTestId("strategy-findings");
  await expect(page.getByTestId("strategy-result")).toContainText(
    "Stack scenario: Claude Max 5x + ChatGPT Pro 100 + Command Code Pro + OpenCode Go (−$100/mo)",
  );
  await expect(findings).toContainText("Published subscription spend: $330/mo → $230/mo.");
  await expect(findings).toContainText("plan fit is not claimed");
  await page.getByTestId("add-to-compare").click();
  const saved = await page.evaluate(
    () => localStorage.getItem("stackreplay.completed-replays.v1") ?? "",
  );
  expect(saved).toContain('"mode":"assessment"');
  for (const marker of WORKLOAD_MARKERS) expect(saved).not.toContain(marker);
});

test("recorded limit events: no downgrade finding, a likely interruption, account-scoped confirmation", async ({
  page,
}) => {
  const id = await importWorkload(
    page,
    stackWorkloadFile({
      repeat: 4,
      scale: 10,
      claudeAccount: {
        id: "claude-root-fixture",
        blocked: ["2026-09-10T15:00:00.000Z", "2026-09-12T16:00:00.000Z"],
      },
    }),
  );
  await openStack(page, id, ["plan:anthropic-claude-max-20x", "plan:openai-chatgpt-pro"]);
  const claude = page.getByTestId("stack-target-anthropic-claude-max-20x");
  await expect(claude).toContainText("2 blocked attempts on 2 days");
  await expect(page.getByTestId("opportunity-downgrade")).toHaveCount(1);
  await expect(page.getByTestId("opportunity-downgrade")).toContainText("ChatGPT Pro 100");
  await claude.getByRole("button", { name: "Test Claude Max 5x →" }).click();
  const outcome = page.getByTestId("scenario-outcome");
  await expect(outcome).toContainText("2 blocked attempts on 2 days were recorded");
  await expect(outcome).toContainText("likely to interrupt more of this work");
  await expect(outcome.locator('[data-evidence="likely"]')).toHaveCount(1);

  await page.getByTestId("stack-period-edit").click();
  await page.getByLabel("Review period source").selectOption("custom");
  await page.getByLabel("Review start date").fill("2026-09-01");
  await page.getByLabel("Review end date").fill("2026-10-01");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByTestId("stack-period-dates")).toHaveText(
    "Sep 1, 2026 – Sep 30, 2026 · 30 days · UTC",
  );
  // Separate local accounts: a confirmation names one and covers its tool only.
  await expect(page.getByLabel("Confirm history covers this review period")).toBeDisabled({
    timeout: 60_000,
  });
  await page
    .getByLabel("Local source account for history confirmation")
    .selectOption("claude-root-fixture");
  const confirm = page.getByLabel("Confirm history covers this review period");
  await expect(confirm).toBeEnabled({ timeout: 60_000 });
  await confirm.check();
  await expect(page.getByTestId("stack-period-state")).toContainText(
    "History confirmed by you · Claude Code account only",
  );
  await expect(claude.locator('[data-evidence="measured"]').first()).toBeVisible();
  await expect(
    page
      .getByTestId("stack-target-openai-chatgpt-pro")
      .locator('[data-evidence="estimated"]')
      .first(),
  ).toBeVisible();
});
