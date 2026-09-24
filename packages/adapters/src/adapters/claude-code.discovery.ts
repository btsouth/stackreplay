import type { SourceDiscovery } from "../discovery-types.js";

/**
 * Claude Code keeps transcripts at `~/.claude/projects/<project>/<session>.jsonl`,
 * with subagent transcripts in `<session>/subagents/`. On Windows `~/.claude`
 * is `%USERPROFILE%\.claude`. `CLAUDE_CONFIG_DIR` moves all of it, and
 * `~/.claude.json` is written beside the folder in the home directory.
 */
export const CLAUDE_CODE_DISCOVERY: SourceDiscovery = {
  adapterId: "claude-code",
  name: "Claude Code",
  history: [
    { path: [".claude", "projects"], kind: "directory", platforms: ["linux", "macos", "windows"] },
  ],
  installed: [
    { path: [".claude"], kind: "directory", platforms: ["linux", "macos", "windows"] },
    { path: [".claude.json"], kind: "file", platforms: ["linux", "macos", "windows"] },
  ],
  inventory: { maxDepth: 3, extension: ".jsonl" },
  relocatedBy: "CLAUDE_CONFIG_DIR",
  evidence: [
    "https://code.claude.com/docs/en/claude-directory",
    "https://code.claude.com/docs/en/settings",
  ],
};
