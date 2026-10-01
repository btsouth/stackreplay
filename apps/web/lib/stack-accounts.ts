import { accountSource } from "./accounts";
import type { StackSubscription } from "./current-stack";
import { DISCOVERY_FAMILIES } from "./stack-discovery";

/**
 * Which recorded work each subscription in the stack is associated with.
 *
 * Work is recorded per local account (one history location of one tool). A
 * subscription the person linked to an account gets that account's work, and
 * nothing else. A subscription with no link shares, with any other unlinked
 * subscription of its family, the work of that family's accounts that no
 * subscription is linked to: this is how a one-account stack has always been
 * read, and it never splits one account's work between two plans. An account
 * no subscription is associated with is outside the stack.
 *
 * Association is where the work was recorded, as the person described it. It
 * is not a provider's statement of which account paid.
 */

export interface AccountRow {
  key: string;
  source: string;
}

export interface Assignment {
  /** Account keys each subscription is associated with, by subscription id. */
  scopes: Record<string, string[]>;
  /** For a linked subscription whose account has no history here: the account it names. */
  missingAccount: Record<string, string>;
  /** Accounts of a tool no subscription is associated with, by tool (adapter id). */
  unassigned: Record<string, string[]>;
}

type Family = (typeof DISCOVERY_FAMILIES)[number];

export function familyOfPlanId(planId: string): Family | undefined {
  return DISCOVERY_FAMILIES.find(
    (family) =>
      (family.planIds as readonly string[]).includes(planId) ||
      (family.otherPlanIds as readonly string[]).includes(planId),
  );
}

export function familyOfTool(source: string): Family | undefined {
  return DISCOVERY_FAMILIES.find((family) =>
    (family.sourceIds as readonly string[]).includes(source),
  );
}

/**
 * Whether an account's recorded work can belong to a plan at all (Claude Code
 * to Claude plans). `source` is the tool that recorded it; the key's own
 * prefix is used only when the account has no history loaded.
 */
export function accountFitsPlan(
  account: string,
  plan: string,
  source: string = accountSource(account),
): boolean {
  if (!plan.startsWith("plan:")) return false;
  const family = familyOfPlanId(plan.slice(5));
  return !!family && (family.sourceIds as readonly string[]).includes(source);
}

/** A stable identity for a set of accounts, used to key computed facts. */
export function scopeKey(accounts: readonly string[]): string {
  return [...new Set(accounts)].sort().join(",");
}

export function assignAccounts(
  subscriptions: readonly StackSubscription[],
  accounts: readonly AccountRow[],
): Assignment {
  const sourceOf = new Map(accounts.map((account) => [account.key, account.source]));
  const scopes: Record<string, string[]> = {};
  const missingAccount: Record<string, string> = {};
  const claimed = new Set<string>();
  // A linked account belongs to the first subscription that names it.
  for (const subscription of subscriptions) {
    const account = subscription.account;
    if (!account || !accountFitsPlan(account, subscription.plan, sourceOf.get(account))) continue;
    if (claimed.has(account)) continue;
    claimed.add(account);
    if (sourceOf.has(account)) scopes[subscription.id] = [account];
    else missingAccount[subscription.id] = account;
  }
  const familyAccounts = (family: Family) =>
    accounts
      .filter(
        (account) =>
          (family.sourceIds as readonly string[]).includes(account.source) &&
          !claimed.has(account.key),
      )
      .map((account) => account.key)
      .sort();
  const coveredByUnlinked = new Set<string>();
  for (const subscription of subscriptions) {
    if (scopes[subscription.id] || missingAccount[subscription.id]) continue;
    if (!subscription.plan.startsWith("plan:")) continue;
    const family = familyOfPlanId(subscription.plan.slice(5));
    if (!family || (family.sourceIds as readonly string[]).length === 0) continue;
    // A second subscription linked to an already-claimed account shares nothing:
    // it is read as unlinked, like any other subscription of its family.
    const shared = familyAccounts(family);
    scopes[subscription.id] = shared;
    for (const key of shared) coveredByUnlinked.add(key);
  }
  const unassigned: Record<string, string[]> = {};
  for (const account of accounts) {
    if (claimed.has(account.key) || coveredByUnlinked.has(account.key)) continue;
    unassigned[account.source] = [...(unassigned[account.source] ?? []), account.key].sort();
  }
  return { scopes, missingAccount, unassigned };
}

/** Every distinct set of accounts whose facts the stack's analysis reads. */
export function scopesToCompute(
  assignment: Assignment,
  accounts: readonly AccountRow[],
): string[][] {
  const sets = new Map<string, string[]>();
  const add = (keys: readonly string[]) => {
    if (keys.length > 0) sets.set(scopeKey(keys), [...new Set(keys)].sort());
  };
  for (const keys of Object.values(assignment.scopes)) add(keys);
  for (const keys of Object.values(assignment.unassigned)) add(keys);
  // Each account of a tool with several, so the account list and any proposal
  // that links one account can be read without another calculation.
  const bySource = new Map<string, string[]>();
  for (const account of accounts)
    bySource.set(account.source, [...(bySource.get(account.source) ?? []), account.key]);
  for (const keys of bySource.values()) if (keys.length > 1) for (const key of keys) add([key]);
  return [...sets.values()];
}
