import { expect, test } from "@playwright/test";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { ensureLargeExport } from "./fixtures/large-export";
import { gotoImport, importDemo } from "./helpers";

/**
 * Import route states (M3 brief): empty, drag-over, importing, invalid file,
 * valid file, large import.
 */

test("empty import surface states the privacy contract up front", async ({ page }) => {
  await gotoImport(page);
  const boundary = page.getByTestId("privacy-boundary");
  await expect(
    boundary.getByText("Scanned locally. Nothing in your AI history is uploaded."),
  ).toBeVisible();
  await expect(boundary).toContainText("It discards prompts, responses, code, command output");
  await expect(boundary).toContainText("Site assets and public catalog facts only.");
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();
  await expect(page.getByTestId("demo-presets")).toBeVisible();
});

test("dropzone reacts to a drag over it", async ({ page }) => {
  await gotoImport(page);
  const dropzone = page.getByTestId("import-dropzone");
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await dropzone.dispatchEvent("dragover", { dataTransfer });
  await expect(dropzone).toHaveAttribute("data-drag-active", "true");
  await dropzone.dispatchEvent("dragleave", { dataTransfer });
  await expect(dropzone).toHaveAttribute("data-drag-active", "false");
});

test("imports a demo workload and reports usage sources and orchestration separately", async ({
  page,
}) => {
  await importDemo(page, "moderate");

  const sources = page.getByTestId("usage-sources");
  await expect(sources).toContainText("Claude Code");
  await expect(sources).toContainText("Codex");
  // T3 Code is a control surface: it must never appear as a zero-event usage source.
  await expect(sources).not.toContainText("T3 Code");

  const orchestration = page.getByTestId("orchestration");
  await expect(orchestration).toContainText("T3 Code");
  await expect(orchestration).toContainText(/sessions attributed|attribution available/);
  await expect(page.getByTestId("import-summary")).not.toContainText("T3 Code\n0 events");
});

test("rejects a file that is not a StackReplay export without quoting it", async ({ page }) => {
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ hello: "SECRET-CONTENT-MARKER" })),
  });
  const error = page.getByTestId("import-error");
  await expect(error).toBeVisible();
  await expect(error).toContainText("not a valid StackReplay export");
  await expect(error).not.toContainText("SECRET-CONTENT-MARKER");
});

test("rejects malformed JSON", async ({ page }) => {
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "broken.stackreplay.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ not json at all"),
  });
  await expect(page.getByTestId("import-error")).toContainText("not valid JSON");
});

test("rejects a newer export version with a version-specific message", async ({ page }) => {
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "future.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "stackreplay", version: 2, events: [] })),
  });
  await expect(page.getByTestId("import-error")).toContainText("version 2 is newer");
});

test("accepts a valid export with an unexpected filename", async ({ page }) => {
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "usage-export-copy.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(JSON.stringify(buildDemoExport("moderate"))),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 30_000 });
});

test("imports a ~100k-event export without blocking the interface", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "large import measured on desktop only");
  test.setTimeout(180_000);

  const { path, events, bytes } = await ensureLargeExport();
  const sizeMb = (bytes / (1024 * 1024)).toFixed(1);

  await gotoImport(page);
  const started = Date.now();
  await page.getByTestId("import-file-input").setInputFiles(path);

  // The interface must stay responsive while the Worker works: this click
  // happens while the import is in flight.
  await page.getByTestId("demo-moderate").click({ timeout: 15_000 });

  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 150_000 });
  const elapsed = Date.now() - started;

  const summary = page.getByTestId("import-summary");
  await expect(summary).toContainText("Events");

  // The large import is superseded by the demo import; the visible summary must
  // be the newest request, never the stale one.
  const eventsText = await summary.textContent();
  expect(eventsText).not.toContain(events.toLocaleString("en-US"));
  // A superseded import is cancelled on purpose: it must not report a failure
  // and it must not leave the interface stuck in a working state.
  await expect(page.getByTestId("import-error")).toHaveCount(0);
  await expect(page.getByTestId("import-working")).toHaveCount(0);

  console.log(
    `[large-import] file ${sizeMb} MB, ${events.toLocaleString("en-US")} events, wall time ${elapsed} ms (superseded by a demo import mid-flight)`,
  );
  testInfo.attach("large-import.json", {
    body: JSON.stringify({ events, bytes, sizeMb, elapsedMs: elapsed }),
    contentType: "application/json",
  });
});
