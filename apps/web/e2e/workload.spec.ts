import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { decodeAnyShareToken } from "@stackreplay/share";
import {
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
} from "../../../packages/adapters/src/fixtures/content";
import {
  captureRequests,
  createShareToken,
  gotoImport,
  importDemo,
  openReplayDetails,
  setRulesAsOf,
} from "./helpers";

/**
 * SCAN → UNDERSTAND → REPLAY → COMPARE, end to end in a real browser.
 *
 * The fixtures are the adapters' own recorded session shapes with real catalog
 * model identifiers and distinctive project folders, so the tests can prove
 * both that a project name reaches the local workload page and that it never
 * reaches a request.
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

function claude(options: { model: string; project: string }): string {
  return CLAUDE_CODE_SESSION.replaceAll('"example-medium"', `"${options.model}"`).replaceAll(
    "/home/example/projects/demo-app",
    `/home/example/code/${options.project}`,
  );
}

async function scanFixtures(page: Page, withUnresolved = false): Promise<void> {
  await gotoImport(page);
  // Saved, so a test may reload a page and still find the workload.
  await page.getByLabel("Save normalized workload on this browser").check();
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
  await expect(page.getByTestId("import-summary")).toContainText("Workload ready", {
    timeout: 30_000,
  });
}

async function openWorkload(page: Page): Promise<void> {
  await page.getByTestId("open-workload").click();
  await expect(page.getByRole("heading", { name: "How you actually use AI" })).toBeVisible();
  // The value block appears once the analysis is in: a figure, or why there is none.
  await expect(page.getByTestId("workload-opening").getByTestId("workload-value")).toBeVisible({
    timeout: 30_000,
  });
}

test("the workload page stands on its own after a scan, with local project names", async ({
  page,
}) => {
  await scanFixtures(page);
  await expect(page.getByTestId("ready-preview").getByTestId("value-figure")).toBeVisible();
  await expect(page.getByTestId("ready-preview")).toContainText("not what you paid");
  await expect(page.getByTestId("ready-preview").getByTestId("ready-insight")).toBeVisible();
  await openWorkload(page);

  await expect(page.getByTestId("opening-events")).toContainText("6");
  await expect(page.getByTestId("opening-projects")).toContainText("2");
  await expect(page.getByTestId("workload-chronology")).toBeVisible();
  await expect(page.getByTestId("rhythm-grid")).toBeVisible();
  await expect(page.getByTestId("pressure-table")).toContainText("Peak 5 hours");
  await expect(page.getByTestId("project-table")).toContainText(PROJECT_MARKER);
  await expect(page.getByTestId("project-table")).toContainText("orbit-service");
  await expect(page.getByTestId("model-mix")).toContainText("GPT-5.6 Sol");
  await expect(page.getByTestId("composition-table")).toContainText("Cache read");
  await expect(page.getByTestId("evidence-summary")).toContainText("files skipped");

  // A project opens a local drilldown; nothing leaves the page to do it.
  await page
    .getByTestId("project-row")
    .filter({ hasText: PROJECT_MARKER })
    .getByRole("button")
    .click();
  await expect(page.getByTestId("project-drilldown")).toContainText(PROJECT_MARKER);
  await expect(page.getByTestId("project-drilldown")).toContainText("Model mix");

  // Peak windows are inspectable and name what was in them.
  await page.getByTestId("inspect-5h").click();
  await expect(page.getByTestId("pressure-window-detail")).toBeVisible();
  await expect(page.getByTestId("pressure-window-detail")).toContainText(
    "Tools that created this peak",
  );
  await expect(
    page.getByTestId("pressure-window-detail").getByTestId("window-token-composition"),
  ).toContainText("Token composition");

  // One control switches every shape between events and known tokens.
  await page.getByTestId("measure-tokens").click();
  await expect(page.getByTestId("measure-tokens")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("pressure-table")).toContainText("Peak known tokens");
});

test("project names and the workload stay local through scan, analysis and replay", async ({
  page,
}) => {
  const requests = captureRequests(page);
  await scanFixtures(page);
  await openWorkload(page);
  await page.getByTestId("inspect-1h").click();
  await page.getByTestId("next-api").click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });

  const leaked = requests.filter(
    (request) =>
      request.url.includes(PROJECT_MARKER) ||
      (request.body ?? "").includes(PROJECT_MARKER) ||
      Object.values(request.headers).some((value) => value.includes(PROJECT_MARKER)),
  );
  expect(leaked.map((request) => `${request.method} ${request.url}`)).toEqual([]);

  // The portable export carries salted hashes, never the folder name.
  await page.goto("/app/import");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /^Export / })
    .first()
    .click();
  const file = await download;
  const path = await file.path();
  const { readFile } = await import("node:fs/promises");
  const text = await readFile(path, "utf8");
  expect(text).toContain("ph_");
  expect(text).not.toContain(PROJECT_MARKER);
});

test("Codex to Claude: an exact dead end becomes a translated scenario the user builds", async ({
  page,
}) => {
  await scanFixtures(page);
  await openWorkload(page);
  await page.getByTestId("next-cross-provider").click();

  await expect(page.getByTestId("translation-required")).toContainText(
    "This target requires model substitution",
  );
  await page.getByTestId("configure-translation").click();
  const editor = page.getByTestId("translation-editor");
  await expect(editor).toContainText("does not claim equal model quality");
  await expect(editor).toContainText("Recorded usage magnitude is preserved");
  // Aliases are grouped: one row per canonical model, never pre-mapped.
  await expect(page.getByTestId("translation-row")).toHaveCount(2);
  await expect(page.getByTestId("translation-select-gpt-5-6-sol")).toHaveValue("");

  await page.getByTestId("translation-select-gpt-5-6-sol").selectOption("claude-opus-5-5");
  await page.getByTestId("translation-select-gpt-6-sol").selectOption("claude-opus-5-5");
  await expect(page.getByTestId("run-replay")).toHaveText(
    "Run moved-work scenario · Translated Replay",
  );
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });

  await expect(page.getByTestId("reading-mode")).toHaveText("Translated replay");
  await expect(page.getByTestId("reading-routing")).toContainText("6 calls substituted");
  await expect(page.getByTestId("reading-capacity")).toContainText("Cannot be established");
  await expect(page.getByTestId("reading-assumption")).toBeVisible();
  await expect(page.getByTestId("replay-mode")).toContainText(/translated/i);
  // A translated replay can be shared, and the link says it is one.
  const token = await createShareToken(page);
  await page.goto(`/s/${token}`);
  await expect(page.getByTestId("share-mode")).toHaveText("Translated replay");
  await expect(page.getByTestId("share-support")).toContainText("Substitution you chose");
  await expect(page.getByTestId("share-support")).toContainText(
    "nothing here says they would do the same work",
  );
});

test("Claude to Codex runs the same scenario in reverse", async ({ page }) => {
  await gotoImport(page);
  await page.getByLabel("Save normalized workload on this browser").check();
  await page.getByTestId("source-file-input").setInputFiles({
    name: "session.jsonl",
    mimeType: "application/jsonl",
    buffer: Buffer.from(claude({ model: "claude-opus-5-5", project: "atlas" })),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 30_000 });
  await openWorkload(page);
  await page.getByTestId("next-cross-provider").click();
  await expect(page.getByTestId("translation-required")).toBeVisible();
  await page.getByTestId("configure-translation").click();
  // One observed model, so the row itself carries the choice.
  await page.getByTestId("translation-select-claude-opus-5-5").selectOption("gpt-6-sol");
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("reading-mode")).toHaveText("Translated replay", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("reading-routing")).toContainText("GPT-6 Sol");
});

test("same models on the Direct API: an explicit scope prices what is established", async ({
  page,
}) => {
  await scanFixtures(page, true);
  await openWorkload(page);
  await page.getByTestId("tokens-api-link").click();
  await expect(page.getByTestId("target-kind-api")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("reading-cost")).toContainText("Not established", {
    timeout: 60_000,
  });
  // Unrecognized IDs are the only gap, so the verdict already leads with the
  // price of the calls that resolve and states what it leaves out. The replay
  // below it is still the whole workload's.
  await expect(page.getByTestId("verdict-headline")).toContainText(
    /^Your \d+ calls with recognized models are worth \$[\d,]+\.\d\d at OpenAI's published API rates/u,
  );
  await expect(page.getByTestId("verdict-support")).toContainText("not what you paid");
  await expect(page.getByTestId("verdict-support")).toContainText(
    /\d+ calls? with unrecognized model IDs (is|are) left out and not priced/u,
  );
  await expect(page.getByTestId("cost-resolved-scope")).toContainText("Not what you paid");
  await expect(page.getByTestId("exclude-unresolved").getByRole("checkbox")).not.toBeChecked();

  await page.getByTestId("exclude-unresolved").getByRole("checkbox").check();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("reading-cost")).toContainText("Published-rate equivalent", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("reading-cost")).toContainText("Not what you paid");
  await expect(page.getByTestId("reading-scope")).toContainText("left out of this replay");
  // The scope travels with the link.
  const token = await createShareToken(page);
  await page.goto(`/s/${token}`);
  await expect(page.getByTestId("share-headline")).toContainText("calls with recognized models");
  await expect(page.getByTestId("share-support")).toContainText("left out and not priced");
});

test("a numeric limit crossing states when the allowance ran out and opens its window", async ({
  page,
}) => {
  await importDemo(page, "heavy");
  await page.getByTestId("continue-to-replay").click();
  await setRulesAsOf(page, "2026-09-15");
  await page.getByTestId("plan-example-cloud-pro").click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("reading-capacity")).toContainText("historical limit");
  await expect(page.getByTestId("limit-crossings")).toContainText("ran out");
  await page.getByTestId("inspect-crossing").first().click();
  await expect(page.getByTestId("crossing-window-detail")).toBeVisible({ timeout: 30_000 });
  await openReplayDetails(page);
});

test("qualitative plans keep capacity unknown while model support is established", async ({
  page,
}) => {
  await scanFixtures(page);
  await openWorkload(page);
  await page.goto(
    `${new URL(page.url()).pathname.replace("/app/workload", "/app/replay")}?${new URLSearchParams({ import: new URL(page.url()).searchParams.get("import") ?? "", target: "openai-chatgpt-pro" })}`,
  );
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("reading-mode")).toHaveText("Exact replay", { timeout: 60_000 });
  await expect(page.getByTestId("reading-capacity")).toContainText("Cannot be established");
  await expect(page.getByTestId("reading-routing")).toContainText("calls use models");
  await expect(page.getByTestId("reading-cost")).toContainText("per month");
});

test("Compare asks for a decision before showing Codex subscription and API facts", async ({
  page,
}) => {
  await scanFixtures(page);
  await openWorkload(page);
  await page.getByTestId("workload-compare-cta").click();
  await expect(page.getByRole("heading", { name: "Compare this workload" })).toBeVisible();
  await expect(page.getByTestId("compare-results")).toHaveCount(0);
  await page.getByTestId("compare-decision-codex").click();
  await expect(page.getByTestId("comparison-object")).toContainText("Codex work");
  await expect(page.getByTestId("comparison-object")).toContainText("Models as recorded");
  await expect(page.getByTestId("compare-demand")).toContainText("No subscription allowance", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("compare-price")).toContainText("published API rates");
  await expect(page.getByTestId("compare-results")).not.toContainText(/best|score|winner|savings/i);
});

test("a mixed workload keeps its selected slice in the Replay result", async ({ page }) => {
  await importDemo(page, "multistack");
  await page.getByTestId("continue-to-replay").click();
  await expect(page.getByTestId("replay-scope-picker")).toContainText("All recorded work");
  for (const tool of ["claude-code", "codex", "command-code"]) {
    await expect(page.getByTestId(`scope-${tool}`)).toBeVisible();
  }
  await page.getByTestId("scope-claude-code").click();
  await expect(page.getByTestId("scope-claude-code")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("plan-example-cloud-pro").click();
  await page.getByTestId("run-replay").click();
  await expect(page.getByTestId("replay-result-object")).toContainText("Claude Code work", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("replay-result-object")).toContainText("Models as recorded");
});

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious.map((violation) => `${violation.id}: ${violation.nodes.length} node(s)`)).toEqual(
    [],
  );
}

for (const theme of ["dark", "light"] as const) {
  test(`workload, translation and compare surfaces pass axe in ${theme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await scanFixtures(page);
    await openWorkload(page);
    await page.getByTestId("inspect-5h").click();
    await page.getByTestId("project-row").first().getByRole("button").click();
    await page.getByTestId("scan-evidence-details").evaluate((element: HTMLDetailsElement) => {
      element.open = true;
    });
    await expectNoSeriousViolations(page);

    await page.getByTestId("next-cross-provider").click();
    await page.getByTestId("configure-translation").click();
    await page.getByTestId("translation-select-gpt-5-6-sol").selectOption("claude-opus-5-5");
    await expectNoSeriousViolations(page);
    await page.getByTestId("run-replay").click();
    await expect(page.getByTestId("replay-reading")).toBeVisible({ timeout: 60_000 });
    await expectNoSeriousViolations(page);

    await page.getByTestId("strip-workload-link").click();
    await page.getByTestId("workload-compare-cta").click();
    await page.getByTestId("compare-decision-codex").click();
    await expect(page.getByTestId("compare-results")).toBeVisible({ timeout: 60_000 });
    await expectNoSeriousViolations(page);
  });
}

test("a finished scan is saved by default and survives a reload", async ({ page }) => {
  await gotoImport(page);
  await expect(
    page.getByRole("checkbox", { name: "Save normalized workload on this browser" }),
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
  await expect(page.getByTestId("import-summary")).toContainText("saved on this browser", {
    timeout: 30_000,
  });
  await expect(page.getByTestId("not-saved-notice")).toHaveCount(0);
  await openWorkload(page);
  await page.reload();
  await expect(page.getByTestId("workload-opening").getByTestId("workload-value")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("workload-not-saved")).toHaveCount(0);
  // The workspace starts from the stored workload and its value.
  await page.goto("/app");
  await expect(page.getByTestId("stored-workload")).toContainText("calls", { timeout: 30_000 });
  await expect(page.getByTestId("stored-workload")).toContainText("not what you paid", {
    timeout: 30_000,
  });
});

test("a partial scan says so beside the totals and offers a rescan", async ({ page }) => {
  await scanFixtures(page);
  const href = await page.getByTestId("open-workload").getAttribute("href");
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
  await page.goto(href ?? "/app/workload");
  const notice = page.getByTestId("partial-scan");
  await expect(notice).toContainText("Partial scan", { timeout: 30_000 });
  await expect(notice).toContainText("could not be read to the end");
  await expect(notice).not.toContainText(/malformed|changed/iu);
  await expect(page.getByTestId("workload-rescan")).toHaveAttribute("href", "/app/import");
  await page.getByTestId("scan-evidence-details").evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await expect(page.getByTestId("intake-file-review")).toContainText("unreadable");
});

test.describe("rules date default", () => {
  test.use({ timezoneId: "America/New_York" });

  test("starts on the viewer's calendar date, not tomorrow's UTC date", async ({ page }) => {
    // 11:30 PM Sep 23 in New York is already Sep 24 in UTC.
    await page.clock.setFixedTime(new Date("2026-09-24T03:30:00Z"));
    await importDemo(page, "moderate");
    await page.getByTestId("continue-to-replay").click();
    await expect(page.getByTestId("rules-as-of")).toHaveValue("2026-09-23");
  });
});

test("a workload share link carries aggregates only and reads as StackReplay in public", async ({
  page,
}) => {
  await scanFixtures(page);
  await openWorkload(page);
  await page.getByTestId("share-workload-link").click();
  const panel = page.getByTestId("share-panel");
  await expect(panel.getByTestId("share-preview")).toBeVisible();
  const token = await createShareToken(page);
  const decoded = await decodeAnyShareToken(token);
  expect(decoded.ok).toBe(true);
  const json = decoded.ok ? JSON.stringify(decoded.snapshot) : "";
  // Local project names, other projects, sessions and times never leave.
  expect(json).not.toContain(PROJECT_MARKER);
  expect(json).not.toContain("orbit-service");
  expect(json).not.toMatch(/nativeSessionHash|projectHash|rawName|"at"|"zone"|"period"/u);

  await page.goto(`/s/${token}`);
  await expect(page.getByTestId("share-card-v2")).toHaveAttribute("data-kind", "workload");
  await expect(page.getByTestId("share-figure-caption")).toHaveText(
    "at published API list prices · not what you paid",
  );
  await expect(page.getByTestId("share-privacy")).toContainText("no times of day");
  await expect(page.locator("main")).not.toContainText(PROJECT_MARKER);
});
