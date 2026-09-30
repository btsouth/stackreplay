import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const google = "google-deepmind-argon-2026-09-30";
const sheet = `/benchmarks?source=${google}&models=gemini-4-argon,gpt-6-astra,claude-fable-5-1,claude-opus-5-5&coverage=shared&edition=2026-09-30-v1`;

test("default Frontier shows verified Sol launch scores and shared benchmark coverage", async ({
  page,
}) => {
  await page.goto("/benchmarks");
  await expect(page.getByRole("heading", { name: "Model Benchmarks", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "GPT-6.1 Sol OpenAI" })).toBeVisible();
  await expect(page.locator('[data-model-id="gpt-6-1-sol"]')).toHaveCount(21);
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
  await expect(page.locator("tbody tr")).toHaveCount(21);
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
  await expect(page.locator("tbody tr")).toHaveCount(21);
  await expect(page.locator('[data-model-id="gpt-6-1-sol"] .bench-score')).toHaveCount(6);
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
