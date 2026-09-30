import { expect, type Page, test } from "@playwright/test";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { createShareToken, gotoImport, openWorkloadTools, waitForWorkload } from "./helpers";

// These legacy receipt fixtures use a known accepted rate date, not the runner's clock.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-27T12:00:00Z"));
});

/**
 * Phase 3: every suggested route answers for the work it is scoped to, tool
 * slices are explicit, pickers put the targets that run this work first, and a
 * configured stack is compared against the same observed API workload.
 */

async function importMixed(page: Page): Promise<string> {
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page.getByTestId("import-file-input").setInputFiles({
    name: "mixed.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(buildArchetypeExport("mixed"))),
  });
  await waitForWorkload(page);
  await page.goto("/app/workload");
  await expect(page.getByTestId("suggested-routes")).toBeVisible({ timeout: 60_000 });
  return (
    new URL(
      (await page.getByTestId("legacy-workload-compare-cta").getAttribute("href")) ?? "",
      "http://x",
    ).searchParams.get("import") ?? ""
  );
}

test("suggested routes go to targets that answer, with the tool slice stated", async ({ page }) => {
  await importMixed(page);
  await expect(page.getByTestId("workload-tools")).not.toHaveAttribute("open");
  await expect(page.getByTestId("workload-tools").locator("summary")).toHaveText(
    "Share this workload",
  );
  await expect(page.getByTestId("overview-evidence")).not.toHaveAttribute("open");
  expect(
    await page.getByTestId("replay-transition").evaluate((el) => el.closest("details")),
  ).toBeNull();
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
  // The tool slice travels with the link, by its known name.
  const token = await createShareToken(page);
  await page.goto(`/s/${token}`);
  await expect(page.getByTestId("share-headline")).toContainText("Claude Code");
  await expect(page.getByTestId("share-support")).toContainText("Scope: your Claude Code work");
});

test("the numeric route shows where the plan would run out, on the whole workload", async ({
  page,
}) => {
  await importMixed(page);
  await openWorkloadTools(page);
  await page.getByTestId("next-numeric").click();
  await expect(page.getByTestId("plan-github-copilot-pro-plus")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("verdict-headline")).toContainText(
    // One of the mixed workload's five unresolved calls comes before the first
    // run-out, so the date is what the recognized calls establish.
    /^Recognized calls alone would exhaust Copilot Pro\+ credits by [A-Z][a-z]{2} \d+ \(day \d+\)/u,
    { timeout: 60_000 },
  );
});

test("pickers put the targets that run this work first and never list demo targets", async ({
  page,
}) => {
  await importMixed(page);
  await page.goto("/app/replay?mode=custom");
  const plans = page.getByTestId("plan-list");
  await expect(plans.locator("[data-plan-option]").first()).toHaveAttribute(
    "data-plan-option",
    "github-copilot-pro-plus",
    { timeout: 30_000 },
  );
  await expect(page.getByTestId("plan-coverage-github-copilot-pro-plus")).toContainText("Offers");
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

test("a configured stack compares the whole workload with its published API equivalent", async ({
  page,
}) => {
  const importId = await importMixed(page);
  await page.goto(`/app/compare?view=billing&import=${importId}`);
  await page.getByTestId("legacy-compare").evaluate((el: HTMLDetailsElement) => {
    el.open = true;
  });
  await page.getByTestId("compare-decision-stack").click();
  await expect(page.getByTestId("comparison-object")).toContainText("5,000 calls");
  await expect(page.getByTestId("comparison-object")).toContainText("Models as recorded");
  await page.getByTestId("stack-plan-anthropic-claude-max-20x").check();
  await page.getByTestId("stack-plan-openai-chatgpt-pro").check();
  await expect(page.getByTestId("compare-price")).toContainText("$300.00/month");
  await expect(page.getByTestId("compare-price")).toContainText("published list prices");
  await expect(page.getByTestId("stack-tool-breakdown")).toContainText("Command Code");
  await expect(page.getByTestId("stack-tool-breakdown")).toContainText("150 outside plans");
  await page.reload();
  await page.getByTestId("legacy-compare").evaluate((el: HTMLDetailsElement) => {
    el.open = true;
  });
  await page.getByTestId("compare-decision-stack").click();
  await expect(page.getByTestId("compare-price")).toContainText("$300.00/month");
  await page.getByTestId("stack-plan-picker").locator("summary").click();
  await expect(page.getByTestId("stack-plan-anthropic-claude-max-20x")).toBeChecked();
  await expect(page.getByTestId("stack-plan-openai-chatgpt-pro")).toBeChecked();
});

test("default decisions carry the same scope and targets into the custom engine", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as { replayRequests: unknown[] };
    state.replayRequests = [];
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
      if ((args[0] as { type?: string })?.type === "RUN_REPLAY") state.replayRequests.push(args[0]);
      return Reflect.apply(post, this, args);
    };
  });
  const importId = await importMixed(page);
  const workloadLink = await page.getByTestId("next-api").getAttribute("href");
  await page.getByTestId("workload-replay-cta").click();
  await expect(page.getByTestId("strategy-suggestions")).toBeVisible();
  await expect(page.getByTestId("plan-list")).toHaveCount(0);
  await expect(
    page.getByTestId("strategy-suggestions").locator(":scope > section").first(),
  ).toHaveAttribute("data-testid", "suggest-route-api-value");
  await expect(page.getByTestId("suggest-target-api-value")).toHaveAttribute(
    "href",
    workloadLink ?? "",
  );
  const apiLink = new URL(workloadLink ?? "", "http://x");
  const planLink = new URL(
    (await page.getByTestId("suggest-subscription").getAttribute("href")) ?? "",
    "http://x",
  );
  expect(apiLink.searchParams.get("scope")).toBe("claude-code");
  expect(planLink.searchParams.get("scope")).toBe(apiLink.searchParams.get("scope"));
  expect(planLink.searchParams.get("import")).toBe(importId);
  await expect(page.getByTestId("suggest-route-api-value")).toContainText(
    "its exact capacity cannot be computed",
  );
  await page.getByTestId("suggest-subscription").click();
  await expect(page.getByTestId("scope-claude-code")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId(`plan-${planLink.searchParams.get("target")}`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible();
  const requests = () =>
    page.evaluate(
      () => (window as unknown as { replayRequests: Record<string, unknown>[] }).replayRequests,
    );
  expect((await requests()).at(-1)).toMatchObject({
    importId,
    sources: ["claude-code"],
    target: { type: "subscription", planId: planLink.searchParams.get("target") },
  });
  // Back returns to decisions; API choice retains exactly that same tool slice.
  await page.goBack();
  await expect(page.getByTestId("strategy-suggestions")).toBeVisible();
  await page.getByTestId("suggest-target-api-value").click();
  await expect(page.getByTestId("scope-claude-code")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("provider-anthropic")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible();
  expect((await requests()).at(-1)).toMatchObject({
    importId,
    sources: ["claude-code"],
    target: { type: "api", providerId: "anthropic" },
  });
  await expect(page.getByTestId("result-computed-for")).toContainText("your Claude Code work");
  expect([...new URL(page.url()).searchParams.keys()].sort()).toEqual([
    "api",
    "import",
    "mode",
    "scope",
  ]);
  // Reload holds scope/target, then changing to all work removes only scope.
  await page.reload();
  await expect(page.getByTestId("scope-claude-code")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("provider-anthropic")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("scope-all").click();
  await expect(page).not.toHaveURL(/scope=/);
  await expect(page.getByTestId("provider-anthropic")).toHaveAttribute("aria-pressed", "true");
});
