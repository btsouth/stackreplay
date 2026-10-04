import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import {
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
  COMMAND_CODE_SESSION,
} from "../../../packages/adapters/src/fixtures/content";
import { gotoImport, importDemo, waitForWorkload } from "./helpers";

const STACK = "stackreplay.current-stack";
const PREFERENCES = "stackreplay.stack-discovery.v1";
const panel = (page: Page) => page.getByTestId("stack-confirmation-panel");

async function scan(page: Page, mixed = false, unresolved = false) {
  await gotoImport(page);
  await expect(panel(page)).toHaveCount(0);
  await page.getByTestId("source-file-input").setInputFiles([
    {
      name: "claude.jsonl",
      mimeType: "application/jsonl",
      buffer: Buffer.from(
        CLAUDE_CODE_SESSION.replaceAll(
          '"example-medium"',
          unresolved ? '"unresolved-preview"' : '"claude-opus-5-5"',
        ),
      ),
    },
    ...(mixed
      ? [
          {
            name: "codex.jsonl",
            mimeType: "application/jsonl",
            buffer: Buffer.from(CODEX_ROLLOUT.replaceAll('"example-large"', '"gpt-6-sol"')),
          },
          {
            name: "command-code.jsonl",
            mimeType: "application/jsonl",
            buffer: Buffer.from(
              COMMAND_CODE_SESSION.replaceAll('"example-small"', '"gpt-5-6-sol"').replaceAll(
                '"example-medium"',
                '"claude-sonnet-5-5"',
              ),
            ),
          },
        ]
      : []),
  ]);
  await waitForWorkload(page);
  await expect(panel(page)).toBeVisible();
}

async function savedStack(page: Page): Promise<string[]> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]") as string[], STACK);
}

test("a real completed mixed scan offers small unselected families and published facts", async ({
  page,
}) => {
  await scan(page, true);
  await expect(panel(page).getByRole("heading", { name: "We found your AI stack" })).toBeVisible();
  await expect(panel(page)).toContainText("activity from 3 services");
  await expect(page.getByTestId("discovery-group-claude")).toContainText("Claude Code activity");
  await expect(page.getByTestId("discovery-group-chatgpt")).toContainText("Codex activity");
  await expect(page.getByTestId("discovery-group-command-code")).toContainText(
    "Command Code activity",
  );
  await expect(panel(page)).toContainText("% of recorded calls");
  await expect(panel(page)).toContainText("Published price: $100.00/month");
  await expect(panel(page)).toContainText("ChatGPT Pro 500");
  await expect(page.getByTestId("discovery-plan-command-code-goat")).toBeVisible();
  await expect(panel(page).locator('input[type="radio"]:checked')).toHaveCount(0);
  expect(await savedStack(page)).toEqual([]);
  await expect(panel(page).getByRole("button", { name: "Confirm stack" })).toBeDisabled();
  await expect(panel(page)).not.toContainText(
    /You pay|probably have|detected Claude|subscription usage|spend share/u,
  );
});

test("one click per family confirms, survives reload and can edit one family without losing others", async ({
  page,
}) => {
  await gotoImport(page);
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify(["plan:command-code-goat", "plan:cursor-ultra", "api:openai"]),
      ),
    STACK,
  );
  await scan(page, true);
  await expect(page.getByTestId("discovery-plan-command-code-goat")).toBeChecked();
  await page.getByTestId("discovery-plan-anthropic-claude-max-5x").click();
  await page.getByTestId("discovery-plan-openai-chatgpt-pro-20x").click();
  await panel(page).getByRole("button", { name: "Confirm stack" }).click();
  await expect(panel(page)).toHaveCount(0);
  expect(await savedStack(page)).toEqual(
    expect.arrayContaining([
      "plan:command-code-goat",
      "plan:cursor-ultra",
      "api:openai",
      "plan:anthropic-claude-max-5x",
      "plan:openai-chatgpt-pro-20x",
    ]),
  );
  await page.reload();
  await expect(page.getByTestId("stack-discovery")).toBeVisible();
  await expect(panel(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Review discovered stack →" }).click();
  await expect(page.getByTestId("discovery-plan-anthropic-claude-max-5x")).toBeChecked();
  await page.getByTestId("discovery-plan-anthropic-claude-pro").click();
  await panel(page).getByRole("button", { name: "Confirm stack" }).click();
  const saved = await savedStack(page);
  expect(saved).toHaveLength(5);
  expect(saved).toContain("plan:anthropic-claude-pro");
  expect(saved).not.toContain("plan:anthropic-claude-max-5x");
  expect(saved).toContain("plan:openai-chatgpt-pro-20x");
  await page.goto("/app/settings");
  await expect(page.getByTestId("settings-plans-summary")).toContainText("Claude Pro");
  await expect(page.getByTestId("settings-plans-summary")).toContainText("ChatGPT Pro 200");
  await expect(page.getByTestId("settings-manual-plans")).not.toHaveAttribute("open", "");
  await page.getByRole("link", { name: "Manage My Stack →" }).click();
  await expect(page.getByRole("heading", { name: "My Stack", exact: true })).toBeVisible();
  await expect(page.getByTestId("stack-target-anthropic-claude-pro")).toBeVisible();
});

test("Not now keeps Workload usable, does not recur through Replay/Compare or reload, and can reopen", async ({
  page,
}) => {
  await scan(page);
  const workload = page.url();
  await panel(page).getByRole("button", { name: "Not now" }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Review discovered stack →" })).toBeFocused();
  expect(await savedStack(page)).toEqual([]);
  for (const path of ["/app/replay", "/app/compare", workload]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(panel(page)).toHaveCount(0);
  }
  await expect(page.getByTestId("stack-discovery")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("stack-discovery")).toBeVisible();
  await expect(panel(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Review discovered stack →" }).click();
  await expect(panel(page)).toBeVisible();
});

for (const answer of ["Not sure", "API / other billing"] as const) {
  test(`${answer} answers persist without creating a plan or provider API target`, async ({
    page,
  }) => {
    await scan(page);
    await panel(page).getByRole("radio", { name: answer, exact: true }).click();
    await panel(page).getByRole("button", { name: "Confirm stack" }).click();
    expect(await savedStack(page)).toEqual([]);
    const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES);
    expect(preferences).not.toContain("plan:");
    expect(preferences).not.toContain("api:");
    await page.reload();
    await expect(page.getByTestId("stack-discovery")).toBeVisible();
    await expect(panel(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Review discovered stack →" }).click();
    await expect(panel(page).getByRole("radio", { name: answer, exact: true })).toBeChecked();
  });
}

test("panel supports keyboard focus, native radio arrows, confirmation and Escape dismissal", async ({
  page,
}) => {
  await scan(page);
  await expect(panel(page).getByRole("heading", { name: "We found your AI stack" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("discovery-plan-anthropic-claude-pro")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("discovery-plan-anthropic-claude-pro")).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("discovery-plan-anthropic-claude-max-5x")).toBeChecked();
  await panel(page).getByRole("button", { name: "Confirm stack" }).focus();
  await page.keyboard.press("Enter");
  expect(await savedStack(page)).toEqual(["plan:anthropic-claude-max-5x"]);
  await page.getByRole("button", { name: "Review discovered stack →" }).click();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Review discovered stack →" })).toBeFocused();
});

test("unresolved models still offer source choices, with no tier selected", async ({ page }) => {
  await scan(page, false, true);
  await expect(panel(page)).toContainText("unresolved model identities");
  await expect(panel(page)).toContainText("Published access:");
  await expect(panel(page)).not.toContainText("Model access unknown");
  await expect(panel(page).locator('input[type="radio"]:checked')).toHaveCount(0);
});

test("OpenCode offers Go choices without assuming a billing relationship; Hermes alone offers none", async ({
  page,
}) => {
  for (const sourceId of ["opencode", "hermes"] as const) {
    const exported = buildDemoExport("moderate");
    exported.detectedSources = [
      {
        adapterId: sourceId,
        name: sourceId === "opencode" ? "OpenCode" : "Hermes",
        role: "usage",
        detected: true,
        supported: true,
      },
    ];
    exported.events = exported.events
      .slice(0, 3)
      .map((event) => ({ ...event, source: { ...event.source, adapterId: sourceId } }));
    await gotoImport(page);
    await page.getByTestId("import-file-input").setInputFiles({
      name: `${sourceId}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    await waitForWorkload(page);
    if (sourceId === "opencode") {
      await expect(panel(page)).toBeVisible();
      await expect(panel(page)).toContainText(
        "ChatGPT sign-in, API keys, other bundles or local models",
      );
      await expect(page.getByTestId("discovery-plan-opencode-go")).not.toBeChecked();
      await panel(page).getByRole("button", { name: "Not now" }).click();
    } else {
      await expect(page.getByTestId("section-projects")).toBeVisible();
      await expect(page.getByTestId("stack-discovery")).toHaveCount(0);
    }
    expect(await savedStack(page)).toEqual([]);
  }
});

test("multiple manual plans and an organization plan are preserved until the family is deliberately edited", async ({
  page,
}) => {
  await gotoImport(page);
  const existing = [
    "plan:anthropic-claude-pro",
    "plan:anthropic-claude-max-5x",
    "plan:openai-chatgpt-business",
  ];
  await page.evaluate(({ key, existing }) => localStorage.setItem(key, JSON.stringify(existing)), {
    key: STACK,
    existing,
  });
  await scan(page, true);
  await expect(
    page
      .getByTestId("discovery-group-claude")
      .getByRole("radio", { name: "Keep my current selections" }),
  ).toBeChecked();
  await expect(
    page
      .getByTestId("discovery-group-chatgpt")
      .getByRole("radio", { name: "Keep my current selections" }),
  ).toBeChecked();
  await page.getByTestId("discovery-plan-command-code-goat").click();
  await panel(page).getByRole("button", { name: "Confirm stack" }).click();
  expect(await savedStack(page)).toEqual([...existing, "plan:command-code-goat"]);
});

test("storage failure keeps editable choices, reports failure and permits skipping", async ({
  page,
}) => {
  await scan(page);
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        key.startsWith("stackreplay.current-stack") ||
        key.startsWith("stackreplay.stack-discovery")
      )
        throw new DOMException("Unavailable", "QuotaExceededError");
      return set.call(this, key, value);
    };
  });
  await page.getByTestId("discovery-plan-anthropic-claude-pro").click();
  await panel(page).getByRole("button", { name: "Confirm stack" }).click();
  await expect(panel(page).getByRole("alert")).toContainText("Could not save");
  await expect(page.getByTestId("discovery-plan-anthropic-claude-pro")).toBeChecked();
  expect(await savedStack(page)).toEqual([]);
  await panel(page).getByRole("button", { name: "Not now" }).click();
  await expect(panel(page)).toHaveCount(0);
  const navigation = page.getByRole("button", { name: "Open navigation" });
  if (await navigation.isVisible()) await navigation.click();
  await page.getByRole("link", { name: "Replay", exact: true }).first().click();
  await expect(page).toHaveURL(/\/app\/replay/u);
});

test("demo discovery never opens or changes real selections or preferences", async ({ page }) => {
  await gotoImport(page);
  await page.evaluate(
    ({ key, preferenceKey }) => {
      localStorage.setItem(key, '["plan:command-code-goat"]');
      localStorage.setItem(
        preferenceKey,
        '{"version":1,"groups":{"claude":{"response":"not-sure"}}}',
      );
    },
    { key: STACK, preferenceKey: PREFERENCES },
  );
  for (const preset of ["moderate", "multistack"] as const) {
    await importDemo(page, preset);
    await expect(page.getByTestId("section-projects")).toBeVisible();
    await expect(page.getByTestId("stack-discovery")).toHaveCount(0);
    expect(await savedStack(page)).toEqual(["plan:command-code-goat"]);
    expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES)).toBe(
      '{"version":1,"groups":{"claude":{"response":"not-sure"}}}',
    );
  }
});

for (const theme of ["dark", "light"] as const) {
  test(`confirmation has no overflow or axe violations in ${theme}`, async ({ page }) => {
    await page.addInitScript((theme) => localStorage.setItem("stackreplay-theme", theme), theme);
    await scan(page, true);
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
    await expect(panel(page)).toBeVisible();
  });
}

test("Max 5x quantity two persists, adds Pro and prices the stack on mobile and desktop", async ({
  page,
}) => {
  await page.setViewportSize({
    width: test.info().project.name === "mobile" ? 390 : 1440,
    height: 1000,
  });
  await scan(page);
  await page.getByTestId("discovery-plan-anthropic-claude-max-5x").check();
  const group = page.getByTestId("discovery-group-claude");
  await group.getByRole("button", { name: "Increase Claude Max 5x quantity", exact: true }).click();
  await expect(group.getByLabel("Claude Max 5x quantity", { exact: true })).toHaveText("2");
  await group.getByRole("button", { name: "I pay for multiple plans", exact: true }).click();
  await page.getByTestId("discovery-plan-anthropic-claude-pro").check();
  await panel(page).getByRole("button", { name: "Confirm stack", exact: true }).click();
  const subscriptions = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("stackreplay.stack-subscriptions.v2") ?? "null")
        .subscriptions,
  );
  expect(
    subscriptions.find((s: { plan: string }) => s.plan === "plan:anthropic-claude-max-5x").quantity,
  ).toBe(2);
  await page.reload();
  await page.getByRole("button", { name: "Review discovered stack →" }).click();
  await group.getByRole("button", { name: "I pay for multiple plans", exact: true }).click();
  await expect(group.getByLabel("Claude Max 5x quantity", { exact: true })).toHaveText("2");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await panel(page).getByRole("button", { name: "Confirm stack", exact: true }).click();
  await page.getByRole("link", { name: "Manage My Stack →", exact: true }).click();
  await expect(page.getByTestId("stack-published-total")).toContainText("$220");
  const importId = new URL(page.url()).searchParams.get("import");
  await page.goto(`/app/compare?import=${encodeURIComponent(importId ?? "")}&decision=stack`);
  await expect(page.getByTestId("compare-price")).toContainText("$220.00/month");
});
