import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { languageMatches } from "./app-language";
import { buildHome, writeClaudeProjects } from "./fixtures/discovery-home";
import { dropFolders, gotoImport, waitForWorkload } from "./premium-app-helpers";

/**
 * Claude Code discovery is never silent.
 *
 * A drag cannot follow a linked history folder, so the tool is shown as
 * needing access: a prominent block above the list, and a confirm step before
 * a recap is built without it. Alternate `CLAUDE_CONFIG_DIR` folders
 * (`.claude2`, `.claude-work`) are found and imported together.
 */

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "folder discovery is a desktop path");
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function dropHome(page: Page, home: string): Promise<void> {
  await gotoImport(page);
  await page.getByTestId("find-histories").click();
  await expect(page.getByTestId("permission-preview")).toBeVisible();
  await dropFolders(page, [home]);
  await expect(page.getByTestId("discovery-selection")).toBeVisible();
}

test("a linked Claude history is shown loudly and confirmed before it is left out", async ({
  page,
}, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  const external = testInfo.outputPath("external/claude-projects");
  await buildHome(home, { claudeSessions: 2, codexRollouts: 1, linkClaude: external });
  await dropHome(page, home);

  await expect(page.getByTestId("history-claude-code")).toHaveAttribute(
    "data-status",
    "access-needed",
  );
  // The prominent block sits above the list, one per affected tool.
  const block = page.getByTestId("missing-claude-code");
  await expect(block).toBeVisible();
  await expect(block).toContainText("Claude Code isn't included yet");
  await expect(block).toContainText("a link, which a drag can't follow");
  await expect(block).toContainText("Connect it, choose ~/.claude/projects");
  await expect(block).toContainText("confirm your browser's upload prompt");
  await expect(page.getByTestId("top-connect-claude-code")).toBeVisible();
  expect(languageMatches(await page.getByTestId("history-discovery").innerText())).toEqual([]);

  // Making a recap first asks, and says exactly what would be left out.
  await page.getByTestId("build-workload").click();
  const confirm = page.getByTestId("connect-confirm");
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText("Claude Code won't be in your recap.");
  await expect(page.getByTestId("confirm-connect-claude-code")).toBeVisible();
  expect(languageMatches(await confirm.innerText())).toEqual([]);

  await page.getByTestId("build-without-missing").click();
  await waitForWorkload(page);
  const notice = page.getByTestId("skipped-tool-notice");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("Claude Code was found but not included");
  await expect(notice.getByRole("link", { name: "Connect it" })).toHaveAttribute(
    "href",
    "/app/scan",
  );
  expect(languageMatches(await notice.innerText())).toEqual([]);
});

test("extra .claude2 history is found, listed and imported with Claude Code", async ({
  page,
}, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { claudeSessions: 1, codexRollouts: 1 });
  await mkdir(join(home, ".claude2"), { recursive: true });
  await writeFile(join(home, ".claude2", "session-env"), "");
  await writeClaudeProjects(join(home, ".claude2", "projects"), 2);
  await dropHome(page, home);

  const claude = page.getByTestId("history-claude-code");
  await expect(claude).toHaveAttribute("data-status", "found");
  const locations = page.getByTestId("locations-claude-code");
  await expect(locations).toContainText("~/.claude/projects");
  await expect(locations).toContainText("~/.claude2/projects");
  // All three session files are one Claude Code history.
  await expect(claude).toContainText("3 files");

  await page.getByTestId("select-codex").uncheck();
  await page.getByTestId("build-workload").click();
  await waitForWorkload(page);
  await expect(page.getByTestId("skipped-tool-notice")).toHaveCount(0);
});

/**
 * Chromium's folder picker never follows a symbolic link: a picked link fails
 * every read, and picking `~/.claude` hides the linked `projects`. The upload
 * chooser does follow a picked link, so Connect for a linked history uses it
 * (both checked in Chromium on Linux). The folder picker cannot be driven from
 * Playwright, so its handle is stubbed with exactly those semantics.
 */
test("Connect Claude Code reads a linked projects folder through the upload chooser", async ({
  page,
}, testInfo) => {
  const real = testInfo.outputPath("real-data/claude-projects");
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { claudeSessions: 1, codexRollouts: 1, linkClaude: real });

  await dropHome(page, home);
  await expect(page.getByTestId("history-claude-code")).toHaveAttribute(
    "data-status",
    "access-needed",
  );
  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("top-connect-claude-code").click();
  await (await chooser).setFiles(join(home, ".claude", "projects"));
  await expect(page.getByTestId("history-claude-code")).toHaveAttribute("data-status", "found");
  await expect(page.getByTestId("history-claude-code")).toContainText("1 file");
  await expect(page.getByTestId("missing-claude-code")).toHaveCount(0);
});

test("a picked link the folder picker cannot read says so", async ({ page }, testInfo) => {
  const real = testInfo.outputPath("real-data/claude-projects");
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { claudeSessions: 1, codexRollouts: 1, linkClaude: real });

  const link = await readTree(join(home, ".claude", "projects"));
  await page.addInitScript(installPicker, { tree: link, rootName: "projects" });

  await gotoImport(page);
  await page.getByTestId("choose-history-folder").click();
  const note = page.getByTestId("discovery-drop-note");
  await expect(note).toContainText("Your browser can't open projects because it is a link");
  expect(languageMatches(await note.innerText())).toEqual([]);
});

test("the chooser cannot descend from .claude into a linked projects", async ({
  page,
}, testInfo) => {
  const real = testInfo.outputPath("real-data/claude-projects");
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { claudeSessions: 1, codexRollouts: 1, linkClaude: real });

  const tool = await readTree(join(home, ".claude"));
  await page.addInitScript(installPicker, { tree: tool, rootName: ".claude" });

  await gotoImport(page);
  await page.getByTestId("choose-history-folder").click();
  await expect(page.getByTestId("discovery-selection")).toBeVisible();
  // The linked `projects` is invisible from `.claude`, so nothing is found.
  await expect(page.getByTestId("history-claude-code")).not.toHaveAttribute("data-status", "found");
  await expect(page.getByTestId("missing-claude-code")).toBeVisible();
});

test("connecting Claude from .claude with a linked projects says what to choose", async ({
  page,
}, testInfo) => {
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, {
    claudeSessions: 1,
    codexRollouts: 1,
    linkClaude: testInfo.outputPath("real"),
  });
  // What the upload chooser hands over for .claude: the linked projects is dropped.
  const tool = testInfo.outputPath("picked/.claude");
  await mkdir(tool, { recursive: true });
  await writeFile(join(tool, "settings.json"), "{}");

  await dropHome(page, home);
  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("top-connect-claude-code").click();
  await (await chooser).setFiles(tool);
  const note = page.getByTestId("discovery-drop-note");
  await expect(note).toContainText("Claude Code still isn't included");
  await expect(note).toContainText("Choose ~/.claude/projects itself");
  expect(languageMatches(await note.innerText())).toEqual([]);
  await expect(page.getByTestId("history-claude-code")).not.toHaveAttribute("data-status", "found");
});

type ReadNode =
  | { kind: "dir"; entries: Record<string, ReadNode> }
  | { kind: "file"; content: string }
  | { kind: "link" };

/** Reads a real directory into a serializable tree, marking symbolic links. */
async function readTree(path: string): Promise<ReadNode> {
  const info = await lstat(path);
  if (info.isSymbolicLink()) return { kind: "link" };
  if (info.isFile()) return { kind: "file", content: await readFile(path, "utf8") };
  const entries: Record<string, ReadNode> = {};
  for (const name of await readdir(path)) entries[name] = await readTree(join(path, name));
  return { kind: "dir", entries };
}

/** Runs in the page: a directory handle with Chromium's symlink semantics. */
function installPicker({ tree, rootName }: { tree: ReadNode; rootName: string }): void {
  type Node = ReadNode;
  const handle = (name: string, node: Extract<Node, { kind: "dir" }>) => ({
    kind: "directory" as const,
    name,
    async getDirectoryHandle(child: string) {
      const next = node.entries[child];
      // A linked child is reported as missing, never followed.
      if (next === undefined || next.kind !== "dir")
        throw new DOMException("Missing", "NotFoundError");
      return handle(child, next);
    },
    async getFileHandle(child: string) {
      const next = node.entries[child];
      if (next === undefined || next.kind !== "file")
        throw new DOMException("Missing", "NotFoundError");
      return {
        kind: "file" as const,
        name: child,
        async getFile() {
          return new File([next.content], child);
        },
      };
    },
    async *values() {
      for (const [child, next] of Object.entries(node.entries)) {
        if (next.kind === "link") continue; // Chromium hides symbolic links.
        if (next.kind === "dir") yield handle(child, next);
        else yield await this.getFileHandle(child);
      }
    },
  });
  const missing = () => {
    throw new DOMException("Missing", "NotFoundError");
  };
  // A picked link opens, then fails every read.
  const root =
    tree.kind === "dir"
      ? handle(rootName, tree)
      : {
          kind: "directory" as const,
          name: rootName,
          getDirectoryHandle: async () => missing(),
          getFileHandle: async () => missing(),
          values: () => ({
            next: async () => missing(),
            [Symbol.asyncIterator]() {
              return this;
            },
          }),
        };
  Object.defineProperty(window, "showDirectoryPicker", {
    configurable: true,
    value: async () => root,
  });
}
