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

/** Imports a deterministic demo workload and follows the automatic handoff. */
export async function importDemo(page: Page, preset: DemoPreset): Promise<void> {
  await gotoImport(page);
  await page.getByTestId(`demo-${preset}`).click();
  await waitForWorkload(page);
}

/** A successful scan requires no follow-up click. */
export async function waitForWorkload(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/app\/workload\?import=/u, { timeout: 60_000 });
  await expect(page.getByTestId("automatic-workload")).toBeVisible({ timeout: 60_000 });
}

/** Client navigation preserves intentionally temporary workloads in the worker. */
export async function visitImportManager(page: Page): Promise<void> {
  await page
    .locator('a[href="/app/import"]')
    .first()
    .evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
}

export async function inspectLatestImport(page: Page): Promise<void> {
  await waitForWorkload(page);
  await visitImportManager(page);
  await page.getByTestId("import-details").first().locator(":scope > summary").click();
}

export async function visitReplay(page: Page): Promise<void> {
  await waitForWorkload(page);
  await page
    .locator('a[href="/app/replay"]')
    .first()
    .evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page.getByTestId("run-replay")).toBeVisible();
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

/** Review controls and evidence are progressive disclosures after setup. */
export async function openReviewEditor(page: Page): Promise<void> {
  await openBillingReview(page);
  const editor = page.getByTestId("review-editor");
  await expect(editor).toBeVisible();
  if (!(await editor.evaluate((el) => (el as HTMLDetailsElement).open)))
    await page.getByTestId("review-bar").click();
}
export async function openReviewEvidence(page: Page): Promise<void> {
  await expect(
    page
      .locator('[data-testid="overview-evidence"]:visible, [data-testid="review-evidence"]:visible')
      .first(),
  ).toBeVisible();
  const overview = page.getByTestId("overview-evidence");
  if (await overview.count())
    await overview.evaluate((el: HTMLDetailsElement) => {
      el.open = true;
    });
  const evidence = page.getByTestId("review-evidence");
  if (!(await evidence.count())) return;
  if (!(await evidence.isVisible())) await openBillingReview(page);
  await expect(evidence).toBeVisible();
  if (!(await evidence.evaluate((el) => (el as HTMLDetailsElement).open)))
    await evidence.locator(":scope > summary").click();
}

export async function openBillingReview(page: Page): Promise<void> {
  await expect(
    page.getByTestId("automatic-workload").or(page.getByTestId("review-editor")).first(),
  ).toBeVisible();
  if (await page.getByTestId("automatic-workload").count()) {
    await expect(page.getByTestId("overview-api-total")).not.toContainText("Pricing recorded work");
    if (!(await page.getByTestId("billing-panel").isVisible()))
      await page.getByTestId("billing-action").click();
    await expect(page.getByTestId("review-editor")).toBeVisible();
  }
}
