import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { registeredProbePaths } from "@stackreplay/adapters/discovery";
import { buildHome, CANARY, writeClaudeProjects } from "./fixtures/discovery-home";
import {
  captureRequests,
  dropFolders,
  gotoImport,
  importDemo,
  openConnectIndividually,
} from "./helpers";

/**
 * Find my AI histories (history discovery before import).
 *
 * Folders are dropped through Chromium's own drag path, so the page gets the
 * same directory entries a person's drag gives it. Discovery only works where
 * a folder can be dragged; phones get the per-source folder chooser.
 */

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.startsWith("touch devices")) return;
  test.skip(testInfo.project.name !== "desktop", "folder drag discovery is a desktop path");
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function discover(page: Page, home: string): Promise<void> {
  await gotoImport(page);
  await page.getByTestId("find-histories").click();
  await expect(page.getByTestId("permission-preview")).toBeVisible();
  await dropFolders(page, [home]);
  await expect(page.getByTestId("discovery-selection")).toBeVisible();
}

/**
 * Records every directory-entry call the page makes and every content read on
 * the main thread, so the privacy contract can be checked against what the
 * browser was actually asked for.
 */
async function recordFolderAccess(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log: { op: string; path: string }[] = [];
    (window as unknown as { __folderAccess: typeof log }).__folderAccess = log;
    type Entry = { fullPath: string };
    type Method = (this: Entry, ...args: unknown[]) => unknown;
    // Chromium does not expose the entry interfaces as globals, so the directory
    // entry prototype is patched from the first entry a drop hands the page.
    let patched = false;
    const patch = (entry: object | null) => {
      if (patched || entry === null || !(entry as { isDirectory?: boolean }).isDirectory) return;
      patched = true;
      const proto = Object.getPrototypeOf(entry) as Record<string, Method>;
      const wrap = (name: string, op: string, named: boolean) => {
        const original = proto[name] as Method;
        proto[name] = function (this: Entry, ...args: unknown[]) {
          log.push({ op, path: named ? `${this.fullPath}/${String(args[0])}` : this.fullPath });
          return original.apply(this, args);
        };
      };
      wrap("getDirectory", "directory", true);
      wrap("getFile", "file", true);
      wrap("createReader", "list", false);
    };
    const getAsEntry = DataTransferItem.prototype.webkitGetAsEntry;
    DataTransferItem.prototype.webkitGetAsEntry = function (this: DataTransferItem) {
      const entry = getAsEntry.call(this);
      patch(entry);
      return entry;
    };
    for (const method of ["text", "arrayBuffer", "stream", "bytes"] as const) {
      const original = Blob.prototype[method] as ((...args: unknown[]) => unknown) | undefined;
      if (original === undefined) continue;
      Object.defineProperty(Blob.prototype, method, {
        configurable: true,
        value(this: Blob, ...args: unknown[]) {
          log.push({ op: "read", path: this instanceof File ? this.name : "blob" });
          return original.apply(this, args);
        },
      });
    }
  });
}

async function folderAccess(page: Page, root: string) {
  const log = await page.evaluate(
    () => (window as unknown as { __folderAccess: { op: string; path: string }[] }).__folderAccess,
  );
  const prefix = `/${root}/`;
  return log.map((entry) => ({
    op: entry.op,
    path: entry.path === `/${root}` ? "" : entry.path.replace(prefix, ""),
  }));
}

test("finds histories in a dropped home folder and builds only what is selected", async ({
  page,
}, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { claudeSessions: 2, codexRollouts: 1 });
  await discover(page, home);

  await expect(page.getByTestId("history-claude-code")).toHaveAttribute("data-status", "found");
  await expect(page.getByTestId("history-claude-code")).toContainText("2 files");
  await expect(page.getByTestId("history-codex")).toHaveAttribute("data-status", "found");
  await expect(page.getByTestId("history-codex")).toContainText("1 file");
  // Absent histories are quiet: a status, not an error.
  await expect(page.getByTestId("history-command-code")).toContainText("Not found");
  await expect(page.getByTestId("history-hermes")).toContainText("Not found");
  await expect(page.getByTestId("history-opencode")).toHaveAttribute("data-status", "unsupported");
  await expect(page.getByTestId("history-discovery").getByRole("alert")).toHaveCount(0);
  await expect(page.getByTestId("discovery-summary")).toContainText("2 histories found");
  await expect(page.getByTestId("discovery-boundary")).toContainText(/Checked \d+ known paths/u);
  await expect(page.getByTestId("discovery-announcer")).toContainText("Nothing has been imported");

  // Discovery is not import: nothing is scanned or stored until Build.
  await expect(page.getByTestId("scan-instrument")).toHaveCount(0);
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();

  await page.getByTestId("select-codex").uncheck();
  await expect(page.getByTestId("selection-count")).toContainText("1 selected");
  await page.getByTestId("build-workload").click();
  await expect(page.getByTestId("import-summary")).toContainText("Workload ready", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("detected-sources")).toContainText("Claude Code");
  await expect(page.getByTestId("detected-sources")).not.toContainText("Codex");
});

test("the happy path runs from discovery through the scan instrument into the workload", async ({
  page,
}, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { claudeSessions: 3, codexRollouts: 2 });
  await discover(page, home);
  await expect(page.getByTestId("select-claude-code")).toBeChecked();
  await expect(page.getByTestId("select-codex")).toBeChecked();
  await page.getByTestId("build-workload").click();
  await expect(page.getByTestId("scan-instrument")).toBeVisible();
  await expect(page.getByTestId("import-summary")).toContainText("Workload ready", {
    timeout: 60_000,
  });
  const sources = page.getByTestId("detected-sources");
  await expect(sources).toContainText("Claude Code");
  await expect(sources).toContainText("Codex");
  await expect(page.getByTestId("stored-imports")).toContainText("Claude Code + Codex");
  await page.getByTestId("open-workload").click();
  await expect(page).toHaveURL(/\/app\/workload\?import=/u);
});

test("a linked history needs additional access and connects without disturbing the others", async ({
  page,
}, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  const external = testInfo.outputPath("external-drive/claude-projects");
  await buildHome(home, { claudeSessions: 2, codexRollouts: 1, linkClaude: external });
  await discover(page, home);

  const claude = page.getByTestId("history-claude-code");
  await expect(claude).toHaveAttribute("data-status", "access-needed");
  await expect(claude).toContainText("Additional access required");
  await expect(page.getByTestId("history-codex")).toHaveAttribute("data-status", "found");
  await expect(page.getByTestId("access-guidance")).toContainText("folder chooser");

  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("connect-row-claude-code").click();
  await (await chooser).setFiles(`${home}/.claude/projects`);
  // A bare `projects` folder is not identified by looking inside it; the
  // person's own Connect choice decides, and the scan confirms the content.
  await expect(claude).toHaveAttribute("data-status", "connected");
  await expect(claude).toContainText("2 files");
  await expect(page.getByTestId("history-codex")).toHaveAttribute("data-status", "found");
  await expect(page.getByTestId("selection-count")).toContainText("2 selected");

  await page.getByTestId("build-workload").click();
  await expect(page.getByTestId("import-summary")).toContainText("Workload ready", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("detected-sources")).toContainText("Claude Code");
  await expect(page.getByTestId("detected-sources")).toContainText("Codex");
});

test("another location joins the same list", async ({ page }, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { claudeSessions: 1, codexRollouts: 1 });
  const wsl = testInfo.outputPath("wsl-home/.claude/projects");
  await writeClaudeProjects(wsl, 2);
  await discover(page, home);
  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("add-location").click();
  await (await chooser).setFiles(wsl);
  // A bare `projects` folder is not identified by its contents, so it joins as
  // an added location whose files are identified by content when it is built.
  await expect(page.getByTestId("history-location-1")).toHaveAttribute("data-status", "connected");
  await expect(page.getByTestId("selection-count")).toContainText("3 selected");
});

test("a dropped tool folder works as well as a home folder", async ({ page }, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { codexRollouts: 2 });
  await discover(page, `${home}/.codex`);
  await expect(page.getByTestId("history-codex")).toHaveAttribute("data-status", "found");
  await expect(page.getByTestId("history-claude-code")).toContainText("Not found");
});

test("an OpenCode data folder reads as found but not readable, dropped or chosen", async ({
  page,
}, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home);
  const data = `${home}/.local/share/opencode`;
  await discover(page, data);
  await expect(page.getByTestId("history-opencode")).toHaveAttribute("data-status", "unsupported");
  await expect(page.getByTestId("history-opencode")).toContainText("Not readable in browser");

  // The same folder through Add another location, after a drop that missed it.
  await discover(page, `${home}/.codex`);
  await expect(page.getByTestId("history-opencode")).toContainText("Not found");
  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("add-location").click();
  await (await chooser).setFiles(data);
  await expect(page.getByTestId("history-opencode")).toHaveAttribute("data-status", "unsupported");
  await expect(page.locator('[data-testid^="history-location-"]')).toHaveCount(0);
});

test("a dropped bare projects folder asks for access and is never listed", async ({
  page,
}, testInfo) => {
  const root = "projects";
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { claudeSessions: 2 });
  await recordFolderAccess(page);
  await discover(page, `${home}/.claude/${root}`);
  const claude = page.getByTestId("history-claude-code");
  await expect(claude).toHaveAttribute("data-status", "access-needed");
  await expect(claude).toContainText("did not look inside");
  await expect(page.getByTestId("connect-row-claude-code")).toBeVisible();
  // Beside Connect: which hidden folder to pick, and why the browser says "upload".
  await expect(page.getByTestId("connect-hint-claude-code")).toContainText("~/.claude/projects");
  await expect(page.getByTestId("connect-hint-claude-code")).toContainText(
    "none are sent anywhere",
  );
  const access = await folderAccess(page, root);
  expect(access.filter((entry) => entry.op === "list")).toEqual([]);
  expect(access.filter((entry) => entry.op === "read")).toEqual([]);
});

test("an unrelated projects folder and a year-sorted archive are not listed or taken for a tool", async ({
  page,
}, testInfo) => {
  const repos = testInfo.outputPath("work/projects");
  for (const repo of ["alpha", "beta", "gamma"]) {
    await mkdir(join(repos, repo, "src"), { recursive: true });
    await writeFile(join(repos, repo, "notes.jsonl"), "{}\n");
  }
  const archive = testInfo.outputPath("journal/sessions");
  await mkdir(join(archive, "2026", "notes"), { recursive: true });
  await writeFile(join(archive, "2026", "notes", "personal.jsonl"), "{}\n");
  await recordFolderAccess(page);
  await discover(page, repos);
  expect((await folderAccess(page, "projects")).filter((entry) => entry.op === "list")).toEqual([]);
  await discover(page, archive);
  await expect(page.getByTestId("history-codex")).not.toHaveAttribute("data-status", "found");
  expect((await folderAccess(page, "sessions")).filter((entry) => entry.op === "list")).toEqual([]);
});

test("a file that disappears before Build is reported, and the workload says it is partial", async ({
  page,
}, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { claudeSessions: 3, codexRollouts: 1 });
  const full = testInfo.outputPath("full-home");
  await buildHome(full, { claudeSessions: 2, codexRollouts: 1 });
  await discover(page, home);
  await expect(page.getByTestId("history-claude-code")).toContainText("3 files");
  // One of the discovered sessions is deleted between discovery and Build.
  const [project] = await readdir(join(home, ".claude", "projects"));
  const [session] = await readdir(join(home, ".claude", "projects", project as string));
  await rm(join(home, ".claude", "projects", project as string, session as string));
  await page.getByTestId("build-workload").click();
  await expect(page.getByTestId("import-summary")).toContainText("Workload ready", {
    timeout: 60_000,
  });
  // Once the workload is ready, discovery folds away: no live Build button
  // under "Workload ready".
  await expect(page.getByTestId("discovery-after-ready")).not.toHaveAttribute("open");
  await expect(page.getByTestId("build-workload")).toBeHidden();
  const partial = page.getByTestId("partial-scan");
  await expect(partial).toContainText("1 source file could not be read");
  await page.getByTestId("intake-review").locator("summary").click();
  await expect(page.getByTestId("intake-review")).toContainText(session as string);
  // The totals are what was read: the same as a home that only ever had two sessions.
  const facts = await page.getByTestId("scan-ready-facts").innerText();
  await discover(page, full);
  await page.getByTestId("build-workload").click();
  await expect(page.getByTestId("import-summary")).toContainText("Workload ready", {
    timeout: 60_000,
  });
  expect(await page.getByTestId("scan-ready-facts").innerText()).toBe(facts);
});

test("a dropped file is explained instead of scanned", async ({ page }, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home);
  await gotoImport(page);
  await page.getByTestId("find-histories").click();
  await dropFolders(page, [`${home}/.claude.json`]);
  await expect(page.getByTestId("discovery-drop-note")).toContainText("Drop a folder");
  await expect(page.getByTestId("scan-instrument")).toHaveCount(0);
});

test("Cancel scan stops the scan and leaves saved workloads alone", async ({ page }, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { claudeSessions: 600, codexRollouts: 400 });
  await importDemo(page, "moderate");
  await page.reload();
  await expect(page.getByTestId("stored-imports").locator("li")).toHaveCount(1);
  await page.getByTestId("find-histories").click();
  await dropFolders(page, [home]);
  await expect(page.getByTestId("discovery-selection")).toBeVisible();
  await page.getByTestId("build-workload").click();
  const cancel = page.getByTestId("cancel-scan");
  await cancel.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("scan-canceled")).toContainText("saved workloads are unchanged");
  await expect(page.getByTestId("scan-instrument")).toHaveCount(0);
  // The sources are back, still selected, ready to build again.
  await expect(page.getByTestId("select-claude-code")).toBeChecked();
  await expect(page.getByTestId("build-workload")).toBeEnabled();
  // The demo is still saved, and the cancelled scan never lands.
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByTestId("stored-imports").locator("li")).toHaveCount(1);
  await expect(page.getByTestId("stored-imports")).toContainText("Demo");
});

test("connected histories are remembered by name and refresh asks for the folder again", async ({
  page,
}, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home);
  await discover(page, home);
  await page.getByTestId("build-workload").click();
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 60_000 });

  await page.reload();
  const connected = page.getByTestId("connected-histories");
  await expect(connected).toContainText("Claude Code · Codex");
  await expect(connected).toContainText("asks for your user folder again");
  const stored = await page.evaluate(() => localStorage.getItem("stackreplay.connections.v1"));
  expect(stored).not.toContain("dev-home");
  expect(stored).not.toContain("/");

  await page.getByTestId("refresh-connected").click();
  await expect(page.getByTestId("permission-preview")).toBeVisible();
  await dropFolders(page, [home]);
  await expect(page.getByTestId("history-claude-code")).toHaveAttribute("data-status", "found");

  // Clearing local data forgets them too.
  await page.getByTestId("clear-local-data").click();
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("connected-histories")).toHaveCount(0);
});

test("privacy: discovery opens only registered locations, reads nothing, and sends nothing", async ({
  page,
}, testInfo) => {
  const root = "dev-home";
  const home = testInfo.outputPath(root);
  await buildHome(home, { claudeSessions: 2, codexRollouts: 1 });
  await recordFolderAccess(page);
  const requests = captureRequests(page);
  await discover(page, home);

  const access = await folderAccess(page, root);
  const allowed = registeredProbePaths();
  const probes = access.filter((entry) => entry.op === "directory" || entry.op === "file");
  expect(probes.length).toBeGreaterThan(0);
  for (const probe of probes) expect(allowed.has(probe.path), probe.path).toBe(true);

  // Listings happen only inside the two history folders that were found.
  const listings = access.filter((entry) => entry.op === "list").map((entry) => entry.path);
  expect(listings.length).toBeGreaterThan(0);
  for (const listing of listings) {
    expect(listing, "the chosen folder itself is never listed").not.toBe("");
    expect(
      listing.startsWith(".claude/projects") || listing.startsWith(".codex/sessions"),
      listing,
    ).toBe(true);
  }
  expect(access.filter((entry) => entry.path.includes(CANARY))).toEqual([]);
  expect(access.filter((entry) => entry.op === "read")).toEqual([]);

  await page.getByTestId("build-workload").click();
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 60_000 });

  // Nothing about the folder or its history crosses the network: no bodies at
  // all, and no folder, file or project name in any URL or header.
  expect(requests.filter((request) => (request.body ?? "").length > 0)).toEqual([]);
  const markers = [root, CANARY, ".claude", ".codex", "synthetic-", "rollout-", ".jsonl"];
  for (const request of requests) {
    const surface = `${request.url} ${JSON.stringify(request.headers)}`;
    for (const marker of markers) expect(surface, request.url).not.toContain(marker);
  }
  const foreign = requests.filter((request) => !request.url.startsWith("http://localhost:3100"));
  expect(foreign.map((request) => request.url)).toEqual([]);
});

test("discovery states pass axe and selection works from the keyboard", async ({
  page,
}, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home);
  for (const theme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await gotoImport(page);
    const find = page.getByTestId("find-histories");
    await find.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Choose your user folder" })).toBeFocused();
    await expectNoSeriousViolations(page);
    await dropFolders(page, [home]);
    await expect(page.getByTestId("discovery-selection")).toBeVisible();
    await expectNoSeriousViolations(page);
  }
  const codex = page.getByTestId("select-codex");
  await codex.focus();
  await page.keyboard.press("Space");
  await expect(codex).not.toBeChecked();
  await expect(page.getByTestId("selection-count")).toContainText("1 selected");
  const build = page.getByRole("button", { name: "Build my workload from 1 selected history" });
  await build.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 60_000 });
});

test("the manual chooser stays one keyboard step away", async ({ page }) => {
  await gotoImport(page);
  const toggle = page.getByTestId("connect-individually");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("connect-claude-code")).toBeVisible();
  await expect(page.getByTestId("picker-note")).not.toContainText(/upload/iu);
});

test("touch devices get the folder chooser instead of drag discovery", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "touch emulation");
  await gotoImport(page);
  const discovery = page.getByTestId("history-discovery");
  await expect(discovery).toHaveAttribute("data-mode", "chooser");
  await expect(page.getByTestId("find-histories")).toHaveCount(0);
  await openConnectIndividually(page);
  await expect(page.getByTestId("connect-codex")).toBeVisible();
  await expect(page.getByTestId("discovery-unavailable")).toBeVisible();
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
