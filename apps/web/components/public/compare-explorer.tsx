"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { PlanTermsNotice } from "@/components/plan-history";
import { type CompareFacts, compareModelMatrix } from "@/lib/compare-facts";
import { compareSearch, readComparePlans } from "@/lib/compare-url";
import type { PublicProviderSummary } from "@/lib/public-catalog";
import type { PublicDirectoryPlan } from "@/lib/public-directory";
import { publicPlanPricePresentation } from "@/lib/public-plan-price";
import { limitUnitText, limitWindowText } from "./plan-facts";
import { SourceList, VerificationBadge } from "./provenance";
import { PublishedSubscriptionTerms, PublishedUsageTable } from "./published-subscription-terms";

/**
 * Public plan comparison (launch).
 *
 * Rows follow the questions a person asks before choosing a plan, in order:
 * price, models, apps and tools, usage limits, what StackReplay can simulate,
 * what happens after the limit, and sources. Two or three plans sit side by
 * side; a row where every plan says the same thing is shown once. Every
 * catalog detail (limit types, provider statements, model rules, versions,
 * sources) stays one level down under "Inspect constraints and sources".
 */

/**
 * The count and a link to the plan's own lineup. The lineup summary is written for
 * the plan page; side by side, its caveats read as differences between plans.
 */
function ModelsCell({ facts }: { facts: CompareFacts }) {
  const { total } = facts.models;
  return (
    <div>
      <p className="text-foreground">
        {total === 0
          ? (facts.modelAccess?.summary ?? "No named model is listed for this plan.")
          : `${total} ${total === 1 ? "model" : "models"} included`}
      </p>
      {facts.modelAccess && (
        <Link
          href={`/plans/${facts.planId}#model-access`}
          className="market-link mt-2 inline-flex min-h-11 items-center text-sm"
        >
          Full lineup & access conditions ↗
        </Link>
      )}
    </div>
  );
}

/** Short lineups show in full; long ones start with the most shared models. */
const MATRIX_LIMIT = 24;
const MATRIX_ROWS = 16;

/** Which models each plan includes, shared ones first. Names link to model pages. */
function ModelMatrix({
  plans,
  testIdPrefix = "compare",
}: {
  plans: readonly { plan: PublicDirectoryPlan; facts: CompareFacts }[];
  testIdPrefix?: "compare" | "compare-mobile";
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = compareModelMatrix(plans.map((entry) => entry.facts));
  if (plans.some((entry) => entry.plan.kind === "public_offer"))
    return (
      <p className="text-muted-foreground">
        Exact model comparison is unavailable for offers whose complete lineup is not established.
      </p>
    );
  if (rows.length === 0) return null;
  const shared = rows.filter((row) => row.included.every(Boolean)).length;
  const only = plans.map(
    (_, index) =>
      rows.filter((row) => row.included[index] && row.included.filter(Boolean).length === 1).length,
  );
  const collapsible = rows.length > MATRIX_LIMIT;
  const shown = expanded || !collapsible ? rows : rows.slice(0, MATRIX_ROWS);
  return (
    <div className="min-w-0">
      <p className="text-foreground" data-testid={`${testIdPrefix}-model-summary`}>
        {shared} in {plans.length === 2 ? "both" : "all three"}
        {plans.map((entry, index) => (
          <span key={entry.plan.id}>
            {" "}
            · {only[index]} only in {entry.plan.name}
          </span>
        ))}
      </p>
      <table className="market-matrix mt-3" data-testid={`${testIdPrefix}-model-matrix`}>
        <caption className="sr-only">Models each compared plan includes</caption>
        <thead>
          <tr>
            <th scope="col">Model</th>
            {plans.map((entry) => (
              <th key={entry.plan.id} scope="col">
                {entry.plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr key={row.id}>
              <th scope="row">
                {row.id.startsWith("published:") ? (
                  row.name
                ) : (
                  <Link href={`/models/${row.id}`}>{row.name}</Link>
                )}
                {row.legacy ? <span className="text-muted-foreground"> · Legacy</span> : null}
              </th>
              {row.included.map((included, index) => (
                <td key={plans[index]?.plan.id} data-included={included || undefined}>
                  <span aria-hidden="true">{included ? "✓" : "–"}</span>
                  <span className="sr-only">{included ? "Included" : "Not listed"}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {collapsible && (
        <button
          type="button"
          className="market-link mt-2 inline-flex min-h-11 items-center text-sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show fewer models ↑" : `Show all ${rows.length} models ↓`}
        </button>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Included means the plan lists the model as included or available with conditions. Model
        choice and limits can differ between a plan's apps; each lineup link above has the
        conditions.
      </p>
    </div>
  );
}

const toolsText = (facts: CompareFacts) =>
  facts.codingTools.join(", ") || "Not named in this plan's sources";

function AppsCell({ facts }: { facts: CompareFacts }) {
  return (
    <div>
      <p className="text-foreground">{toolsText(facts)}</p>
      {facts.otherApps && <p className="mt-2 text-muted-foreground">{facts.otherApps}</p>}
    </div>
  );
}

function UsageFacts({ facts }: { facts: CompareFacts }) {
  if (!facts.usage.lines.length) {
    return <p className="text-foreground">No numeric allowance is recorded in this snapshot.</p>;
  }
  return (
    <ul className="space-y-2">
      {facts.usage.lines.map((line) => (
        <li key={`${line.text}-${line.detail}`}>
          <span className="text-foreground">{line.text}</span>
          {line.detail && (
            <span className="block text-xs text-muted-foreground">{line.detail}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function UsageCell({ facts }: { facts: CompareFacts }) {
  return (
    <div>
      <UsageFacts facts={facts} />
      {facts.publishedTerms && (
        <>
          {facts.publishedTerms.tables?.[0] && (
            <details className="mt-3">
              <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
                {facts.publishedTerms.tables[0].title}
              </summary>
              <PublishedUsageTable table={facts.publishedTerms.tables[0]} />
            </details>
          )}
          <Link
            className="market-link mt-2 inline-flex min-h-11 items-center text-sm"
            href={`/plans/${facts.planId}#usage`}
          >
            Usage, privacy & plan conditions ↗
          </Link>
        </>
      )}
    </div>
  );
}

function AfterLimitCell({ facts }: { facts: CompareFacts }) {
  const { lines, quotes } = facts.afterLimit;
  if (lines.length === 0 && quotes.length === 0) {
    return <p className="text-muted-foreground">Not stated in the sources StackReplay records.</p>;
  }
  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <p key={line} className="text-foreground">
          {line}
        </p>
      ))}
      {lines.length === 0
        ? quotes.slice(0, 1).map((quote) => (
            <blockquote
              key={quote.text}
              className="border-l border-border-strong pl-3 text-muted-foreground"
            >
              {quote.excerpt}
            </blockquote>
          ))
        : null}
    </div>
  );
}

function InspectContent({
  plan,
  facts,
  testId,
}: {
  plan: PublicDirectoryPlan;
  facts: CompareFacts;
  testId: string;
}) {
  if (plan.kind === "public_offer")
    return (
      <div className="space-y-3 pb-4 pt-2 text-sm" data-testid={testId}>
        <p>{facts.effective}</p>
        <p>{facts.simulation}</p>
        <SourceList sources={plan.sources} />
      </div>
    );
  return (
    <div className="space-y-5 pb-4 pt-2 text-sm" data-testid={testId}>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Numeric limits
        </p>
        {plan.limits.length === 0 ? (
          <p className="mt-1 text-muted-foreground">
            {plan.publishedTerms
              ? "Published allowances are shown in the usage row. They are not yet executable replay constraints."
              : "No numeric limit is recorded here."}
          </p>
        ) : (
          <ul className="mt-1 space-y-3">
            {plan.limits.map((limit) => (
              <li key={limit.id} className="border-l border-border-strong pl-3">
                <span className="font-medium text-foreground">{limit.label}</span>
                <span className="block text-muted-foreground">
                  {limit.amount} {limitUnitText(limit)} · {limitWindowText(limit)} ·{" "}
                  {limit.exceed.replaceAll("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {plan.qualitativeLimits.length > 0 ? (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Provider statements
          </p>
          <ul className="mt-1 space-y-2 text-xs text-muted-foreground">
            {plan.qualitativeLimits.map((limit) => (
              <li key={limit.id}>
                <span className="font-medium text-foreground">{limit.label}.</span>{" "}
                {limit.statement}
                {limit.sourceUrl === undefined ? null : (
                  <>
                    {" "}
                    <a
                      className="text-accent underline underline-offset-2"
                      href={limit.sourceUrl}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      Source
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Model rules
        </p>
        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
          {facts.rules.map((rule) => (
            <li key={rule.id}>
              <span className="text-foreground">{rule.name}</span>{" "}
              <span className="font-mono">({rule.id})</span> · {rule.kindLabel}
              {rule.excluded
                ? rule.usageCredits
                  ? " · usage credits only"
                  : " · not included"
                : ""}
              {rule.multiplier === undefined ? "" : ` · ×${rule.multiplier}`}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Version
        </p>
        <p className="mt-1 break-all font-mono text-xs text-foreground">{plan.versionId}</p>
        <p className="text-xs text-muted-foreground">
          {facts.effective} · {plan.versionCount} {plan.versionCount === 1 ? "version" : "versions"}{" "}
          on record
        </p>
      </div>
      <div className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Sources
        </p>
        <SourceList sources={plan.sources} />
        <VerificationBadge status={plan.verificationStatus} lastVerifiedAt={plan.lastVerifiedAt} />
      </div>
    </div>
  );
}

function InspectCell({ plan, facts }: { plan: PublicDirectoryPlan; facts: CompareFacts }) {
  return (
    <details>
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
        {plan.kind === "public_offer"
          ? "Inspect public offer and sources"
          : "Inspect constraints and sources"}
      </summary>
      <InspectContent plan={plan} facts={facts} testId="compare-inspect" />
    </details>
  );
}

/** Grid classes for two plans side by side from 640px, or three from 1024px. */
function columns(count: number) {
  return count === 3
    ? {
        grid: "lg:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]",
        stackedOnly: "lg:hidden",
        wideOnly: "hidden lg:block",
        span: "lg:col-span-3",
      }
    : {
        grid: "sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]",
        stackedOnly: "sm:hidden",
        wideOnly: "hidden sm:block",
        span: "sm:col-span-2",
      };
}

function Row({
  label,
  testId,
  names,
  cells,
  same,
}: {
  label: string;
  testId: string;
  names: readonly string[];
  cells: readonly ReactNode[];
  /** Shown once across every column when each plan says the same thing. */
  same?: ReactNode;
}) {
  const layout = columns(names.length);
  return (
    <div
      className={`grid gap-x-6 gap-y-3 border-b border-border py-4 text-sm ${layout.grid}`}
      data-testid={`compare-row-${testId}`}
    >
      <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-0.5">
        {label}
      </h3>
      {same !== undefined ? (
        <div className={`min-w-0 ${layout.span}`}>
          {same}
          <p className="mt-1 text-xs text-muted-foreground">
            {names.length === 2 ? "Same for both plans" : "Same for all three plans"}
          </p>
        </div>
      ) : (
        cells.map((cell, index) => (
          <div key={names[index]} className="min-w-0">
            <p className={`mb-1 text-xs text-muted-foreground ${layout.stackedOnly}`}>
              {names[index]}
            </p>
            {cell}
          </div>
        ))
      )}
    </div>
  );
}

/** A row of plain statements, shown once when every plan's statement is the same. */
function TextRow({
  label,
  testId,
  names,
  texts,
  className = "text-foreground",
}: {
  label: string;
  testId: string;
  names: readonly string[];
  texts: readonly string[];
  className?: string;
}) {
  const same = texts.every((text) => text === texts[0]);
  return (
    <Row
      label={label}
      testId={testId}
      names={names}
      cells={texts.map((text) => (
        <p key={text} className={className}>
          {text}
        </p>
      ))}
      same={same ? <p className={className}>{texts[0]}</p> : undefined}
    />
  );
}

const COMPACT_FACT_LABEL =
  "font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground";

function CompactFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className={COMPACT_FACT_LABEL}>{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function CompactModelMatrix({
  plans,
  className,
}: {
  plans: readonly { plan: PublicDirectoryPlan; facts: CompareFacts }[];
  className: string;
}) {
  const unavailable = plans.some((entry) => entry.plan.kind === "public_offer");
  if (!unavailable && compareModelMatrix(plans.map((entry) => entry.facts)).length === 0) {
    return null;
  }
  return (
    <details
      className={`border-y border-border py-4 ${className}`}
      data-testid="compare-mobile-model-matrix-details"
    >
      <summary className="min-h-11 cursor-pointer content-center text-sm font-medium text-accent">
        Compare model access
      </summary>
      <div className="pt-3">
        <ModelMatrix plans={plans} testIdPrefix="compare-mobile" />
      </div>
    </details>
  );
}

function CompactPlanFacts({
  plan,
  facts,
  className,
}: {
  plan: PublicDirectoryPlan;
  facts: CompareFacts;
  className: string;
}) {
  const terms = facts.publishedTerms;
  return (
    <div
      className={`mt-5 space-y-4 border-t border-border pt-4 ${className}`}
      data-testid="compare-compact-summary"
    >
      <CompactFact label="Apps & tools">
        <AppsCell facts={facts} />
      </CompactFact>
      <CompactFact label="Included allowance">
        <UsageFacts facts={facts} />
      </CompactFact>
      <CompactFact label="After the limit">
        <AfterLimitCell facts={facts} />
      </CompactFact>
      <CompactFact label="Billing & qualifications">
        {terms?.billingSummary && <p className="text-foreground">{terms.billingSummary}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{facts.evidence}</p>
        <p className="mt-1 text-xs text-muted-foreground">{facts.effective}</p>
      </CompactFact>
      <details className="border-t border-border pt-2">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
          Models & access
        </summary>
        <div className="pt-2">
          <ModelsCell facts={facts} />
        </div>
      </details>
      {terms && (
        <details className="border-t border-border pt-2">
          <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
            Published terms & policy
          </summary>
          <div className="pt-2">
            <PublishedSubscriptionTerms terms={terms} />
          </div>
        </details>
      )}
      <details className="border-t border-border pt-2">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
          {plan.kind === "public_offer"
            ? "Inspect public offer and sources"
            : "Inspect constraints and sources"}
        </summary>
        <InspectContent plan={plan} facts={facts} testId="compare-compact-inspect" />
      </details>
    </div>
  );
}

function TargetHeader({
  plan,
  facts,
  asOf,
  onRemove,
  compactClass,
}: {
  plan: PublicDirectoryPlan;
  facts: CompareFacts;
  asOf: string;
  onRemove?: (() => void) | undefined;
  compactClass: string;
}) {
  const price = publicPlanPricePresentation(plan);
  return (
    <section className="min-w-0 border-t border-border-strong pt-4" data-testid="compare-target">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          {plan.providerName}
        </p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="min-h-11 -mt-3 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            aria-label={`Remove ${plan.name} from the comparison`}
          >
            Remove
          </button>
        )}
      </div>
      <h2 className="mt-1 text-xl font-medium text-foreground">
        <Link className="hover:text-accent hover:underline" href={`/plans/${plan.id}`}>
          {plan.name}
        </Link>
      </h2>
      <p className="mt-3" data-testid="compare-price">
        <span className={price.formula ? "text-xl leading-relaxed" : "market-stat"}>
          {price.amount}
        </span>
        <span className="market-muted ml-2">{price.unit}</span>
      </p>
      <CompactPlanFacts plan={plan} facts={facts} className={compactClass} />
      {plan.kind === "catalog_plan" && plan.timeline !== undefined && (
        <PlanTermsNotice
          asOf={asOf}
          followToday
          historyHref={`/plans/${plan.id}#history`}
          plan={plan.timeline}
          planName={plan.name}
          providerName={plan.providerName}
          variant="summary"
        />
      )}
      {plan.publishedTerms?.availabilityNote && (
        <p className="mt-3 text-sm text-warning">{plan.publishedTerms.availabilityNote}</p>
      )}
      {plan.kind === "public_offer" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Published offer only; workload replay is unavailable.
        </p>
      ) : (
        <Link
          className="mt-1 inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4"
          href={`/app/import?target=${encodeURIComponent(plan.id)}`}
        >
          Replay your workload here ↗
        </Link>
      )}
    </section>
  );
}

const PRIVACY_FALLBACK =
  "Privacy terms are not recorded here. Check the provider before sending sensitive work.";

/** Read router-owned search data after client navigation, not an earlier window URL. */
export function RoutedCompareExplorer(props: ComponentProps<typeof CompareExplorer>) {
  const search = useSearchParams();
  return <CompareExplorer {...props} routedSearch={search.toString()} />;
}

export function CompareExplorer({
  plans,
  providers,
  facts,
  defaultPair,
  asOf,
  routedSearch,
}: {
  plans: readonly PublicDirectoryPlan[];
  providers: readonly PublicProviderSummary[];
  facts: Readonly<Record<string, CompareFacts>>;
  defaultPair: readonly [string, string];
  routedSearch?: string;
  /** The day the page resolved plan terms on; a plan's notice follows the viewer's day after hydration. */
  asOf: string;
}) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>(() =>
    routedSearch === undefined
      ? [...defaultPair]
      : readComparePlans(
          routedSearch,
          plans.map((plan) => plan.id),
          defaultPair,
        ),
  );
  const planIds = useMemo(() => plans.map((plan) => plan.id), [plans]);
  // Select from router data before paint, without touching the previous page's history.
  useLayoutEffect(() => {
    // The static Suspense fallback is display-only.
    if (routedSearch === undefined) return;
    setIds(readComparePlans(routedSearch, planIds, defaultPair));
    document.documentElement.removeAttribute("data-compare");
  }, [routedSearch, planIds, defaultPair]);
  // Once the router's layout commit has finished, the browser URL is authoritative.
  // Cached vinext trees can restore an older useSearchParams snapshot on traversal.
  // Reconcile selection before normalizing so that snapshot cannot erase the query.
  useEffect(() => {
    if (routedSearch === undefined || window.location.pathname !== "/compare") return;
    const nextIds = readComparePlans(window.location.search, planIds, defaultPair);
    setIds((current) =>
      current.length === nextIds.length && current.every((id, index) => id === nextIds[index])
        ? current
        : nextIds,
    );
    const next = `/compare${compareSearch(nextIds, defaultPair)}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`)
      router.replace(next, { scroll: false });
  }, [routedSearch, planIds, defaultPair, router]);
  const selectPlans = (nextIds: string[]) => {
    setIds(nextIds);
    router.replace(`/compare${compareSearch(nextIds, defaultPair)}${window.location.hash}`, {
      scroll: false,
    });
  };
  const chosen = ids.flatMap((id) => {
    const plan = plans.find((entry) => entry.id === id);
    const planFacts = facts[id];
    return plan && planFacts ? [{ plan, facts: planFacts }] : [];
  });
  const names = chosen.map((entry) => entry.plan.name);
  const setAt = (index: number, id: string) =>
    selectPlans(ids.map((value, at) => (at === index ? id : value)));
  const addThird = () =>
    selectPlans([...ids, planIds.find((id) => !ids.includes(id)) ?? ids[0] ?? ""]);
  const selector = (label: string, index: number) => (
    <label key={label} className="flex min-w-0 flex-col gap-2 text-xs text-muted-foreground">
      {label}
      <select
        value={ids[index]}
        onChange={(event) => setAt(index, event.target.value)}
        className="min-h-11 w-full border border-control-border bg-surface px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {providers.map((provider) => (
          <optgroup key={provider.id} label={provider.name}>
            {plans
              .filter((plan) => plan.providerId === provider.id)
              .map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
  const duplicate = new Set(ids).size !== ids.length;
  const ready = !duplicate && chosen.length === ids.length && chosen.length >= 2;
  const layout = columns(chosen.length);
  return (
    <div className="flex flex-col gap-6" data-compare-results>
      <div
        className={`grid items-end gap-4 border-y border-border-strong py-4 ${ids.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"}`}
      >
        {selector("First plan", 0)}
        {selector("Second plan", 1)}
        {ids.length === 3 ? (
          selector("Third plan", 2)
        ) : (
          <button
            type="button"
            onClick={addThird}
            className="min-h-11 border border-control-border px-4 text-sm text-foreground hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            + Add a third plan
          </button>
        )}
      </div>
      {duplicate ? (
        <p className="text-sm text-muted-foreground">Choose different plans to see a comparison.</p>
      ) : null}
      {ready ? (
        <div className="flex min-w-0 flex-col" data-testid="compare-table">
          <div className={`grid gap-x-6 gap-y-5 ${layout.grid}`}>
            <div className={layout.wideOnly} />
            {chosen.map((entry, index) => (
              <TargetHeader
                asOf={asOf}
                compactClass={layout.stackedOnly}
                facts={entry.facts}
                key={entry.plan.id}
                plan={entry.plan}
                onRemove={
                  chosen.length === 3
                    ? () => selectPlans(ids.filter((_, at) => at !== index))
                    : undefined
                }
              />
            ))}
          </div>
          <CompactModelMatrix plans={chosen} className={layout.stackedOnly} />
          <div className={`mt-4 border-t border-border ${layout.wideOnly}`}>
            <Row
              label="Models"
              testId="models"
              names={names}
              cells={chosen.map((entry) => <ModelsCell key={entry.plan.id} facts={entry.facts} />)}
            />
            <div
              className={`grid gap-x-6 gap-y-3 border-b border-border py-4 text-sm ${layout.grid}`}
              data-testid="compare-row-model-matrix"
            >
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-0.5">
                Model by model
              </h3>
              <div className={`min-w-0 ${layout.span}`}>
                <ModelMatrix plans={chosen} />
              </div>
            </div>
            <Row
              label="Apps & tools"
              testId="coding-tools"
              names={names}
              cells={chosen.map((entry) => <AppsCell key={entry.plan.id} facts={entry.facts} />)}
              same={
                chosen[0] &&
                new Set(
                  chosen.map((entry) => `${toolsText(entry.facts)}\n${entry.facts.otherApps}`),
                ).size === 1 ? (
                  <AppsCell facts={chosen[0].facts} />
                ) : undefined
              }
            />
            <Row
              label="Usage limits"
              testId="usage"
              names={names}
              cells={chosen.map((entry) => <UsageCell key={entry.plan.id} facts={entry.facts} />)}
            />
            <TextRow
              label="StackReplay can simulate"
              testId="simulation"
              names={names}
              texts={chosen.map((entry) => entry.facts.simulation)}
            />
            <Row
              label="After the limit"
              testId="after-limit"
              names={names}
              cells={chosen.map((entry) => (
                <AfterLimitCell key={entry.plan.id} facts={entry.facts} />
              ))}
            />
            {chosen.some((entry) => entry.facts.publishedTerms) && (
              <>
                <TextRow
                  label="Privacy & data use"
                  testId="privacy"
                  names={names}
                  className=""
                  texts={chosen.map(
                    (entry) => entry.facts.publishedTerms?.privacySummary ?? PRIVACY_FALLBACK,
                  )}
                />
                <TextRow
                  label="Billing & renewal"
                  testId="billing-terms"
                  names={names}
                  className=""
                  texts={chosen.map(
                    (entry) =>
                      entry.facts.publishedTerms?.billingSummary ??
                      (entry.plan.kind === "catalog_plan"
                        ? entry.plan.billingMechanics
                        : undefined) ??
                      "Check provider billing terms.",
                  )}
                />
              </>
            )}
            <Row
              label="Sources"
              testId="sources"
              names={names}
              cells={chosen.map((entry) => (
                <div key={entry.plan.id}>
                  <p className="text-xs text-muted-foreground">{entry.facts.evidence}</p>
                  <InspectCell plan={entry.plan} facts={entry.facts} />
                </div>
              ))}
            />
          </div>
        </div>
      ) : null}
      <p className="max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
        Published usage values can use different model rates and multipliers. They are not cash
        balances or interchangeable request quotas. Replay your history where exact plan mechanics
        are supported.
      </p>
      <Link
        className="inline-flex min-h-11 items-center self-start text-sm text-accent underline underline-offset-4"
        href="/app/compare"
        data-testid="compare-with-workload"
      >
        Compare against my workload →
      </Link>
    </div>
  );
}
