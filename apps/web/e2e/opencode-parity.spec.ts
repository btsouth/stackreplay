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
  test(`OpenCode ${archive ? "ZIP" : "database + WAL"} reaches Stats as its own tool, saves no plan, and reloads`, async ({
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
    await page.getByRole("tab", { name: "Tools" }).click();
    await expect(page.getByRole("table", { name: "Tools in this period" })).toContainText(
      "OpenCode",
    );
    await page.reload();
    await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
    // Nothing is assumed about what the person pays.
    expect(await page.evaluate(() => localStorage.getItem("stackreplay.current-stack"))).toBeNull();
    expect(
      await page.evaluate(() => localStorage.getItem("stackreplay.stack-subscriptions.v2")),
    ).toBeNull();
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

test("OpenCode and Command Code appear as independent tools in Stats", async ({ page }, info) => {
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
  await page.getByRole("tab", { name: "Tools" }).click();
  const tools = page.getByRole("table", { name: "Tools in this period" });
  await expect(tools).toContainText("OpenCode");
  await expect(tools).toContainText("Command Code");
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
  await expect(page.getByTestId("recap-ready")).toBeVisible();
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
