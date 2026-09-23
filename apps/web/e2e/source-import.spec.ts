import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { stackReplayExportV1Schema } from "@stackreplay/schema";
import { strToU8, zipSync } from "fflate";
import {
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
} from "../../../packages/adapters/src/fixtures/content";
import { captureRequests } from "./helpers";

const raw = `${CODEX_ROLLOUT}\n${JSON.stringify({
  type: "response_item",
  payload: {
    role: "user",
    content: "THIS_PROMPT_MUST_NEVER_BE_PERSISTED",
    response: "THIS_RESPONSE_MUST_NEVER_BE_PERSISTED",
  },
})}`;

test("selected source stays local, can be saved, exported and replayed", async ({ page }) => {
  const requests = captureRequests(page);
  await page.goto("/app/replay");
  await expect(page.getByTestId("source-file-input")).toBeVisible();
  await page.getByText("Save normalized workload on this browser").click();
  await page.getByTestId("source-file-input").setInputFiles({
    name: "rollout-fixture.jsonl",
    mimeType: "application/x-ndjson",
    buffer: Buffer.from(raw),
  });
  await expect(page.getByTestId("intake-review")).toContainText("Codex");
  await expect(page.getByTestId("import-summary")).toContainText("2 events");
  expect(JSON.stringify(requests)).not.toContain("THIS_PROMPT_MUST_NEVER_BE_PERSISTED");
  expect(JSON.stringify(requests)).not.toContain("THIS_RESPONSE_MUST_NEVER_BE_PERSISTED");
  const persisted = await page.evaluate(async () => {
    const request = indexedDB.open("stackreplay");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction(["payloads", "imports"], "readonly");
    const payloads = transaction.objectStore("payloads").getAll();
    const records = transaction.objectStore("imports").getAll();
    const read = (entry: IDBRequest<unknown[]>) =>
      new Promise<unknown[]>((resolve, reject) => {
        entry.onsuccess = () => resolve(entry.result);
        entry.onerror = () => reject(entry.error);
      });
    const value = await Promise.all([read(payloads), read(records)]);
    database.close();
    return JSON.stringify(value);
  });
  expect(persisted).not.toContain("THIS_PROMPT_MUST_NEVER_BE_PERSISTED");
  expect(persisted).not.toContain("THIS_RESPONSE_MUST_NEVER_BE_PERSISTED");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export portable workload" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exported = Buffer.concat(chunks).toString("utf8");
  expect(stackReplayExportV1Schema.safeParse(JSON.parse(exported)).success).toBe(true);
  expect(exported).not.toContain("THIS_PROMPT_MUST_NEVER_BE_PERSISTED");
  expect(exported).not.toContain("THIS_RESPONSE_MUST_NEVER_BE_PERSISTED");
  await page.reload();
  await page.goto("/app/import");
  await expect(page.getByTestId("stored-imports")).toContainText("rollout-fixture.jsonl");
  await page.getByTestId("stored-imports").getByRole("link", { name: "Replay" }).click();
  await expect(page.getByTestId("run-replay")).toBeVisible();
});

test("unsupported selected source reports its reason", async ({ page }) => {
  await page.goto("/app/replay");
  await page.getByTestId("source-file-input").setInputFiles({
    name: "unsupported.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"messages":[]}'),
  });
  await expect(page.getByTestId("import-error")).toContainText("No replayable usage found");
  await expect(page.getByTestId("import-error")).toContainText(
    "No supported source structure found",
  );
});

test("selected folder is scanned without implying a whole computer scan", async ({
  page,
}, testInfo) => {
  const directory = testInfo.outputPath("selected-history");
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/rollout.jsonl`, CODEX_ROLLOUT);
  await writeFile(`${directory}/other.json`, '{"messages":[]}');
  await page.goto("/app/replay");
  await page.getByTestId("source-folder-input").setInputFiles(directory);
  await expect(page.getByTestId("intake-review")).toContainText("Codex");
  await expect(page.getByTestId("intake-review")).toContainText(
    "No supported source structure found",
  );
  await expect(page.getByTestId("import-summary")).toContainText("2 events");
});

test("an unsaved source can replay in this session without IndexedDB persistence", async ({
  page,
}) => {
  await page.goto("/app/replay");
  await page.getByTestId("source-file-input").setInputFiles({
    name: "rollout-unsaved.jsonl",
    mimeType: "application/x-ndjson",
    buffer: Buffer.from(CODEX_ROLLOUT),
  });
  await expect(page.getByTestId("import-summary")).toContainText("temporary until reload");
  const payloadCount = await page.evaluate(async () => {
    const request = indexedDB.open("stackreplay");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction("payloads", "readonly");
    const count = transaction.objectStore("payloads").count();
    const result = await new Promise<number>((resolve, reject) => {
      count.onsuccess = () => resolve(count.result);
      count.onerror = () => reject(count.error);
    });
    db.close();
    return result;
  });
  expect(payloadCount).toBe(0);
  await page.getByTestId("continue-to-replay").click();
  await expect(page.getByTestId("workload-strip")).toBeVisible();
});

test("ZIP selection expands supported members and reports unsafe paths", async ({ page }) => {
  const zip = zipSync({
    "history/rollout.jsonl": strToU8(CODEX_ROLLOUT),
    "../escape.jsonl": strToU8(CODEX_ROLLOUT),
  });
  await page.goto("/app/replay");
  await page.getByTestId("source-file-input").setInputFiles({
    name: "history.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zip),
  });
  await expect(page.getByTestId("import-summary")).toContainText("2 events");
  await expect(page.getByTestId("intake-review")).toContainText("Unsafe archive member path");
});

test("corrupt ZIP is a precise failed candidate", async ({ page }) => {
  await page.goto("/app/replay");
  await page.getByTestId("source-file-input").setInputFiles({
    name: "broken.zip",
    mimeType: "application/zip",
    buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0]),
  });
  await expect(page.getByTestId("import-error")).toContainText("No replayable usage found");
  await expect(page.getByTestId("import-error")).toContainText("broken.zip");
});

test("malformed ZIP does not discard valid siblings", async ({ page }) => {
  await page.goto("/app/replay");
  await page.getByTestId("source-file-input").setInputFiles([
    { name: "codex.jsonl", mimeType: "application/x-ndjson", buffer: Buffer.from(CODEX_ROLLOUT) },
    {
      name: "bad.zip",
      mimeType: "application/zip",
      buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0]),
    },
    {
      name: "claude.jsonl",
      mimeType: "application/x-ndjson",
      buffer: Buffer.from(CLAUDE_CODE_SESSION),
    },
  ]);
  await expect(page.getByTestId("intake-review")).toContainText("bad.zip");
  await expect(page.getByTestId("intake-review")).toContainText("Codex");
  await expect(page.getByTestId("intake-review")).toContainText("Claude Code");
  await expect(page.getByTestId("continue-to-replay")).toBeVisible();
});

test("archive hierarchy is absent from both stores and portable export", async ({ page }) => {
  const zip = zipSync({
    "Users/alice/secret-project/internal/customer-data/session.jsonl": strToU8(CODEX_ROLLOUT),
    "home/alice/private-repo/messages.jsonl": strToU8(CLAUDE_CODE_SESSION),
    "Users/alice/private-repo/notes.txt": strToU8("private"),
  });
  await page.goto("/app/replay");
  await page.getByText("Save normalized workload on this browser").click();
  await page
    .getByTestId("source-file-input")
    .setInputFiles({ name: "history.zip", mimeType: "application/zip", buffer: Buffer.from(zip) });
  await expect(page.getByTestId("intake-review")).toContainText("session.jsonl");
  const stored = await page.evaluate(async () => {
    const open = indexedDB.open("stackreplay");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const tx = db.transaction(["imports", "payloads"], "readonly");
    const read = (store: string) =>
      new Promise<unknown[]>((resolve, reject) => {
        const request = tx.objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const rows = await Promise.all([read("imports"), read("payloads")]);
    db.close();
    return JSON.stringify(rows);
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export portable workload" }).click();
  const stream = await (await downloadPromise).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const portable = Buffer.concat(chunks).toString("utf8");
  for (const text of [stored, portable]) {
    expect(text).not.toContain("secret-project");
    expect(text).not.toContain("private-repo");
    expect(text).not.toContain("Users/alice");
    expect(text).not.toContain("/home/alice");
  }
});

test("CLI compatible V1 named usage.json imports and replays", async ({ page }) => {
  await page.goto("/app/replay");
  await page.getByTestId("source-file-input").setInputFiles({
    name: "source.jsonl",
    mimeType: "application/x-ndjson",
    buffer: Buffer.from(CODEX_ROLLOUT),
  });
  await expect(page.getByTestId("import-summary")).toContainText("2 events");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export portable workload" }).click();
  const stream = await (await downloadPromise).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const portable = Buffer.concat(chunks);
  expect(stackReplayExportV1Schema.safeParse(JSON.parse(portable.toString("utf8"))).success).toBe(
    true,
  );
  await page.getByText("Save normalized workload on this browser").click();
  await page
    .getByTestId("source-file-input")
    .setInputFiles({ name: "usage.json", mimeType: "application/json", buffer: portable });
  await expect(page.getByTestId("import-summary")).toContainText("2 events");
  await expect(page.getByTestId("import-summary")).toContainText("saved on this browser");
  await page.reload();
  await page.goto("/app/import");
  await expect(page.getByTestId("stored-imports")).toContainText("usage.json");
  await page.getByTestId("stored-imports").getByRole("link", { name: "Replay" }).click();
  await expect(page.getByTestId("run-replay")).toBeVisible();
});

test("future portable version gets a version error through source selection", async ({ page }) => {
  await page.goto("/app/replay");
  await page.getByTestId("source-file-input").setInputFiles({
    name: "usage.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "stackreplay", version: 99, events: [] })),
  });
  await expect(page.getByTestId("import-error")).toContainText("version 99 is newer");
});
