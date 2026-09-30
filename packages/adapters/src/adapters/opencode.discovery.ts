import type { SourceDiscovery } from "../discovery-types.js";

/**
 * OpenCode documents its data at `~/.local/share/opencode/` on macOS and Linux
 * and `%USERPROFILE%\.local\share\opencode` on Windows. Usage lives in its
 * SQLite database, shared by the CLI and the desktop's local CLI server.
 */
export const OPENCODE_DISCOVERY: SourceDiscovery = {
  adapterId: "opencode",
  name: "OpenCode",
  history: [
    // Compatibility with the native collector's macOS data-home location.
    {
      path: ["Library", "Application Support", "opencode", "opencode.db"],
      kind: "file",
      platforms: ["macos"],
    },
    {
      path: ["AppData", "Local", "opencode", "opencode.db"],
      kind: "file",
      platforms: ["windows"],
    },
    {
      path: [".local", "share", "opencode", "opencode.db"],
      kind: "file",
      platforms: ["linux", "macos", "windows"],
    },
  ],
  installed: [],
  companionFiles: ["opencode.db-wal"],
  // The data folder under any name: it holds the documented database.
  roots: [
    {
      requires: [{ name: "opencode.db", kind: "file" }],
      history: ["opencode.db"],
      kind: "file",
    },
  ],
  evidence: ["https://opencode.ai/docs/troubleshooting/"],
};
