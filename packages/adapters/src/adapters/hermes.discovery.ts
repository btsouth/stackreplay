import type { SourceDiscovery } from "../discovery-types.js";

/**
 * Hermes keeps `~/.hermes/` on Linux, macOS and WSL2 (usage in `state.db`), and
 * native Windows defaults `HERMES_HOME` to `%LOCALAPPDATA%\hermes`. Its SQLite
 * store is not parsed in the browser.
 */
export const HERMES_DISCOVERY: SourceDiscovery = {
  adapterId: "hermes",
  name: "Hermes",
  history: [
    { path: [".hermes", "state.db"], kind: "file", platforms: ["linux", "macos"] },
    { path: ["AppData", "Local", "hermes"], kind: "directory", platforms: ["windows"] },
  ],
  installed: [],
  relocatedBy: "HERMES_HOME",
  evidence: [
    "https://hermes-agent.nousresearch.com/docs/getting-started/installation",
    "https://hermes-agent.nousresearch.com/docs/user-guide/windows-native",
  ],
};
