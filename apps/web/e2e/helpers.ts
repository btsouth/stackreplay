import { expect, type Page } from "@playwright/test";

/** Shared E2E helpers for the M3 browser-local surfaces. */

export const DEMO_PRESETS = ["moderate", "heavy", "multistack"] as const;
export type DemoPreset = (typeof DEMO_PRESETS)[number];

export async function gotoImport(page: Page): Promise<void> {
  await page.goto("/app/import");
  await expect(page.getByTestId("import-dropzone")).toBeVisible();
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
  await page.getByTestId("rules-as-of").fill(rulesAsOf);
  await page.getByTestId(`plan-${planId}`).click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
}

export interface CapturedRequest {
  method: string;
  url: string;
  body: string | null;
}

/** Records every request with its body, so a privacy test can inspect them. */
export function captureRequests(page: Page): CapturedRequest[] {
  const captured: CapturedRequest[] = [];
  page.on("request", (request) => {
    let body: string | null = null;
    try {
      body = request.postData();
    } catch {
      body = null;
    }
    captured.push({ method: request.method(), url: request.url(), body });
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

export async function expectNoConsoleErrors(page: Page, run: () => Promise<void>): Promise<void> {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await run();
  expect(errors).toEqual([]);
}
