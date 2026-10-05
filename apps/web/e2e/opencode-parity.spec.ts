import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import AxeBuilder from "@axe-core/playwright";
import { expect, type TestInfo, test } from "@playwright/test";
import { zipSync } from "fflate";
import {
  COMMAND_CODE_SESSION,
  OPENCODE_FIXTURE_SQL,
} from "../../../packages/adapters/src/fixtures/content";
import {
  captureRequests,
  gotoImport,
  openConnectIndividually,
  openReplayDetails,
  setRulesAsOf,
  visitReplay,
  waitForWorkload,
} from "./premium-app-helpers";

async function history(info: TestInfo) {
  const root = info.outputPath("opencode");
  await mkdir(root, { recursive: true });
  const path = join(root, "opencode.db");
  const db = new DatabaseSync(path);
  try {
    db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;");
    for (const sql of OPENCODE_FIXTURE_SQL)
      db.exec(
        sql
          .replaceAll("example-medium", "gpt-6.1-sol")
          .replaceAll("example-small", "gpt-6.1-sol")
          .replaceAll("example-provider", "openai"),
      );
    db.exec(
      "CREATE TABLE part (text); INSERT INTO part VALUES ('OPENCODE_PRIVATE_PROMPT'); CREATE TABLE credential (secret); INSERT INTO credential VALUES ('OPENCODE_PRIVATE_KEY');",
    );
    return { bytes: await readFile(path), wal: await readFile(`${path}-wal`), root };
  } finally {
    db.close();
  }
}

for (const archive of [false, true]) {
  test(`OpenCode ${archive ? "ZIP" : "database + WAL"} reaches Workload, confirms explicitly, reloads and replays`, async ({
    page,
  }, info) => {
    const { bytes, wal } = await history(info);
    const requests = captureRequests(page);
    await gotoImport(page);
    await page.getByTestId("source-file-input").setInputFiles(
      archive
        ? {
            name: "opencode.zip",
            mimeType: "application/zip",
            buffer: Buffer.from(
              zipSync({ "history/opencode.db": bytes, "history/opencode.db-wal": wal }),
            ),
          }
        : [
            { name: "opencode.db", mimeType: "application/octet-stream", buffer: bytes },
            { name: "opencode.db-wal", mimeType: "application/octet-stream", buffer: wal },
          ],
    );
    await waitForWorkload(page);
    await expect(page.getByTestId("discovery-group-opencode")).toContainText("OpenCode activity");
    await expect(page.getByTestId("discovery-group-opencode")).toContainText("2 calls");
    await expect(page.getByTestId("discovery-plan-opencode-go")).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem("stackreplay.current-stack"))).toBeNull();
    await page.getByTestId("discovery-plan-opencode-go").click();
    await page.getByRole("button", { name: "Confirm stack", exact: true }).click();
    await page.reload();
    await waitForWorkload(page);
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("stackreplay.current-stack") ?? "[]"),
      ),
    ).toEqual(["plan:opencode-go"]);
    await visitReplay(page);
    await expect(page.getByTestId("plan-opencode-go")).toBeVisible();
    await expect(page.getByTestId("plan-command-code-goat")).toBeVisible();
    await page.getByTestId("plan-command-code-goat").click();
    await expect(page.getByTestId("plan-replay-unavailable")).toContainText(
      "Capacity Replay is unavailable",
    );
    await expect(page.getByTestId("run-replay")).toBeDisabled();
    await page.getByTestId("plan-command-code-goat").press("Enter");
    await expect(page.getByTestId("replay-error")).toHaveCount(0);
    await expect(page.getByTestId("translation-required")).toHaveCount(0);
    await setRulesAsOf(page, "2026-09-29");
    await page.getByTestId("target-kind-api").click();
    await page.getByTestId("provider-openai").click();
    await page.getByTestId("run-replay").click();
    await expect(page.getByTestId("replay-result")).toBeVisible();
    await openReplayDetails(page);
    await expect(page.getByTestId("unserved-models")).toHaveCount(0);
    await page.goto("/app/settings");
    await expect(page.getByTestId("settings-plans-summary")).toHaveText("OpenCode Go");
    expect(JSON.stringify(requests)).not.toMatch(
      /OPENCODE_PRIVATE_PROMPT|OPENCODE_PRIVATE_KEY|ses_alpha|msg_alpha/u,
    );
    expect(
      requests.filter(
        ({ url }) => !url.startsWith(info.project.use.baseURL ?? "http://localhost:3100"),
      ),
    ).toEqual([]);
  });
}

test("OpenCode and Command Code share stack, settings and Compare behavior with independent families", async ({
  page,
}, info) => {
  const { bytes, wal } = await history(info);
  await gotoImport(page);
  await page.getByTestId("source-file-input").setInputFiles([
    { name: "opencode.db", mimeType: "application/octet-stream", buffer: bytes },
    { name: "opencode.db-wal", mimeType: "application/octet-stream", buffer: wal },
    {
      name: "command.jsonl",
      mimeType: "application/jsonl",
      buffer: Buffer.from(
        COMMAND_CODE_SESSION.replaceAll("example-medium", "gpt-6.1-sol").replaceAll(
          "example-small",
          "gpt-6.1-sol",
        ),
      ),
    },
  ]);
  await waitForWorkload(page);
  await page.getByTestId("discovery-plan-opencode-go-plus").click();
  await page.getByTestId("discovery-plan-command-code-goat").click();
  await page.getByRole("button", { name: "Confirm stack", exact: true }).click();
  await page.goto("/app/settings");
  await expect(page.getByTestId("settings-plans-summary")).toContainText("OpenCode Go Plus");
  await expect(page.getByTestId("settings-plans-summary")).toContainText("Command Code GOAT");
  await page.goto("/app/plans?section=compare&view=billing");
  await page.getByTestId("legacy-compare").evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await page.getByTestId("compare-decision-stack").click();
  await expect(page.getByTestId("stack-comparison")).toContainText("OpenCode Go Plus");
  await expect(page.getByTestId("stack-comparison")).toContainText("Command Code GOAT");
  await expect(page.getByTestId("compare-price")).toContainText("$50.00/month");
  await page.evaluate(() => {
    const stack = JSON.parse(localStorage.getItem("stackreplay.current-stack") ?? "[]");
    localStorage.setItem(
      "stackreplay.current-stack",
      JSON.stringify([
        ...stack,
        "plan:anthropic-claude-pro",
        "plan:openai-chatgpt-plus",
        "plan:cursor-pro",
      ]),
    );
    window.dispatchEvent(new Event("stackreplay-current-stack"));
  });
  await page.getByTestId("stack-plan-picker").evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await page.getByTestId("stack-plan-opencode-go").check();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("stackreplay.current-stack") ?? "[]"),
    ),
  ).toHaveLength(6);
});

test("individual OpenCode and Command Code connection controls remain accessible on mobile and desktop", async ({
  page,
}, info) => {
  const { root } = await history(info);
  await gotoImport(page);
  await openConnectIndividually(page);
  await expect(page.getByTestId("connect-command-code")).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("connect-opencode").click();
  await (await chooser).setFiles(root);
  await waitForWorkload(page);
  await expect(page.getByTestId("discovery-group-opencode")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("malformed OpenCode database reports a recoverable import error", async ({ page }) => {
  await gotoImport(page);
  await page.getByTestId("source-file-input").setInputFiles({
    name: "opencode.db",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("not a database"),
  });
  await expect(page.getByRole("alert").first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("stackreplay.current-stack"))).toBeNull();
});
