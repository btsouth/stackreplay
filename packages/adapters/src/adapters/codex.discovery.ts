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
  relocatedBy: "CODEX_HOME",
  evidence: [
    "https://github.com/openai/codex/blob/main/codex-rs/utils/home-dir/src/lib.rs",
    "https://github.com/openai/codex/blob/main/codex-rs/rollout/src/lib.rs",
  ],
};
