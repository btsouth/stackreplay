import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
  OPENCODE_FIXTURE_SQL,
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

export async function writeClaudeProjects(
  root: string,
  sessions: number,
  options: { first?: number; model?: string } = {},
): Promise<void> {
  const first = options.first ?? 0;
  for (let index = first; index < first + sessions; index += 1) {
    const project = join(root, `-home-dev-work-synthetic-${index % 3}`);
    await mkdir(project, { recursive: true });
    const id = sessionId(CLAUDE_ID, index);
    const content = CLAUDE_CODE_SESSION.replaceAll(CLAUDE_ID, id);
    await writeFile(
      join(project, `${id}.jsonl`),
      options.model === undefined ? content : content.replaceAll("example-medium", options.model),
    );
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
 * A Claude Code profile (`.claude.json`) as Claude Code writes it, every value
 * invented. `CANARY` marks the fields StackReplay must never keep.
 */
export function claudeProfile(account: {
  id: string;
  name: string;
  email: string;
  type: string;
  tier: string;
}): string {
  return JSON.stringify({
    numStartups: 3,
    projects: { [`/home/dev/${CANARY}-repo`]: { allowedTools: [] } },
    oauthAccount: {
      accountUuid: account.id,
      emailAddress: account.email,
      displayName: account.name,
      fullName: `${account.name} ${CANARY}`,
      organizationUuid: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      organizationName: `${CANARY} org`,
      organizationRole: "admin",
      organizationType: account.type,
      organizationRateLimitTier: account.tier,
      billingType: "stripe_subscription",
      hasExtraUsageEnabled: false,
      profileFetchedAt: Date.UTC(2026, 8, 30, 12),
    },
  });
}

/**
 * A home with Claude Code, Codex and OpenCode history, no Command Code or
 * Hermes, and unrelated personal folders.
 */
export async function buildHome(
  home: string,
  options: {
    claudeSessions?: number;
    codexRollouts?: number;
    /** Put the Claude history elsewhere and link it, as a dotfiles setup would. */
    linkClaude?: string;
    /** The signed-in account's profile; signed out (`{}`) by default. */
    claudeProfile?: string;
    /** A real catalog model for Claude sessions, so the workload is not a demo one. */
    claudeModel?: string;
  } = {},
): Promise<void> {
  await personalFolders(home);
  await mkdir(join(home, ".claude"), { recursive: true });
  await writeFile(join(home, ".claude", "settings.json"), "{}");
  await writeFile(join(home, ".claude.json"), options.claudeProfile ?? "{}");
  if (options.linkClaude === undefined) {
    await writeClaudeProjects(join(home, ".claude", "projects"), options.claudeSessions ?? 2, {
      ...(options.claudeModel === undefined ? {} : { model: options.claudeModel }),
    });
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
  const db = new DatabaseSync(join(home, ".local", "share", "opencode", "opencode.db"));
  try {
    for (const statement of OPENCODE_FIXTURE_SQL)
      db.exec(
        statement
          .replaceAll("example-medium", "gpt-6.1-sol")
          .replaceAll("example-small", "gpt-6.1-sol")
          .replaceAll("example-provider", "openai"),
      );
  } finally {
    db.close();
  }
}
