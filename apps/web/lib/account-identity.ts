import type { ClaudeProfile } from "@stackreplay/adapters/claude-profile";

/**
 * Who each local Claude account is, as Claude Code's own profile says.
 *
 * Read once, when a saved workload is built, from the `.claude.json` beside
 * each selected Claude history, keeping only the fields of `ClaudeProfile`
 * (the account id only as a salted hash). Kept in this browser only: never
 * in a workload, an export, a share, a `?stack=` link or any request, and
 * removed by Clear local data. Name and email are hidden until the person
 * shows them for that account.
 */

export const IDENTITY_KEY = "stackreplay.account-identity.v1";
const EVENT = "stackreplay-account-labels";
const MAX_ACCOUNTS = 64;

export interface AccountIdentity extends ClaudeProfile {
  /** The person chose to show this account's name and email. */
  shown?: true;
}

const ACCOUNT_HASH = /^ca_[0-9a-f]{32}$/u;
/** Identity belongs to Claude Code history locations only. */
const CLAUDE_ACCOUNT_KEY = /^claude-code:sr_[0-9a-f]{32}$/u;

export function isIdentityKey(key: string): boolean {
  return CLAUDE_ACCOUNT_KEY.test(key);
}
const ENUM = /^[a-z0-9_]{1,48}$/u;
const DAY = /^\d{4}-\d{2}-\d{2}$/u;

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > max) return undefined;
  const control = Array.from(value).some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  });
  return control ? undefined : value;
}

function parseIdentity(value: unknown): AccountIdentity | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const entry = value as Record<string, unknown>;
  if (typeof entry.account !== "string" || !ACCOUNT_HASH.test(entry.account)) return undefined;
  const name = text(entry.name, 80);
  const email = text(entry.email, 120);
  const enumOf = (field: unknown) =>
    typeof field === "string" && ENUM.test(field) ? field : undefined;
  const organizationType = enumOf(entry.organizationType);
  const rateLimitTier = enumOf(entry.rateLimitTier);
  const fetchedOn =
    typeof entry.fetchedOn === "string" && DAY.test(entry.fetchedOn) ? entry.fetchedOn : undefined;
  return {
    account: entry.account,
    ...(name === undefined ? {} : { name }),
    ...(email === undefined ? {} : { email }),
    ...(organizationType === undefined ? {} : { organizationType }),
    ...(rateLimitTier === undefined ? {} : { rateLimitTier }),
    ...(fetchedOn === undefined ? {} : { fetchedOn }),
    ...(entry.shown === true ? { shown: true as const } : {}),
  };
}

/** Every stored identity, by local account key. */
export function readAccountIdentities(): Record<string, AccountIdentity> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(IDENTITY_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) return {};
    const { version, accounts } = parsed as { version?: unknown; accounts?: unknown };
    if (version !== 1 || typeof accounts !== "object" || accounts === null) return {};
    return Object.fromEntries(
      Object.entries(accounts).flatMap(([key, value]) => {
        const identity = isIdentityKey(key) ? parseIdentity(value) : undefined;
        return identity === undefined ? [] : [[key, identity]];
      }),
    );
  } catch {
    return {};
  }
}

function writeAll(accounts: Record<string, AccountIdentity>): boolean {
  try {
    const kept = Object.entries(accounts).slice(-MAX_ACCOUNTS);
    window.localStorage.setItem(
      IDENTITY_KEY,
      JSON.stringify({ version: 1, accounts: Object.fromEntries(kept) }),
    );
    window.dispatchEvent?.(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

/**
 * Stores profiles just read for these local accounts. A rescan refreshes the
 * profile and keeps whether the person had chosen to show it, unless the
 * folder is now signed in to a different account.
 */
export function rememberAccountIdentities(
  profiles: Readonly<Record<string, ClaudeProfile>>,
): boolean {
  const entries = Object.entries(profiles).filter(([key]) => isIdentityKey(key));
  if (entries.length === 0) return true;
  const current = readAccountIdentities();
  for (const [key, profile] of entries) {
    const previous = current[key];
    const parsed = parseIdentity(profile);
    if (parsed === undefined) continue;
    delete current[key];
    current[key] = {
      ...parsed,
      ...(previous?.shown === true && previous.account === parsed.account ? { shown: true } : {}),
    };
  }
  return writeAll(current);
}

/** Shows or hides the names and emails of these accounts in this browser. */
export function setIdentityShown(keys: string | readonly string[], shown: boolean): boolean {
  const current = readAccountIdentities();
  let changed = false;
  for (const key of typeof keys === "string" ? [keys] : keys) {
    const identity = current[key];
    if (identity === undefined) continue;
    const { shown: _previous, ...rest } = identity;
    current[key] = shown ? { ...rest, shown: true } : rest;
    changed = true;
  }
  return changed && writeAll(current);
}

/** Whether a profile gave this account a name or email to show. */
export function hasIdentityName(identity: AccountIdentity | undefined): boolean {
  return identity?.name !== undefined || identity?.email !== undefined;
}

/** Hides every shown name and email at once, for sharing a screen. */
export function hideAllIdentities(): boolean {
  const current = readAccountIdentities();
  return writeAll(
    Object.fromEntries(
      Object.entries(current).map(([key, { shown: _shown, ...rest }]) => [key, rest]),
    ),
  );
}

export function clearAccountIdentities(): void {
  try {
    window.localStorage.removeItem(IDENTITY_KEY);
  } catch {
    /* Identity is optional. */
  }
}

/** The name an account shows by once the person has chosen to show it. */
export function shownIdentityName(identity: AccountIdentity | undefined): string | undefined {
  if (identity?.shown !== true) return undefined;
  return identity.name ?? identity.email;
}

/**
 * Claude Code's own plan type and rate-limit tier, mapped to a catalog plan.
 * Reviewed pairs only: anything else has no suggestion, never a guess.
 */
const CLAUDE_PLAN_TIERS: readonly {
  organizationType: string;
  rateLimitTier: string;
  planId: string;
}[] = [
  {
    organizationType: "claude_pro",
    rateLimitTier: "default_claude_ai",
    planId: "anthropic-claude-pro",
  },
  {
    organizationType: "claude_max",
    rateLimitTier: "default_claude_max_5x",
    planId: "anthropic-claude-max-5x",
  },
  {
    organizationType: "claude_max",
    rateLimitTier: "default_claude_max_20x",
    planId: "anthropic-claude-max-20x",
  },
];

export function suggestedPlanId(identity: ClaudeProfile | undefined): string | undefined {
  if (identity === undefined) return undefined;
  return CLAUDE_PLAN_TIERS.find(
    (entry) =>
      entry.organizationType === identity.organizationType &&
      entry.rateLimitTier === identity.rateLimitTier,
  )?.planId;
}
