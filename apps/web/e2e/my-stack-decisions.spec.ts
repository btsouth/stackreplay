import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import type { StackReplayExportV1 } from "@stackreplay/schema";
import { chooseOption, expectSelectValue } from "./app-select-helpers";
import { stackWorkloadFile } from "./fixtures/stack-workload";
import { captureRequests, gotoImport, WORKLOAD_MARKERS, waitForWorkload } from "./premium-app-helpers";

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
  await page.goto(`/app/plans?import=${id}`);
  await expect(page.getByTestId("stack-investigations")).toBeVisible({ timeout: 60_000 });
}

/** Opens the Claude Max 20x → 5x scenario from the subscription's own report row. */
const analyzeClaudeDowngrade = (page: Page) =>
  page
    .getByTestId("stack-target-anthropic-claude-max-20x")
    .getByRole("button", { name: "Test Claude Max 5x →" })
    .click();

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
    await expect(page.getByTestId("stack-published-total")).toContainText("4 subscriptions");
    await expect(page.getByTestId("stack-workload-value")).toContainText("14,400");
    await expect(page.getByTestId("stack-workload-value")).toContainText("recorded calls");
    await expect(page.getByTestId("stack-workload-value")).toContainText("every call priced");
    // Subscription leverage is not a headline figure any more.
    await expect(page.getByTestId("stack-leverage")).toHaveCount(0);
    await expect(summary).not.toContainText(/leverage/iu);
    // Every selected plan's tool history is in this workload.
    await expect(page.getByTestId("stack-coverage-count")).toContainText("4");
    await expect(page.getByTestId("stack-coverage-headline")).toContainText("Every subscription");
    await expect(page.getByTestId("stack-period")).toContainText("Recorded history");
    await expect(page.getByTestId("stack-period-dates")).toHaveText(
      "Sep 1, 2026 – Sep 30, 2026 · 30 days · UTC",
    );
    await expect(page.getByTestId("stack-period-state")).toContainText("history not confirmed");
    await expect(summary).not.toContainText("NaN");

    // At most three findings the data supports, each with its evidence and a test.
    const findings = page.getByTestId("stack-investigations").locator(":scope > li");
    expect(await findings.count()).toBeLessThanOrEqual(3);
    // The leading finding is a cheaper-tier review with its evidence and exact spend change.
    const tier = findings.first();
    await expect(tier).toHaveAttribute("data-kind", "tier-review");
    await expect(tier.locator('[data-row="fit"]')).toContainText("Cannot be proven");
    await expect(tier.locator('[data-row="spend"]')).toContainText(/−\$\d+\/mo/u);
    await expect(tier.getByRole("button", { name: "Analyze downgrade →" })).toBeVisible();
    await expect(page.getByTestId("stack-investigate")).not.toContainText(/leverage/iu);

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
  await expect(page.getByTestId("stack-leverage")).toHaveCount(0);
  await expect(page.getByTestId("investigation-unused")).toHaveCount(0);

  await page.getByTestId("stack-period-edit").click();
  await chooseOption(page.getByLabel("Review period source"), "custom");
  await page.getByLabel("Review start date").fill("2026-09-01");
  await page.getByLabel("Review end date").fill("2026-10-01");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByTestId("stack-period-dates")).toHaveText(
    "Sep 1, 2026 – Sep 30, 2026 · 30 days · UTC",
  );
  const unused = page.getByTestId("investigation-unused");
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
  await page.goto(`/app/stats?import=${id}#api-market`);
  await expect(page.getByTestId("review-period")).toContainText("Sep 1 → Oct 1");

  // A shorter period is labelled and the old confirmation lapses.
  await page.goto(`/app/plans?import=${id}`);
  await page.getByTestId("stack-period-edit").click();
  await page.getByLabel("Review end date").fill("2026-09-15");
  await page.getByRole("button", { name: "Apply review period" }).click();
  await expect(page.getByTestId("stack-period-dates")).toContainText("14 days");
  await expect(page.getByTestId("stack-period-state")).toContainText("History not confirmed");
});

test("Test a change: exact spend, workload effects, reset, apply with Undo, and Replay", async ({
  page,
}) => {
  const id = await importWorkload(page, stackWorkloadFile({ repeat: 4, scale: 10 }));
  await openStack(page, id, FULL_STACK);
  await analyzeClaudeDowngrade(page);
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
  await chooseOption(page.getByTestId("scenario-add"), "plan:cursor-pro");
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
  await chooseOption(page.getByTestId("scenario-add"), "plan:anthropic-claude-pro");
  await page.getByTestId("scenario-add-button").click();
  await expect(page.getByTestId("scenario-editor")).toContainText("Claude Pro added");
  await expectSelectValue(
    page.getByTestId("scenario-plan-anthropic-claude-max-20x"),
    "plan:anthropic-claude-max-20x",
  );
  await expect(page.getByTestId("scenario-outcome-delta")).toContainText("+$20/mo");
  await page.getByTestId("scenario-reset").click();

  await analyzeClaudeDowngrade(page);
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

  await analyzeClaudeDowngrade(page);
  await expect(page.getByTestId("scenario-replay")).toHaveAttribute(
    "href",
    `/app/plans?section=replay&import=${id}&stack=${encodeURIComponent(
      "anthropic-claude-max-5x,openai-chatgpt-pro,command-code-pro,opencode-go",
    )}`,
  );
  await page.getByTestId("scenario-replay").click();
  await expect(page.getByTestId("replay-stack-scenario")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("replay-scenario-outcome-delta")).toContainText("−$100/mo", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("replay-stack-period")).toContainText("Recorded history");
  // The link reads against the stack it came from: kept plans read as kept and
  // the tier change as a change, never as a removal plus a second subscription.
  const proposed = page.locator(".stack-scenario-proposed li");
  const row = (plan: string) =>
    proposed.filter({ has: page.getByTestId(`replay-scenario-plan-${plan}`) });
  await expect(row("anthropic-claude-max-20x")).toHaveAttribute("data-state", "changed");
  await expect(row("openai-chatgpt-pro")).toHaveAttribute("data-state", "kept");
  await expect(row("command-code-pro")).toHaveAttribute("data-state", "kept");
  await expect(row("opencode-go")).toHaveAttribute("data-state", "kept");
  await expect(page.locator('.stack-scenario-proposed li[data-state="added"]')).toHaveCount(0);
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

test("recorded limit events: surfaced as capacity pressure, a likely interruption, account-scoped confirmation", async ({
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
  await expect(claude).toContainText("2 blocked on 2 days");
  // The downgrade question is still asked, with the recorded pressure as its evidence.
  const tier = page
    .getByTestId("investigation-tier-review")
    .filter({ hasText: "Claude Max 20x → Claude Max 5x" });
  await expect(tier.locator('[data-row="pressure"]')).toContainText(
    "2 blocked attempts across 2 days",
  );
  await expect(tier.locator('[data-row="pressure"] [data-evidence="measured"]')).toHaveCount(1);
  await expect(tier.locator('[data-row="fit"]')).toContainText("Cannot be proven");
  await expect(tier).toContainText("likely to be interrupted more often");
  await expect(tier).not.toContainText(/will (fit|fail)/u);
  await claude.getByRole("button", { name: "Test Claude Max 5x →" }).click();
  const outcome = page.getByTestId("scenario-outcome");
  await expect(outcome).toContainText("2 blocked attempts on 2 days were recorded");
  await expect(outcome).toContainText("likely to interrupt more of this work");
  await expect(outcome.locator('[data-evidence="likely"]')).toHaveCount(1);

  await page.getByTestId("stack-period-edit").click();
  await chooseOption(page.getByLabel("Review period source"), "custom");
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
  await chooseOption(
    page.getByLabel("Local source account for history confirmation"),
    "claude-root-fixture",
  );
  const confirm = page.getByLabel("Confirm history covers this review period");
  await expect(confirm).toBeEnabled({ timeout: 60_000 });
  await confirm.check();
  await expect(page.getByTestId("stack-period-state")).toContainText(
    "History confirmed by you · Claude Code account only",
  );
  // Confirmation makes the Claude activity measured; other tools stay estimated.
  await expect(tier.locator('[data-row="activity"] [data-evidence="measured"]')).toBeVisible();
  await claude.getByText("Evidence, models and published terms").click();
  await expect(page.getByTestId("report-leverage-anthropic-claude-max-20x")).toContainText(
    "Measured",
  );
  const chatgpt = page.getByTestId("stack-target-openai-chatgpt-pro");
  await chatgpt.getByText("Evidence, models and published terms").click();
  await expect(page.getByTestId("report-leverage-openai-chatgpt-pro")).toContainText("Estimated");
});

test("several Claude accounts: each subscription reads its own account", async ({ page }) => {
  const MAX = "claude-code:sr_maxaccount";
  const PRO = "claude-code:sr_proaccount";
  const PRO2 = "claude-code:sr_pro2account";
  const id = await importWorkload(
    page,
    stackWorkloadFile({
      repeat: 2,
      drop: ["codex", "opencode", "command-code", "hermes"],
      claudeAccounts: [
        { id: MAX, share: 0.8, blocked: ["2026-09-10T10:00:00Z", "2026-09-11T10:00:00Z"] },
        { id: PRO, share: 0.12 },
        { id: PRO2, share: 0.08, blocked: ["2026-09-12T10:00:00Z"] },
      ],
    }),
  );
  await openStack(page, id, ["plan:anthropic-claude-max-5x"]);

  // Unlinked, the one Claude plan reads every Claude account, as before, and says so.
  const accounts = page.getByTestId("stack-accounts");
  await expect(accounts).toBeVisible();
  await expect(accounts.locator("li")).toHaveCount(3);
  await expect(accounts).toContainText("Claude Code account 1");
  await expect(accounts).toContainText("Claude Code account 3");
  await page
    .getByTestId("stack-target-anthropic-claude-max-5x")
    .getByText("Evidence, models")
    .click();
  await expect(page.getByTestId("report-details-anthropic-claude-max-5x")).toContainText(
    "not linked to an account",
  );

  // Link account 1 to Max 5x and the other two to Claude Pro: three subscriptions, $140/mo.
  const select = (key: string) =>
    page.getByTestId(`stack-account-plan-${key.replace(/[^a-z0-9-]/giu, "")}`);
  await chooseOption(select(MAX), "plan:anthropic-claude-max-5x");
  await chooseOption(select(PRO), "plan:anthropic-claude-pro");
  await chooseOption(select(PRO2), "plan:anthropic-claude-pro");
  await expect(page.getByTestId("stack-published-total")).toContainText("$140/mo");
  await expect(page.getByTestId("stack-published-total")).toContainText("3 subscriptions");
  const max = page.getByTestId("stack-target-anthropic-claude-max-5x");
  const pro = page.getByTestId("stack-target-anthropic-claude-pro");
  const pro2 = page.getByTestId("stack-target-anthropic-claude-pro-2");
  await expect(max).toHaveAttribute("data-account", "linked");
  await expect(max).toContainText("Claude Code account 1");
  await expect(pro).toContainText("Claude Code account 2");
  await expect(pro2).toContainText("Claude Code account 3");
  // Limit events are per account: two on account 1, one on account 3, none on account 2.
  await expect(max).toContainText("2 blocked");
  await expect(pro2).toContainText("1 blocked");
  await expect(pro).toContainText("None recorded");
  await expect(page.getByTestId("stack-outside")).toHaveCount(0);

  // The links persist, with a plan list an older build can still read.
  const stored = await page.evaluate(() => ({
    plans: JSON.parse(localStorage.getItem("stackreplay.current-stack") ?? "[]") as string[],
    subscriptions: (
      JSON.parse(localStorage.getItem("stackreplay.stack-subscriptions.v2") ?? "{}") as {
        subscriptions?: { plan: string; account?: string }[];
      }
    ).subscriptions,
  }));
  expect(stored.plans.sort()).toEqual([
    "plan:anthropic-claude-max-5x",
    "plan:anthropic-claude-pro",
  ]);
  expect(stored.subscriptions?.map((entry) => [entry.plan, entry.account])).toEqual([
    ["plan:anthropic-claude-max-5x", MAX],
    ["plan:anthropic-claude-pro", PRO],
    ["plan:anthropic-claude-pro", PRO2],
  ]);
  expect(JSON.stringify(stored)).not.toMatch(/\/|\\\\/u);

  // A tier change on Max 5x leaves both Pro subscriptions alone.
  await chooseOption(
    page.getByTestId("scenario-plan-anthropic-claude-max-5x"),
    "plan:anthropic-claude-pro",
  );
  await expect(page.getByTestId("scenario-outcome-delta")).toContainText("−$80/mo");
  await expect(page.getByTestId("scenario-outcome")).toContainText("Claude Max 5x → Claude Pro");
  await expect(page.getByTestId("scenario-outcome")).toContainText("Claude Code account 1");
  await expect(page.getByTestId("scenario-outcome")).not.toContainText("account 2");

  // Labels are local and replace the numbered names everywhere.
  await accounts.getByRole("button", { name: "Rename Claude Code account 3" }).click();
  await page.getByLabel("Label for Claude Code account 3").fill("Side project");
  await accounts.getByRole("button", { name: "Save" }).click();
  await expect(pro2).toContainText("Side project");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
