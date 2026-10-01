import { isAccountKey } from "./accounts";
import type { TargetKey } from "./routes";

/**
 * The stack a person uses today: several subscriptions at once is normal for a
 * heavy mixed user, and so are several subscriptions to one provider (a Max
 * plan on one Claude account, a Pro plan on another). Kept in this browser
 * only, read by My Stack, Compare, Replay and the billing-period review.
 *
 * A subscription is a plan plus, optionally, the local account (one history
 * location of one recording tool, see `accounts.ts`) whose work it is read against. An account
 * link is the person's own statement; it is never inferred from history.
 *
 * Storage: the plan list (`stackreplay.current-stack`, distinct plan keys) is
 * still written for every change, so an older build reading it keeps working;
 * the subscriptions (`stackreplay.stack-subscriptions.v2`) add multiplicity
 * and account links. On read, the subscriptions are reconciled with the plan
 * list, so a change written by an older build is never lost. Synthetic demos
 * use an isolated namespace.
 */
const CURRENT_STACK_KEY = "stackreplay.current-stack";
export const SUBSCRIPTIONS_KEY = "stackreplay.stack-subscriptions.v2";
const MAX_SUBSCRIPTIONS = 24;

export interface StackSubscription {
  /** Local identity of this subscription, stable across edits; never a plan or account id. */
  id: string;
  plan: TargetKey;
  /** The local account whose work this subscription is read against, when the person has said so. */
  account?: string | undefined;
}

function isTargetKey(value: unknown): value is TargetKey {
  return (
    typeof value === "string" &&
    value.length <= 160 &&
    (value.startsWith("plan:") || value.startsWith("api:"))
  );
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

function readPlanList(namespace: string): TargetKey[] {
  const value = window.localStorage.getItem(CURRENT_STACK_KEY + namespace);
  if (value === null) return [];
  if (isTargetKey(value)) return [value];
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed) ? [...new Set(parsed.filter(isTargetKey))] : [];
}

function readStoredSubscriptions(namespace: string): StackSubscription[] | undefined {
  const raw = window.localStorage.getItem(SUBSCRIPTIONS_KEY + namespace);
  if (raw === null) return undefined;
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const { version, subscriptions } = parsed as { version?: unknown; subscriptions?: unknown };
  if (version !== 2 || !Array.isArray(subscriptions)) return undefined;
  const seen = new Set<string>();
  const valid: StackSubscription[] = [];
  for (const entry of subscriptions.slice(0, MAX_SUBSCRIPTIONS)) {
    if (typeof entry !== "object" || entry === null) continue;
    const { id, plan, account } = entry as Record<string, unknown>;
    if (typeof id !== "string" || !ID_PATTERN.test(id) || seen.has(id) || !isTargetKey(plan))
      continue;
    seen.add(id);
    valid.push({
      id,
      plan,
      ...(plan.startsWith("plan:") && isAccountKey(account) ? { account } : {}),
    });
  }
  return valid;
}

/** A deterministic id for a subscription known only from the plan list. */
function derivedId(plan: TargetKey, taken: ReadonlySet<string>): string {
  let hash = 2166136261;
  for (let i = 0; i < plan.length; i++) hash = Math.imul(hash ^ plan.charCodeAt(i), 16777619);
  const base = `p${(hash >>> 0).toString(36).padStart(7, "0")}`;
  let id = base;
  for (let n = 1; taken.has(id); n++) id = `${base}${n}`;
  return id;
}

/**
 * Subscriptions reconciled with the plan list: entries whose plan was removed
 * by a plan-list writer are dropped; plans added that way gain one unlinked
 * entry. Ids for entries derived from the plan list alone are deterministic, so
 * repeated reads agree until a write stores them.
 */
export function reconcileSubscriptions(
  plans: readonly TargetKey[],
  stored: readonly StackSubscription[] | undefined,
): StackSubscription[] {
  const wanted = new Set(plans);
  const kept = (stored ?? []).filter((entry) => wanted.has(entry.plan));
  const present = new Set(kept.map((entry) => entry.plan));
  const taken = new Set(kept.map((entry) => entry.id));
  for (const plan of wanted) {
    if (present.has(plan)) continue;
    present.add(plan);
    const id = derivedId(plan, taken);
    taken.add(id);
    kept.push({ id, plan });
  }
  // Plan-list order wins for distinct plans; a plan's subscriptions stay together.
  const order = [...wanted];
  return kept
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => order.indexOf(a.entry.plan) - order.indexOf(b.entry.plan) || a.index - b.index)
    .map(({ entry }) => entry);
}

export function readStackSubscriptions(namespace = ""): StackSubscription[] {
  try {
    const plans = readPlanList(namespace);
    let stored: StackSubscription[] | undefined;
    try {
      stored = readStoredSubscriptions(namespace);
    } catch {
      stored = undefined;
    }
    return reconcileSubscriptions(plans, stored);
  } catch {
    return [];
  }
}

/** Distinct plan and API keys, in stack order: what every plan-level reader needs. */
export function stackKeys(subscriptions: readonly StackSubscription[]): TargetKey[] {
  return [...new Set(subscriptions.map((entry) => entry.plan))];
}

export function readCurrentStack(namespace = ""): TargetKey[] {
  return stackKeys(readStackSubscriptions(namespace));
}

export function writeStackSubscriptions(
  value: readonly StackSubscription[],
  namespace = "",
): boolean {
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
      ...(entry.plan.startsWith("plan:") && entry.account && isAccountKey(entry.account)
        ? { account: entry.account }
        : {}),
    }));
  try {
    if (entries.length === 0) {
      window.localStorage.removeItem(CURRENT_STACK_KEY + namespace);
      window.localStorage.removeItem(SUBSCRIPTIONS_KEY + namespace);
    } else {
      window.localStorage.setItem(
        SUBSCRIPTIONS_KEY + namespace,
        JSON.stringify({ version: 2, subscriptions: entries }),
      );
      window.localStorage.setItem(
        CURRENT_STACK_KEY + namespace,
        JSON.stringify(stackKeys(entries)),
      );
    }
    window.dispatchEvent?.(new Event("stackreplay-current-stack"));
    return true;
  } catch {
    // A convenience only: nothing depends on it.
    return false;
  }
}

/**
 * Plan-level writes (Settings, discovery answers, Compare): every existing
 * subscription of a kept plan keeps its id, multiplicity and account link; a
 * plan new to the stack gains one unlinked subscription; removed plans drop
 * all of theirs.
 */
export function writeCurrentStack(value: readonly TargetKey[], namespace = ""): boolean {
  return writeStackSubscriptions(
    applyPlanList(readStackSubscriptions(namespace), value),
    namespace,
  );
}

export function applyPlanList(
  current: readonly StackSubscription[],
  plans: readonly TargetKey[],
): StackSubscription[] {
  const wanted = [...new Set(plans.filter(isTargetKey))];
  const taken = new Set(current.map((entry) => entry.id));
  return wanted.flatMap((plan) => {
    const existing = current.filter((entry) => entry.plan === plan);
    if (existing.length > 0) return existing;
    const id = newSubscriptionId(taken);
    taken.add(id);
    return [{ id, plan }];
  });
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

/**
 * Link an account to a plan, as the person states it in My Stack's account
 * list. Re-plans the account's own subscription when it has one; otherwise
 * links an unlinked subscription of that plan; otherwise adds one. `undefined`
 * unlinks the account and keeps its subscription in the stack.
 */
export function linkAccount(
  current: readonly StackSubscription[],
  account: string,
  plan: TargetKey | undefined,
): StackSubscription[] {
  const linked = current.find((entry) => entry.account === account);
  if (plan === undefined)
    return current.map((entry) =>
      entry.account === account ? { id: entry.id, plan: entry.plan } : entry,
    );
  if (linked) return current.map((entry) => (entry === linked ? { ...entry, plan } : entry));
  const unlinked = current.find((entry) => entry.plan === plan && entry.account === undefined);
  if (unlinked) return current.map((entry) => (entry === unlinked ? { ...entry, account } : entry));
  return [...current, { id: newSubscriptionId(current.map((entry) => entry.id)), plan, account }];
}

/** Undo restores one removed subscription without overwriting later edits. */
export function restoreSubscription(
  current: readonly StackSubscription[],
  removed: StackSubscription,
  index: number,
): StackSubscription[] {
  if (current.some((entry) => entry.id === removed.id)) return [...current];
  const next = [...current];
  next.splice(Math.max(0, Math.min(next.length, index)), 0, removed);
  return next;
}
