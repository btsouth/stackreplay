import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
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
  await expect(block).toContainText("a link your browser can't follow from a drag");
  await expect(block).toContainText("Choose ~/.claude/projects");
  await expect(block).toContainText("The chooser follows the link");
  await expect(page.getByTestId("top-connect-claude-code")).toBeVisible();

  // Making a recap first asks, and says exactly what would be left out.
  await page.getByTestId("build-workload").click();
  const confirm = page.getByTestId("connect-confirm");
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText("Claude Code won't be in your recap.");
  await expect(page.getByTestId("confirm-connect-claude-code")).toBeVisible();

  await page.getByTestId("build-without-missing").click();
  await waitForWorkload(page);
  const notice = page.getByTestId("skipped-tool-notice");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("Claude Code was found but not included");
  await expect(notice.getByRole("link", { name: "Connect it" })).toHaveAttribute(
    "href",
    "/app/scan",
  );
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
 * Chromium's File System Access layer treats any path containing a symbolic
 * link as not found (`storage/browser/file_system/local_file_util.cc`,
 * `IsHiddenItemUnderRoot` / `GetLocalFilePath`), except that the picked folder
 * itself is not checked. So picking `~/.claude/projects` (the link) reads its
 * target, while picking `~/.claude` cannot descend into the linked `projects`.
 * The native picker cannot be driven from Playwright, so the handle is stubbed
 * over a real temp tree with exactly those semantics.
 */
test("the chooser reads a picked linked folder but not a linked child", async ({
  page,
}, testInfo) => {
  const real = testInfo.outputPath("real-data/claude-projects");
  const home = testInfo.outputPath("dev-home");
  await buildHome(home, { claudeSessions: 1, codexRollouts: 1, linkClaude: real });

  // Picking the link itself: the handle root is the link, read through it.
  const target = await readTree(real);
  await page.addInitScript(installPicker, { tree: target, rootName: "projects" });

  await dropHome(page, home);
  await expect(page.getByTestId("history-claude-code")).toHaveAttribute(
    "data-status",
    "access-needed",
  );
  await page.getByTestId("top-connect-claude-code").click();
  await expect(page.getByTestId("history-claude-code")).toHaveAttribute("data-status", "found");
  await expect(page.getByTestId("history-claude-code")).toContainText("1 file");
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
  const root =
    tree.kind === "dir" ? handle(rootName, tree) : handle(rootName, { kind: "dir", entries: {} });
  Object.defineProperty(window, "showDirectoryPicker", {
    configurable: true,
    value: async () => root,
  });
}
