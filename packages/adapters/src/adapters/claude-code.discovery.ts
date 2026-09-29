import type { SourceDiscovery } from "../discovery-types.js";

/**
 * Claude Code keeps transcripts at `~/.claude/projects/<project>/<session>.jsonl`,
 * with subagent transcripts in `<session>/subagents/` and workflow agents
 * below that. On Windows `~/.claude`
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
  // Subagent transcripts nest below their session, and workflow agents below
  // those (`<session>/subagents/workflows/<workflow>/agent-*.jsonl`, five folder
  // levels down); the bound leaves room for deeper nesting inside `projects`.
  inventory: { maxDepth: 8, extension: ".jsonl" },
  // A custom CLAUDE_CONFIG_DIR holds the same `projects` folder and prompt
  // history. Command Code writes both of those too, so a folder counts as
  // Claude Code's only beside a name the Claude Code docs list and no other
  // supported tool writes.
  roots: [
    {
      requires: [
        { name: "projects", kind: "directory" },
        { name: "history.jsonl", kind: "file" },
      ],
      anyOf: [
        { name: "shell-snapshots", kind: "directory" },
        { name: "session-env", kind: "directory" },
        { name: "stats-cache.json", kind: "file" },
      ],
      history: ["projects"],
      kind: "directory",
    },
  ],
  relocatedBy: "CLAUDE_CONFIG_DIR",
  evidence: [
    "https://code.claude.com/docs/en/claude-directory",
    "https://code.claude.com/docs/en/settings",
  ],
};
