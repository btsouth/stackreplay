import { claudeAccountHash, normalizeProjectKey, sourceRootHash } from "./identity.js";

/**
 * What StackReplay keeps from a Claude Code profile (`.claude.json`, beside a
 * found Claude history). The file is parsed in the browser and this fixed
 * list of `oauthAccount` fields is kept; everything else in it (projects,
 * paths, settings, organization ids, any other personal field) is dropped
 * where it is parsed. The account id is kept only as a salted hash.
 *
 * Name and email are kept so the person can recognise their own account.
 * They stay in the browser that read them, hidden until the person shows
 * them, and are never part of a workload, an export, a share or a link.
 */
export interface ClaudeProfile {
  /** Salted hash of the signed-in account's id (`ca_…`). */
  account: string;
  name?: string;
  email?: string;
  /** Claude Code's own plan type, such as `claude_max` or `claude_pro`. */
  organizationType?: string;
  /** Claude Code's own rate-limit tier, such as `default_claude_max_5x`. */
  rateLimitTier?: string;
  /** When Claude Code last refreshed this profile (a UTC calendar date): a snapshot, not a history. */
  fetchedOn?: string;
}

/** A profile larger than this is not read at all. Real ones are tens of kilobytes. */
export const CLAUDE_PROFILE_MAX_BYTES = 4 * 1024 * 1024;

const ENUM = /^[a-z0-9_]{1,48}$/u;
const ACCOUNT_ID = /^[0-9a-f-]{8,64}$/iu;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function enumField(value: unknown): string | undefined {
  return typeof value === "string" && ENUM.test(value) ? value : undefined;
}

function textField(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = Array.from(value, (character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127 ? " " : character;
  })
    .join("")
    .replace(/\s+/gu, " ")
    .trim();
  return text.length > 0 && text.length <= max ? text : undefined;
}

function fetchedOn(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  // Between 2020 and 2100: anything else is not a refresh time.
  if (value < 1_577_836_800_000 || value > 4_102_444_800_000) return undefined;
  return new Date(value).toISOString().slice(0, 10);
}

/**
 * The kept fields of one Claude Code profile, or undefined when the text has
 * no signed-in account. `salt` is the browser's local identity salt.
 */
export function readClaudeProfile(text: string, salt: string): ClaudeProfile | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  const oauth = isRecord(parsed) ? parsed.oauthAccount : undefined;
  if (!isRecord(oauth)) return undefined;
  const id = oauth.accountUuid;
  if (typeof id !== "string" || !ACCOUNT_ID.test(id)) return undefined;
  const name = textField(oauth.displayName, 80);
  const email = textField(oauth.emailAddress, 120);
  const organizationType = enumField(oauth.organizationType);
  const rateLimitTier =
    enumField(oauth.organizationRateLimitTier) ?? enumField(oauth.userRateLimitTier);
  const fetched = fetchedOn(oauth.profileFetchedAt);
  return {
    account: claudeAccountHash(salt, id),
    ...(name === undefined ? {} : { name }),
    ...(email === undefined || !email.includes("@") ? {} : { email }),
    ...(organizationType === undefined ? {} : { organizationType }),
    ...(rateLimitTier === undefined ? {} : { rateLimitTier }),
    ...(fetched === undefined ? {} : { fetchedOn: fetched }),
  };
}

/**
 * The local account key a browser scan gives the Claude Code history a
 * selected session file belongs to, as `intakeBrowserCandidates` derives it
 * with the same `sourceRootSalt`: the history group and the folder above
 * `projects`, hashed. Undefined for a path outside a `projects` folder.
 */
export function claudeLocationAccount(
  path: string,
  group: string | undefined,
  salt: string,
): string | undefined {
  const root = path.replace(/\\/gu, "/").match(/^(.*?(?:^|\/)projects)(?:\/|$)/u)?.[1];
  if (root === undefined) return undefined;
  // The scan keeps only a history group that is a plain identifier.
  const scoped =
    group !== undefined && /^[a-z0-9][a-z0-9-]{0,39}$/u.test(group) ? group : undefined;
  const scope = JSON.stringify([scoped ?? "selection", root]);
  return `claude-code:${sourceRootHash(salt, normalizeProjectKey(scope, "linux"))}`;
}
