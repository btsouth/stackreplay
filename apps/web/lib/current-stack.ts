import type { TargetKey } from "./routes";

/**
 * The stack a person uses today: several subscriptions at once is normal for a
 * heavy mixed user. One set, kept in this browser only, read by Compare (each
 * plan replayed on the work it carries) and by the billing-period review.
 * Published prices and optional paid amounts are composed separately. An older
 * single selection is read as a stack of one. Synthetic demos use an isolated namespace.
 */
const CURRENT_STACK_KEY = "stackreplay.current-stack";

function isTargetKey(value: unknown): value is TargetKey {
  return typeof value === "string" && (value.startsWith("plan:") || value.startsWith("api:"));
}

export function readCurrentStack(namespace = ""): TargetKey[] {
  try {
    const value = window.localStorage.getItem(CURRENT_STACK_KEY + namespace);
    if (value === null) return [];
    if (isTargetKey(value)) return [value];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? [...new Set(parsed.filter(isTargetKey))] : [];
  } catch {
    return [];
  }
}

export function writeCurrentStack(value: readonly TargetKey[], namespace = ""): boolean {
  try {
    if (value.length === 0) window.localStorage.removeItem(CURRENT_STACK_KEY + namespace);
    else
      window.localStorage.setItem(
        CURRENT_STACK_KEY + namespace,
        JSON.stringify([...new Set(value)]),
      );
    window.dispatchEvent?.(new Event("stackreplay-current-stack"));
    return true;
  } catch {
    // A convenience only: nothing depends on it.
    return false;
  }
}

/** Keep all open decision surfaces consistent, including changes from another tab. */
export function subscribeCurrentStack(listener: () => void): () => void {
  window.addEventListener("stackreplay-current-stack", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("stackreplay-current-stack", listener);
    window.removeEventListener("storage", listener);
  };
}
