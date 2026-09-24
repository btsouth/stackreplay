import type { SourceDiscovery } from "../discovery-types.js";

/**
 * Codex resolves its home as `CODEX_HOME`, else `~/.codex` from the `dirs`
 * crate's home directory (the user profile on Windows), and writes rollouts to
 * `sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl` inside it.
 */
export const CODEX_DISCOVERY: SourceDiscovery = {
  adapterId: "codex",
  name: "Codex",
  history: [
    { path: [".codex", "sessions"], kind: "directory", platforms: ["linux", "macos", "windows"] },
  ],
  installed: [{ path: [".codex"], kind: "directory", platforms: ["linux", "macos", "windows"] }],
  inventory: { maxDepth: 3, extension: ".jsonl" },
  // A custom CODEX_HOME keeps `sessions` beside its `config.toml`. Other tools
  // keep a `sessions` folder and a TOML config too, so one of the names Codex's
  // own source writes into its home must be there as well.
  roots: [
    {
      requires: [
        { name: "sessions", kind: "directory" },
        { name: "config.toml", kind: "file" },
      ],
      anyOf: [
        { name: "session_index.jsonl", kind: "file" },
        { name: "archived_sessions", kind: "directory" },
        { name: "models_cache.json", kind: "file" },
      ],
      history: ["sessions"],
      kind: "directory",
    },
  ],
  relocatedBy: "CODEX_HOME",
  evidence: [
    "https://github.com/openai/codex/blob/main/codex-rs/utils/home-dir/src/lib.rs",
    "https://github.com/openai/codex/blob/main/codex-rs/rollout/src/lib.rs",
    "https://github.com/openai/codex/blob/main/codex-rs/rollout/src/session_index.rs",
    "https://github.com/openai/codex/blob/main/codex-rs/models-manager/src/manager.rs",
  ],
};
