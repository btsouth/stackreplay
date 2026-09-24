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
    maxDepth: 1,
    extension: ".jsonl",
    excludeSuffixes: [".checkpoints.jsonl", ".prompts.jsonl"],
  },
  evidence: ["https://commandcode.ai/docs/sessions"],
};
