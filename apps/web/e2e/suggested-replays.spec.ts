import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { buildDemoExport } from "../../../packages/test-fixtures/src/demo-workload";
import { gotoImport, setRulesAsOf, waitForWorkload } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-29T12:00:00Z"));
});

async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "stackreplay.current-stack",
      JSON.stringify(["plan:anthropic-claude-max-5x"]),
    );
    const state = window as unknown as { pricingRuns: number; replayRuns: number };
    state.pricingRuns = 0;
    state.replayRuns = 0;
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
      if ((args[0] as { type?: string })?.type === "API_MARKET") state.pricingRuns++;
      if ((args[0] as { type?: string })?.type === "RUN_REPLAY") state.replayRuns++;
      return Reflect.apply(post, this, args);
    };
  });
  const file = buildDemoExport("moderate");
  const base = file.events.find((e) => e.model.rawName.startsWith("claude"));
  if (!base) throw Error("Missing fixture");
  file.collectorVersion = "synthetic-strategy-test";
  file.detectedSources = file.detectedSources.map(({ note: _note, ...s }) => s);
  file.events = [
    "claude-opus-5-5",
    "claude-fable-5-1",
    "claude-opus-5",
    "claude-fable-5",
    "claude-opus-4-8",
  ].map((model, i) => ({
    ...base,
    id: `s${i}`,
    occurredAt: `2026-09-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
    model: { rawName: model },
  }));
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "strategy.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await waitForWorkload(page);
  await expect(page.getByTestId("overview-api-total")).toContainText("$");
  const baseline = await page.getByTestId("overview-api-total").textContent();
  await page
    .locator('a[href="/app/replay"]')
    .first()
    .evaluate((a: HTMLAnchorElement) => a.click());
  await expect(page.getByTestId("strategy-baseline")).toHaveText(baseline ?? "");
  return baseline;
}
for (const theme of ["dark", "light"] as const)
  test(`suggestions, explicit translation and cached Compare in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((t) => localStorage.setItem("stackreplay-theme", t), theme);
    const baseline = await setup(page);
    await expect(page.getByTestId("suggest-route-api-value")).toBeVisible();
    await expect(page.getByTestId("suggest-exact")).toBeHidden();
    await expect(page.getByTestId("suggest-stack")).toBeHidden();
    await page.getByTestId("strategy-assessments").locator("summary").click();
    await expect(page.getByTestId("suggest-exact")).toBeVisible();
    await expect(page.getByTestId("suggest-openai-frontier")).toBeVisible();
    await expect(page.getByTestId("suggest-stack")).toBeVisible();
    await expect(page.getByTestId("run-replay")).toHaveCount(0);
    const runs = () =>
      page.evaluate(
        () => (window as unknown as { pricingRuns: number; replayRuns: number }).pricingRuns,
      );
    const before = await runs();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByTestId("suggest-exact").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("strategy-confirmation")).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByTestId("run-strategy").click();
    await expect(page.getByTestId("strategy-cost")).toHaveText(baseline ?? "");
    await expect(page.getByTestId("strategy-difference")).toHaveText("$0.00");
    await page.getByTestId("add-to-compare").click();
    await page.getByRole("button", { name: "← Try another strategy" }).click();
    await expect(page.getByTestId("strategy-assessments").locator("summary")).toBeFocused();
    await page.getByTestId("suggest-openai-frontier").click();
    await expect(page.getByTestId("strategy-confirmation")).toContainText("5 model rules");
    await page.getByRole("button", { name: "Edit mapping" }).click();
    await expect(page.getByLabel("Replay model for Claude Opus 5.5")).toHaveValue("gpt-6-1-sol");
    await page.getByTestId("run-strategy").click();
    await expect(page.getByTestId("strategy-result")).toBeVisible();
    await expect(page.getByTestId("strategy-coverage")).toContainText(
      "5 priced · 5 models translated",
    );
    await expect(page.getByTestId("strategy-difference")).toHaveText("No same-scope difference");
    await expect(page.getByTestId("strategy-result")).toContainText(
      "No difference across catalog snapshots or rules dates",
    );
    await page.getByTestId("strategy-evidence").locator("summary").first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByTestId("strategy-evidence").locator("summary").first().click();
    await page.getByTestId("add-to-compare").click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const replayRuns = await page.evaluate(
      () => (window as unknown as { replayRuns: number }).replayRuns,
    );
    await page.getByTestId("compare-completed").click();
    await expect(page.getByTestId("completed-comparison").locator(":scope > section")).toHaveCount(
      1,
    );
    await expect(
      page.getByText("Different workloads, scopes or price snapshots are kept separate.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open another result group →" }).click();
    await expect(page.getByTestId("completed-comparison")).toContainText(
      "Same models → direct APIs",
    );
    expect(await runs()).toBe(before);
    expect(
      await page.evaluate(() => (window as unknown as { replayRuns: number }).replayRuns),
    ).toBe(replayRuns);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await expect(page.getByTestId("completed-comparison").locator(":scope > section")).toHaveCount(
      1,
    );
    await expect(
      page.getByRole("group", { name: "Choose completed results" }).getByRole("checkbox"),
    ).toHaveCount(2);
    expect(await runs()).toBe(0);
  });
test("edited unmapped calls remain in scope without a whole-workload difference", async ({
  page,
}) => {
  await setup(page);
  await page.getByTestId("suggest-openai-frontier").click();
  await page.getByRole("button", { name: "Edit mapping" }).click();
  await page.getByLabel("Replay model for Claude Opus 5.5").selectOption("");
  await page.getByTestId("run-strategy").click();
  await expect(page.getByTestId("strategy-coverage")).toContainText("5 / 5 calls retained");
  await expect(page.getByTestId("strategy-coverage")).toContainText("4 priced");
  await expect(page.getByTestId("strategy-difference")).toHaveText("No same-scope difference");
  await expect(page.getByTestId("strategy-mapping-result")).toContainText("Unmapped");
});
test("current stack stays honest and manual capabilities remain available", async ({ page }) => {
  await setup(page);
  await page.getByTestId("strategy-assessments").locator("summary").click();
  await page.getByTestId("suggest-stack").click();
  await expect(page.getByTestId("strategy-confirmation")).toContainText("100 USD published price");
  await page.getByTestId("run-strategy").click();
  await expect(page.getByTestId("strategy-result")).toContainText(
    "capacity not deterministically published",
  );
  await expect(page.getByTestId("strategy-cost")).toHaveText("Not computable");
  await page.getByRole("button", { name: "← Try another strategy" }).click();
  await page.getByTestId("build-own").click();
  await expect(page.getByTestId("run-replay")).toBeVisible();
  await expect(page).toHaveURL(/mode=custom/);
});
test("fresh Replay and Compare point to the next useful action", async ({ page }) => {
  await page.goto("/app/replay");
  await expect(page.getByTestId("replay-empty")).toContainText("Import a workload");
  await page.goto("/app/compare");
  await expect(page.getByTestId("completed-compare-empty")).toContainText(
    "Explore suggested replays",
  );
});

test("a completed manual replay can be compared without rerunning it", async ({ page }) => {
  await setup(page);
  await page.getByTestId("build-own").click();
  await setRulesAsOf(page, "2026-09-27");
  await page.getByTestId("target-kind-api").click();
  await page.getByTestId("provider-anthropic").click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible();
  await page.getByRole("button", { name: "Add completed replay to Compare →" }).click();
  await expect(page.getByRole("button", { name: "Added to Compare" })).toBeDisabled();
  await page.getByRole("link", { name: "Compare completed replays →" }).click();
  await expect(page.getByTestId("completed-comparison").locator(":scope > section")).toHaveCount(1);
});

test("Replay loading explains the local preparation before showing decisions", async ({ page }) => {
  await page.addInitScript(() => {
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
      if ((args[0] as { type?: string })?.type === "LIST_LOCAL_IMPORTS") {
        setTimeout(() => Reflect.apply(post, this, args), 1500);
        return;
      }
      return Reflect.apply(post, this, args);
    };
  });
  await page.goto("/app/replay");
  await expect(page.getByTestId("replay-restoring")).toContainText("Opening your workload");
  await expect(page.getByTestId("replay-restoring")).toContainText(
    "Reading recorded models and finding useful replay strategies",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page.getByTestId("replay-empty")).toBeVisible();
});
