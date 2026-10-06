"use client";
import { Decimal } from "@stackreplay/replay-engine";
import { DataTable } from "@stackreplay/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalculationNote } from "@/components/recap/calculation-note";
import { PeriodControl } from "@/components/recap/period-control";
import { FamilyPlanChoices } from "@/components/stack/family-plan-choices";
import { readAccountIdentities } from "@/lib/account-identity";
import {
  newSubscriptionId,
  readStackSubscriptions,
  type StackSubscription,
  stackCounts,
  stackKeys,
  subscribeCurrentStack,
  writeStackSubscriptions,
} from "@/lib/current-stack";
import { buildMyStack } from "@/lib/my-stack";
import type { PlanOption } from "@/lib/plan-explorer";
import { catalogPlansAt } from "@/lib/public-catalog";
import { compactNumber, recapUsd } from "@/lib/recap-card";
import { paidMultiplier, recapPlans } from "@/lib/recap-plans";
import type { TargetKey } from "@/lib/routes";
import { parseStackParam } from "@/lib/stack-analysis";
import { type DiscoveryAnswer, discoverStack, initialDiscoveryAnswer } from "@/lib/stack-discovery";
import { useRecapData } from "@/lib/use-recap-data";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import { AppPageSkeleton, ScanEmptyState } from "./app-page-state";
import "@/components/recap/recap.css";
import "@/app/my-stack.css";
import "./premium-app.css";
import "./explorer.css";

export function PlansSurface({ initialImportId }: { initialImportId?: string | undefined }) {
  const query = useSearchParams();
  const [stack, setStack] = useState<StackSubscription[]>([]);
  const [confirmation, setConfirmation] = useState<string>();
  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, DiscoveryAnswer | undefined>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string>();
  const counts = useMemo(() => stackCounts(stack), [stack]);
  const proposal = parseStackParam(query.get("stack") ?? undefined) ?? [];
  const proposalCounts = stackCounts(proposal);
  const requested = [
    query.get("target")?.replace(/^plan:/, ""),
    query.get("detail"),
    ...(query.get("api") ? [`api:${query.get("api")}`] : []),
    ...proposal.map((s) => s.plan.slice(5)),
    ...(query.get("options")?.split(",") ?? []),
  ].filter((id): id is string => Boolean(id));
  const data = useRecapData(
    initialImportId,
    query.get("stack") ? { ...counts, ...proposalCounts } : counts,
    requested,
  );
  useEffect(() => {
    const refresh = () => {
      const saved = readStackSubscriptions();
      setStack(
        localStorage.getItem("stackreplay.recap-plans-manual") === "true"
          ? saved
          : recapPlans(saved, readAccountIdentities()),
      );
      setConfirmation(localStorage.getItem("stackreplay.recap-paid-confirmation") ?? undefined);
    };
    refresh();
    return subscribeCurrentStack(refresh);
  }, []);
  const plans = useMemo(() => catalogPlansAt(data.now.slice(0, 10)), [data.now]);
  const summary = buildMyStack({
    currentStack: stackKeys(stack),
    counts,
    rulesAsOf: data.now.slice(0, 10),
  });
  const monthly =
    summary.totals.length === 1 && !summary.unpricedPlans && !summary.apiTargets
      ? summary.totals.find((t) => t.currency === "USD" && t.interval === "month")?.amount
      : undefined;
  const signature = JSON.stringify({
    plans: stack
      .filter((s) => s.plan.startsWith("plan:"))
      .map((s) => s.plan)
      .sort(),
    monthlyCost: monthly,
  });
  const confirmed = confirmation === signature && stack.length > 0;
  const groups = discoverStack({
    recordedCalls: data.recap?.records ?? 0,
    sources: (data.recap?.tools ?? []).map((t) => ({
      id: t.id,
      events: t.records,
      models: [],
      unresolvedEvents: 0,
    })),
    sourceNames: data.record?.summary.usageSources ?? [],
    rulesAsOf: data.now.slice(0, 10),
    currentStack: stackKeys(stack),
    plans,
    includeUnobserved: true,
  }).filter((g) => g.candidates.length > 0);
  const visibleGroups = groups.filter((g) => g.recordedCalls > 0 || g.currentTargets.length > 0);
  const shownGroups = visibleGroups.length ? visibleGroups : groups;
  const draft = shownGroups.flatMap((group) => {
    const answer = answers[group.groupId] ?? initialDiscoveryAnswer(group);
    const targets =
      typeof answer === "object"
        ? answer.planTargets
        : answer === "keep-current"
          ? group.currentTargets
          : typeof answer === "string" && answer.startsWith("plan:")
            ? [answer as TargetKey]
            : [];
    return targets.map((plan) => ({
      id: newSubscriptionId(),
      plan,
      quantity:
        typeof answer === "object"
          ? (answer.quantities?.[plan] ?? counts[plan] ?? 1)
          : (counts[plan] ?? 1),
    }));
  });
  function save() {
    setSaveError(undefined);
    if (!writeStackSubscriptions(draft)) {
      setSaveError("Your plans couldn't be saved. Allow browser storage and try again.");
      return;
    }
    const totals = buildMyStack({
      currentStack: stackKeys(draft),
      counts: stackCounts(draft),
      rulesAsOf: data.now.slice(0, 10),
    });
    const amount =
      totals.totals.length === 1 && !totals.unpricedPlans && !totals.apiTargets
        ? totals.totals.find((t) => t.currency === "USD" && t.interval === "month")?.amount
        : undefined;
    const next = JSON.stringify({ plans: draft.map((s) => s.plan).sort(), monthlyCost: amount });
    try {
      localStorage.setItem("stackreplay.recap-plans-manual", "true");
      localStorage.setItem("stackreplay.recap-paid-confirmation", next);
    } catch {
      setSaveError("Your plans couldn't be saved. Allow browser storage and try again.");
      return;
    }
    setStack(draft);
    setConfirmation(next);
    setEditing(false);
  }
  if (data.error)
    return (
      <div className="recap-page explorer-page">
        <h1>Your plans</h1>
        <p role="alert">{data.error}</p>
        <Link href="/app/scan" className="recap-button">
          Scan my history
        </Link>
      </div>
    );
  if (!data.imports) return <AppPageSkeleton label="Opening your plans" />;
  if (!data.id)
    return (
      <div className="recap-page explorer-page">
        <h1>Your plans</h1>
        <ScanEmptyState />
      </div>
    );
  if (!data.recap || !data.options)
    return <AppPageSkeleton label="Finding plans for your history" />;
  const recap = data.recap;
  const options = data.options;
  const detailId =
    query.get("target")?.replace(/^plan:/, "") ??
    query.get("detail") ??
    (query.get("api") ? `api:${query.get("api")}` : undefined);
  const detail = options.find((o) => o.id === detailId);
  const compareIds = query.get("options")?.split(",") ?? [];
  const comparisons = options
    .filter((o) => compareIds.includes(o.id) || proposal.some((s) => s.plan === `plan:${o.id}`))
    .slice(0, query.get("stack") ? 20 : 3);
  const comparing = query.get("section") === "compare" || proposal.length > 0;
  const multiplier =
    confirmed && monthly ? paidMultiplier(recap.usd, monthly, recap.days.length) : undefined;
  const alternatives = options
    .filter((o) => o.kind !== "api" && !counts[`plan:${o.id}`])
    .slice(0, 6);
  const href = (params: Record<string, string>) =>
    `/app/plans?${new URLSearchParams({ ...Object.fromEntries([...query].filter(([key]) => !["detail", "target", "api", "section", "options"].includes(key))), import: data.id ?? "", period: data.period, ...params })}`;
  return (
    <div
      className="recap-page explorer-page plans-flow"
      data-testid="plans-ready"
      data-period={data.period}
    >
      <header className="recap-toolbar">
        <div>
          <p className="recap-eyebrow">Make room for your next idea</p>
          <h1>{detail ? "A closer look" : comparing ? "Compare your options" : "Your plans"}</h1>
          <p className="explorer-intro">
            {detail
              ? detail.name
              : comparing
                ? "The same history. A few different possibilities."
                : "What you pay for. How you use it. What else could fit."}
          </p>
        </div>
        <PeriodControl value={data.period} onChange={data.selectPeriod} />
      </header>
      {data.record && isSyntheticWorkload(data.record) && (
        <p className="plan-muted">Fictional demo. These numbers are sample data.</p>
      )}
      {(detail || comparing) && (
        <Link className="recap-button secondary" href={href({})}>
          Back to your plans
        </Link>
      )}
      {detail ? (
        <section className="plan-detail" data-testid="plan-detail">
          <div className="plan-alternatives">
            <PlanCard
              option={detail}
              monthly={confirmed ? monthly : undefined}
              href={href}
              showActions={false}
            />
          </div>
          <section className="plan-section">
            <div className="plan-section-heading">
              <h2>How your history fits</h2>
            </div>
            <Usage option={detail} />
          </section>
          {detail.windows.length > 0 && (
            <div className="explorer-panel">
              <div className="explorer-section-title">
                <h2>When the limits matter</h2>
                <p>Time periods when your recorded activity would exceed an included allowance.</p>
              </div>
              <DataTable
                label="Activity beyond included limits"
                rows={detail.windows}
                rowKey={(r) => r.id}
                columns={[
                  {
                    key: "date",
                    label: "Period starting",
                    render: (r) => r.date,
                    compare: (a, b) => a.date.localeCompare(b.date),
                  },
                  { key: "limit", label: "Limit", render: (r) => r.limit },
                  {
                    key: "stopped",
                    label: "Requests that would stop",
                    numeric: true,
                    render: (r) => r.stopped.toLocaleString(),
                    compare: (a, b) => a.stopped - b.stopped,
                  },
                ]}
              />
            </div>
          )}
          <div className="explorer-panel">
            <div className="explorer-section-title">
              <h2>
                {detail.kind === "api" ? "Your models with this API" : "Your models on this plan"}
              </h2>
            </div>
            <DataTable
              label="Model access on this plan"
              rows={detail.models}
              rowKey={(r) => r.id}
              columns={[
                {
                  key: "model",
                  label: "Model",
                  render: (r) => r.name,
                  compare: (a, b) => a.name.localeCompare(b.name),
                },
                {
                  key: "tokens",
                  label: "Tokens",
                  numeric: true,
                  render: (r) => compactNumber(r.tokens),
                  compare: (a, b) => a.tokens - b.tokens,
                },
                {
                  key: "access",
                  label: "Included",
                  render: (r) => (r.included ? "Yes" : "No documented access"),
                },
              ]}
            />
          </div>
        </section>
      ) : comparing ? (
        <section className="plan-section plan-compare" data-testid="plans-comparison">
          {comparisons.length >= (proposal.length ? 1 : 2) ? (
            <div className="plan-alternatives">
              {comparisons.map((option) => (
                <PlanCard
                  key={option.id}
                  option={option}
                  monthly={confirmed ? monthly : undefined}
                  href={href}
                />
              ))}
            </div>
          ) : (
            <div className="plan-use">
              <h2>Choose two or three alternatives.</h2>
              <p>Select Compare on the cards to put them side by side.</p>
              <Link className="recap-button secondary" href={href({})}>
                Choose alternatives
              </Link>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="plan-section" aria-label="Your plans">
            <div className="plan-section-heading">
              <h2>Your plans</h2>
              {confirmed && !editing && (
                <button
                  className="recap-button secondary"
                  type="button"
                  onClick={() => setEditing(true)}
                >
                  Edit plans
                </button>
              )}
            </div>
            {confirmed && !editing ? (
              <div className="plan-list">
                {summary.targets.map((t) => (
                  <div className="plan-saved" key={t.key}>
                    <div>
                      <h3>
                        {t.name}
                        {(counts[t.key] ?? 1) > 1 ? ` × ${counts[t.key]}` : ""}
                      </h3>
                      <p className="plan-muted">
                        {counts[t.key] ?? 1} {(counts[t.key] ?? 1) > 1 ? "accounts" : "account"}
                      </p>
                    </div>
                    <strong>
                      {t.publishedPrice?.currency === "USD" && t.publishedPrice.interval === "month"
                        ? `${recapUsd(new Decimal(t.publishedPrice.amount).mul(counts[t.key] ?? 1).toString())}/month`
                        : "Price unreported"}
                    </strong>
                  </div>
                ))}
                {monthly && (
                  <p className="plan-muted">
                    Monthly total: {recapUsd(monthly)}. Published subscription prices.
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="plan-muted" style={{ marginBottom: 24 }}>
                  Choose the plans you pay for, then save once. Detected services are shown first.
                </p>
                {shownGroups.map((group) => (
                  <div className="plan-choice-family" key={group.groupId}>
                    <h3>
                      {group.groupId === "claude"
                        ? "Claude"
                        : group.groupId === "chatgpt"
                          ? "ChatGPT"
                          : group.groupId === "opencode"
                            ? "OpenCode"
                            : "Command Code"}
                    </h3>
                    <p>{group.question}</p>
                    <FamilyPlanChoices
                      group={group}
                      plans={plans}
                      counts={counts}
                      answer={answers[group.groupId] ?? initialDiscoveryAnswer(group)}
                      onChange={(answer) =>
                        setAnswers((old) => ({ ...old, [group.groupId]: answer }))
                      }
                      prefix="plans"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="recap-button"
                  disabled={!draft.length}
                  onClick={save}
                >
                  Save plans
                </button>
                {saveError && <p role="alert">{saveError}</p>}
              </>
            )}
          </section>
          <section className="plan-headline">
            <p className="recap-eyebrow">
              {compactNumber(recap.total)} tokens · {recap.start} to {recap.end}
            </p>
            <h2>
              Your {data.period === "all" ? "history" : `last ${data.period} days`} would have cost{" "}
              <strong>{recapUsd(recap.usd)}</strong> at API prices
            </h2>
            {multiplier && <p className="plan-multiplier">{multiplier} × what you paid</p>}
          </section>
          <section className="plan-section">
            <div className="plan-section-heading">
              <h2>How hard you use them</h2>
            </div>
            {confirmed ? (
              <div className="plan-list">
                {options
                  .filter((o) => counts[`plan:${o.id}`])
                  .map((option) => (
                    <Usage key={option.id} option={option} />
                  ))}
              </div>
            ) : (
              <p className="plan-muted">
                Save your plans above to see how your history fits their limits.
              </p>
            )}
          </section>
          <section className="plan-section" aria-label="Alternative plans">
            <div className="plan-section-heading">
              <div>
                <h2>What else would fit</h2>
                <p>
                  Ranked by access to the models you used. Limits stay unknown where they aren’t
                  published.
                </p>
              </div>
              <Link
                href={href({ section: "compare", options: selected.join(",") })}
                className="recap-button secondary"
                aria-disabled={selected.length < 2}
                onClick={(e) => {
                  if (selected.length < 2) e.preventDefault();
                }}
              >
                Compare {selected.length ? `${selected.length} plans` : "plans"}
              </Link>
            </div>
            {alternatives.length ? (
              <div className="plan-alternatives">
                {alternatives.map((option) => (
                  <PlanCard
                    key={option.id}
                    option={option}
                    monthly={confirmed ? monthly : undefined}
                    href={href}
                    selection={{
                      selected,
                      onSelect: (id, checked) =>
                        setSelected((old) =>
                          checked ? [...old, id] : old.filter((item) => item !== id),
                        ),
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="plan-use">
                <p>No other plan documents access to your recorded models.</p>
                <Link href="/catalog" className="recap-button secondary">
                  Explore models &amp; plans
                </Link>
              </div>
            )}
          </section>
        </>
      )}
      <CalculationNote recap={recap} />
      <footer className="recap-footer">Calculated on this device. Your logs stay here.</footer>
    </div>
  );
}
function PlanCard({
  option,
  monthly,
  href,
  showActions = true,
  selection,
}: {
  option: PlanOption;
  monthly?: string | undefined;
  href: (params: Record<string, string>) => string;
  showActions?: boolean;
  selection?: { selected: string[]; onSelect: (id: string, checked: boolean) => void };
}) {
  return (
    <article className="plan-alternative" data-testid={`alternative-${option.id}`}>
      <h3>{option.name}</h3>
      <p className="plan-price">
        {option.kind === "api"
          ? "Pay as you go"
          : option.monthly
            ? recapUsd(option.monthly)
            : "Price unreported"}
        {option.monthly && <small> / month</small>}
      </p>
      <dl>
        <div>
          <dt>Models for your work</dt>
          <dd>{Math.round(option.share * 100)}% covered</dd>
        </div>
        <div>
          <dt>Days it would run out</dt>
          <dd>
            {option.kind === "api"
              ? "No subscription limit"
              : option.daysOut === undefined
                ? "Not enough limit evidence"
                : `${option.daysOut} days`}
          </dd>
        </div>
        <div>
          <dt>Compared with your plans</dt>
          <dd>
            {monthly && option.monthly
              ? difference(option.monthly, monthly)
              : "Confirm your plans to compare"}
          </dd>
        </div>
      </dl>
      {showActions && (
        <div className="plan-alternative-actions">
          <Link href={href({ detail: option.id })} className="recap-button secondary">
            See details
          </Link>
          {selection && (
            <label>
              <input
                type="checkbox"
                checked={selection.selected.includes(option.id)}
                disabled={!selection.selected.includes(option.id) && selection.selected.length >= 3}
                onChange={(e) => selection.onSelect(option.id, e.target.checked)}
              />
              Compare<span className="sr-only"> {option.name}</span>
            </label>
          )}
        </div>
      )}
    </article>
  );
}

function Usage({ option }: { option: PlanOption }) {
  return (
    <article className="plan-use">
      <h3>{option.name}</h3>
      {option.error ? (
        <p>This plan’s limits couldn’t be checked for this history.</p>
      ) : (
        <>
          {option.limits.map((limit) => (
            <p key={`${option.id}-${limit.name}`}>
              {limit.uncertain
                ? "Some usage needed for this limit wasn’t recorded."
                : limit.days === undefined
                  ? `Your activity would exceed the ${limit.name.toLowerCase()} allowance. The exact days aren’t reported.${limit.continues ? " Work can continue beyond this allowance under the plan’s terms." : ""}`
                  : `Would reach the ${limit.name.toLowerCase()} limit on ${limit.days} ${limit.days === 1 ? "day" : "days"}.${limit.continues ? " Work can continue beyond this allowance under the plan’s terms." : ""}`}
            </p>
          ))}
          {option.kind === "api" ? (
            <p>Pay per request. Subscription limits do not apply.</p>
          ) : (
            option.daysOut === undefined && (
              <p>
                {option.limits.length > 0
                  ? "The available evidence cannot tell us when this plan would run out."
                  : "Limits aren’t published, so we can’t say when this plan would run out."}
              </p>
            )
          )}
          {option.peak && (
            <p>
              Peak day: {option.peak.date}, with {compactNumber(option.peak.tokens)} tokens on
              included models.
            </p>
          )}
        </>
      )}
    </article>
  );
}
function difference(next: string, current: string) {
  const delta = new Decimal(next).sub(current);
  return delta.isZero()
    ? "Same monthly price"
    : `${recapUsd(delta.abs().toString())} ${delta.isNegative() ? "less" : "more"} / month`;
}
