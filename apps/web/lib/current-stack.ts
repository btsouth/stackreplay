import type { TargetKey } from "./routes";

/**
 * The stack a person uses today: several subscriptions at once is normal for a
 * heavy mixed user. One set, kept in this browser only, read by Compare (each
 * plan replayed on the work it carries) and by the workload page (what those
 * plans cost over the recorded days). An older single value is read as a stack
 * of one.
 */
const CURRENT_STACK_KEY = "stackreplay.current-stack";
const MAX_CURRENT = 4;

function isTargetKey(value: unknown): value is TargetKey {
  return typeof value === "string" && (value.startsWith("plan:") || value.startsWith("api:"));
}

export function readCurrentStack(): TargetKey[] {
  try {
    const value = window.localStorage.getItem(CURRENT_STACK_KEY);
    if (value === null) return [];
    if (isTargetKey(value)) return [value];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isTargetKey).slice(0, MAX_CURRENT) : [];
  } catch {
    return [];
  }
}

export function writeCurrentStack(value: readonly TargetKey[]): void {
  try {
    if (value.length === 0) window.localStorage.removeItem(CURRENT_STACK_KEY);
    else
      window.localStorage.setItem(CURRENT_STACK_KEY, JSON.stringify(value.slice(0, MAX_CURRENT)));
  } catch {
    // A convenience only: nothing depends on it.
  }
}
