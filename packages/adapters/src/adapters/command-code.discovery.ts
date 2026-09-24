import type { SourceDiscovery } from "../discovery-types.js";

/**
 * Command Code documents `~/.commandcode/projects/<project-slug>/<session-id>.jsonl`
 * with `.checkpoints.jsonl` and `.prompts.jsonl` sidecars that carry no usage.
 * It documents no separate Windows location, so none is claimed here; the
 * probe still runs under whatever folder the user chooses. It documents no way
 * to move the folder and no name only its root holds, so a renamed root is not
 * recognized: `.commandcode` itself, or the folder chooser, is the way in.
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
  evidence: ["https://commandcode.ai/docs/sessions"],
};
