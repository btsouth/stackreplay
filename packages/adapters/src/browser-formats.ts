/** Raw formats the browser intake actually dispatches to shared adapters. */
export const BROWSER_SOURCE_FORMATS = [
  { id: "codex", name: "Codex", format: "session JSONL" },
  { id: "claude-code", name: "Claude Code", format: "session JSONL" },
  { id: "command-code", name: "Command Code", format: "session JSONL" },
  { id: "ccusage", name: "ccusage", format: "JSON" },
] as const;

export type BrowserSourceId = (typeof BROWSER_SOURCE_FORMATS)[number]["id"];
