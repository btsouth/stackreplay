import { expect, test } from "@playwright/test";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { gotoImport, importDemo, runReplay } from "./helpers";

/**
 * Replay route states (M3 brief): no workload, ready, replaying, full coverage,
 * partial coverage, exceeded constraints, unknown coverage, unsupported model,
 * low confidence, violation detail.
 */

test("direct navigation without an import shows an intentional empty state", async ({ page }) => {
  await page.goto("/app/replay");
  await expect(page.getByTestId("replay-empty")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No workload yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Import a workload" })).toBeVisible();
});

test("replays a demo workload with full coverage", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  await expect(page.getByTestId("headline-status")).toContainText(/Fully served|Partly served/);
  await expect(page.getByTestId("coverage-requests")).toHaveAttribute("data-status", "known");
  await expect(page.getByTestId("coverage-requests")).toContainText("%");
  await expect(page.getByTestId("confidence-factors")).toBeVisible();
});

test("shows exceeded constraints with violation detail and a timeline", async ({ page }) => {
  await importDemo(page, "heavy");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  const constraints = page.getByTestId("constraints");
  await expect(constraints).toContainText("EXCEEDED");
  await expect(constraints).toContainText("attempted");
  // Enum values are humanized for display: no raw underscores leak through.
  // This covers constraint detail rows AND the result warnings (the
  // LATCH_TRIGGERED warning text also embeds the enum).
  await expect(constraints).toContainText("latch until reset");
  await expect(constraints).not.toContainText("until_reset");
  await expect(page.getByTestId("replay-warnings")).toContainText("latch until reset rule");
  await expect(page.getByTestId("replay-warnings")).not.toContainText("until_reset");

  const violations = page.getByTestId("violations");
  await expect(violations).toBeVisible();
  await violations.locator("summary").first().click();
  await expect(violations).toContainText("Attempted demand");
  await expect(violations).toContainText("Affected events");
  await expect(violations).toContainText(
    /latched until the window reset|individual requests rejected|served, billed as overage|recorded only/,
  );

  await expect(page.getByTestId("replay-timeline")).toBeVisible();
  await expect(page.getByTestId("timeline-chart")).toBeVisible();
});

test("the timeline names what each shaded band did to the workload", async ({ page }) => {
  await importDemo(page, "heavy");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  // Regression (benchmark F030): every band used to be described as work the
  // target did not serve, which is wrong for a rule that served the work and
  // billed overage. The caption now says which it was.
  const caption = page.getByTestId("timeline-caption");
  await expect(caption).toBeVisible();
  await expect(caption).toContainText("Historical activity per day");
  const text = (await caption.textContent()) ?? "";
  if (!/No window exceeded/u.test(text)) {
    expect(text).toMatch(/did not serve|served and billed as overage/u);
  }
});

test("states whether the replay was exact and how each event was treated", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  const card = page.getByTestId("replay-semantics");
  await expect(card).toBeVisible();
  await expect(card.getByRole("heading", { name: "Replay semantics" })).toBeVisible();
  // Same-model replay: the headline states exact and the card never claims a substitution.
  await expect(page.getByTestId("replay-headline").getByTestId("replay-mode")).toHaveText(
    "Exact replay",
  );
  // Exact states one thing: no cross-model substitution. It must not read as a
  // claim that every request was served (M4B review: the note used to).
  await expect(page.getByTestId("replay-mode-note")).toContainText(
    "No cross-model substitution was applied",
  );
  await expect(page.getByTestId("replay-mode-note")).not.toContainText(
    /every replayed request|target itself serves|covered in full/i,
  );
  await expect(page.getByTestId("replay-translation")).toHaveCount(0);
  await expect(card).not.toContainText("Translated replay");

  // Every event lands in exactly one outcome, and the paid case is its own row.
  const outcomes = page.getByTestId("replay-dispositions");
  for (const label of ["Included", "Overage", "Blocked", "Unavailable", "Unknown"])
    await expect(outcomes).toContainText(label);

  // Evidence dimensions stay separate, each with its own denominator.
  await expect(page.getByTestId("replay-evidence")).toContainText("Model resolution");
  await expect(page.getByTestId("replay-evidence")).toContainText("events");
  await expect(page.getByTestId("replay-replayability")).toBeVisible();

  // The scope statement must not upgrade an imported workload into account-wide coverage.
  await expect(page.getByTestId("replay-scope")).toContainText("not the whole provider account");
});

test("the result panel describes the replay it shows, not the current selection", async ({
  page,
}) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  // Regression (benchmark F026): the panel was labelled with whatever was
  // selected, and a target change left the old result on screen under the new
  // name.
  const result = page.getByTestId("replay-result");
  await expect(result).toContainText("rules as of");
  await expect(page.getByTestId("result-computed-for")).toContainText("example-cloud-pro");

  await page.getByTestId("plan-example-cloud-starter").click();
  await expect(result).toHaveCount(0);
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("result-computed-for")).toContainText("example-cloud-starter");
});

test("keeps unknown coverage visibly unknown instead of 0% or 100%", async ({ page }) => {
  await importDemo(page, "multistack");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");

  const requests = page.getByTestId("coverage-requests");
  await expect(requests).toHaveAttribute("data-status", "unknown");
  await expect(requests).toContainText("UNKNOWN");
  await expect(requests).not.toContainText("%");

  const constraints = page.getByTestId("constraints");
  await expect(constraints).toContainText("UNKNOWN");
});

test("explains how observed model names map onto the catalog", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");

  const identities = page.getByTestId("model-identities");
  await expect(identities).toBeVisible();
  await expect(identities.getByRole("heading", { name: "Models in this workload" })).toBeVisible();
  // The demo workloads use the catalog's synthetic namespace, which the bundled
  // catalog does carry, so they resolve exactly and the panel says so.
  await expect(identities).toContainText("exact id");
  await expect(identities).toContainText("Every observed model name resolved to a catalog model.");
});

test("an identifier no source justifies is reported as unmapped, never guessed", async ({
  page,
}) => {
  const exported = buildDemoExport("moderate");
  const unknown = "gpt-daybreak-blue-latest";
  const mutated = {
    ...exported,
    events: exported.events.map((event, index) =>
      index % 3 === 0 ? { ...event, model: { rawName: unknown } } : event,
    ),
  };
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "unmapped-model.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(mutated)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 30_000 });
  await page.goto("/app/replay");

  const identities = page.getByTestId("model-identities");
  await expect(identities).toBeVisible();
  await expect(identities).toContainText(unknown);
  await expect(identities).toContainText("unmapped");
  await expect(identities).toContainText("never guesses a model identity");
});

test("never reads as served while part of the demand is unavailable or undecided", async ({
  page,
}) => {
  const exported = buildDemoExport("moderate");
  const unknown = "gpt-daybreak-blue-latest";
  const mutated = {
    ...exported,
    events: exported.events.map((event, index) =>
      index % 3 === 0 ? { ...event, model: { rawName: unknown } } : event,
    ),
  };
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "partly-undecided.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(mutated)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 30_000 });
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  // An identifier no source establishes is undecided demand, so the result is
  // exact (nothing was substituted) and bounded (something was not decided).
  await expect(page.getByTestId("replay-headline").getByTestId("replay-mode")).toHaveText(
    "Exact replay",
  );
  const note = page.getByTestId("replay-mode-note");
  await expect(note).toContainText("No cross-model substitution was applied");
  await expect(note).not.toContainText(/every replayed request|target itself serves/i);

  const dispositions = page.getByTestId("replay-dispositions");
  await expect(dispositions).toContainText("Unknown");
  const undecided = await dispositions.evaluate(
    (element) =>
      [...element.querySelectorAll("div")]
        .find((row) => row.querySelector("dt")?.textContent === "Unknown")
        ?.querySelector("dd")?.textContent ?? "0",
  );
  expect(Number(undecided.replace(/[^0-9]/gu, ""))).toBeGreaterThan(0);
  await expect(page.getByTestId("replay-replayability")).toContainText(/bounded|qualitative/i);
});

test("lists models the target does not serve", async ({ page }) => {
  await importDemo(page, "multistack");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");
  await expect(page.getByTestId("unsupported-models")).toBeVisible();
  await expect(page.getByTestId("unsupported-models")).toContainText(
    /unresolved|not_supported|excluded/,
  );
});

test("shows the rules instant and the plan version used", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter", "2026-09-15");
  await expect(page.getByTestId("replay-result")).toContainText("2026-09-15");
  await expect(page.getByTestId("replay-result")).toContainText("example-cloud-starter@2026-09-15");
});

test("plan picker is searchable and keyboard operable", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");

  await page.getByTestId("plan-search").fill("example-cloud-pro");
  await expect(page.getByTestId("plan-list").getByRole("button")).toHaveCount(1);

  await page.getByTestId("plan-search").fill("");
  const firstOption = page.getByTestId("plan-list").getByRole("button").first();
  await firstOption.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("plan-list").getByRole("button").nth(1)).toBeFocused();
  await expect(page.getByTestId("plan-list").getByRole("button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a replay can be re-run for a different target without leaving the page", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");
  const firstHeadline = await page.getByTestId("headline-status").textContent();

  await page.getByTestId("plan-example-cloud-pro").click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
  const secondHeadline = await page.getByTestId("headline-status").textContent();

  expect(secondHeadline).not.toBe(firstHeadline);
  await expect(page.getByTestId("replay-result")).toContainText("example-cloud-pro");
});

test("the share panel discloses what a link reveals before one is created", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-starter");

  const panel = page.getByTestId("share-panel");
  await expect(panel).toBeVisible();
  // Creation-time disclosure: possession of the URL is access, and the payload is not
  // encrypted. It must not read as a security guarantee.
  await expect(page.getByTestId("share-disclosure")).toHaveText(
    /Anyone with this link can read the aggregate numbers it contains\. The link is not encrypted\./u,
  );
  await expect(panel).not.toContainText(/tamper-proof|authenticat|signed|verif/u);

  await panel.getByTestId("share-create").click();
  const url = page.getByTestId("share-url");
  await expect(url).toBeVisible();
  expect(await url.textContent()).toContain("/s/");
  await expect(page.getByTestId("share-open")).toBeVisible();
});
