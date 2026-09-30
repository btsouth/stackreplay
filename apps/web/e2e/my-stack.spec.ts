import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import {
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
} from "../../../packages/adapters/src/fixtures/content";
import { gotoImport, importDemo, waitForWorkload } from "./helpers";

const STACK = "stackreplay.current-stack";
const PREFERENCES = "stackreplay.stack-discovery.v1";
const readStack = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]") as string[], STACK);

async function scan(page: Page, source: "claude" | "codex" = "claude", unresolved = false) {
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page.getByTestId("source-file-input").setInputFiles({
    name: `${source}.jsonl`,
    mimeType: "application/jsonl",
    buffer: Buffer.from(
      source === "claude"
        ? CLAUDE_CODE_SESSION.replaceAll(
            '"example-medium"',
            unresolved ? '"unknown-stack-model"' : '"claude-opus-5-5"',
          )
        : CODEX_ROLLOUT.replaceAll('"example-large"', '"gpt-6-sol"'),
    ),
  });
  await waitForWorkload(page);
  return new URL(page.url()).searchParams.get("import") ?? "";
}

async function edit(page: Page, family = "claude") {
  await page.getByTestId(`edit-family-${family}`).click();
  await expect(page.locator("#stack-family-editor")).toBeVisible();
}

test("no history needed: multiple plans save, reload, edit independently and remove one selection", async ({
  page,
}) => {
  await page.goto("/app/stack");
  await expect(page.getByRole("heading", { name: "My Stack", exact: true })).toBeVisible();
  await expect(page.getByTestId("edit-family-claude")).toBeEnabled();
  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      '["plan:command-code-goat","api:openai","plan:retired-plan","plan:openai-chatgpt-business"]',
    );
    window.dispatchEvent(new Event("stackreplay-current-stack"));
  }, STACK);
  await expect(page.getByTestId("stack-target-retired-plan")).toContainText(
    "Current catalog facts unavailable",
  );
  await expect(page.getByTestId("stack-target-command-code-goat")).toContainText(
    "Published price:",
  );
  await edit(page);
  await page.getByRole("button", { name: "I pay for multiple plans" }).click();
  await expect(page.getByRole("button", { name: "Save stack", exact: true })).toBeDisabled();
  await page.getByTestId("stack-editor-plan-anthropic-claude-pro").check();
  await page.getByTestId("stack-editor-plan-anthropic-claude-max-5x").check();
  await page.getByRole("button", { name: "Save stack", exact: true }).click();
  expect(await readStack(page)).toEqual([
    "plan:command-code-goat",
    "api:openai",
    "plan:retired-plan",
    "plan:openai-chatgpt-business",
    "plan:anthropic-claude-pro",
    "plan:anthropic-claude-max-5x",
  ]);
  await expect(page.getByTestId("stack-published-total")).toContainText("API targets are excluded");
  await page.reload();
  await expect(page.getByTestId("stack-target-anthropic-claude-pro")).toBeVisible();
  await edit(page);
  await expect(page.getByRole("radio", { name: "Keep my current selections" })).toBeChecked();
  await page.getByRole("button", { name: "I pay for multiple plans" }).click();
  await page.getByTestId("stack-editor-plan-anthropic-claude-pro").uncheck();
  await page.getByTestId("stack-editor-plan-anthropic-claude-max-20x").check();
  await page.getByRole("button", { name: "Save stack", exact: true }).click();
  expect(await readStack(page)).toEqual([
    "plan:command-code-goat",
    "api:openai",
    "plan:retired-plan",
    "plan:openai-chatgpt-business",
    "plan:anthropic-claude-max-5x",
    "plan:anthropic-claude-max-20x",
  ]);
  await page.getByRole("button", { name: "Remove Claude Max 5x", exact: true }).click();
  expect(await readStack(page)).toEqual([
    "plan:command-code-goat",
    "api:openai",
    "plan:retired-plan",
    "plan:openai-chatgpt-business",
    "plan:anthropic-claude-max-20x",
  ]);
});

test("Workload quick confirmation has an explicit multiple-plan path using the same editor controls", async ({
  page,
}) => {
  const id = await scan(page);
  const panel = page.getByTestId("stack-confirmation-panel");
  await panel.getByRole("button", { name: "I pay for multiple plans" }).click();
  await page.getByTestId("discovery-plan-anthropic-claude-pro").check();
  await page.getByTestId("discovery-plan-anthropic-claude-max-5x").check();
  await panel.getByRole("button", { name: "Confirm stack" }).click();
  expect(await readStack(page)).toEqual([
    "plan:anthropic-claude-pro",
    "plan:anthropic-claude-max-5x",
  ]);
  await page.getByRole("link", { name: "Manage My Stack →" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/stack\\?import=${id}`));
  await expect(page.getByTestId("stack-activity-claude-code")).toContainText("% of recorded calls");
  await expect(page.getByTestId("selected-stack").locator("article")).toHaveCount(2);
});

test("one selected workload at a time, unresolved identities stay unknown and navigation retains scope", async ({
  page,
}) => {
  const claudeId = await scan(page, "claude", true);
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  const codexId = await scan(page, "codex");
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.goto(`/app/stack?import=${claudeId}`);
  await expect(page.getByTestId("stack-activity-claude-code")).toContainText(
    "No resolved model identities",
  );
  await expect(page.getByTestId("stack-activity-claude-code")).toContainText(
    "100% of recorded calls",
  );
  await expect(page.getByTestId("stack-activity-codex")).toHaveCount(0);
  await page.getByTestId("stack-workload").selectOption(codexId);
  await expect(page.getByTestId("stack-activity-codex")).toContainText("100% of recorded calls");
  await page.reload();
  await expect(page.getByTestId("stack-workload")).toHaveValue(codexId);
  await expect(page.getByTestId("stack-activity-codex")).toContainText("100% of recorded calls");
  await expect(page.getByTestId("stack-activity-claude-code")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Replay this workload →" })).toHaveAttribute(
    "href",
    `/app/replay?import=${codexId}`,
  );
  await expect(page.getByRole("link", { name: "Compare and review billing →" })).toHaveAttribute(
    "href",
    `/app/compare?view=billing&import=${codexId}`,
  );
  await page.getByTestId("stack-workload").selectOption("");
  await expect(page.getByTestId("stack-activity")).toHaveCount(0);
  expect(await readStack(page)).toEqual([]);
});

test("Not sure, API/other and work responses persist without creating plans; manual choices survive", async ({
  page,
}) => {
  const id = await scan(page);
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.goto(`/app/stack?import=${id}`);
  for (const label of ["Not sure", "API / other billing", "Work / organization account"]) {
    await edit(page);
    await page.getByRole("radio", { name: label, exact: true }).click();
    await page.getByRole("button", { name: "Save stack", exact: true }).click();
    expect(await readStack(page)).toEqual([]);
    await page.reload();
    await edit(page);
    await expect(page.getByRole("radio", { name: label, exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  }
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES)).not.toMatch(
    /plan:|api:/u,
  );
  await page.goto(`/app/workload?import=${id}`);
  await expect(page.getByTestId("stack-discovery")).toBeVisible();
  await expect(page.getByTestId("stack-confirmation-panel")).toHaveCount(0);
  await page.goto("/app/settings");
  await page.getByTestId("settings-manual-plans").locator("summary").click();
  await page.getByTestId("settings-plan-cursor-ultra").check();
  await page.getByRole("link", { name: "Manage My Stack →" }).click();
  await expect(page.getByTestId("stack-target-cursor-ultra")).toBeVisible();
});

test("keyboard editor focus, native radio navigation, save and Escape cancellation", async ({
  page,
}) => {
  await page.goto("/app/stack");
  await edit(page);
  await expect(page.locator("#stack-editor-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("stack-editor-plan-anthropic-claude-pro")).toBeFocused();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("stack-editor-plan-anthropic-claude-max-5x")).toBeChecked();
  await page.getByRole("button", { name: "Save stack", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("edit-family-claude")).toBeFocused();
  expect(await readStack(page)).toEqual(["plan:anthropic-claude-max-5x"]);
  await edit(page);
  await page.getByTestId("stack-editor-plan-anthropic-claude-max-20x").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#stack-family-editor")).toHaveCount(0);
  await expect(page.getByTestId("edit-family-claude")).toBeFocused();
  expect(await readStack(page)).toEqual(["plan:anthropic-claude-max-5x"]);
});

test("storage denial leaves editable answers, never claims success and allows cancellation", async ({
  page,
}) => {
  await page.goto("/app/stack");
  await edit(page);
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        key.startsWith("stackreplay.current-stack") ||
        key.startsWith("stackreplay.stack-discovery")
      )
        throw new DOMException("Blocked", "QuotaExceededError");
      return set.call(this, key, value);
    };
  });
  await page.getByTestId("stack-editor-plan-anthropic-claude-pro").click();
  await page.getByRole("button", { name: "Save stack", exact: true }).click();
  await expect(page.locator("#stack-family-editor").getByRole("alert")).toContainText(
    "Could not save",
  );
  await expect(page.getByTestId("stack-editor-plan-anthropic-claude-pro")).toBeChecked();
  expect(await readStack(page)).toEqual([]);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#stack-family-editor")).toHaveCount(0);
});

test("demo context is read-only, excludes activity and cannot change real selections or preferences", async ({
  page,
}) => {
  await gotoImport(page);
  await page.evaluate(
    ({ stack, preferences }) => {
      localStorage.setItem(stack, '["plan:command-code-goat"]');
      localStorage.setItem(
        preferences,
        '{"version":1,"groups":{"claude":{"response":"not-sure"}}}',
      );
    },
    { stack: STACK, preferences: PREFERENCES },
  );
  await importDemo(page, "moderate");
  const id = new URL(page.url()).searchParams.get("import");
  await page.goto(`/app/stack?import=${id}`);
  await expect(page.getByTestId("stack-demo-notice")).toBeVisible();
  await expect(page.getByTestId("edit-family-claude")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Remove Command Code GOAT" })).toBeDisabled();
  await expect(page.getByTestId("stack-activity")).toHaveCount(0);
  expect(await readStack(page)).toEqual(["plan:command-code-goat"]);
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES)).toBe(
    '{"version":1,"groups":{"claude":{"response":"not-sure"}}}',
  );
});

for (const theme of ["dark", "light"] as const) {
  test(`My Stack and multi-plan editor pass axe with no overflow in ${theme}`, async ({ page }) => {
    await page.addInitScript((theme) => localStorage.setItem("stackreplay-theme", theme), theme);
    const id = await scan(page);
    await page.getByRole("button", { name: "Not now", exact: true }).click();
    await page.goto(`/app/stack?import=${id}`);
    await edit(page, "opencode");
    await page.getByRole("button", { name: "I pay for multiple plans" }).click();
    await page.getByTestId("stack-editor-plan-opencode-go").check();
    await page.getByTestId("stack-editor-plan-opencode-go-plus").check();
    await page.getByRole("button", { name: "Save stack", exact: true }).click();
    await edit(page, "opencode");
    await page.getByRole("button", { name: "I pay for multiple plans" }).click();
    await page
      .getByTestId("stack-target-opencode-go")
      .getByText("Published model access", { exact: true })
      .click();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.setViewportSize({ width: 820, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
