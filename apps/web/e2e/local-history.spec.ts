import { expect, type Page, test } from "@playwright/test";
import { CODEX_ROLLOUT } from "../../../packages/adapters/src/fixtures/content";
import { captureRequests, gotoImport, waitForWorkload } from "./premium-app-helpers";

/**
 * SCAN → RECAP → STATS, end to end in a real browser.
 *
 * The fixtures are the adapters' own recorded session shapes with real catalog
 * model identifiers and distinctive project folders, so the tests can prove
 * both that a project name reaches the local pages and that it never reaches a
 * request.
 */

const PROJECT_MARKER = "zz-private-project-4417";

function codex(
  index: number,
  options: { model: string; project: string; day: string; hour: string },
): string {
  return CODEX_ROLLOUT.replaceAll(
    "22222222-2222-4222-8222-222222222222",
    `2222222${index}-2222-4222-8222-222222222222`,
  )
    .replaceAll('"example-large"', `"${options.model}"`)
    .replaceAll("/home/example/projects/demo-app", `/home/example/code/${options.project}`)
    .replaceAll("2026-09-19T11", `2026-09-${options.day}T${options.hour}`);
}

async function scanFixtures(page: Page, withUnresolved = false): Promise<void> {
  await gotoImport(page);
  // Saved, so a test may reload a page and still find the workload.
  await page.getByLabel("Save this scan in this browser").check();
  const files = [
    {
      name: "rollout-a.jsonl",
      text: codex(1, { model: "gpt-5.6-sol", project: PROJECT_MARKER, day: "18", hour: "20" }),
    },
    {
      name: "rollout-b.jsonl",
      text: codex(2, { model: "gpt-6-sol", project: "orbit-service", day: "19", hour: "14" }),
    },
    {
      name: "rollout-c.jsonl",
      text: codex(3, { model: "gpt-5.6-sol", project: PROJECT_MARKER, day: "21", hour: "21" }),
    },
    ...(withUnresolved
      ? [
          {
            name: "rollout-d.jsonl",
            text: codex(4, {
              model: "gpt-mystery-preview",
              project: "orbit-service",
              day: "21",
              hour: "09",
            }),
          },
        ]
      : []),
  ];
  await page.getByTestId("source-file-input").setInputFiles(
    files.map((file) => ({
      name: file.name,
      mimeType: "application/jsonl",
      buffer: Buffer.from(file.text),
    })),
  );
  await waitForWorkload(page);
}

test("project names stay local through scan, recap and stats", async ({ page }) => {
  const requests = captureRequests(page);
  await scanFixtures(page);
  await expect(page.locator("#section-06")).toContainText(PROJECT_MARKER);
  await page.getByRole("radio", { name: "All time", exact: true }).check();
  await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "all");
  const id = new URL(page.url()).searchParams.get("import");
  await page.goto(`/app/recap?import=${id}`);
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
  expect(JSON.stringify(requests)).not.toContain(PROJECT_MARKER);
  expect(requests.filter((request) => (request.body ?? "").length > 0)).toEqual([]);
  // The shared page never carries a project name either.
  await page.getByTestId("recap-share-create").click();
  await page.getByTestId("recap-share-open").click();
  await expect(page.getByTestId("share-card-v2")).toBeVisible();
  await expect(page.locator("main")).not.toContainText(PROJECT_MARKER);
  expect(decodeURIComponent(page.url())).not.toContain(PROJECT_MARKER);
});

test("a finished scan is saved by default and survives a reload", async ({ page }) => {
  await gotoImport(page);
  await expect(
    page.getByRole("checkbox", { name: "Save this scan in this browser" }),
  ).toBeChecked();
  await expect(page.getByTestId("save-local-note")).toContainText(
    "Raw session files are never copied",
  );
  await page.getByTestId("source-file-input").setInputFiles({
    name: "rollout-a.jsonl",
    mimeType: "application/jsonl",
    buffer: Buffer.from(
      codex(1, { model: "gpt-5.6-sol", project: "atlas", day: "18", hour: "20" }),
    ),
  });
  await waitForWorkload(page);
  await page.reload();
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/recap$/);
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("#section-06")).toBeVisible();
});

test("a partial scan says so beside the totals and offers a rescan", async ({ page }) => {
  await scanFixtures(page);
  const href = page.url();
  // A browser File cannot be made to fail a read on demand, so the stored scan
  // record is given the outcome the intake writes for an unreadable file.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("stackreplay");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const store = db.transaction("imports", "readwrite").objectStore("imports");
    const all = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as Array<Record<string, unknown>>);
      request.onerror = () => reject(request.error);
    });
    const record = all[0] as { intake: { outcomes: unknown[] } };
    record.intake.outcomes.push({
      path: "rollout-live.jsonl",
      status: "unreadable",
      source: "Codex",
      reason:
        "The browser could not read this file to the end (NotReadableError). None of its usage is included in this scan.",
      events: 0,
    });
    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
  await page.goto(href);
  const notice = page.getByTestId("partial-scan");
  await expect(notice).toBeVisible({ timeout: 30_000 });
  await expect(notice).toContainText("Partial scan");
  await expect(notice).toContainText("missing usage is outside these totals");
  await expect(notice).not.toContainText(/malformed|changed/iu);
  await expect(notice.getByRole("link", { name: "Scan again" })).toHaveAttribute(
    "href",
    "/app/scan",
  );
  const id = new URL(href).searchParams.get("import");
  await page.goto(`/app/recap?import=${id}`);
  const briefing = page.getByTestId("recap-ready").getByTestId("partial-scan");
  await expect(briefing).toBeVisible({ timeout: 60_000 });
  await expect(briefing).toContainText("missing usage is outside these totals");
  await page.goto("/app/scan");
  await page.getByTestId("import-details").first().locator(":scope > summary").click();
  await expect(page.getByTestId("intake-file-review")).toContainText("unreadable");
});
