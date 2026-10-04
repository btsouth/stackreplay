import { normalizeProjectKey } from "./identity.js";
import type { SourceEnvironment } from "./types.js";

/** Git common root merges linked worktrees. Missing paths retain meaningful local folders. */
export async function projectKeyFor(env: SourceEnvironment, raw: string): Promise<string> {
  const key = normalizeProjectKey(raw, env.platform);
  const root = await env.fs.projectRoot?.(key);
  if (root) return root;
  const base = key
    .split(/[\\/]+/u)
    .at(-1)
    ?.toLowerCase();
  if (
    key === normalizeProjectKey(env.homeDir, env.platform) ||
    ["projects", "work", "home", "workspace", "repos", "worktrees", "~"].includes(base ?? "")
  )
    return "";
  return key;
}
