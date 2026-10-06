import { expect, type Page } from "@playwright/test";

/** Shared E2E helpers for the M3 browser-local surfaces. */

export const DEMO_PRESETS = ["moderate", "heavy", "multistack"] as const;
export type DemoPreset = (typeof DEMO_PRESETS)[number];

export async function gotoImport(page: Page): Promise<void> {
  page.on("pageerror", (error) => console.error("Browser page error:", error.stack));
  page.on("console", (message) => {
    if (message.type() === "error") console.error("Browser console error:", message.text());
  });
  await page.goto("/app/scan");
  await page.getByText("Use files or an export instead", { exact: true }).click();
  await page.getByText("Try a sample recap", { exact: true }).click();
  await expect(page.getByTestId("import-dropzone")).toBeVisible();
  await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
}

/**
 * Opens the per-source folder chooser cards. On a device that cannot drag a
 * folder they are already the primary intake; elsewhere they sit behind
 * Connect individually.
 */
export async function openConnectIndividually(page: Page): Promise<void> {
  const card = page.getByTestId("connect-claude-code");
  if (await card.isVisible()) return;
  if (!(await page.getByTestId("connect-individually").first().isVisible()))
    await page.getByTestId("find-histories").click();
  await page.getByTestId("connect-individually").first().click();
  await expect(card).toBeVisible();
}

/**
 * Drops real folders on the discovery machine through Chromium's own drag
 * path, so the page receives the same directory entries a person's drag gives
 * it. Playwright has no folder drag of its own; the DevTools protocol does.
 */
export async function dropFolders(page: Page, paths: string[]): Promise<void> {
  const target = page.getByTestId("discovery-machine");
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box === null) throw new Error("discovery machine is not visible");
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + Math.min(box.height / 2, 24));
  const cdp = await page.context().newCDPSession(page);
  const data = { items: [], files: paths, dragOperationsMask: 1 };
  await cdp.send("Input.dispatchDragEvent", { type: "dragEnter", x, y, data });
  await cdp.send("Input.dispatchDragEvent", { type: "dragOver", x, y, data });
  await cdp.send("Input.dispatchDragEvent", { type: "drop", x, y, data });
  await cdp.detach();
}

/** Imports a deterministic demo workload and follows the automatic handoff. */
export async function importDemo(page: Page, preset: DemoPreset): Promise<void> {
  await gotoImport(page);
  await page.getByTestId(`demo-${preset}`).click();
  await waitForWorkload(page);
}

/** Follows the automatic recap handoff to the legacy workload assertions. */
export async function waitForWorkload(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/app\/(?:recap|stats)\?import=/u, { timeout: 60_000 });
  // Historical fixtures can fall outside the default period. The overview is continuous.
  const all = page.getByRole("radio", { name: "All time", exact: true });
  await all
    .or(page.getByRole("button", { name: "ALL", exact: true }))
    .first()
    .click();
  await expect(page).toHaveURL(/\/app\/recap\?import=/u);
  await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "all", {
    timeout: 60_000,
  });
}

/** Client navigation preserves intentionally temporary workloads in the worker. */
export async function visitImportManager(page: Page): Promise<void> {
  await page
    .locator('a[href="/app/scan"]')
    .first()
    .evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
}

export async function inspectLatestImport(page: Page): Promise<void> {
  await waitForWorkload(page);
  await visitImportManager(page);
  await page.getByTestId("import-details").first().locator(":scope > summary").click();
}

export interface CapturedRequest {
  method: string;
  url: string;
  body: string | null;
  headers: Record<string, string>;
}

/** Records every request with its body and headers, so a privacy test can inspect them. */
export function captureRequests(page: Page): CapturedRequest[] {
  const captured: CapturedRequest[] = [];
  page.on("request", (request) => {
    let body: string | null = null;
    try {
      body = request.postData();
    } catch {
      body = null;
    }
    captured.push({
      method: request.method(),
      url: request.url(),
      body,
      headers: request.headers(),
    });
  });
  return captured;
}

/** Strings that must never appear in a request body. */
export const PRIVATE_MARKERS = [
  "ev_demo_",
  "ne_demo_",
  "ns_demo_",
  "ph_demo_",
  "stackreplay-worker",
];

/**
 * The subset that identifies workload content rather than the app's own
 * assets. Only these can be looked for in URLs and headers: the app's asset
 * path legitimately contains "stackreplay-worker".
 */
export const WORKLOAD_MARKERS = ["ev_demo_", "ne_demo_", "ns_demo_", "ph_demo_"];

export async function expectNoConsoleErrors(page: Page, run: () => Promise<void>): Promise<void> {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await run();
  expect(errors).toEqual([]);
}
