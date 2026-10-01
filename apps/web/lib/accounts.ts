/**
 * Local accounts: one history location of one recording tool.
 *
 * An account is identified by the event's salted `resourceInstanceId` (Claude
 * Code derives one per history root; the browser import gives Codex, Command
 * Code and OpenCode one per selected location). History imported before
 * locations were recorded, or from the CLI, carries no id: all of that tool's
 * calls are then one default account, never guessed apart. An account is a
 * place work was recorded, not a provider's statement of who paid.
 *
 * Labels are the person's own words for an account ("Work", "Pro #2"). They
 * are kept in this browser only, keyed by the salted id, and never contain a
 * path or anything read from history.
 */

export interface AccountRef {
  adapterId: string;
  resourceInstanceId?: string | undefined;
}

export const DEFAULT_ACCOUNT_SUFFIX = ":default";

export function accountKeyOf(source: AccountRef): string {
  return source.resourceInstanceId ?? `${source.adapterId}${DEFAULT_ACCOUNT_SUFFIX}`;
}

/**
 * The recording tool an account key names, read from the key itself. Keys
 * StackReplay assigns are `<tool>:<hash>`, but ids stored by older imports or
 * written by hand ("main") are not, so code that has the account's recorded
 * events uses their tool and treats this only as a fallback.
 */
export function accountSource(key: string): string {
  return key.slice(0, Math.max(0, key.indexOf(":"))) || key;
}

/**
 * Whether an account's history can record limit events. Only Claude Code
 * records them, and only for an account with its own root id (capacity events
 * are scoped to it); a default account carries none.
 */
export function recordsCapacity(key: string, source = accountSource(key)): boolean {
  return source === "claude-code" && key !== `${source}${DEFAULT_ACCOUNT_SUFFIX}`;
}

export const ACCOUNT_KEY_PATTERN = /^[a-z0-9-]{1,40}:[A-Za-z0-9_-]{1,140}$/u;

export function isAccountKey(value: unknown): value is string {
  return typeof value === "string" && value.length <= 150 && ACCOUNT_KEY_PATTERN.test(value);
}

/** An account in one scope of a workload, with the calls it recorded there. */
export interface WorkloadAccount {
  key: string;
  source: string;
  calls: number;
}

export const LABELS_KEY = "stackreplay.account-labels.v1";
const MAX_LABEL = 40;

export function sanitizeAccountLabel(value: string): string | undefined {
  const label = Array.from(value, (character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127 ? " " : character;
  })
    .join("")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, MAX_LABEL);
  return label.length > 0 ? label : undefined;
}

export function readAccountLabels(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LABELS_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) return {};
    const labels = (parsed as { version?: unknown; labels?: unknown }).labels;
    if ((parsed as { version?: unknown }).version !== 1 || typeof labels !== "object" || !labels)
      return {};
    return Object.fromEntries(
      Object.entries(labels).flatMap(([key, value]) => {
        const label = typeof value === "string" ? sanitizeAccountLabel(value) : undefined;
        return isAccountKey(key) && label ? [[key, label]] : [];
      }),
    );
  } catch {
    return {};
  }
}

export function writeAccountLabel(key: string, value: string | undefined): boolean {
  if (!isAccountKey(key)) return false;
  try {
    const labels = readAccountLabels();
    const label = value === undefined ? undefined : sanitizeAccountLabel(value);
    if (label) labels[key] = label;
    else delete labels[key];
    window.localStorage.setItem(LABELS_KEY, JSON.stringify({ version: 1, labels }));
    window.dispatchEvent?.(new Event("stackreplay-account-labels"));
    return true;
  } catch {
    return false;
  }
}

export function subscribeAccountLabels(listener: () => void): () => void {
  window.addEventListener("stackreplay-account-labels", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("stackreplay-account-labels", listener);
    window.removeEventListener("storage", listener);
  };
}

export function clearAccountLabels(): void {
  try {
    window.localStorage.removeItem(LABELS_KEY);
  } catch {
    /* Labels are optional. */
  }
}

const TOOL_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  "command-code": "Command Code",
  opencode: "OpenCode",
  hermes: "Hermes",
  ccusage: "ccusage",
};

export function toolNameOf(source: string): string {
  return TOOL_NAMES[source] ?? source;
}

/**
 * Display names for every account: the person's label, or the tool and a
 * number that orders that tool's accounts by recorded calls (most first, ties
 * by key), so the busiest account is always "account 1". A tool with one
 * account is just the tool's name.
 */
export function accountNames(
  accounts: readonly WorkloadAccount[],
  labels: Readonly<Record<string, string>> = {},
): Map<string, string> {
  const names = new Map<string, string>();
  const bySource = new Map<string, WorkloadAccount[]>();
  for (const account of accounts)
    bySource.set(account.source, [...(bySource.get(account.source) ?? []), account]);
  for (const [source, list] of bySource) {
    const ordered = [...list].sort((a, b) => b.calls - a.calls || (a.key < b.key ? -1 : 1));
    ordered.forEach((account, index) => {
      names.set(
        account.key,
        labels[account.key] ??
          (ordered.length === 1
            ? toolNameOf(source)
            : `${toolNameOf(source)} account ${index + 1}`),
      );
    });
  }
  return names;
}
