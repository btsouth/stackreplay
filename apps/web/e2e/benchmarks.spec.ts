import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { BenchmarkExport } from "../lib/benchmark-export";

const google = "google-deepmind-argon-2026-09-30";
const sheet = `/benchmarks?source=${google}&models=gemini-4-argon,gpt-6-astra,claude-fable-5-1,claude-opus-5-5&coverage=shared&edition=2026-09-30-v1`;

test("default Frontier shows verified Sol launch scores and shared benchmark coverage", async ({
  page,
}) => {
  await page.goto("/benchmarks");
  await expect(page.getByRole("heading", { name: "Model Benchmarks", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "GPT-6.1 Sol OpenAI" })).toBeVisible();
  await expect(page.locator('[data-model-id="gpt-6-1-sol"]')).toHaveCount(22);
  await expect(page.locator("tbody tr").first()).toHaveAttribute(
    "data-benchmark-id",
    "deep-swe-v1-1",
  );
  await expect(
    page.locator('[data-benchmark-id="vals-index"] [data-model-id="gpt-6-1-sol"]'),
  ).toHaveText("Not reported");
  await expect(
    page.locator('[data-benchmark-id="deep-swe-v1-1"] [data-model-id="gpt-6-1-sol"]'),
  ).toContainText("71.9%");
  await expect(
    page.locator('[data-benchmark-id="terminal-bench-science-0-1"] [data-model-id="gpt-6-1-sol"]'),
  ).toContainText("57.02%");
  await page.getByRole("button", { name: "Shared benchmarks", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.locator("tbody")).not.toContainText("Not reported");
  await expect(page.getByRole("button", { name: "Remove GPT-6.1 Sol" })).toBeVisible();
  await page.getByRole("button", { name: "All reported results", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(22);
});
test("Sol effort alternatives stay exact, attributed and pinned across reload", async ({
  page,
}) => {
  await page.goto("/benchmarks?models=gpt-6-1-sol");
  await page.getByRole("button", { name: /DeepSWE v1.1, GPT-6.1 Sol, 71.9%/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("OpenAI");
  await expect(dialog).toContainText("Max");
  await expect(dialog.getByRole("link", { name: "Original evidence ↗" })).toHaveAttribute(
    "href",
    "https://openai.com/index/introducing-gpt-6-1-sol/",
  );
  await page
    .getByLabel("Reported result for GPT-6.1 Sol")
    .selectOption("openai-sol-2026-09-29-high.deep-swe-v1-1.gpt-6-1-sol");
  await expect(dialog).toContainText("75.22%");
  await expect(dialog).toContainText("High");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator('[data-benchmark-id="deep-swe-v1-1"]')).toContainText("75.22%");
});
test("published v1 links retain the original coverage instead of adopting new scores", async ({
  page,
}) => {
  await page.goto("/benchmarks?edition=2026-09-30-v1");
  await expect(page.locator("tbody tr")).toHaveCount(17);
  await expect(page.locator('[data-model-id="gpt-6-1-sol"] .bench-score')).toHaveCount(0);
  await page.getByRole("button", { name: "Frontier preset", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(22);
  await expect(page.locator('[data-model-id="gpt-6-1-sol"] .bench-score')).toHaveCount(6);
  await page.goto("/benchmarks?edition=2026-09-30-v2");
  await expect(page.locator("tbody tr")).toHaveCount(21);
  await expect(page.locator('[data-model-id="gpt-6-1-sol"] .bench-score')).toHaveCount(6);
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(21);
});
test("Google sheet has four headers, 17 complete rows and exact representative scores", async ({
  page,
}) => {
  await page.goto(sheet);
  for (const name of [
    "Gemini 4 Argon Google",
    "GPT-6 Astra OpenAI",
    "Claude Fable 5.1 Anthropic",
    "Claude Opus 5.5 Anthropic",
  ])
    await expect(page.getByRole("columnheader", { name })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(17);
  await expect(page.locator("tbody td")).toHaveCount(68);
  const cell = (benchmark: string, model: string) =>
    page.locator(`[data-benchmark-id="${benchmark}"] [data-model-id="${model}"]`);
  await expect(cell("deep-swe-v1-1", "gemini-4-argon")).toContainText("77.9%");
  await expect(cell("frontier-swe-v2", "gpt-6-astra")).toContainText("65.5%");
  await expect(cell("terminal-bench-4-0", "claude-opus-5-5")).toContainText("66.4%");
  for (const model of ["gemini-4-argon", "gpt-6-astra"]) {
    await expect(cell("cwe-bench-v1", model)).toContainText("68.0%");
    await expect(cell("cwe-bench-v1", model)).toHaveAttribute("data-highlighted", "true");
  }
  await expect(cell("terminal-bench-4-0", "claude-opus-5-5")).toHaveAttribute(
    "data-highlighted",
    "true",
  );
  await expect(page.locator("tbody")).not.toContainText("Not reported");
  await page.getByRole("button", { name: "Coding", exact: true }).click();
  await expect(page).toHaveURL(/category=coding/);
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(5);
});
test("local evidence explains benchmark identity, configuration and original sources", async ({
  page,
}) => {
  await page.goto(sheet);
  await page.getByRole("button", { name: /DeepSWE v1.1, Gemini 4 Argon, 77.9%/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("mini-swe");
  await expect(dialog).toContainText("Developer reported");
  await expect(dialog.getByRole("link", { name: "Original methodology ↗" })).toHaveAttribute(
    "href",
    "https://deepmind.google/models/evals-methodology/gemini-4-argon",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("link", { name: "Methodology & sources ↓" }).click();
  await page.getByText("How results are selected and verified", { exact: true }).click();
  await expect(page.locator("#benchmark-methodology")).toContainText(
    "Selection never maximizes a score",
  );
});
test("cross-source comparison works and observation alternatives remain pinned", async ({
  page,
}) => {
  await page.goto("/benchmarks?models=deepseek-v4-1-flash,claude-sonnet-5-5&coverage=shared");
  await expect(page.locator('[data-benchmark-id="terminal-bench-4-0"]')).toContainText("31.2%");
  await expect(page.locator('[data-benchmark-id="terminal-bench-4-0"]')).toContainText("70.6%");
  await expect(
    page.locator('[data-benchmark-id="terminal-bench-4-0"] [data-model-id="claude-sonnet-5-5"]'),
  ).toHaveAttribute("data-highlighted", "true");
  await expect(page.locator("tbody")).toContainText("Different or unreported setups");
  await page.goto("/benchmarks?models=claude-opus-5-5");
  await page.getByRole("button", { name: /Chartography, Claude Opus 5.5, 66.3%/ }).click();
  const result = page.getByLabel("Reported result for Claude Opus 5.5");
  await result.selectOption("anthropic-sonnet-2026-09-28.chartography.claude-opus-5-5");
  await expect(page).toHaveURL(/observation=anthropic-sonnet/);
  await expect(page.getByRole("dialog")).toContainText("64.4%");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator('[data-benchmark-id="chartography"]')).toContainText("64.4%");
});
test("model section is grouped, expandable and linked to exact evidence", async ({ page }) => {
  await page.goto("/models/gemini-4-argon");
  const section = page.getByRole("region", { name: "Benchmarks", exact: true });
  await expect(section).toContainText("Google DeepMind");
  await expect(section).toContainText("77.9%");
  await section.getByText("Show all 17 results", { exact: true }).click();
  await expect(section).toContainText("CWE-bench v1");
  await section.getByText("Methodology & sources", { exact: true }).click();
  await expect(section).toContainText("StackReplay calculates no composite score");
  await section.getByRole("link", { name: "Open benchmark sheet →" }).click();
  await expect(page).toHaveURL(/\/benchmarks\?models=gemini-4-argon/);
});
test("Sol model page presents one primary launch section with six useful results", async ({
  page,
}) => {
  await page.goto("/models/gpt-6-1-sol");
  const section = page.getByRole("region", { name: "Benchmarks", exact: true });
  await expect(section.locator(".bench-model-source")).toHaveCount(1);
  await expect(section).toContainText("GPT-6.1 Sol launch · Max effort");
  await expect(section).toContainText("71.9%");
  await expect(section).toContainText("57.02%");
  await expect(section).toContainText("AutomationBench 1.0.6");
  await section.getByText("Methodology & sources", { exact: true }).click();
  await expect(section).toContainText("public reports");
});
for (const theme of ["dark", "light"] as const)
  test(`sheet ${theme}: accessible, readable, keyboard scrollable, no page overflow`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((value) => {
      localStorage.setItem("stackreplay-theme", value);
      document.documentElement.classList.toggle("dark", value === "dark");
    }, theme);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("/benchmarks");
    await page.evaluate(
      (value) => document.documentElement.classList.toggle("dark", value === "dark"),
      theme,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const region = page.getByRole("region", { name: /Benchmark comparison table/ });
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await expect(region).toBeFocused();
    if (testInfo.project.name === "mobile")
      expect(await region.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: testInfo.outputPath(`benchmarks-${testInfo.project.name}-${theme}.png`),
      fullPage: true,
    });
    if (testInfo.project.name === "mobile")
      await page.getByRole("button", { name: /menu/i }).click();
    await expect(
      page
        .getByRole("navigation", { name: "Public" })
        .getByRole("link", { name: "Benchmarks", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });

test("custom picker, browser history and tablet navigation preserve selection without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/benchmarks");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByText("Add or change models", { exact: false }).first().click();
  await page.getByLabel("Find a model", { exact: true }).fill("DeepSeek V4.1 Flash");
  await page.getByRole("checkbox", { name: /DeepSeek.?V4.1.?Flash/ }).check();
  await expect(page).toHaveURL(/deepseek-v4-1-flash/);
  await page.getByRole("button", { name: "Coding", exact: true }).click();
  await page.goBack();
  await expect(page.getByRole("button", { name: /^All \d+$/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("unscored selections change only after explicit recovery and retain browser history", async ({
  page,
}) => {
  await page.goto("/benchmarks?models=qwen-3-8-max%2Ckimi-k3&coverage=all");
  await expect(page.locator(".bench-empty")).toContainText(
    "Qwen 3.8 Max, Kimi K3: no reported scores in this edition.",
  );
  await expect(page.getByRole("button", { name: "Remove Qwen 3.8 Max" })).toBeVisible();
  await expect(page.locator(".bench-picker")).toContainText("No verified scores yet");
  await expect(page.getByRole("button", { name: "Download JSON", exact: true })).toBeEnabled();
  await expect(page).toHaveURL(/models=qwen-3-8-max%2Ckimi-k3/);
  await page.getByRole("button", { name: "Show models with reported scores", exact: true }).click();
  await expect(page.locator(".bench-empty")).toHaveCount(0);
  expect(await page.locator(".bench-score").count()).toBeGreaterThan(0);
  await expect(page).not.toHaveURL(/models=qwen-3-8-max/);
  await page.goBack();
  await expect(page.locator(".bench-empty")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Kimi K3" })).toBeVisible();
});

test("Download JSON matches pinned visible evidence, share URL and native keyboard action", async ({
  page,
}, testInfo) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/benchmarks?models=gpt-6-1-sol,gemini-4-argon");
  await page.getByRole("button", { name: /DeepSWE v1.1, GPT-6.1 Sol, 71.9%/ }).click();
  const pin = "openai-sol-2026-09-29-high.deep-swe-v1-1.gpt-6-1-sol";
  await page.getByLabel("Reported result for GPT-6.1 Sol").selectOption(pin);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Coding", exact: true }).click();
  const copy = page.getByRole("button", { name: "Copy comparison link" });
  await copy.click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  await page.keyboard.press("Tab");
  const button = page.getByRole("button", { name: "Download JSON", exact: true });
  await expect(button).toBeFocused();
  const downloading = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("stackreplay-benchmarks-2026-10-04-v3.json");
  const file = testInfo.outputPath("selected-benchmark-evidence.json");
  await download.saveAs(file);
  const payload: BenchmarkExport = JSON.parse(await readFile(file, "utf8"));
  expect(payload.exportVersion).toBe(1);
  expect(payload.edition).toBe("2026-10-04-v3");
  expect(payload.comparisonUrl).toBe(shareUrl);
  expect(payload.requested.observationIds).toEqual([pin]);
  expect(payload.requested.category).toBe("coding");
  expect(payload.models.map((model) => model.id)).toEqual(["gpt-6-1-sol", "gemini-4-argon"]);
  expect(payload.rows.map((row) => row.definition.id)).toEqual(
    await page
      .locator("tbody tr")
      .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-benchmark-id"))),
  );
  for (const row of payload.rows) {
    const displayed = page.locator(`[data-benchmark-id="${row.definition.id}"]`);
    await expect(displayed).toContainText(row.setupLabel);
    for (const cell of row.cells) {
      const shown = displayed.locator(`[data-model-id="${cell.modelId}"]`);
      await expect(shown).toContainText(cell.displayValue ?? "Not reported");
      if (row.highlightedModelIds.includes(cell.modelId))
        await expect(shown).toHaveAttribute("data-highlighted", "true");
      else await expect(shown).not.toHaveAttribute("data-highlighted", "true");
    }
  }
  const pinned = payload.rows.find((row) => row.definition.id === "deep-swe-v1-1")?.cells[0];
  expect(pinned).toMatchObject({
    observationId: pin,
    value: 75.22,
    displayValue: "75.22%",
    observation: { effort: "High" },
  });
  expect(
    payload.fullProvenance.data.sourceSets.flatMap((source) => source.observations),
  ).toHaveLength(205);
  await page.reload();
  await expect(page.locator('[data-benchmark-id="deep-swe-v1-1"]')).toContainText("75.22%");
});

test("Download JSON retains old source sheets, full provenance and redistribution links", async ({
  page,
}, testInfo) => {
  await page.goto(sheet);
  await page.getByRole("button", { name: "Security", exact: true }).click();
  const button = page.getByRole("button", { name: "Download JSON", exact: true });
  await expect(button).toBeEnabled();
  const downloading = page.waitForEvent("download");
  await button.click();
  const download = await downloading;
  const file = testInfo.outputPath("v1-source-evidence.json");
  await download.saveAs(file);
  const payload: BenchmarkExport = JSON.parse(await readFile(file, "utf8"));
  expect(payload.edition).toBe("2026-09-30-v1");
  expect(payload.requested.sourceSetId).toBe(google);
  expect(payload.rows.map((row) => row.definition.id)).toEqual(["cwe-bench-v1"]);
  expect(payload.rows[0]?.highlightedModelIds).toEqual(["gemini-4-argon", "gpt-6-astra"]);
  const source = payload.fullProvenance.data.sourceSets.find((source) => source.id === google);
  expect(source?.observations).toHaveLength(68);
  expect(payload.fullProvenance.data.sourceSets).toHaveLength(4);
  expect(payload.fullProvenance.scope).toContain("Full immutable evidence edition");
  await expect(page.locator(".bench-card-counts")).toContainText("1 shared benchmarks");
  await expect(page.locator(".bench-source-card")).toContainText("Published Sep 30, 2026");
  const disclosure = page
    .locator("#benchmark-methodology details")
    .filter({ has: page.locator("summary", { hasText: "Google DeepMind" }) });
  await disclosure.locator("summary").click();
  await expect(disclosure).toContainText(source?.redistribution.rationale ?? "missing source");
  await expect(disclosure.getByRole("link", { name: "Redistribution terms ↗" })).toHaveAttribute(
    "href",
    source?.redistribution.termsUrl ?? "missing source",
  );
});

test("Download JSON allows valid empty views, rejects unresolved coverage and recovers current evidence", async ({
  page,
}, testInfo) => {
  await page.goto("/benchmarks?models=gpt-6-1-sol&category=security");
  await expect(page.locator(".bench-header")).toContainText("No reported evidence in this view.");
  const button = page.getByRole("button", { name: "Download JSON", exact: true });
  await expect(button).toBeEnabled();
  const downloading = page.waitForEvent("download");
  await button.click();
  const download = await downloading;
  const file = testInfo.outputPath("empty-evidence.json");
  await download.saveAs(file);
  const payload: BenchmarkExport = JSON.parse(await readFile(file, "utf8"));
  expect(payload.rows).toEqual([]);
  expect(payload.requested.modelIds).toEqual(["gpt-6-1-sol"]);
  expect(payload.requested.category).toBe("security");
  for (const { query, coverageCopy } of [
    {
      query: "edition=unavailable&models=qwen-3-8-max",
      coverageCopy: "Coverage unknown for this edition",
    },
    { query: "source=unavailable", coverageCopy: "Coverage unavailable for this selection" },
    { query: "observation=unavailable", coverageCopy: "Coverage unavailable for this selection" },
    { query: "models=unknown", coverageCopy: "Coverage unavailable for this selection" },
  ]) {
    await page.goto(`/benchmarks?${query}`);
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-describedby", "benchmark-selection-error");
    const errorPanel = page.locator(".bench-empty");
    await expect(errorPanel.getByRole("alert")).toBeVisible();
    await expect(errorPanel).toContainText("No benchmark coverage is asserted for this selection.");
    await expect(errorPanel).not.toContainText("No reported benchmarks for this selection.");
    await expect(errorPanel).not.toContainText("no reported scores in this edition");
    await expect(page.locator(".bench-coverage-note")).toHaveCount(0);
    await expect(page.locator(".bench-picker")).toContainText(coverageCopy);
    await expect(page.locator(".bench-picker")).not.toContainText("No verified scores yet");
    await expect(page.locator(".bench-header")).toContainText(
      "Evidence unavailable for this selection.",
    );
    await expect(page.locator(".bench-header")).not.toContainText("Developer reported");
    await expect(page.locator(".bench-header")).not.toContainText("Latest check");
    await expect(page.locator("tbody tr")).toHaveCount(0);
    await page.getByRole("button", { name: "Show current edition with reported scores" }).click();
    await expect(errorPanel.getByRole("alert")).toHaveCount(0);
    await expect(button).toBeEnabled();
    await expect(page.locator("tbody tr").first()).toBeVisible();
    if (query.startsWith("edition=")) {
      await page.getByRole("button", { name: "Frontier preset", exact: true }).click();
      await expect(page.locator("tbody tr")).toHaveCount(22);
      await expect(page).toHaveURL(/edition=2026-10-04-v3/);
    }
    expect(await page.locator(".bench-score").count()).toBeGreaterThan(0);
    await expect(page).not.toHaveURL(
      /edition=unavailable|source=unavailable|observation=unavailable|models=unknown/,
    );
  }
});

for (const theme of ["dark", "light"] as const)
  test(`Download JSON controls ${theme}: category summary, keyboard, mobile wrapping and axe`, async ({
    page,
  }) => {
    await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("/benchmarks?models=gemini-4-argon,gpt-6-1-sol");
    await page.evaluate(
      (value) => document.documentElement.classList.toggle("dark", value === "dark"),
      theme,
    );
    await page.getByRole("button", { name: "Security", exact: true }).click();
    await expect(page.locator(".bench-source-card h2")).toHaveText("Google DeepMind");
    await expect(page.locator(".bench-card-counts")).toContainText("1 reported benchmarks");
    await expect(page.locator(".bench-header > div .bench-source-label")).toHaveText(
      "Developer reported · Checked against original publications; not reproduced by StackReplay.",
    );
    const button = page.getByRole("button", { name: "Download JSON", exact: true });
    await expect(button).toBeEnabled();
    await page.getByRole("button", { name: "Copy comparison link" }).focus();
    await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
    for (const name of ["Copy comparison link", "Download JSON"]) {
      const bounds = await page.getByRole("button", { name, exact: true }).boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds?.x).toBeGreaterThanOrEqual(0);
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(
        await page.evaluate(() => innerWidth),
      );
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

const epochBenchmark = "epoch-gpqa-diamond-revision-unreported";
const epochModels = ["claude-sonnet-5-5", "claude-opus-5-5", "qwen-3-8-max-0902"];
const epochDisplays = ["95.5808080808080800%", "90.5934343434343400%", "92.297979797979800%"];
const epochPin = `epoch-gpqa-sonnet-5-5-max-2026-10-04.${epochBenchmark}.claude-sonnet-5-5`;

for (const theme of ["dark", "light"] as const)
  test(`Epoch mixed evidence ${theme}: exact download, partial Science and readable precision`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto(
      `/benchmarks?models=${epochModels.join(",")},gpt-6-1-sol&observation=${epochPin}`,
    );
    await expect(page.locator(".bench-header")).toContainText(
      "Mixed evidence: Developer reported · Independent evaluation",
    );
    await expect(page.locator(".bench-header")).toContainText("Latest check Oct 4, 2026");
    await page.getByRole("button", { name: "Coding", exact: true }).click();
    await expect(page.locator(".bench-header")).not.toContainText("Independent evaluation");
    await expect(page.locator(".bench-header")).toContainText("Latest check Sep 30, 2026");
    await page.getByRole("button", { name: "Science", exact: true }).click();
    const row = page.locator(`[data-benchmark-id="${epochBenchmark}"]`);
    await expect(row).toContainText("Different or unreported setups");
    await expect(row.locator('[data-model-id="gpt-6-1-sol"]')).toHaveText("Not reported");
    for (const [index, model] of epochModels.entries())
      await expect(row.locator(`[data-model-id="${model}"]`)).toContainText(
        epochDisplays[index] ?? "missing expected score",
      );

    const downloadJson = async (name: string) => {
      const downloading = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download JSON", exact: true }).click();
      const download = await downloading;
      const file = testInfo.outputPath(name);
      await download.saveAs(file);
      return JSON.parse(await readFile(file, "utf8")) as BenchmarkExport;
    };
    const payload = await downloadJson("epoch-science-all.json");
    expect(payload.edition).toBe("2026-10-04-v3");
    expect(payload.requested).toMatchObject({
      modelIds: [...epochModels, "gpt-6-1-sol"],
      category: "science",
      coverage: "all",
      observationIds: [epochPin],
      sourceSetId: null,
    });
    expect(payload.comparisonUrl).toBe(page.url());
    const exported = payload.rows.find((row) => row.definition.id === epochBenchmark);
    if (!exported) throw new Error("Missing admitted Epoch row");
    expect(exported.definition).toMatchObject({ version: null, taskSubset: "Diamond" });
    expect(exported.setup).toBe("different_or_unreported");
    expect(exported.cells.map((cell) => cell.displayValue)).toEqual([...epochDisplays, null]);
    expect(exported.cells.map((cell) => cell.value)).toEqual([
      95.58080808080808,
      90.59343434343434,
      92.2979797979798,
      null,
    ]);
    expect(exported.cells[0]?.observationId).toBe(epochPin);
    expect(exported.cells[0]?.selectionReason).toBe(
      "Explicit observation selected in this comparison URL.",
    );
    expect(exported.cells[3]).toEqual({
      modelId: "gpt-6-1-sol",
      status: "unreported",
      observationId: null,
      value: null,
      displayValue: null,
      selectionReason: null,
      observation: null,
      alternativeObservationIds: [],
    });
    expect(payload.fullProvenance.scope).toContain("Full immutable evidence edition");
    expect(payload.fullProvenance.data.definitions).toHaveLength(44);
    expect(payload.fullProvenance.data.sourceSets).toHaveLength(12);
    expect(
      payload.fullProvenance.data.sourceSets.flatMap((source) => source.observations),
    ).toHaveLength(205);
    const epochSources = payload.fullProvenance.data.sourceSets.filter(
      (source) => source.evaluator === "Epoch AI",
    );
    expect(epochSources).toHaveLength(3);
    for (const source of epochSources) {
      expect(source.kind).toBe("model_observations");
      expect(source.redistribution).toMatchObject({
        basis: "licensed_dataset",
        termsUrl: "https://epoch.ai/benchmarks/use-this-data",
        checkedAt: "2026-10-04",
      });
      expect(source.redistribution.rationale).toContain("does not license the mixed archive");
      expect(source.observations[0]?.notes).toContain("complete archive-member SHA256 c5fed6f");
      expect(source.observations[0]?.comparisonGroup).toBeUndefined();
    }
    expect(payload.fullProvenance.data.sourceSets[0]?.redistribution.basis).toBe(
      "official_provider_facts",
    );
    await row.locator('[data-model-id="claude-sonnet-5-5"] button').click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Independent evaluation");
    await expect(dialog).toContainText("Suite revision, scored count");
    await expect(dialog).toContainText("QPk8jbJvo4986sbWtdte6J");
    await expect(dialog).toContainText("0.013710320714521202");
    await expect(dialog).toContainText("Completion and original publication dates are unknown");
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(row).toContainText(epochDisplays[0] ?? "missing expected score");
    await expect(page).toHaveURL(/observation=epoch-gpqa-sonnet/);

    const metrics = await row.locator(".bench-score").evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        const cell = button.closest("td");
        if (!cell) throw new Error("Score outside table cell");
        const cellRect = cell.getBoundingClientRect();
        return {
          text: button.textContent,
          width: rect.width,
          cellWidth: cellRect.width,
          clipped: button.scrollWidth > button.clientWidth,
          fontSize: getComputedStyle(button).fontSize,
        };
      }),
    );
    await testInfo.attach("epoch-precision-metrics", {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`epoch-${theme}.png`), fullPage: true });

    await page.getByRole("button", { name: "Shared benchmarks", exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(0);
    await expect(page.locator(".bench-header")).toContainText("No reported evidence in this view.");
    expect((await downloadJson("epoch-science-shared-four.json")).rows).toEqual([]);
    await page.getByRole("button", { name: "Remove GPT-6.1 Sol", exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(row).toContainText("Different or unreported setups");
    await expect(page.locator(".bench-header > div .bench-source-label")).toHaveText(
      "Independent evaluation · Checked against original publications; not reproduced by StackReplay.",
    );
    await expect(page.locator(".bench-header")).toContainText("Latest check Oct 4, 2026");
    const shared = await downloadJson("epoch-science-shared-trio.json");
    expect(shared.rows.map((row) => row.definition.id)).toEqual([epochBenchmark]);
    expect(shared.rows[0]?.setup).toBe("different_or_unreported");
    expect(shared.rows[0]?.cells.every((cell) => cell.status === "reported")).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`epoch-shared-${theme}.png`),
      fullPage: true,
    });
    // Keep layout acceptance explicit after recording the functional export paths.
    for (const metric of metrics) {
      expect(metric.clipped).toBe(false);
      expect(metric.width).toBeLessThanOrEqual(metric.cellWidth);
    }
  });

for (const [index, modelId] of epochModels.entries())
  test(`Epoch model provenance: ${modelId}`, async ({ page }, testInfo) => {
    await page.goto(`/models/${modelId}`);
    const section = page.getByRole("region", { name: "Benchmarks", exact: true });
    const source = section
      .locator(".bench-model-source")
      .filter({ has: page.getByRole("heading", { name: "Epoch AI · Oct 4, 2026", exact: true }) });
    await expect(source).toContainText("Independent evaluation");
    await expect(source).toContainText(epochDisplays[index] ?? "missing expected score");
    await source.getByText("Methodology & sources", { exact: true }).click();
    await expect(source).toContainText("CC BY 4.0");
    await expect(source).toContainText("run-specific suite and setup details are unknown");
    await source.locator("details details > summary").click();
    await expect(source).toContainText("Version: Not reported");
    await expect(source).toContainText("Completion and original publication dates are unknown");
    await expect(source.getByRole("link", { name: "Original evidence ↗" })).toHaveAttribute(
      "href",
      "https://epoch.ai/data/benchmark_data.zip",
    );
    const link = source.locator(".bench-model-grid dt a");
    await expect(link).toHaveAttribute(
      "href",
      new RegExp(`edition=2026-10-04-v3&observation=epoch-gpqa-.*${modelId}`),
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath(`epoch-model-${modelId}.png`),
      fullPage: true,
    });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`models=${modelId}.*observation=epoch-gpqa-`));
    await expect(page.locator(`[data-benchmark-id="${epochBenchmark}"]`)).toContainText(
      epochDisplays[index] ?? "missing expected score",
    );
  });
