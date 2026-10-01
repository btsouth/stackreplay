"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import {
  type AccountIdentity,
  hasIdentityName,
  readAccountIdentities,
  setIdentityShown,
  suggestedPlanId,
} from "@/lib/account-identity";
import { subscribeAccountLabels, writeAccountLabel } from "@/lib/accounts";
import type { StackSubscription } from "@/lib/current-stack";
import { catalogPlansAt } from "@/lib/public-catalog";
import type { TargetKey } from "@/lib/routes";
import { accountFitsPlan, familyOfTool } from "@/lib/stack-accounts";
import { type StackAccount, type StackWorkload, shareText } from "@/lib/stack-analysis";

const count = (value: number) => value.toLocaleString("en-US");
/** "Sep 30", or "Sep 30, 2025" when the year is not the current one. */
const day = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...(date.getUTCFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
};

/**
 * The local accounts in this workload, and which subscription each one pays
 * for. Recorded work is read per account: one history location of one tool
 * (a second Claude config folder is a second account). Linking an account to
 * a plan is the person's own statement; StackReplay never infers it.
 */
export function StackAccounts({
  workload,
  stack,
  disabled,
  onLink,
  heading,
}: {
  workload: StackWorkload;
  stack: readonly StackSubscription[];
  disabled: boolean;
  onLink: (account: string, plan: TargetKey | undefined) => void;
  /** The section heading, laid out beside the show-names switch. */
  heading: ReactNode;
}) {
  const [identities, setIdentities] = useState<Record<string, AccountIdentity>>({});
  useEffect(() => {
    const refresh = () => setIdentities(readAccountIdentities());
    refresh();
    return subscribeAccountLabels(refresh);
  }, []);
  // One tool's accounts sit together, tools by their busiest account, accounts by calls.
  const recorded = workload.accounts ?? [];
  const busiest = new Map<string, number>();
  for (const account of recorded)
    busiest.set(account.source, Math.max(busiest.get(account.source) ?? 0, account.calls));
  const accounts = [...recorded].sort(
    (a, b) =>
      (busiest.get(b.source) ?? 0) - (busiest.get(a.source) ?? 0) ||
      a.source.localeCompare(b.source) ||
      b.calls - a.calls ||
      a.key.localeCompare(b.key),
  );
  const multi = new Set(
    [...new Set(accounts.map((account) => account.source))].filter(
      (source) => accounts.filter((account) => account.source === source).length > 1,
    ),
  );
  if (accounts.length === 0) return null;
  const total = workload.overall.calls;
  const named = accounts
    .filter((account) => hasIdentityName(identities[account.key]))
    .map((account) => account.key);
  const shown = named.length > 0 && named.every((key) => identities[key]?.shown === true);
  return (
    <>
      <div className="stack-section-header">
        <div>{heading}</div>
        {named.length > 0 ? (
          <button
            type="button"
            className="stack-secondary stack-accounts-reveal"
            aria-pressed={shown}
            data-testid="stack-accounts-reveal"
            onClick={() => setIdentityShown(named, !shown)}
          >
            {shown ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            {shown ? "Hide names" : "Show names"}
          </button>
        ) : null}
      </div>
      <div className="stack-accounts" data-testid="stack-accounts">
        <div className="stack-accounts-head" aria-hidden="true">
          <span>Account</span>
          <span>Calls this period</span>
          <span>Limit events</span>
          <span>Read against</span>
        </div>
        <ul>
          {accounts.map((account) => (
            <AccountRow
              key={account.key}
              account={account}
              total={total}
              stack={stack}
              disabled={disabled}
              onLink={onLink}
              several={multi.has(account.source)}
              identity={identities[account.key]}
            />
          ))}
        </ul>
        <p className="stack-caption">
          An account is one history location of one tool, such as a second Claude config folder.
          Link each to the subscription its work belongs with so it is read only against that plan.
          A link says where work was recorded, not which account was billed.
          {named.length > 0
            ? " Names and emails come from each folder's Claude Code profile and stay hidden until you show them."
            : ""}{" "}
          Labels, names and links stay in this browser, are never shared or exported, and Clear
          local data removes them.
        </p>
      </div>
    </>
  );
}

function AccountRow({
  account,
  total,
  stack,
  disabled,
  onLink,
  several,
  identity,
}: {
  account: StackAccount;
  total: number;
  stack: readonly StackSubscription[];
  disabled: boolean;
  onLink: (account: string, plan: TargetKey | undefined) => void;
  several: boolean;
  identity: AccountIdentity | undefined;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(account.name);
  const family = familyOfTool(account.source);
  const plans = catalogPlansAt(DECISION_MARKET.rulesAt).filter((plan) =>
    (family?.planIds as readonly string[] | undefined)?.includes(plan.id),
  );
  // A link the account's tool cannot belong to (a hand-made link) is not shown as one.
  const linked = stack.find(
    (entry) =>
      entry.account === account.key && accountFitsPlan(account.key, entry.plan, account.source),
  );
  const suggestedId = suggestedPlanId(identity);
  const suggested = plans.find((plan) => plan.id === suggestedId);
  const suggestion =
    suggested !== undefined && linked?.plan !== `plan:${suggested.id}` ? suggested : undefined;
  const email =
    identity?.shown === true && identity.name !== undefined ? identity.email : undefined;
  const facts = account.facts;
  const testKey = account.key.replace(/[^a-z0-9-]/giu, "").slice(0, 60);
  return (
    <li className="stack-account" data-testid={`stack-account-${testKey}`}>
      <div className="stack-account-name">
        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              writeAccountLabel(account.key, draft);
              setEditing(false);
            }}
          >
            <label htmlFor={`${id}-label`} className="sr-only">
              Label for {account.name}
            </label>
            <input
              id={`${id}-label`}
              value={draft}
              maxLength={40}
              ref={(node) => node?.focus()}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setEditing(false);
              }}
            />
            <button type="submit" className="stack-link">
              Save
            </button>
          </form>
        ) : (
          <span className="stack-account-heading">
            <span className="stack-account-title">{account.name}</span>
            <button
              type="button"
              className="stack-icon-action"
              onClick={() => {
                setDraft(account.name);
                setEditing(true);
              }}
              aria-label={`Rename ${account.name}`}
              title="Rename"
            >
              <Pencil size={14} aria-hidden />
            </button>
          </span>
        )}
        {email !== undefined ? (
          <span className="stack-caption" data-testid={`stack-account-email-${testKey}`}>
            {email}
          </span>
        ) : null}
        <span className="stack-caption">
          {count(account.calls)} {account.calls === 1 ? "call" : "calls"} in the whole import
          {several ? "" : ` · the only ${account.name} account`}
        </span>
      </div>
      <p className="stack-account-figure">
        {facts ? (
          <>
            {count(facts.calls)}
            <span className="stack-caption"> {shareText(total ? facts.calls / total : 0)}</span>
          </>
        ) : (
          <span className="stack-muted-value">Not calculated</span>
        )}
      </p>
      <p
        className={`stack-account-figure${facts?.blocked?.attempts ? " stack-warning-value" : ""}`}
      >
        {facts?.blocked ? (
          facts.blocked.attempts > 0 ? (
            `${count(facts.blocked.attempts)} blocked on ${facts.blocked.days} ${facts.blocked.days === 1 ? "day" : "days"}`
          ) : (
            "None recorded"
          )
        ) : (
          <span className="stack-muted-value">Not recorded</span>
        )}
      </p>
      <div className="stack-account-link">
        {plans.length > 0 ? (
          <label>
            <span className="sr-only">Subscription {account.name} is read against</span>
            <select
              value={linked?.plan ?? ""}
              disabled={disabled}
              data-testid={`stack-account-plan-${testKey}`}
              onChange={(event) =>
                onLink(account.key, (event.target.value || undefined) as TargetKey | undefined)
              }
            >
              <option value="">Not linked</option>
              {plans.map((plan) => (
                <option key={plan.id} value={`plan:${plan.id}`}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="stack-caption">No subscription family</span>
        )}
        {suggestion !== undefined ? (
          <div
            className="stack-account-suggestion"
            data-testid={`stack-account-suggestion-${testKey}`}
          >
            <p
              className="stack-caption"
              title={
                identity?.fetchedOn
                  ? `Claude Code's profile for this account, as of ${day(identity.fetchedOn)}`
                  : undefined
              }
            >
              Profile says <span className="stack-account-plan">{suggestion.name}</span>
            </p>
            <button
              type="button"
              className="stack-suggestion-action"
              disabled={disabled}
              aria-label={`Link to ${suggestion.name}`}
              onClick={() => onLink(account.key, `plan:${suggestion.id}` as TargetKey)}
            >
              Link
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
