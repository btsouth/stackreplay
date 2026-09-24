import { expect, type Page, test } from "@playwright/test";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { gotoImport } from "./helpers";

/**
 * Phase 3: every suggested route answers for the work it is scoped to, tool
 * slices are explicit, pickers put the targets that run this work first, and a
 * stack of several current plans replays each on the work it carries.
 */

async function importMixed(page: Page): Promise<string> {
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page.getByTestId("import-file-input").setInputFiles({
    name: "mixed.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(buildArchetypeExport("mixed"))),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 60_000 });
  await page.goto("/app/workload");
  await expect(page.getByTestId("suggested-routes")).toBeVisible({ timeout: 60_000 });
  return (
    new URL(
      (await page.getByTestId("workload-compare-cta").getAttribute("href")) ?? "",
      "http://x",
    ).searchParams.get("import") ?? ""
  );
}

test("suggested routes go to targets that answer, with the tool slice stated", async ({ page }) => {
  await importMixed(page);
  const routes = page.getByTestId("suggested-routes");
  await expect(routes).not.toContainText("Copilot Pro →");
  await expect(page.getByTestId("next-api")).toContainText("Your Claude Code work, Anthropic API");
  await expect(page.getByTestId("next-numeric")).toContainText("Copilot Pro+");
  await expect(page.getByTestId("next-cross-provider")).toContainText("Claude Max 20x");

  await page.getByTestId("next-api").click();
  await expect(page).toHaveURL(/scope=claude-code/u);
  await expect(page.getByTestId("scope-claude-code")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("target-kind-api")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("verdict-headline")).toContainText(
    /Claude Code (work is|calls with recognized models are) worth \$[\d,]+\.\d\d at Anthropic's published API rates/u,
    { timeout: 60_000 },
  );
  await expect(page.getByTestId("verdict-support")).toContainText(
    /Scope: your Claude Code work, [\d,]+ of 5,000 calls/u,
  );
  await expect(page.getByTestId("result-computed-for")).toContainText("your Claude Code work");
  // A V1 link cannot state a tool slice, so the share panel says so.
  await expect(page.getByTestId("share-create")).toBeDisabled();
});

test("the numeric route shows where the plan would run out, on the whole workload", async ({
  page,
}) => {
  await importMixed(page);
  await page.getByTestId("next-numeric").click();
  await expect(page.getByTestId("plan-github-copilot-pro-plus")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("verdict-headline")).toContainText(
    /^Copilot Pro\+ credits would have run out on [A-Z][a-z]{2} \d+ \(day \d+\)/u,
    { timeout: 60_000 },
  );
});

test("pickers put the targets that run this work first and never list demo targets", async ({
  page,
}) => {
  await importMixed(page);
  await page.goto("/app/replay");
  const plans = page.getByTestId("plan-list");
  await expect(plans.locator("[data-plan-option]").first()).toHaveAttribute(
    "data-plan-option",
    "github-copilot-pro-plus",
    { timeout: 30_000 },
  );
  await expect(page.getByTestId("plan-coverage-github-copilot-pro-plus")).toContainText("Runs");
  await expect(plans.locator('[data-plan-option^="example-"]')).toHaveCount(0);
  // Setup stays out of the way: rules date and version badges wait under Advanced.
  await expect(page.getByTestId("replay-advanced")).not.toHaveAttribute("open");
  await expect(page.getByTestId("rules-as-of")).toBeHidden();

  await page.getByTestId("scope-codex").click();
  await expect(plans.locator("[data-plan-option]").first()).not.toHaveAttribute(
    "data-plan-option",
    /anthropic-/u,
  );
  await expect(page.getByTestId("scope-note")).toContainText(
    "Only the calls your Codex work recorded",
  );
});

test("a stack of two current plans replays each on the work it carries", async ({ page }) => {
  const importId = await importMixed(page);
  await page.goto(`/app/compare?import=${importId}`);
  await page.getByTestId("current-stack").locator(":scope > summary").click();
  await page.getByTestId("current-plan:anthropic-claude-max-20x").check();
  await page.getByTestId("current-plan:openai-chatgpt-pro").check();
  await expect(page.getByTestId("stack-summary")).toContainText(
    "Claude Max 20x carries your Claude Code work.",
  );
  await expect(page.getByTestId("stack-summary")).toContainText("carries your Codex work.");
  await expect(page.getByTestId("stack-summary")).toContainText(
    "150 Command Code calls are not carried by any of them.",
  );
  await page.getByTestId("compare-run").click();
  const claude = page.locator(
    '[data-testid="compare-column"][data-target="plan:anthropic-claude-max-20x"]',
  );
  await expect(claude).toHaveAttribute("data-scope", "claude-code");
  await expect(claude).toContainText("What you use today");
  await expect(claude.getByTestId("compare-verdict-headline")).toContainText(
    /^For your Claude Code work, Claude Max 20x runs every model in your [\d,]+ calls/u,
    { timeout: 60_000 },
  );
  const chatgpt = page.locator(
    '[data-testid="compare-column"][data-target="plan:openai-chatgpt-pro"]',
  );
  await expect(chatgpt.getByTestId("compare-verdict-headline")).toContainText(
    /^For your Codex work, ChatGPT Pro/u,
    { timeout: 60_000 },
  );
  // Kept in this browser: a reload remembers both plans.
  await page.reload();
  await expect(page.getByTestId("current-stack")).toContainText("Claude Max 20x + ChatGPT Pro");
});
