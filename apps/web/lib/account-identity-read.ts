import {
  CLAUDE_PROFILE_MAX_BYTES,
  type ClaudeProfile,
  claudeLocationAccount,
  readClaudeProfile,
} from "@stackreplay/adapters/claude-profile";
import { rememberAccountIdentities } from "./account-identity";
import type { HistorySelection } from "./discovery-list";
import { localSourceRootSalt } from "./review-storage";

/**
 * Reads the profile of each selected Claude history once a saved workload is
 * built, and remembers it for that history's local accounts. Runs in this
 * page only: nothing read here is sent anywhere or added to the workload.
 * A profile that is missing, too large or unreadable is skipped silently,
 * since the workload never depends on it.
 */
export async function learnAccountIdentities(
  profiles: HistorySelection["profiles"],
): Promise<void> {
  const claude = profiles.filter((entry) => entry.adapterId === "claude-code");
  if (claude.length === 0) return;
  const salt = localSourceRootSalt();
  const learned: Record<string, ClaudeProfile> = {};
  for (const entry of claude) {
    let profile: ClaudeProfile | undefined;
    try {
      const file = await entry.get();
      if (file.size > CLAUDE_PROFILE_MAX_BYTES) continue;
      profile = readClaudeProfile(await file.text(), salt);
    } catch {
      continue;
    }
    if (profile === undefined) continue;
    for (const path of entry.paths) {
      const key = claudeLocationAccount(path, entry.group, salt);
      if (key !== undefined) learned[key] = profile;
    }
  }
  rememberAccountIdentities(learned);
}
