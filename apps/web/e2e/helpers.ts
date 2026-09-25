import { expect, type Page } from "@playwright/test";

/** Shared E2E helpers for the M3 browser-local surfaces. */

export const DEMO_PRESETS = ["moderate", "heavy", "multistack"] as const;
export type DemoPreset = (typeof DEMO_PRESETS)[number];

export async function gotoImport(page: Page): Promise<void> {
  await page.goto("/app/import");
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

/** Waits until the Replay route's embedded intake can accept the first action. */
export async function gotoReplayImport(page: Page): Promise<void> {
  await page.goto("/app/replay");
  await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
}

/** Imports a deterministic demo workload and waits for the summary. */
export async function importDemo(page: Page, preset: DemoPreset): Promise<void> {
  await gotoImport(page);
  await page.getByTestId(`demo-${preset}`).click();
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 30_000 });
}

/** Runs a replay for a plan and waits for the result. */
export async function runReplay(
  page: Page,
  planId: string,
  rulesAsOf = "2026-09-15",
): Promise<void> {
  await setRulesAsOf(page, rulesAsOf);
  await page.getByTestId(`plan-${planId}`).click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
  await openReplayDetails(page);
}

/** The rules date lives under Advanced: a sensible default, overridden on purpose. */
export async function setRulesAsOf(page: Page, rulesAsOf: string): Promise<void> {
  await page.getByTestId("replay-advanced").evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await page.getByTestId("rules-as-of").fill(rulesAsOf);
}

/** Opens the native evidence disclosures for tests that inspect forensic rows. */
export async function openReplayDetails(page: Page): Promise<void> {
  // Most replay cases inspect forensic rows. Open the two native disclosures
  // without moving the viewport so those assertions exercise their content.
  await page.getByTestId("replay-evidence-details").evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await page.getByTestId("replay-detail").evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
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

/**
 * Creates a short share link from the visible share panel. Returns the short
 * id, the URL shown, and the aggregate token the browser uploaded (read from
 * the request itself, so a test sees exactly what left the page).
 */
export async function createShareLink(
  page: Page,
): Promise<{ id: string; token: string; url: string; body: unknown }> {
  const panel = page.getByTestId("share-panel");
  const upload = page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === "/api/share",
  );
  await panel.getByTestId("share-create").click();
  const body = (await upload).postDataJSON() as { token?: unknown };
  await expect(panel.getByTestId("share-open")).toBeVisible();
  const url = ((await panel.getByTestId("share-url").textContent()) ?? "").trim();
  return {
    id: url.split("/s/")[1] ?? "",
    token: typeof body.token === "string" ? body.token : "",
    url,
    body,
  };
}

/** Creates a share link and returns the aggregate token it stores (a self-contained link path). */
export async function createShareToken(page: Page): Promise<string> {
  return (await createShareLink(page)).token;
}
