/**
 * The subscriptions a person says they pay for ("What you pay" in Settings),
 * with a quantity for each: several accounts on one plan are normal (a Claude
 * Max 5x on two accounts is quantity 2). Optional, and kept in this browser
 * only. Nothing is inferred from a history, and nothing here is sent anywhere.
 *
 * Storage: `stackreplay.stack-subscriptions.v2` holds the subscriptions. The
 * older plain plan list (`stackreplay.current-stack`) is still read when the
 * subscriptions were never written.
 */

/** A plan (`plan:<id>`) or a direct API provider (`api:<id>`). */
export type TargetKey = `plan:${string}` | `api:${string}`;

const LEGACY_PLAN_LIST_KEY = "stackreplay.current-stack";
export const SUBSCRIPTIONS_KEY = "stackreplay.stack-subscriptions.v2";
const MAX_SUBSCRIPTIONS = 24;
export const MAX_QUANTITY = 10;

export interface StackSubscription {
  /** Local identity of this subscription, stable across edits; never a plan id. */
  id: string;
  plan: TargetKey;
  /** Accounts purchased on this plan. Legacy entries default to one. */
  quantity?: number | undefined;
}

function isTargetKey(value: unknown): value is TargetKey {
  return (
    typeof value === "string" &&
    value.length <= 160 &&
    (value.startsWith("plan:") || value.startsWith("api:"))
  );
}

export function subscriptionQuantity(entry: Pick<StackSubscription, "quantity">): number {
  return Number.isInteger(entry.quantity) &&
    (entry.quantity ?? 0) >= 1 &&
    (entry.quantity ?? 0) <= MAX_QUANTITY
    ? (entry.quantity as number)
    : 1;
}

const ID_PATTERN = /^[a-z0-9]{4,24}$/u;

export function newSubscriptionId(taken: Iterable<string> = []): string {
  const used = new Set(taken);
  for (;;) {
    const bytes = new Uint8Array(6);
    globalThis.crypto.getRandomValues(bytes);
    const id = `s${Array.from(bytes, (byte) => (byte % 36).toString(36)).join("")}`;
    if (!used.has(id)) return id;
  }
}

function readPlanList(): TargetKey[] {
  const value = window.localStorage.getItem(LEGACY_PLAN_LIST_KEY);
  if (value === null) return [];
  if (isTargetKey(value)) return [value];
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed) ? [...new Set(parsed.filter(isTargetKey))] : [];
}

function readStoredSubscriptions(): StackSubscription[] | undefined {
  const raw = window.localStorage.getItem(SUBSCRIPTIONS_KEY);
  if (raw === null) return undefined;
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const { version, subscriptions } = parsed as { version?: unknown; subscriptions?: unknown };
  if (version !== 2 || !Array.isArray(subscriptions)) return undefined;
  const seen = new Set<string>();
  const valid: StackSubscription[] = [];
  for (const entry of subscriptions.slice(0, MAX_SUBSCRIPTIONS)) {
    if (typeof entry !== "object" || entry === null) continue;
    const { id, plan, quantity } = entry as Record<string, unknown>;
    if (typeof id !== "string" || !ID_PATTERN.test(id) || seen.has(id) || !isTargetKey(plan))
      continue;
    seen.add(id);
    const count = subscriptionQuantity({ quantity: typeof quantity === "number" ? quantity : 1 });
    valid.push({ id, plan, ...(count > 1 ? { quantity: count } : {}) });
  }
  return valid;
}

export function readStackSubscriptions(): StackSubscription[] {
  try {
    let stored: StackSubscription[] | undefined;
    try {
      stored = readStoredSubscriptions();
    } catch {
      stored = undefined;
    }
    if (stored !== undefined) return stored;
    const taken = new Set<string>();
    return readPlanList().map((plan, index) => {
      const id = `p${index.toString(36).padStart(3, "0")}${plan.length.toString(36)}`;
      taken.add(id);
      return { id, plan };
    });
  } catch {
    return [];
  }
}

/** Distinct plan and API keys, in stack order. */
export function stackKeys(subscriptions: readonly StackSubscription[]): TargetKey[] {
  return [...new Set(subscriptions.map((entry) => entry.plan))];
}

export function writeStackSubscriptions(value: readonly StackSubscription[]): boolean {
  const seen = new Set<string>();
  const entries = value
    .filter((entry) => {
      if (!isTargetKey(entry.plan) || !ID_PATTERN.test(entry.id) || seen.has(entry.id))
        return false;
      seen.add(entry.id);
      return true;
    })
    .slice(0, MAX_SUBSCRIPTIONS)
    .map((entry) => ({
      id: entry.id,
      plan: entry.plan,
      ...(subscriptionQuantity(entry) > 1 ? { quantity: subscriptionQuantity(entry) } : {}),
    }));
  try {
    if (entries.length === 0) {
      window.localStorage.removeItem(LEGACY_PLAN_LIST_KEY);
      // An empty list is stored, not removed, so the legacy list cannot come back.
      window.localStorage.setItem(
        SUBSCRIPTIONS_KEY,
        JSON.stringify({ version: 2, subscriptions: [] }),
      );
    } else {
      window.localStorage.setItem(
        SUBSCRIPTIONS_KEY,
        JSON.stringify({ version: 2, subscriptions: entries }),
      );
    }
    window.dispatchEvent?.(new Event("stackreplay-current-stack"));
    return true;
  } catch {
    // A convenience only: nothing depends on it.
    return false;
  }
}

/** Keep every open page consistent, including changes from another tab. */
export function subscribeCurrentStack(listener: () => void): () => void {
  window.addEventListener("stackreplay-current-stack", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("stackreplay-current-stack", listener);
    window.removeEventListener("storage", listener);
  };
}
