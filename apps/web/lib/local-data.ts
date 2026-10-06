/** Stable root identity across local rescans, cleared with the user's local data. */
const ROOT_SALT_KEY = "stackreplay.billing-review.v1.root-salt";

export function localSourceRootSalt(): string {
  try {
    const saved = window.localStorage.getItem(ROOT_SALT_KEY);
    if (saved && /^[a-zA-Z0-9-]{32,80}$/u.test(saved)) return saved;
    const salt = crypto.randomUUID();
    window.localStorage.setItem(ROOT_SALT_KEY, salt);
    return salt;
  } catch {
    return crypto.randomUUID();
  }
}

/** Browser-held choices that belong with the scans: what you pay, and leftovers of earlier builds. */
const CLEARED_KEY_PREFIXES = [
  ROOT_SALT_KEY.replace(/\.root-salt$/u, ""),
  "stackreplay.current-stack",
  "stackreplay.stack-subscriptions.v2",
  "stackreplay.account-identity.v1",
  "stackreplay.account-labels.v1",
  "stackreplay.completed-replays.v1",
];

/** Clear local data also forgets what the person said they pay. */
export function clearLocalPreferences(): void {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && CLEARED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)))
        window.localStorage.removeItem(key);
    }
    window.dispatchEvent(new Event("stackreplay-current-stack"));
  } catch {
    /* Storage may be unavailable. */
  }
}
