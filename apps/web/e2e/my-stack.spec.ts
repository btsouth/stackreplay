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

async function scan(
  page: Page,
  source: "claude" | "codex" = "claude",
  unresolved = false,
  saveLocal = true,
) {
  await gotoImport(page);
  await page
    .getByRole("checkbox", { name: "Save normalized workload on this browser" })
    .setChecked(saveLocal);
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

/** Setup is secondary once a stack exists: open it the way a person would. */
async function edit(page: Page, family = "claude") {
  const button = page.getByTestId(`edit-family-${family}`);
  if (!(await button.isVisible())) await page.getByTestId("stack-edit").click();
  await button.click();
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
  await expect(page.getByTestId("stack-target-command-code-goat")).toContainText("$10/mo");
  await edit(page);
  await expect(page.locator("#stack-family-editor")).toContainText("Published access:");
  await expect(page.locator("#stack-family-editor")).not.toContainText("Model access unknown");
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
  await expect(page.getByTestId("stack-published-total")).toContainText("API target is excluded");
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
  await expect(page.getByTestId("selected-stack").locator("article")).toHaveCount(2);
  // Two plans of one family share the tool's calls; they are never split.
  await expect(page.getByTestId("stack-target-anthropic-claude-pro")).toContainText(
    "shared with Claude Max 5x",
  );
});

for (const context of ["session-only", "missing"] as const) {
  test(`${context} workload scope can be cleared to manage plans without saved history`, async ({
    page,
  }) => {
    if (context === "session-only") {
      const id = await scan(page, "claude", false, false);
      await page.getByRole("button", { name: "Not now", exact: true }).click();
      await page.getByRole("link", { name: "Manage My Stack →" }).click();
      await expect(page).toHaveURL(new RegExp(`/app/stack\\?import=${id}`));
    } else {
      await page.goto("/app/stack?import=missing-workload");
    }
    await expect(page.getByTestId("stack-workload")).toHaveValue("");
    await expect(page.getByTestId("stack-workload").locator("option")).toHaveCount(1);
    await expect(page.getByTestId("edit-family-claude")).toBeDisabled();
    await expect(page.getByTestId("stack-opportunities")).toHaveCount(0);
    await page.getByRole("link", { name: "Manage plans without this workload →" }).click();
    await expect(page).toHaveURL(/\/app\/stack$/);
    await expect(page.getByTestId("edit-family-claude")).toBeEnabled();
    await edit(page);
    await page.getByTestId("stack-editor-plan-anthropic-claude-pro").click();
    await page.getByRole("button", { name: "Save stack", exact: true }).click();
    expect(await readStack(page)).toEqual(["plan:anthropic-claude-pro"]);
    await page.getByRole("button", { name: "Remove Claude Pro", exact: true }).click();
    expect(await readStack(page)).toEqual([]);
  });
}

test("one selected workload at a time, unresolved identities stay unknown and navigation retains scope", async ({
  page,
}) => {
  const claudeId = await scan(page, "claude", true);
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  const codexId = await scan(page, "codex");
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.goto(`/app/stack?import=${claudeId}`);
  await expect(page.getByTestId("edit-family-claude")).toContainText("100% of recorded calls");
  // Unresolved identities are never priced or assigned a model.
  await expect(page.getByTestId("stack-workload-value")).toContainText("Not priced");
  await page.evaluate((key) => {
    localStorage.setItem(key, '["plan:anthropic-claude-max-5x"]');
    window.dispatchEvent(new Event("stackreplay-current-stack"));
  }, STACK);
  const report = page.getByTestId("stack-target-anthropic-claude-max-5x");
  await expect(report).toContainText("Not priced");
  await report
    .getByTestId("report-details-anthropic-claude-max-5x")
    .locator(":scope > summary")
    .click();
  await expect(report).toContainText("unresolved model identities");
  await page.getByTestId("stack-workload").selectOption(codexId);
  await expect(page.getByTestId("stack-outside")).toContainText("Codex");
  await page.reload();
  await expect(page.getByTestId("stack-workload")).toHaveValue(codexId);
  await expect(page.getByTestId("stack-outside")).toContainText("No ChatGPT plan in your stack");
  // Codex history says nothing about Claude use: not visible, never "unused".
  await expect(page.getByTestId("stack-target-anthropic-claude-max-5x")).toContainText(
    "No Claude Code history in this workload",
  );
  await expect(page.getByTestId("opportunity-unused")).toHaveCount(0);
  await page.getByTestId("stack-workload").selectOption("");
  await expect(page.getByTestId("stack-workload-value")).toContainText("No workload selected");
  await expect(page.getByTestId("stack-outside")).toHaveCount(0);
  expect(await readStack(page)).toEqual(["plan:anthropic-claude-max-5x"]);
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
  await expect(
    page.getByRole("button", { name: "Remove Command Code GOAT", exact: true }),
  ).toBeDisabled();
  await expect(page.getByTestId("stack-opportunities")).toHaveCount(0);
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
    await page.getByTestId("report-details-opencode-go").locator(":scope > summary").click();
    await page.getByTestId("published-access-opencode-go").locator("summary").click();
    // Audit from the top: content scrolled under the sticky site header is not a target-size fault.
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await edit(page, "opencode");
    await page.getByRole("button", { name: "I pay for multiple plans" }).click();
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

test("removal Undo preserves targets confirmed afterward and survives reload", async ({ page }) => {
  await page.goto("/app/stack");
  await expect(page.getByTestId("edit-family-claude")).toBeEnabled();
  await page.evaluate((key) => {
    localStorage.setItem(key, '["plan:anthropic-claude-pro","api:openai"]');
    window.dispatchEvent(new Event("stackreplay-current-stack"));
  }, STACK);
  await page.getByRole("button", { name: "Remove Claude Pro", exact: true }).click();
  expect(await readStack(page)).toEqual(["api:openai"]);
  await page.evaluate((key) => {
    localStorage.setItem(key, '["api:openai","plan:command-code-goat"]');
    window.dispatchEvent(new Event("stackreplay-current-stack"));
  }, STACK);
  await page.getByRole("button", { name: "Undo removal" }).click();
  expect(await readStack(page)).toEqual([
    "plan:anthropic-claude-pro",
    "api:openai",
    "plan:command-code-goat",
  ]);
  await page.reload();
  await expect(page.getByTestId("stack-target-anthropic-claude-pro")).toBeVisible();
  await expect(page.getByTestId("stack-target-command-code-goat")).toBeVisible();
});

test("published model access is compact, searchable and keeps distinct routes", async ({
  page,
}) => {
  await page.goto("/app/stack");
  await page.evaluate((key) => {
    localStorage.setItem(key, '["plan:command-code-max-20x"]');
    window.dispatchEvent(new Event("stackreplay-current-stack"));
  }, STACK);
  await page.getByTestId("report-details-command-code-max-20x").locator(":scope > summary").click();
  const access = page.getByTestId("published-access-command-code-max-20x");
  await expect(access.locator("summary")).toContainText(/Published model access · \d+ models/);
  await expect(access.getByRole("searchbox")).not.toBeVisible();
  await access.locator("summary").click();
  await access.getByRole("searchbox").fill("DEEPSEEK V4.1 FLASH");
  await expect(access.getByRole("listitem")).toHaveCount(2);
  await expect(access).toContainText("DeepSeek V4.1 Flash Fast");
  await access.getByRole("searchbox").fill("not-in-this-reviewed-lineup");
  await expect(access.getByRole("listitem")).toHaveCount(0);
  await expect(access).toContainText("No matching entries");
  await access.locator("summary").click();
  await access.locator("summary").click();
  await expect(access.getByRole("searchbox")).toHaveValue("");
});

test("modal contains focus, keeps actions visible on mobile and restores page scrolling", async ({
  page,
}) => {
  await page.goto("/app/stack");
  const originalOverflow = await page.evaluate(() => document.body.style.overflow);
  await edit(page, "command-code");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#stack-editor-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("stack-editor-plan-command-code-go")).toBeFocused();
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.closest("dialog") !== null)).toBe(
      true,
    );
  }
  expect(
    await page.evaluate(() => {
      (document.querySelector('[data-testid="edit-family-claude"]') as HTMLButtonElement).focus();
      return document.activeElement?.closest("dialog") !== null;
    }),
  ).toBe(true);
  await page.getByTestId("stack-editor-plan-command-code-max-20x").click();
  const save = await dialog.getByRole("button", { name: "Save stack", exact: true }).boundingBox();
  const viewport = page.viewportSize();
  if (!save || !viewport) throw new Error("Editor save control or viewport is unavailable");
  expect(save.y + save.height).toBeLessThanOrEqual(viewport.height);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("edit-family-command-code")).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(originalOverflow);
  expect(await readStack(page)).toEqual([]);
});

for (const operation of ["API_MARKET", "LIST_LOCAL_IMPORTS"] as const) {
  test(`${operation} failure has a working retry without changing selected plans`, async ({
    page,
  }) => {
    const id = await scan(page);
    await page.getByRole("button", { name: "Not now", exact: true }).click();
    await page.addInitScript((operation) => {
      const original = Worker.prototype.postMessage;
      let failed = false;
      Worker.prototype.postMessage = function (message, ...args: unknown[]) {
        if (message?.type === operation && !failed) {
          failed = true;
          queueMicrotask(() =>
            this.dispatchEvent(
              new MessageEvent("message", {
                data: {
                  type: "ERROR",
                  requestId: message.requestId,
                  error: {
                    code: "STORAGE_UNAVAILABLE",
                    title: "Unavailable",
                    message: "Fixture read failure",
                  },
                },
              }),
            ),
          );
          return;
        }
        return original.call(this, message, ...(args as [StructuredSerializeOptions]));
      };
    }, operation);
    await page.goto(`/app/stack?import=${id}`);
    const retry = page.getByRole("button", {
      name: operation === "API_MARKET" ? "Retry analysis" : "Retry workloads",
      exact: true,
    });
    await expect(retry).toBeVisible();
    await retry.click();
    await expect(page.getByTestId("edit-family-claude")).toContainText("100% of recorded calls");
    expect(await readStack(page)).toEqual([]);
  });
}

test("empty and API-only stacks do not claim a zero subscription bill", async ({ page }) => {
  await page.goto("/app/stack");
  await expect(page.getByTestId("stack-overview")).toContainText("No subscriptions yet");
  await expect(page.getByTestId("stack-published-total")).toContainText(
    "Tell StackReplay what you currently pay for",
  );
  await expect(page.getByTestId("stack-published-total")).not.toContainText("$0");
  await page.evaluate((key) => {
    localStorage.setItem(key, '["api:openai"]');
    window.dispatchEvent(new Event("stackreplay-current-stack"));
  }, STACK);
  await expect(page.getByTestId("stack-published-total")).toContainText("No fixed plan price");
  await expect(page.getByTestId("stack-published-total")).not.toContainText("$0.00");
  await expect(page.getByTestId("stack-target-openai")).toContainText("Billed by usage");
  await page.evaluate((key) => {
    localStorage.setItem(key, '["plan:retired-plan"]');
    window.dispatchEvent(new Event("stackreplay-current-stack"));
  }, STACK);
  await expect(page.getByTestId("stack-published-total")).toContainText(
    "Published plan price unavailable",
  );
  await expect(page.getByTestId("stack-published-total")).not.toContainText("No fixed plan price");
});

test("failed removal and Undo report storage failure and remain retryable", async ({ page }) => {
  await page.goto("/app/stack");
  await expect(page.getByTestId("edit-family-claude")).toBeEnabled();
  await page.evaluate((key) => {
    localStorage.setItem(key, '["plan:anthropic-claude-pro","api:openai"]');
    window.dispatchEvent(new Event("stackreplay-current-stack"));
    const set = Storage.prototype.setItem;
    Object.assign(window, { blockStackWrites: true });
    Storage.prototype.setItem = function (item, value) {
      if (
        item === key &&
        (window as typeof window & { blockStackWrites: boolean }).blockStackWrites
      )
        throw new DOMException("Blocked", "QuotaExceededError");
      return set.call(this, item, value);
    };
  }, STACK);
  await page.getByRole("button", { name: "Remove Claude Pro", exact: true }).click();
  await expect(page.getByTestId("my-stack").getByRole("alert")).toContainText("Could not remove");
  expect(await readStack(page)).toEqual(["plan:anthropic-claude-pro", "api:openai"]);
  await page.evaluate(() => Object.assign(window, { blockStackWrites: false }));
  await page.getByRole("button", { name: "Remove Claude Pro", exact: true }).click();
  await page.evaluate(() => Object.assign(window, { blockStackWrites: true }));
  await page.getByRole("button", { name: "Undo removal" }).click();
  await expect(page.getByTestId("my-stack").getByRole("alert")).toContainText("Could not restore");
  expect(await readStack(page)).toEqual(["api:openai"]);
  await page.evaluate(() => Object.assign(window, { blockStackWrites: false }));
  await page.getByRole("button", { name: "Undo removal" }).click();
  await expect(page.getByTestId("stack-target-anthropic-claude-pro")).toBeVisible();
  expect(await readStack(page)).toEqual(["plan:anthropic-claude-pro", "api:openai"]);
});
