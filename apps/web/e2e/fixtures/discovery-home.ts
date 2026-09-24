import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
} from "../../../../packages/adapters/src/fixtures/content";

/**
 * Synthetic home folders for discovery tests. Every name and value is
 * invented. `CANARY` folders stand for a person's documents, downloads,
 * repositories and app settings: discovery must never open them, and no
 * request may ever carry their names.
 */

export const CANARY = "CANARY";

const CLAUDE_ID = "11111111-1111-4111-8111-111111111111";
const CODEX_ID = "22222222-2222-4222-8222-222222222222";

function sessionId(base: string, index: number): string {
  return `${base.slice(0, -4)}${String(index).padStart(4, "0")}`;
}

export async function writeClaudeProjects(root: string, sessions: number): Promise<void> {
  for (let index = 0; index < sessions; index += 1) {
    const project = join(root, `-home-dev-work-synthetic-${index % 3}`);
    await mkdir(project, { recursive: true });
    const id = sessionId(CLAUDE_ID, index);
    await writeFile(join(project, `${id}.jsonl`), CLAUDE_CODE_SESSION.replaceAll(CLAUDE_ID, id));
  }
}

export async function writeCodexSessions(root: string, rollouts: number): Promise<void> {
  const day = join(root, "2026", "09", "19");
  await mkdir(day, { recursive: true });
  for (let index = 0; index < rollouts; index += 1) {
    const id = sessionId(CODEX_ID, index);
    await writeFile(
      join(day, `rollout-2026-09-19T11-00-00-${id}.jsonl`),
      CODEX_ROLLOUT.replaceAll(CODEX_ID, id),
    );
  }
}

async function personalFolders(home: string): Promise<void> {
  await mkdir(join(home, "Documents", `${CANARY}-taxes`), { recursive: true });
  await writeFile(join(home, "Documents", `${CANARY}-taxes`, "return.txt"), "private");
  await mkdir(join(home, "Downloads"), { recursive: true });
  await writeFile(join(home, "Downloads", `${CANARY}-installer.zip`), "private");
  await mkdir(join(home, "src", `${CANARY}-repo`, ".git"), { recursive: true });
  await writeFile(join(home, "src", `${CANARY}-repo`, "main.go"), "package main");
  await mkdir(join(home, ".config", `${CANARY}-app`), { recursive: true });
  await writeFile(join(home, ".config", `${CANARY}-app`, "settings.json"), "{}");
}

/**
 * A home with Claude Code and Codex history, an OpenCode database the browser
 * cannot parse, no Command Code or Hermes, and unrelated personal folders.
 */
export async function buildHome(
  home: string,
  options: {
    claudeSessions?: number;
    codexRollouts?: number;
    /** Put the Claude history elsewhere and link it, as a dotfiles setup would. */
    linkClaude?: string;
  } = {},
): Promise<void> {
  await personalFolders(home);
  await mkdir(join(home, ".claude"), { recursive: true });
  await writeFile(join(home, ".claude", "settings.json"), "{}");
  await writeFile(join(home, ".claude.json"), "{}");
  if (options.linkClaude === undefined) {
    await writeClaudeProjects(join(home, ".claude", "projects"), options.claudeSessions ?? 2);
  } else {
    await writeClaudeProjects(options.linkClaude, options.claudeSessions ?? 2);
    await symlink(
      options.linkClaude,
      join(home, ".claude", "projects"),
      process.platform === "win32" ? "junction" : "dir",
    );
  }
  await writeCodexSessions(join(home, ".codex", "sessions"), options.codexRollouts ?? 1);
  await mkdir(join(home, ".local", "share", "opencode"), { recursive: true });
  await writeFile(join(home, ".local", "share", "opencode", "opencode.db"), "SQLite format 3");
}
