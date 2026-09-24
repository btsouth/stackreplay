import type { SourceDiscovery } from "../discovery-types.js";

/**
 * OpenCode documents its data at `~/.local/share/opencode/` on macOS and Linux
 * and `%USERPROFILE%\.local\share\opencode` on Windows. Usage lives in its
 * SQLite database, which the browser does not parse: discovery reports it and
 * leaves collection to the CLI adapter.
 */
export const OPENCODE_DISCOVERY: SourceDiscovery = {
  adapterId: "opencode",
  name: "OpenCode",
  history: [
    {
      path: [".local", "share", "opencode", "opencode.db"],
      kind: "file",
      platforms: ["linux", "macos", "windows"],
    },
  ],
  installed: [],
  evidence: ["https://opencode.ai/docs/troubleshooting/"],
};
