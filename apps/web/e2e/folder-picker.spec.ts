import { expect, test } from "@playwright/test";
import {
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
} from "../../../packages/adapters/src/fixtures/content";
import { languageMatches } from "./app-language";
import { gotoImport, inspectLatestImport, openConnectIndividually } from "./premium-app-helpers";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("choosing home skips a large decoy tree and scans Claude Code and Codex", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "main chooser is on desktop");
  await page.addInitScript(
    ({ claude, codex }) => {
      type Node = { [name: string]: Node | string };
      const access: { op: string; path: string }[] = [];
      const state = window as unknown as {
        __pickerAccess: typeof access;
        __pickerOptions: unknown;
      };
      state.__pickerAccess = access;
      const handle = (name: string, tree: Node, path = "") => ({
        kind: "directory",
        name,
        async getDirectoryHandle(child: string) {
          access.push({ op: "directory", path: `${path}${child}` });
          const node = tree[child];
          if (node === undefined || typeof node === "string")
            throw new DOMException("Missing", "NotFoundError");
          return handle(child, node, `${path}${child}/`);
        },
        async getFileHandle(child: string) {
          access.push({ op: "file", path: `${path}${child}` });
          const content = tree[child];
          if (typeof content !== "string") throw new DOMException("Missing", "NotFoundError");
          return {
            kind: "file",
            name: child,
            async getFile() {
              return new File([content], child);
            },
          };
        },
        async *values(): AsyncGenerator<unknown> {
          access.push({ op: "list", path: path.slice(0, -1) });
          // The chosen home's own top-level names are listed once to find
          // alternate Claude config folders; nothing else is listed.
          if (path !== "" && !/^\.(claude\/projects|codex\/sessions)(\/|$)/u.test(path))
            throw new Error("Unrelated directory was listed");
          for (const [child, node] of Object.entries(tree)) {
            if (typeof node === "string") yield await this.getFileHandle(child);
            else yield handle(child, node, `${path}${child}/`);
          }
        },
      });
      const home = handle("bts", {
        ".claude": { projects: { project: { "session.jsonl": claude } } },
        ".codex": { sessions: { "2026": { "rollout.jsonl": codex } } },
        Projects: {
          node_modules: Object.fromEntries(
            Array.from({ length: 100_000 }, (_, i) => [`decoy-${i}`, {}]),
          ),
        },
        Documents: {},
        ".cache": {},
      });
      Object.defineProperty(window, "showDirectoryPicker", {
        configurable: true,
        value: async (options: unknown) => {
          state.__pickerOptions = options;
          return home;
        },
      });
    },
    { claude: CLAUDE_CODE_SESSION, codex: CODEX_ROLLOUT },
  );
  await gotoImport(page);
  await page.getByTestId("choose-history-folder").click();
  await expect(page.getByTestId("discovery-selection")).toBeVisible();
  await expect(page.getByTestId("history-claude-code")).toHaveAttribute("data-status", "found");
  await expect(page.getByTestId("history-codex")).toHaveAttribute("data-status", "found");
  const log = await page.evaluate(
    () => (window as unknown as { __pickerAccess: { op: string; path: string }[] }).__pickerAccess,
  );
  expect(log.filter((entry) => entry.op === "list").map((entry) => entry.path)).toEqual([
    "",
    ".claude/projects",
    ".claude/projects/project",
    ".codex/sessions",
    ".codex/sessions/2026",
  ]);
  expect(log.some((entry) => /Projects|Documents|\.cache|decoy/u.test(entry.path))).toBe(false);
  expect(
    await page.evaluate(() => (window as unknown as { __pickerOptions: unknown }).__pickerOptions),
  ).toEqual({ id: "stackreplay-history", startIn: "documents", mode: "read" });
  expect(languageMatches(await page.getByTestId("intake-surface").innerText())).toEqual([]);
  await page.getByTestId("build-workload").click();
  await inspectLatestImport(page);
  await expect(page.getByTestId("detected-sources").first()).toContainText("Claude Code");
  await expect(page.getByTestId("detected-sources").first()).toContainText("Codex");
});

for (const name of ["NotAllowedError", "SecurityError", "NotFoundError", "AbortError", "Error"]) {
  test(`${name} leaves both folder chooser paths usable`, async ({ page }, testInfo) => {
    await page.addInitScript(
      (name) =>
        Object.defineProperty(window, "showDirectoryPicker", {
          configurable: true,
          value: async () => {
            throw name === "Error" ? new Error("Failed") : new DOMException("Failed", name);
          },
        }),
      name,
    );
    await gotoImport(page);
    if (testInfo.project.name === "desktop") {
      const button = page.getByTestId("choose-history-folder");
      await button.click();
      await expect(button).toBeEnabled();
      if (name === "AbortError")
        await expect(page.getByTestId("discovery-drop-note")).toHaveCount(0);
      else await expect(page.getByTestId("discovery-drop-note")).toContainText("Drag Home");
      await button.click();
      await expect(button).toBeEnabled();
    }
    await openConnectIndividually(page);
    const tool = page.getByTestId("connect-claude-code");
    await tool.click();
    await expect(tool).toBeEnabled();
    if (name === "AbortError") await expect(page.getByTestId("source-picker-note")).toHaveCount(0);
    else await expect(page.getByTestId("source-picker-note")).toContainText("Drag Home");
    await tool.click();
    await expect(tool).toBeEnabled();
  });
}

test("per-tool chooser uses a lazy handle and completes a scan", async ({ page }) => {
  await page.addInitScript((content) => {
    const file = {
      kind: "file",
      name: "session.jsonl",
      getFile: async () => new File([content], "session.jsonl"),
    };
    const folder = {
      kind: "directory",
      name: "projects",
      async getDirectoryHandle() {
        throw new DOMException("Missing", "NotFoundError");
      },
      async getFileHandle() {
        throw new DOMException("Missing", "NotFoundError");
      },
      async *values() {
        yield file;
      },
    };
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: async () => folder,
    });
  }, CLAUDE_CODE_SESSION);
  await gotoImport(page);
  await openConnectIndividually(page);
  await page.getByTestId("connect-claude-code").click();
  await inspectLatestImport(page);
  await expect(page.getByTestId("detected-sources").first()).toContainText("Claude Code");
});

test("permission lost during discovery releases both chooser paths", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const missing = async () => {
      throw new DOMException("Missing", "NotFoundError");
    };
    const projects = {
      kind: "directory",
      name: "projects",
      getDirectoryHandle: missing,
      getFileHandle: missing,
      values() {
        throw new DOMException("Permission revoked", "NotAllowedError");
      },
    };
    const tool = {
      kind: "directory",
      name: ".claude",
      async getDirectoryHandle(name: string) {
        if (name === "projects") return projects;
        return missing();
      },
      getFileHandle: missing,
    };
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: async () => tool,
    });
  });
  await gotoImport(page);
  if (testInfo.project.name === "desktop") {
    await page.getByTestId("choose-history-folder").click();
    await expect(page.getByTestId("discovery-drop-note")).toContainText("Drag Home");
    await expect(page.getByTestId("choose-history-folder")).toBeEnabled();
  }
  await openConnectIndividually(page);
  await page.getByTestId("connect-claude-code").click();
  await expect(page.getByTestId("source-picker-note")).toContainText("Drag Home");
  await expect(page.getByTestId("connect-claude-code")).toBeEnabled();
});

test("legacy chooser copy steers to tool folders", async ({ page }, testInfo) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: undefined }),
  );
  await gotoImport(page);
  if (testInfo.project.name === "desktop") {
    await expect(page.getByTestId("choose-history-folder")).toHaveText("Choose a tool folder");
    await expect(page.getByTestId("folder-picker-hint")).toContainText("Avoid choosing Home");
  }
  await openConnectIndividually(page);
  await expect(page.getByTestId("picker-note")).toContainText("Avoid choosing Home");
});
