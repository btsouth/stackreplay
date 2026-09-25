import { expect, test } from "@playwright/test";
import {
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
  COMMAND_CODE_SESSION,
} from "../../../packages/adapters/src/fixtures/content";
import { gotoImport, importDemo } from "./helpers";

test("a missing saved workload is identified instead of shown as an empty browser", async ({
  page,
}) => {
  await importDemo(page, "moderate");
  await page.goto("/app/compare?import=missing-snapshot");
  await expect(page.getByTestId("compare-missing")).toContainText(
    "That saved workload is no longer available in this browser",
  );
});

test("a mixed workload compares one purchase decision and enters migration through Replay", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await gotoImport(page);
  await page.getByTestId("source-file-input").setInputFiles([
    {
      name: "claude.jsonl",
      mimeType: "application/jsonl",
      buffer: Buffer.from(CLAUDE_CODE_SESSION.replaceAll('"example-medium"', '"claude-opus-4-8"')),
    },
    {
      name: "codex.jsonl",
      mimeType: "application/jsonl",
      buffer: Buffer.from(CODEX_ROLLOUT.replaceAll('"example-large"', '"gpt-5.6-sol"')),
    },
    {
      name: "command-code.jsonl",
      mimeType: "application/jsonl",
      buffer: Buffer.from(
        COMMAND_CODE_SESSION.replaceAll('"example-small"', '"deepseek-v4-pro"').replaceAll(
          '"example-medium"',
          '"deepseek-v4-pro"',
        ),
      ),
    },
  ]);
  await expect(page.getByTestId("import-summary")).toContainText("Workload ready", {
    timeout: 60_000,
  });
  await page.getByTestId("open-workload").click();
  await page.getByTestId("workload-compare-cta").click();
  await expect(page.getByTestId("compare-decisions")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("compare-results")).toHaveCount(0);

  await page.getByTestId("compare-decision-claude").click();
  await expect(page.getByTestId("comparison-object")).toContainText("Claude Code work");
  await expect(page.getByTestId("comparison-object")).toContainText("2 calls");
  await expect(page.getByTestId("compare-plan")).toHaveValue("anthropic-claude-max-20x");
  await expect(page.getByTestId("compare-demand")).toContainText("No subscription allowance", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("compare-price")).toContainText("published-rate total", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("compare-price")).not.toContainText("savings");

  await page.getByTestId("compare-decision-codex").click();
  await expect(page.getByTestId("comparison-object")).toContainText("Codex work");
  await expect(page.getByTestId("compare-plan")).toHaveValue("openai-chatgpt-pro");
  await expect(page.getByTestId("compare-price")).toContainText("published API rates", {
    timeout: 60_000,
  });

  await page.getByTestId("compare-decision-stack").click();
  await expect(page.getByTestId("stack-configure")).toContainText(
    "Imported history does not identify your subscriptions",
  );
  await page.getByTestId("stack-plan-anthropic-claude-max-20x").check();
  await page.getByTestId("stack-plan-openai-chatgpt-pro").check();
  await expect(page.getByTestId("compare-price")).toContainText("$300.00/month");
  await expect(page.getByTestId("stack-tool-breakdown")).toContainText("Command Code");
  await expect(page.getByTestId("compare-gaps")).toContainText("excluded from the API equivalent");
  await page.reload();
  await page.getByTestId("compare-decision-stack").click();
  await expect(page.getByTestId("stack-plan-anthropic-claude-max-20x")).toBeChecked();
  await expect(page.getByTestId("stack-plan-openai-chatgpt-pro")).toBeChecked();

  await page.getByTestId("compare-decision-migration").click();
  await page.getByTestId("migration-scope-codex").click();
  await page.getByRole("link", { name: "Choose a destination in Replay" }).click();
  await expect(page.getByTestId("scope-codex")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("plan-anthropic-claude-max-20x").click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result-object")).toContainText("Codex work", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("replay-result-object")).toContainText("Exact replay");
  await page.getByTestId("configure-translation").click();
  await page.getByTestId("translation-select-gpt-5-6-sol").selectOption("claude-opus-4-8");
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result-object")).toContainText("Translated replay", {
    timeout: 60_000,
  });
});
