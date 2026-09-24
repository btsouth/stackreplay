import type { SourceDiscovery } from "../discovery-types.js";

/**
 * Command Code documents `~/.commandcode/projects/<project-slug>/<session-id>.jsonl`
 * with `.checkpoints.jsonl` and `.prompts.jsonl` sidecars that carry no usage.
 * It documents no separate Windows location, so none is claimed here; the
 * probe still runs under whatever folder the user chooses.
 */
export const COMMAND_CODE_DISCOVERY: SourceDiscovery = {
  adapterId: "command-code",
  name: "Command Code",
  history: [
    { path: [".commandcode", "projects"], kind: "directory", platforms: ["linux", "macos"] },
  ],
  installed: [{ path: [".commandcode"], kind: "directory", platforms: ["linux", "macos"] }],
  inventory: {
    // Sessions sit one level down; the margin keeps a nested transcript in.
    maxDepth: 3,
    extension: ".jsonl",
    excludeSuffixes: [".checkpoints.jsonl", ".prompts.jsonl"],
  },
  roots: [
    {
      requires: [
        { name: "projects", kind: "directory" },
        { name: "history.jsonl", kind: "file" },
      ],
      history: ["projects"],
      kind: "directory",
    },
  ],
  // The documented `.meta.json` and `.checkpoints.jsonl` sidecars tell it apart from Claude Code.
  historyNames: { anyOf: ["\\.meta\\.json$", "\\.checkpoints\\.jsonl$"] },
  evidence: ["https://commandcode.ai/docs/sessions"],
};
