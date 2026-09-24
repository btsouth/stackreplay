import { mkdir, symlink, writeFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import { stackReplayExportV1Schema } from "@stackreplay/schema";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { strToU8, zipSync } from "fflate";
import {
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
} from "../../../packages/adapters/src/fixtures/content";
import { captureRequests, gotoReplayImport, openConnectIndividually } from "./helpers";

const raw = `${CODEX_ROLLOUT}\n${JSON.stringify({
  type: "response_item",
  payload: {
    role: "user",
    content: "THIS_PROMPT_MUST_NEVER_BE_PERSISTED",
    response: "THIS_RESPONSE_MUST_NEVER_BE_PERSISTED",
  },
})}`;

/** Clicks a source card and answers the folder chooser it opens. */
async function chooseFromCard(page: Page, kind: string, folder: string): Promise<void> {
  await openConnectIndividually(page);
  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId(`connect-${kind}`).click();
  await (await chooser).setFiles(folder);
}

test("Connect Claude Code scans a chosen history tree and reports unrelated files", async ({
  page,
}, testInfo) => {
  const projects = testInfo.outputPath("projects");
  await mkdir(`${projects}/project-a`, { recursive: true });
  await writeFile(`${projects}/project-a/session.jsonl`, CLAUDE_CODE_SESSION);
  await writeFile(`${projects}/project-a/README.md`, "not a session");
  await gotoReplayImport(page);
  await chooseFromCard(page, "claude-code", projects);
  await expect(page.getByTestId("import-summary")).toContainText("Workload ready");
  await expect(page.getByTestId("detected-sources")).toContainText("Claude Code");
  await expect(page.getByTestId("intake-review")).toContainText("README.md");
  await expect(page.getByTestId("continue-to-replay")).toBeVisible();
  await expect(page.getByTestId("import-summary")).toBeInViewport({ ratio: 0.1 });
});

test("Claude Code card reads a symlinked history folder without the directory-access picker", async ({
  page,
}, testInfo) => {
  // Chromium's directory-access picker treats a symlink as missing. The card
  // must not depend on it, so it fails loudly here if anything calls it.
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: async () => {
        throw new DOMException("Symlinked directory treated as missing", "NotFoundError");
      },
    });
  });
  const target = testInfo.outputPath("claude-data/projects");
  const link = testInfo.outputPath("linked-projects");
  await mkdir(`${target}/project-a`, { recursive: true });
  await writeFile(`${target}/project-a/session.jsonl`, CLAUDE_CODE_SESSION);
  await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
  const requests = captureRequests(page);
  await gotoReplayImport(page);
  await chooseFromCard(page, "claude-code", link);
  await expect(page.getByTestId("import-summary")).toContainText("Workload ready");
  await expect(page.getByTestId("detected-sources")).toContainText("Claude Code");
  await expect(page.getByTestId("import-error")).toHaveCount(0);
  expect(requests.filter((request) => request.body !== null && request.body.length > 0)).toEqual(
    [],
  );
});

test("Claude assistant content blocks count usage once in the browser import", async ({ page }) => {
  const base = {
    type: "assistant",
    sessionId: "11111111-1111-4111-8111-111111111111",
    timestamp: "2026-09-19T10:05:00.000Z",
    requestId: "req-one",
  };
  const row = (uuid: string, output: number, stop: string | null) =>
    JSON.stringify({
      ...base,
      uuid,
      message: {
        id: "msg-one",
        model: "claude-sonnet-4-6",
        stop_reason: stop,
        usage: {
          input_tokens: 2,
          output_tokens: output,
          cache_read_input_tokens: 100,
          cache_creation_input_tokens: 3,
        },
      },
    });
  await gotoReplayImport(page);
  await page.getByTestId("source-file-input").setInputFiles([
    {
      name: "claude-session.jsonl",
      mimeType: "application/x-ndjson",
      buffer: Buffer.from([row("row-a", 1, null), row("row-b", 5, "end_turn")].join("\n")),
    },
    {
      name: "copied-session.jsonl",
      mimeType: "application/x-ndjson",
      buffer: Buffer.from(
        row("row-c", 5, "end_turn").replace(
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ),
      ),
    },
  ]);
  await expect(page.getByTestId("import-summary")).toContainText("1 event");
  await expect(page.getByTestId("import-summary")).toContainText("Exact known tokens: 110");
  await expect(page.getByTestId("import-summary")).toContainText(
    "Reused context read from cache: 100",
  );
  await expect(page.getByTestId("intake-review")).toContainText("RECORD_DUPLICATE");
});

test("repeated filenames from separate projects stay readable without duplicate React keys", async ({
  page,
}, testInfo) => {
  const projects = testInfo.outputPath("projects");
  for (const name of ["one", "two"]) {
    await mkdir(`${projects}/${name}`, { recursive: true });
    await writeFile(`${projects}/${name}/session.jsonl`, CLAUDE_CODE_SESSION);
    await writeFile(`${projects}/${name}/custom-title.json`, JSON.stringify({ project: name }));
  }
  const keyErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("same key"))
      keyErrors.push(message.text());
  });
  await gotoReplayImport(page);
  await chooseFromCard(page, "claude-code", projects);
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await expect(page.getByTestId("intake-review")).toContainText("2 matching files");
  expect(keyErrors).toEqual([]);
});

test("Connect Codex scans dated rollout folders and keeps a malformed sibling visible", async ({
  page,
}, testInfo) => {
  const sessions = testInfo.outputPath("sessions");
  await mkdir(`${sessions}/2026/09/23`, { recursive: true });
  await mkdir(`${sessions}/2026/09/22`, { recursive: true });
  await writeFile(`${sessions}/2026/09/23/rollout-valid.jsonl`, CODEX_ROLLOUT);
  await writeFile(`${sessions}/2026/09/22/rollout-bad.jsonl`, "{broken jsonl");
  await gotoReplayImport(page);
  await chooseFromCard(page, "codex", sessions);
  await expect(page.getByTestId("detected-sources")).toContainText("Codex");
  await expect(page.getByTestId("intake-review")).toContainText("rollout-bad.jsonl");
  await expect(page.getByTestId("continue-to-replay")).toBeVisible();
});

test("folder intake sends no raw session content to application endpoints", async ({
  page,
}, testInfo) => {
  const marker = "PRIVATE_FOLDER_PROMPT_MUST_STAY_LOCAL_987";
  const sessions = testInfo.outputPath("sessions");
  await mkdir(sessions, { recursive: true });
  await writeFile(
    `${sessions}/rollout-private.jsonl`,
    `${CODEX_ROLLOUT}\n${JSON.stringify({ type: "response_item", payload: { role: "user", content: marker } })}`,
  );
  const requests = captureRequests(page);
  await gotoReplayImport(page);
  await chooseFromCard(page, "codex", sessions);
  await expect(page.getByTestId("intake-review")).toBeVisible();
  expect(requests.filter((request) => request.body !== null && request.body.length > 0)).toEqual(
    [],
  );
  expect(JSON.stringify(requests)).not.toContain(marker);
  expect(
    requests.filter((request) => /\/api\/(import|upload|events|usage)/u.test(request.url)),
  ).toEqual([]);
});

test("selected source stays local, can be saved, exported and replayed", async ({ page }) => {
  const requests = captureRequests(page);
  await gotoReplayImport(page);
  await expect(page.getByTestId("source-file-input")).toBeVisible();
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page.getByTestId("source-file-input").setInputFiles({
    name: "rollout-fixture.jsonl",
    mimeType: "application/x-ndjson",
    buffer: Buffer.from(raw),
  });
  await expect(page.getByTestId("import-dropzone")).toContainText("rollout-fixture.jsonl");
  await expect(page.getByTestId("intake-review")).toContainText("Codex");
  await expect(page.getByTestId("import-summary")).toContainText("2 events");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
  await page
    .getByTestId("stored-imports")
    .getByRole("link", { name: /^Replay /u })
    .click();
  await expect(page.getByTestId("run-replay")).toBeVisible();
});

test("custom file controls retain native labels and mobile saved actions reflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoReplayImport(page);
  for (const [name, testId] of [
    ["Source files or ZIP", "source-file-input"],
    ["StackReplay workload", "import-file-input"],
  ] as const) {
    const input = page.getByTestId(testId);
    await expect(input).toHaveAccessibleName(name);
    await expect(input).toBeVisible();
    expect(await input.getAttribute("type")).toBe("file");
    const box = await input.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page.getByTestId("source-file-input").setInputFiles({
    name: "a-very-long-rollout-fixture-name-that-must-remain-readable.jsonl",
    mimeType: "application/x-ndjson",
    buffer: Buffer.from(CODEX_ROLLOUT),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible();
  const row = page.getByTestId("stored-imports").locator("li").first();
  await expect(row).toContainText(
    "a-very-long-rollout-fixture-name-that-must-remain-readable.jsonl",
  );
  const actions = row.getByTestId("stored-import-actions");
  await expect(actions).toHaveCSS("display", "grid");
  for (const name of ["Replay", "Delete", "Export"]) {
    const control = actions.getByRole(name === "Replay" ? "link" : "button", {
      name: `${name} a-very-long-rollout-fixture-name-that-must-remain-readable.jsonl`,
    });
    await expect(control).toBeVisible();
    expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("portable workload picker accepts the same file twice", async ({ page }) => {
  await gotoReplayImport(page);
  const input = page.getByTestId("import-file-input");
  const file = {
    name: "repeat.stackreplay.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(buildDemoExport("moderate"))),
  };
  await input.setInputFiles(file);
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await expect(input).toHaveValue("");
  await expect(page.getByTestId("import-dropzone")).toContainText(file.name);
  const firstId = new URL(
    (await page.getByTestId("continue-to-replay").getAttribute("href")) ?? "",
    "http://localhost",
  ).searchParams.get("import");
  await input.setInputFiles(file);
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await expect(input).toHaveValue("");
  await expect(page.getByTestId("import-dropzone")).toContainText(file.name);
  await expect
    .poll(async () =>
      new URL(
        (await page.getByTestId("continue-to-replay").getAttribute("href")) ?? "",
        "http://localhost",
      ).searchParams.get("import"),
    )
    .not.toBe(firstId);
});

test("unsupported selected source reports its reason", async ({ page }) => {
  await gotoReplayImport(page);
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
  await gotoReplayImport(page);
  await chooseFromCard(page, "folder", directory);
  await expect(page.getByTestId("intake-review")).toContainText("Codex");
  await expect(page.getByTestId("intake-review")).toContainText(
    "No supported source structure found",
  );
  await expect(page.getByTestId("import-summary")).toContainText("2 events");
});

test("an unsaved source can replay in this session without IndexedDB persistence", async ({
  page,
}) => {
  await gotoReplayImport(page);
  // Saving is the default; this case opts out explicitly.
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).uncheck();
  await page.getByTestId("source-file-input").setInputFiles({
    name: "rollout-unsaved.jsonl",
    mimeType: "application/x-ndjson",
    buffer: Buffer.from(CODEX_ROLLOUT),
  });
  await expect(page.getByTestId("import-summary")).toContainText(
    "scan results available until reload",
  );
  await expect(page.getByTestId("not-saved-notice")).toContainText("You chose not to save");
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
  await gotoReplayImport(page);
  await page.getByTestId("source-file-input").setInputFiles({
    name: "history.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zip),
  });
  await expect(page.getByTestId("import-summary")).toContainText("2 events");
  await expect(page.getByTestId("intake-review")).toContainText("Unsafe archive member path");
});

test("corrupt ZIP is a precise failed candidate", async ({ page }) => {
  await gotoReplayImport(page);
  await page.getByTestId("source-file-input").setInputFiles({
    name: "broken.zip",
    mimeType: "application/zip",
    buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0]),
  });
  await expect(page.getByTestId("import-error")).toContainText("No replayable usage found");
  await expect(page.getByTestId("import-error")).toContainText("broken.zip");
});

test("malformed ZIP does not discard valid siblings", async ({ page }) => {
  await gotoReplayImport(page);
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
  await gotoReplayImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
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
  await gotoReplayImport(page);
  // Only the portable import is stored in this case; the source scan opts out.
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).uncheck();
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
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page
    .getByTestId("source-file-input")
    .setInputFiles({ name: "usage.json", mimeType: "application/json", buffer: portable });
  await expect(page.getByTestId("import-summary")).toContainText("2 events");
  await expect(page.getByTestId("import-summary")).toContainText("saved on this browser");
  await page.reload();
  await page.goto("/app/import");
  await expect(page.getByTestId("stored-imports")).toContainText("usage.json");
  await page
    .getByTestId("stored-imports")
    .getByRole("link", { name: /^Replay /u })
    .click();
  await expect(page.getByTestId("run-replay")).toBeVisible();
});

test("future portable version gets a version error through source selection", async ({ page }) => {
  await gotoReplayImport(page);
  await page.getByTestId("source-file-input").setInputFiles({
    name: "usage.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "stackreplay", version: 99, events: [] })),
  });
  await expect(page.getByTestId("import-error")).toContainText("version 99 is newer");
});
