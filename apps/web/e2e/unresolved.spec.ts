import { expect, type Page, test } from "@playwright/test";
import type { UsageEventV1 } from "@stackreplay/schema";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { createShareToken, gotoImport } from "./helpers";

/**
 * One unresolved call carrying a billion input tokens, early in a 3,200-call
 * Claude workload (independent audit P0 and P1). Every surface tells one
 * story: the recognized calls' run-out and overage stay visible but are not
 * the whole workload's, and the published-rate price says how much known
 * demand it leaves out. Resolving the call makes every surface exact.
 */

test.use({ timezoneId: "America/New_York" });

function giantExport(resolved: boolean) {
  const exported = buildArchetypeExport("claude-only");
  const order = exported.events
    .map((event, index) => ({ at: Date.parse(event.occurredAt), index }))
    .sort((a, b) => a.at - b.at);
  const index = order[0]?.index ?? 0;
  const event = exported.events[index] as UsageEventV1 & { modality: "text" };
  exported.events[index] = {
    ...event,
    model: resolved ? { rawName: "claude-opus-4-8" } : { rawName: "AUDIT_UNKNOWN_GIANT_MODEL" },
    confidence: { ...event.confidence, model: resolved ? "exact" : "unknown" },
    usage: { ...event.usage, inputTokens: 1_000_000_000 },
  } as UsageEventV1;
  return exported;
}

async function importGiant(page: Page, resolved: boolean): Promise<void> {
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save normalized workload on this browser" }).check();
  await page.getByTestId("import-file-input").setInputFiles({
    name: resolved ? "giant-resolved.json" : "giant-unresolved.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(giantExport(resolved))),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 60_000 });
}

async function replayCopilot(page: Page): Promise<string> {
  await page.goto("/app/replay?target=github-copilot-pro-plus");
  await page.getByTestId("run-replay").click();
  const headline = page.getByTestId("verdict-headline");
  await expect(headline).toBeVisible({ timeout: 60_000 });
  return ((await headline.textContent()) ?? "").replace(/\s+/gu, " ").trim();
}

async function compareCopilot(page: Page): Promise<string> {
  await page.goto("/app/compare");
  await page.getByTestId("compare-run").click();
  const column = page.locator(
    '[data-testid="compare-column"][data-target="plan:github-copilot-pro-plus"]',
  );
  const headline = column.getByTestId("compare-verdict-headline");
  await expect(headline).toBeVisible({ timeout: 90_000 });
  return ((await headline.textContent()) ?? "").replace(/\s+/gu, " ").trim();
}

test("a giant unresolved call qualifies the run-out and the price on every surface", async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  await importGiant(page, false);

  // Workload Ready and the workload page: the price scope never reads complete
  // and names the demand it leaves out.
  const ready = page.getByTestId("ready-preview");
  await expect(ready.getByTestId("value-scope")).toContainText("3,199 of 3,200 calls (99.97%)", {
    timeout: 60_000,
  });
  await expect(ready.getByTestId("value-token-scope")).toContainText(
    /the 1 left out carries 64\.\d%/u,
  );
  await expect(ready.getByTestId("value-scope")).not.toContainText("100.0%");
  await page.goto("/app/workload");
  const opening = page.getByTestId("workload-opening");
  await expect(opening.getByTestId("value-scope")).toContainText("(99.97%)", { timeout: 60_000 });
  await expect(opening.getByTestId("value-token-scope")).toContainText(
    /The priced calls carry 35\.\d% of known processed tokens/u,
  );
  await expect(opening.getByTestId("value-caption")).toHaveText(
    "at published API list prices · not what you paid",
  );

  // Replay: the recognized run-out, stated as such, then what could change it.
  const replay = await replayCopilot(page);
  expect(replay).toMatch(
    /^Recognized calls alone would exhaust Copilot Pro\+ credits by Aug 29 \(day 10\) and again on Sep 10\. They would generate about \$178 in modeled overage/u,
  );
  await expect(page.getByTestId("verdict-support").locator("li").first()).toHaveText(
    "1 unresolved call, recorded before Aug 29, could move the run-out earlier and add to the overage.",
  );

  // The public page and its image carry the same verdict.
  const token = await createShareToken(page);
  await page.goto(`/s/${token}`);
  await expect(page.getByTestId("share-headline")).toHaveText(replay);
  await expect(page.getByTestId("share-support").locator("li").first()).toHaveText(
    "1 unresolved call, recorded before Aug 29, could move the run-out earlier and add to the overage.",
  );
  const image = await request.get(`/s/${token}/image`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");

  // Compare reads the same derivation.
  expect(await compareCopilot(page)).toBe(replay);
});

test("resolving that call makes every surface exact", async ({ page }) => {
  test.setTimeout(240_000);
  await importGiant(page, true);
  await expect(page.getByTestId("ready-preview").getByTestId("value-scope")).toContainText(
    "All 3,200 calls",
    { timeout: 60_000 },
  );
  await expect(page.getByTestId("ready-preview").getByTestId("value-token-scope")).toHaveCount(0);

  const replay = await replayCopilot(page);
  expect(replay).toBe(
    "Copilot Pro+ credits would have run out on Aug 20 (day 1) and again on Sep 10. This workload would have generated about $5,178 in modeled overage over 35 days on top of the $39/month subscription.",
  );
  await expect(page.getByTestId("replay-headline")).not.toContainText(/unresolved|recognized/iu);
  expect(await compareCopilot(page)).toBe(replay);
});
