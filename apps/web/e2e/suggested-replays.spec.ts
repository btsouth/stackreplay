import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { buildDemoExport } from "../../../packages/test-fixtures/src/demo-workload";
import type { CompletedReplay } from "../lib/completed-replays";
import { chooseOption, expectSelectValue } from "./app-select-helpers";
import {
  gotoImport,
  setRulesAsOf,
  visitPlanSuggestions,
  waitForWorkload,
} from "./premium-app-helpers";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-29T12:00:00Z"));
});

async function setup(page: Page, models?: string[]) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "stackreplay.current-stack",
      JSON.stringify(["plan:anthropic-claude-max-5x"]),
    );
    const state = window as unknown as {
      pricingRuns: number;
      replayRuns: number;
      replayRules: string[];
    };
    state.pricingRuns = 0;
    state.replayRuns = 0;
    state.replayRules = [];
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
      if ((args[0] as { type?: string })?.type === "API_MARKET") state.pricingRuns++;
      if ((args[0] as { type?: string })?.type === "RUN_REPLAY") {
        state.replayRuns++;
        state.replayRules.push((args[0] as { rulesAsOf: string }).rulesAsOf);
      }
      return Reflect.apply(post, this, args);
    };
  });
  const file = buildDemoExport("moderate");
  const base = file.events.find((e) => e.model.rawName.startsWith("claude"));
  if (!base) throw Error("Missing fixture");
  file.collectorVersion = "synthetic-strategy-test";
  file.detectedSources = file.detectedSources.map(({ note: _note, ...s }) => s);
  file.events = (
    models ?? [
      "claude-opus-5-5",
      "claude-fable-5-1",
      "claude-opus-5",
      "claude-fable-5",
      "claude-opus-4-8",
    ]
  ).map((model, i) => ({
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
  await visitPlanSuggestions(page);
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
    await expectSelectValue(page.getByLabel("Replay model for Claude Opus 5.5"), "gpt-6-1-sol");
    await page.getByTestId("run-strategy").click();
    await expect(page.getByTestId("strategy-result")).toBeVisible();
    await expect(page.getByTestId("strategy-coverage")).toContainText(
      "5 priced · 5 models translated",
    );
    await expect(page.getByTestId("strategy-difference")).toContainText("$");
    await expect(page.getByTestId("strategy-result")).not.toContainText(
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
      2,
    );
    await expect(page.getByRole("button", { name: "Open another result group →" })).toHaveCount(0);
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
      2,
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
  await chooseOption(page.getByLabel("Replay model for Claude Opus 5.5"), "");
  await page.getByTestId("run-strategy").click();
  await expect(page.getByTestId("strategy-coverage")).toContainText("5 / 5 calls retained");
  await expect(page.getByTestId("strategy-coverage")).toContainText("4 priced");
  await expect(page.getByTestId("strategy-difference")).toHaveText("No same-scope difference");
  await expect(page.getByTestId("strategy-mapping-result")).toContainText("Unmapped");
});
test("a stack scenario stays honest about capacity and manual capabilities remain available", async ({
  page,
}) => {
  await setup(page);
  await page.getByTestId("strategy-assessments").locator("summary").click();
  await page.getByTestId("suggest-stack").click();
  await expect(page.getByTestId("replay-stack-period")).toContainText(
    "Recorded history · Sep 1, 2026 – Sep 5, 2026",
  );
  await chooseOption(
    page.getByTestId("replay-scenario-plan-anthropic-claude-max-5x"),
    "plan:anthropic-claude-pro",
  );
  const outcome = page.getByTestId("replay-scenario-outcome");
  await expect(page.getByTestId("replay-scenario-outcome-delta")).toContainText("−$80/mo");
  await expect(outcome).toContainText(
    "Published allowance: 5× Pro session allowance → Pro usage allowance; five-hour and weekly limits.",
  );
  await expect(outcome).toContainText(
    "Cannot determine whether every recorded request would fit Claude Pro",
  );
  await page.getByTestId("run-strategy").click();
  await expect(page.getByTestId("strategy-result")).toContainText(
    "Stack scenario: Claude Pro (−$80/mo)",
  );
  await expect(page.getByTestId("strategy-findings")).toContainText("plan fit is not claimed");
  await expect(page.getByTestId("strategy-cost")).toHaveCount(0);
  await page.getByRole("button", { name: "← Try another strategy" }).click();
  await page.getByTestId("build-own").click();
  await expect(page.getByTestId("run-replay")).toBeVisible();
  await expect(page).toHaveURL(/mode=custom/);
});
test("fresh Replay and Compare point to the next useful action", async ({ page }) => {
  await page.goto("/app/plans?section=replay");
  await expect(page.getByTestId("replay-empty")).toContainText("Scan your AI history");
  await page.goto("/app/plans?section=compare");
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
  const saved = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("stackreplay.completed-replays.v1") ?? "[]",
      ) as CompletedReplay[],
  );
  expect(saved[0]?.decisionSnapshotHash).toBeUndefined();
  expect(saved[0]?.catalogHash).toBe(DECISION_MARKET.catalogHash);
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
  await page.goto("/app/plans?section=replay");
  await expect(page.getByTestId("replay-restoring")).toContainText("Opening your history");
  await expect(page.getByTestId("replay-restoring")).toContainText(
    "Reading recorded models and finding useful changes",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page.getByTestId("replay-empty")).toBeVisible();
});

test("Sep 30 viewer gets pinned suggested comparisons and independently dated custom Replay", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-09-30T12:00:00Z"));
  await setup(page);
  await expect(
    page.getByText("Recorded API equivalent · accepted pricing 2026-09-29"),
  ).toBeVisible();
  await page.getByTestId("strategy-assessments").locator("summary").click();
  await page.getByTestId("suggest-exact").click();
  await page.getByTestId("run-strategy").click();
  await page.getByTestId("add-to-compare").click();
  await page.getByRole("button", { name: "← Try another strategy" }).click();
  await page.getByTestId("suggest-openai-frontier").click();
  await expect(page.getByTestId("strategy-confirmation")).toContainText(
    "API rules as of 2026-09-29",
  );
  await page.getByRole("button", { name: "Edit mapping" }).click();
  await expectSelectValue(page.getByLabel("Replay model for Claude Opus 5.5"), "gpt-6-1-sol");
  await page.getByTestId("run-strategy").click();
  await expect(page.getByTestId("strategy-difference")).toContainText("$");
  await expect(page.getByTestId("strategy-result")).not.toContainText(
    "No difference across catalog snapshots",
  );
  await page.getByTestId("add-to-compare").click();
  expect(
    await page.evaluate(() => (window as unknown as { replayRules: string[] }).replayRules),
  ).toEqual(["2026-09-29"]);
  const saved: CompletedReplay[] = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("stackreplay.completed-replays.v1") ?? "[]"),
  );
  expect(saved).toHaveLength(2);
  for (const r of saved)
    expect(r).toMatchObject({
      rulesAt: DECISION_MARKET.rulesAt,
      catalogHash: DECISION_MARKET.catalogHash,
      calls: 5,
      priced: 5,
    });
  expect(saved[0]?.scopeDigest).toBe(saved[1]?.scopeDigest);
  expect(saved[0]?.baseline).toEqual(saved[1]?.cost);
  expect(saved[0]?.policy).toEqual({ id: "openai-frontier", version: "2" });
  expect(saved[0]?.mappings).toContainEqual(expect.objectContaining({ target: "gpt-6-1-sol" }));
  // Historical aggregates remain readable, but cannot join this admitted snapshot.
  await page.evaluate((exact) => {
    const key = "stackreplay.completed-replays.v1";
    const results = JSON.parse(localStorage.getItem(key) ?? "[]");
    results.push({
      ...exact,
      id: "old-snapshot",
      title: "Older accepted snapshot",
      rulesAt: "2026-09-28T19:51:32Z",
      catalogHash: "older-catalog",
    });
    localStorage.setItem(key, JSON.stringify(results));
  }, saved[1]);
  await page.getByTestId("compare-completed").click();
  await expect(page.getByTestId("completed-comparison").locator(":scope > section")).toHaveCount(2);
  await page.getByRole("button", { name: "Open another result group →" }).click();
  await expect(page.getByTestId("completed-comparison").locator(":scope > section")).toHaveCount(1);
  await expect(page.getByTestId("completed-comparison")).toContainText("Older accepted snapshot");
  await page.goto(`/app/plans?section=replay&import=${saved[0]?.importId}&mode=custom`);
  await expect(page.getByLabel("Rules as of")).toHaveValue("2026-09-30");
  await setRulesAsOf(page, "2026-09-28");
  await expect(page.getByLabel("Rules as of")).toHaveValue("2026-09-28");
});

for (const theme of ["dark", "light"] as const)
  test(`saved execution snapshot grouping and provenance in ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("stackreplay-theme", t), theme);
    await setup(page, ["claude-opus-5-5"]);
    await page.getByTestId("strategy-assessments").locator("summary").click();
    await page.getByTestId("suggest-exact").click();
    await page.getByTestId("run-strategy").click();
    await page.getByTestId("add-to-compare").click();
    await page.getByRole("button", { name: "← Try another strategy" }).click();
    await page.getByTestId("suggest-openai-frontier").click();
    await page.getByTestId("run-strategy").click();
    await page.getByTestId("add-to-compare").click();
    const saved = await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("stackreplay.completed-replays.v1") ?? "[]",
        ) as CompletedReplay[],
    );
    expect(saved).toHaveLength(2);
    for (const record of saved)
      expect(record.decisionSnapshotHash).toBe(DECISION_MARKET.decisionSnapshotHash);
    expect(saved[0]?.difference).toBeDefined();
    const metadataCatalog = `sha256:${"1".repeat(64)}`;
    await page.evaluate(
      ({ metadataCatalog }) => {
        const key = "stackreplay.completed-replays.v1";
        const records = JSON.parse(localStorage.getItem(key) ?? "[]") as CompletedReplay[];
        records[1] = { ...records[1], catalogHash: metadataCatalog } as CompletedReplay;
        records.push({
          ...records[0],
          id: "other-execution",
          title: "Different execution rules",
          decisionSnapshotHash: `sha256:${"2".repeat(64)}`,
        } as CompletedReplay);
        localStorage.setItem(key, JSON.stringify(records));
      },
      { metadataCatalog },
    );
    await page.getByTestId("compare-completed").click();
    const sections = page.getByTestId("completed-comparison").locator(":scope > section");
    await expect(sections).toHaveCount(2);
    await expect(page.getByTestId("completed-compare")).toContainText("same execution snapshot");
    await expect(page.getByRole("checkbox", { name: /Different execution rules/ })).toBeDisabled();
    for (const section of await sections.all()) {
      await section.locator("summary").first().click();
      await section.getByTestId("saved-snapshot-provenance").locator("summary").click();
    }
    await expect(sections.nth(0)).toContainText(DECISION_MARKET.catalogHash);
    await expect(sections.nth(1)).toContainText(metadataCatalog);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await expect(sections).toHaveCount(2);
    await page.getByRole("button", { name: "Open another result group →" }).click();
    await expect(sections).toHaveCount(1);
    await expect(sections).toContainText("Different execution rules");
    await expect(page.getByTestId("completed-compare")).toContainText(
      "separate execution snapshot",
    );
  });
