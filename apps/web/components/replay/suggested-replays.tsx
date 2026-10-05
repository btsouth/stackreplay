"use client";
import { bundledApiProviderModels, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTokens } from "@/components/instrument/format";
import { MicroLabel } from "@/components/instrument/primitives";
import { AppPageSkeleton, LocalReadError } from "@/components/plans/app-page-state";
import { AppSelect } from "@/components/plans/app-select";
import { StackScenarioPanel } from "@/components/stack/stack-scenario-panel";
import {
  type CompletedReplay,
  compatibleReplaySnapshots,
  saveCompletedReplay,
} from "@/lib/completed-replays";
import {
  readStackSubscriptions,
  type StackSubscription,
  subscribeCurrentStack,
} from "@/lib/current-stack";
import { marketRange } from "@/lib/decision-presentation";
import type { MarketDecision } from "@/lib/market-decision";
import { replayLink, routeCopy, routeLink } from "@/lib/replay-navigation";
import {
  approvedPolicy,
  baselineRange,
  DECISION_RULES_DATE,
  mappingCoverage,
  marketModelCosts,
  priceRangeText,
  replayCost,
  replayDifference,
  suggestedMapping,
  TRANSLATION_PROFILES,
  type TranslationProfile,
} from "@/lib/replay-strategies";
import { suggestRoutes, supportedModelsFor, workloadSlices } from "@/lib/routes";
import {
  alignProposal,
  type ScenarioResult,
  type StackWorkload,
  stackAssessmentLines,
  stackAssessmentTitle,
} from "@/lib/stack-analysis";
import { suggestedReplaySnapshotHash } from "@/lib/suggested-replay-snapshot";
import { browserTimeZone } from "@/lib/time-zone";
import { loadWorkloadProfile } from "@/lib/use-workload-profile";
import { getWorkerClient, type ReplayOutcome, SupersededError } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import type { WorkloadProfile } from "@/lib/workload-profile";
import { StrategyResult } from "./strategy-result";
import { workloadModels } from "./translation-model";

const action =
  "inline-flex min-h-11 items-center text-sm text-accent underline-offset-4 hover:underline";

export function SuggestedReplays({
  initialImportId,
  initialStack,
}: {
  initialImportId?: string | undefined;
  /** A proposed stack from My Stack's "Inspect in Replay": catalog plans and local account keys. */
  initialStack?: StackSubscription[] | undefined;
}) {
  const [state, setState] = useState<{
    record?: ImportRecord | undefined;
    loaded?: boolean;
    error?: boolean;
  }>({});
  useEffect(() => {
    let active = true;
    setState({});
    void getWorkerClient()
      .listImports()
      .then((list) => {
        if (active)
          setState({
            loaded: true,
            record: initialImportId ? list.find((r) => r.id === initialImportId) : list[0],
          });
      })
      .catch(() => {
        if (active) setState({ error: true });
      });
    return () => {
      active = false;
    };
  }, [initialImportId]);
  if (state.error) return <LocalReadError retry={() => window.location.reload()} />;
  if (!state.loaded) return <ReplayPreparation />;
  if (!state.record)
    return (
      <div className="space-y-4" data-testid="replay-empty">
        <h1 className="text-2xl font-medium">
          {initialImportId
            ? "That workload is no longer stored in this browser"
            : "Start with your recorded work"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Scan your history to see which plans and API options could fit the same work. Everything
          runs locally.
        </p>
        <Link href="/app/scan" className={action}>
          Scan your AI history →
        </Link>
      </div>
    );
  return (
    <StrategyWorkspace key={state.record.id} record={state.record} initialStack={initialStack} />
  );
}
function ReplayPreparation() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-medium">Try a change</h1>
      <AppPageSkeleton
        label="Opening your history. Reading recorded models and finding useful changes"
        testId="replay-restoring"
      />
    </div>
  );
}

function StrategyWorkspace({
  record,
  initialStack,
}: {
  record: ImportRecord;
  initialStack?: StackSubscription[] | undefined;
}) {
  const rulesDate = DECISION_RULES_DATE;
  const [baseline, setBaseline] = useState<MarketDecision>();
  const [profile, setProfile] = useState<WorkloadProfile>();
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0);
  const [stack, setStack] = useState<StackSubscription[]>([]);
  const [choice, setChoice] = useState<"exact" | "stack" | TranslationProfile["id"] | undefined>(
    initialStack ? "stack" : undefined,
  );
  const [proposedStack, setProposedStack] = useState<StackSubscription[] | undefined>(initialStack);
  const stackScenario = useRef<{ result: ScenarioResult; workload?: StackWorkload | undefined }>(
    undefined,
  );
  const [stackReady, setStackReady] = useState(false);
  const receiveScenario = useCallback(
    (result: ScenarioResult, workload: StackWorkload | undefined) => {
      stackScenario.current = { result, workload };
      setStackReady(workload !== undefined);
    },
    [],
  );
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [result, setResult] = useState<CompletedReplay>();
  const [outcome, setOutcome] = useState<ReplayOutcome>();
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const guard = useRef(0);
  const lastChoice = useRef<string | undefined>(undefined);
  const confirmation = useRef<HTMLElement>(null);
  const resultAnchor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const namespace = isSyntheticWorkload(record) ? `.demo.${record.id}` : "";
    const read = () => setStack(readStackSubscriptions(namespace));
    read();
    // A linked proposal pairs with the stack it was made from, so kept plans read as kept.
    if (initialStack)
      setProposedStack((proposal) =>
        proposal === initialStack
          ? alignProposal(initialStack, readStackSubscriptions(namespace))
          : proposal,
      );
    return subscribeCurrentStack(read);
  }, [record, initialStack]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry explicitly restarts preparation.
  useEffect(() => {
    const abort = new AbortController();
    setError(undefined);
    void Promise.all([
      getWorkerClient().apiMarket(record.id, abort.signal),
      loadWorkloadProfile(record.id, browserTimeZone()),
    ])
      .then(([b, p]) => {
        if (!abort.signal.aborted) {
          setBaseline(b);
          setProfile(p);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted && !(e instanceof SupersededError))
          setError("The workload could not be prepared. Your history is still stored locally.");
      });
    return () => {
      abort.abort();
      guard.current++;
    };
  }, [record.id, retry]);
  useEffect(() => {
    if (choice) confirmation.current?.focus();
    else if (lastChoice.current) {
      const previous = document.getElementById(`suggest-${lastChoice.current}`);
      if (previous?.closest("details:not([open])"))
        previous.closest("details")?.querySelector("summary")?.focus();
      else previous?.focus();
    }
  }, [choice]);
  useEffect(() => {
    if (result) resultAnchor.current?.focus();
  }, [result]);
  const workload = workloadModels(record.summary.models);
  const selected = TRANSLATION_PROFILES.find((p) => p.id === choice);
  const offered = selected
    ? supportedModelsFor(`api:${selected.providerId}`, rulesDate)
    : new Set<string>();
  const routes = useMemo(() => {
    if (!profile) return [];
    const names = new Map(record.summary.usageSources.map((s) => [s.adapterId, s.name]));
    return suggestRoutes(workloadSlices(profile.sources, names), rulesDate, {
      synthetic: isSyntheticWorkload(record),
    }).filter((route) => !route.translated && route.id !== "switch-provider");
  }, [profile, record]);
  const suggestions = TRANSLATION_PROFILES.filter(
    (p) =>
      Object.keys(suggestedMapping(p, workload, rulesDate)).length > 0 &&
      !(p.providerId === "anthropic" && record.summary.tokens.buckets.cacheWriteTokens > 0),
  )
    .sort(
      (a, b) =>
        mappingCoverage(workload, b.providerId, suggestedMapping(b, workload, rulesDate), rulesDate)
          .applicable -
        mappingCoverage(workload, a.providerId, suggestedMapping(a, workload, rulesDate), rulesDate)
          .applicable,
    )
    .slice(0, 1);
  const market = baseline ? baselineRange(baseline) : undefined;
  const published = market ?? marketRange(baseline?.pricedScope);
  const coverage = selected
    ? mappingCoverage(workload, selected.providerId, mapping, rulesDate)
    : undefined;
  const choose = (value: typeof choice) => {
    if (value) lastChoice.current = value;
    guard.current++;
    setRunning(false);
    setChoice(value);
    setResult(undefined);
    setOutcome(undefined);
    setSaved(false);
    setSaveError(false);
    setEditing(false);
    setError(undefined);
    const p = TRANSLATION_PROFILES.find((p) => p.id === value);
    setMapping(p ? suggestedMapping(p, workload, rulesDate) : {});
  };
  const edit = (from: string, to: string) => {
    guard.current++;
    setRunning(false);
    setResult(undefined);
    setOutcome(undefined);
    setSaved(false);
    setMapping((m) => ({ ...m, [from]: to }));
  };
  async function run() {
    if (!baseline || !profile || !choice) return;
    const token = ++guard.current;
    setRunning(true);
    setError(undefined);
    setResult(undefined);
    setSaved(false);
    setSaveError(false);
    try {
      const base = baselineRange(baseline);
      const calls = record.summary.eventCount;
      const common = {
        version: 1 as const,
        id: crypto.randomUUID(),
        importId: record.id,
        scopeDigest: baseline.scenarios[0]?.summary.scope.digest ?? record.id,
        catalogHash: baseline.snapshot?.catalogHash ?? DECISION_MARKET.catalogHash,
        decisionSnapshotHash: baseline.snapshot?.decisionSnapshotHash,
        rulesAt: baseline.snapshot?.rulesAt ?? DECISION_MARKET.rulesAt,
        createdAt: new Date().toISOString(),
        calls,
        tokens: record.summary.tokens.known,
        baseline: base,
      };
      let completed: CompletedReplay;
      if (choice === "exact") {
        const price = marketRange(baseline) ?? marketRange(baseline.pricedScope);
        const priced = baseline.coverage?.priced ?? 0;
        completed = {
          ...common,
          title: "Same models → direct APIs",
          mode: "exact",
          cost: price ? { low: price.low, high: price.high } : undefined,
          priced,
          translatedCalls: 0,
          difference: base ? { low: "0", high: "0" } : undefined,
          mappings: profile.models.canonical.map((m) => ({
            source: m.modelId,
            target: m.modelId,
            calls: m.events,
            tokens: m.tokens,
          })),
          contributions: marketModelCosts(baseline),
          limitations: [
            "Recorded models and calls are unchanged. This reuses the Workload API result.",
            ...(priced < calls
              ? [
                  `${calls - priced} calls remain unpriced. This is priced-scope economics, not the whole-workload cost.`,
                ]
              : []),
            "The range preserves the two published Claude cache-write assumptions. API cost does not establish an equivalent product experience.",
          ],
        };
      } else if (choice === "stack") {
        const scenario = stackScenario.current;
        if (!scenario?.workload) return;
        completed = {
          ...common,
          title: stackAssessmentTitle(scenario.result, proposedStack ?? stack),
          catalogHash: DECISION_MARKET.catalogHash,
          decisionSnapshotHash: DECISION_MARKET.decisionSnapshotHash,
          rulesAt: DECISION_MARKET.rulesAt,
          // The assessment covers the stack's period, not the whole-history baseline.
          scopeDigest: scenario.workload.scopeDigest ?? common.scopeDigest,
          baseline: undefined,
          calls: scenario.workload.overall.calls,
          tokens: scenario.workload.overall.knownTokens,
          mode: "assessment",
          priced: 0,
          translatedCalls: 0,
          mappings: [],
          contributions: [],
          limitations: stackAssessmentLines(scenario.result, scenario.workload),
        };
      } else if (selected) {
        const policy = approvedPolicy(selected, mapping);
        const next = await getWorkerClient().runReplay(
          record.id,
          {
            type: "api",
            providerId: selected.providerId,
            ...(policy.rules.length ? { modelTranslation: policy } : {}),
          },
          rulesDate,
        );
        if (guard.current !== token) return;
        setOutcome(next);
        const { cost, priced } = replayCost(next);
        const replaySnapshot = {
          rulesAt:
            next.result.versions.rulesAsOf === DECISION_MARKET.rulesAt.slice(0, 10)
              ? DECISION_MARKET.rulesAt
              : next.result.versions.rulesAsOf,
          catalogHash: next.result.versions.catalog,
          decisionSnapshotHash: suggestedReplaySnapshotHash(next),
        };
        const sameRates = compatibleReplaySnapshots(baseline.snapshot ?? common, replaySnapshot);
        const translatedBaseline = sameRates ? base : undefined;
        const totals = new Map<string, Decimal>();
        for (const line of next.receipt?.lines ?? [])
          totals.set(line.modelId, (totals.get(line.modelId) ?? new Decimal(0)).add(line.subtotal));
        const available = new Set(
          bundledApiProviderModels(selected.providerId, rulesDate)
            .filter((m) => m.available)
            .map((m) => m.id),
        );
        const rows = profile.models.canonical.map((m) => ({
          source: m.modelId,
          target: mapping[m.modelId] || (available.has(m.modelId) ? m.modelId : "unmapped"),
          calls: m.events,
          tokens: m.tokens,
        }));
        completed = {
          ...common,
          title: selected.name,
          ...replaySnapshot,
          target: { type: "api", providerId: selected.providerId, serviceTier: "standard" },
          baseline: translatedBaseline,
          mode: policy.rules.length ? "translated" : "exact",
          cost,
          priced,
          translatedCalls: rows
            .filter((m) => m.target !== "unmapped" && m.target !== m.source)
            .reduce((n, m) => n + m.calls, 0),
          policy: { id: policy.id, version: policy.version },
          difference: replayDifference(translatedBaseline, cost, calls, priced),
          mappings: rows,
          contributions: [...totals].map(([model, total]) => ({
            model,
            cost: { low: total.toString(), high: total.toString() },
          })),
          limitations: [
            "Token-preserving counterfactual: input, cache and output quantities carry over unchanged. Model quality, tokenization, cache behavior and product experience are not established as equivalent.",
            ...(priced < calls
              ? [
                  `${calls - priced} retained calls could not be priced. No whole-workload difference is reported.`,
                ]
              : []),
            ...(!sameRates
              ? [
                  `Recorded API receipts use ${DECISION_MARKET.rulesAt.slice(0, 10)} rules; this replay uses ${rulesDate}. No difference across catalog snapshots or rules dates is claimed.`,
                ]
              : []),
            "Current accepted API list rates, including applicable context tiers and reasoning treatment. Taxes, tools and negotiated rates are excluded.",
          ],
        };
      } else return;
      if (guard.current === token) setResult(completed);
    } catch (e) {
      if (guard.current === token && !(e instanceof SupersededError))
        setError("Replay could not finish. Retry this strategy or inspect its mapping.");
    } finally {
      if (guard.current === token) setRunning(false);
    }
  }
  const modelName = (id: string) => loadBundledCatalog().models[id]?.name ?? id;
  const title =
    choice === "exact"
      ? "Same models → direct APIs"
      : choice === "stack"
        ? "Test a change to your stack"
        : selected?.name;
  if (!baseline || !profile) {
    if (!error) return <ReplayPreparation />;
    return (
      <div role="alert">
        <p>{error}</p>
        <button type="button" className={action} onClick={() => setRetry((n) => n + 1)}>
          Retry preparation
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-10" data-testid="suggested-replays">
      <header className="space-y-4">
        <MicroLabel>
          {record.summary.usageSources.map((s) => s.name).join(" + ") || "Recorded workload"}
        </MicroLabel>
        {!choice ? (
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Try a change</h1>
        ) : null}
        {!choice && (
          <p className="max-w-2xl text-base text-muted-foreground">
            See how the same work would fare with different plans or models. Choose a scenario
            below, or build your own. Your choices stay in this browser.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {record.eventCount.toLocaleString()} calls · {formatTokens(record.summary.tokens.known)}{" "}
          known tokens · {workload.sources.length} canonical models ·{" "}
          {profile?.overview.firstDate ?? record.summary.firstEventAt?.slice(0, 10)} →{" "}
          {profile?.overview.lastDate ?? record.summary.lastEventAt?.slice(0, 10)} ·{" "}
          {profile?.timeZone ?? "UTC"}
        </p>
        {!choice ? (
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-y border-border py-4">
            <span className="text-xs text-muted-foreground">
              Recorded API equivalent · accepted pricing {rulesDate}
              {baseline && !market ? " · priced scope" : ""}
            </span>
            <strong className="font-mono text-2xl font-normal" data-testid="strategy-baseline">
              {published
                ? priceRangeText(published)
                : baseline
                  ? "Pricing incomplete"
                  : "Reading accepted API routes…"}
            </strong>
            {baseline?.coverage ? (
              <span className="text-xs text-muted-foreground">
                {baseline.coverage.priced.toLocaleString()} /{" "}
                {baseline.coverage.recorded.toLocaleString()} calls priced
              </span>
            ) : null}
          </div>
        ) : null}
      </header>
      {!choice ? (
        <div
          className="divide-y divide-border border-y border-border"
          data-testid="strategy-suggestions"
        >
          {routes.map((route) => {
            const copy = routeCopy(route);
            return (
              <section
                key={route.id}
                className="space-y-3 py-5"
                data-testid={`suggest-route-${route.id}`}
              >
                <MicroLabel>{copy.kind}</MicroLabel>
                <h2 className="text-xl font-medium tracking-tight">{copy.title}</h2>
                <p className="text-xs text-muted-foreground">
                  Scope: {route.slice.label} · {route.slice.events.toLocaleString()} calls retained
                </p>
                <p className="max-w-3xl text-sm text-muted-foreground">{copy.body}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <Link
                    className={action}
                    href={routeLink(record.id, route)}
                    data-testid={`suggest-target-${route.id}`}
                  >
                    Test {route.target.name} →
                  </Link>
                  {route.alternative ? (
                    <Link
                      className={action}
                      data-testid="suggest-subscription"
                      href={replayLink(record.id, {
                        plan: route.alternative.id,
                        scope: route.slice.sources,
                      })}
                    >
                      Test {route.alternative.name} on the same work →
                    </Link>
                  ) : null}
                </div>
              </section>
            );
          })}
          {suggestions.map((p) => {
            const c = mappingCoverage(
              workload,
              p.providerId,
              suggestedMapping(p, workload, rulesDate),
              rulesDate,
            );
            return (
              <Suggestion
                key={p.id}
                title={`Recorded models vs translated ${loadBundledCatalog().providers[p.providerId]?.name ?? p.providerId} frontier`}
                mode="Explicit translation"
                onClick={() => choose(p.id)}
                id={`suggest-${p.id}`}
                why={`Scope: Full workload · ${c.recorded.toLocaleString()} calls retained. ${c.mapped.toLocaleString()} calls have an explicit frontier mapping. ${c.applicable === c.recorded ? "Every recorded call has an applicable target model." : `${c.recorded - c.applicable} calls need mapping or pricing review.`}`}
              />
            );
          })}
          <details data-testid="strategy-assessments" className="py-3">
            <summary className={`${action} cursor-pointer`}>Other assessments</summary>
            {!baseline?.coverage || baseline.coverage.priced > 0 ? (
              <Suggestion
                title="Full workload at recorded API prices"
                mode="Recorded API routes"
                onClick={() => choose("exact")}
                id="suggest-exact"
                why={
                  baseline?.coverage
                    ? `${baseline.coverage.priced.toLocaleString()} of ${record.eventCount.toLocaleString()} calls have complete published API pricing. Recorded models stay unchanged.`
                    : "Use accepted API routes for the exact recorded models."
                }
              />
            ) : null}
            {stack.some((entry) => entry.plan.startsWith("plan:")) ? (
              <Suggestion
                title="Test a change to your stack"
                mode="Stack scenario"
                id="suggest-stack"
                onClick={() => choose("stack")}
                why={`${stack.filter((entry) => entry.plan.startsWith("plan:")).length} confirmed subscriptions. Change a tier or remove one and see what StackReplay can determine about this workload; plan capacity stays undetermined.`}
              />
            ) : null}
          </details>
          <Link
            href={`/app/plans?section=replay&import=${encodeURIComponent(record.id)}&mode=custom`}
            data-testid="build-own"
            className="flex min-h-20 items-center justify-between gap-4 py-5"
          >
            <span className="text-lg">Build your own</span>
            <span className="text-sm text-accent">Choose scope and target →</span>
          </Link>
        </div>
      ) : null}
      {choice && !result ? (
        <section
          ref={confirmation}
          tabIndex={-1}
          className="space-y-5 outline-none"
          data-testid="strategy-confirmation"
        >
          <button className={action} onClick={() => choose(undefined)} type="button">
            ← Suggested replays
          </button>
          <MicroLabel className="block">
            {selected
              ? "Explicit translated scenario"
              : choice === "stack"
                ? "Stack scenario · capacity stays undetermined"
                : "Exact recorded models"}
          </MicroLabel>
          <h1 className="text-2xl font-medium">{title}</h1>
          {choice === "stack" ? (
            <p className="text-sm text-muted-foreground">
              Your recorded work in its billing period, read against a proposed set of
              subscriptions. Published prices are exact; workload effects use recorded calls and
              accepted API prices; no subscription publishes a fixed token quota.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Full imported workload · {record.eventCount.toLocaleString()} calls retained. No dates
              or sources excluded.{" "}
              {selected ? `API rules as of ${rulesDate} · Standard processing.` : ""}
            </p>
          )}
          {selected ? (
            <>
              <div className="flex flex-wrap justify-between gap-3 border-y border-border py-4">
                <span className="text-sm">
                  Suggested mapping · {Object.values(mapping).filter(Boolean).length} model rules ·{" "}
                  {coverage?.mapped.toLocaleString()} calls translated
                </span>
                <button
                  type="button"
                  className={action}
                  aria-expanded={editing}
                  onClick={() => setEditing((v) => !v)}
                >
                  Edit mapping
                </button>
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground">
                You are approving profile {selected.name}, version {selected.version}. Recorded
                token quantities carry over unchanged. This tests a policy, not a claim of equal
                model quality or cache behavior.
              </p>
              {editing ? (
                <div className="divide-y divide-border" data-testid="suggested-mapping-editor">
                  {workload.sources.map((m) => (
                    <div key={m.modelId} className="grid gap-2 py-3 text-sm sm:grid-cols-2">
                      <span>
                        {m.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {m.events.toLocaleString()} calls
                        </span>
                      </span>
                      <AppSelect
                        label="Translate this recorded model"
                        aria-label={`Replay model for ${m.name}`}
                        className="min-h-11 min-w-0 border border-control-border bg-background px-3"
                        value={mapping[m.modelId] ?? ""}
                        onChange={(e) => edit(m.modelId, e.target.value)}
                      >
                        <option value="">Keep recorded model / no mapping</option>
                        {bundledApiProviderModels(selected.providerId, rulesDate)
                          .filter((m) => m.available && m.priced)
                          .map((m) => (
                            <option value={m.id} key={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </AppSelect>
                    </div>
                  ))}
                </div>
              ) : (
                <details>
                  <summary className={action}>Inspect suggested mapping</summary>
                  <ul className="space-y-2 text-sm">
                    {workload.sources.map((m) => (
                      <li key={m.modelId}>
                        {m.name} →{" "}
                        {mapping[m.modelId]
                          ? modelName(mapping[m.modelId] ?? "")
                          : offered.has(m.modelId)
                            ? `${m.name} (as recorded)`
                            : "No mapping supplied"}{" "}
                        · {m.events.toLocaleString()} calls
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {coverage && coverage.applicable < coverage.recorded ? (
                <p className="border-l-2 border-warning pl-3 text-sm">
                  {coverage.recorded - coverage.applicable} calls have no established priced target.
                  They stay in the replay as unknown or unavailable; no whole-workload difference
                  will be claimed.
                </p>
              ) : null}
            </>
          ) : choice === "exact" ? (
            <p className="text-sm text-muted-foreground">
              Reuses the existing exact-model Workload calculation. Both Claude cache-write
              scenarios remain explicit. No subscription allowance is inferred.
            </p>
          ) : (
            <StackScenarioPanel
              record={record}
              current={stack}
              proposed={proposedStack ?? stack}
              onChange={setProposedStack}
              enabled={!!baseline && !!profile}
              onResult={receiveScenario}
            />
          )}
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || !baseline || !profile || (choice === "stack" && !stackReady)}
            className="min-h-11 border border-accent bg-accent px-6 text-sm font-medium text-accent-foreground disabled:opacity-50"
            data-testid="run-strategy"
          >
            {running
              ? "Replaying locally…"
              : choice === "stack"
                ? "Save this stack assessment"
                : "Run replay"}
          </button>
          {running ? (
            <button
              type="button"
              className={`${action} ml-4`}
              onClick={() => {
                guard.current++;
                setRunning(false);
              }}
            >
              Cancel
            </button>
          ) : null}
        </section>
      ) : null}
      {result ? (
        <div tabIndex={-1} ref={resultAnchor} className="space-y-6 outline-none">
          <button type="button" className={action} onClick={() => choose(undefined)}>
            ← Try another strategy
          </button>
          <StrategyResult result={result} primary />
          <div className="flex flex-wrap gap-5">
            <button
              className={action}
              type="button"
              data-testid="add-to-compare"
              onClick={() => {
                const ok = saveCompletedReplay(result);
                setSaved(ok);
                setSaveError(!ok);
              }}
            >
              {saved ? "Added to Compare" : "Add to Compare →"}
            </button>
            {saved ? (
              <Link
                className={action}
                href={`/app/plans?section=compare&import=${encodeURIComponent(record.id)}`}
                data-testid="compare-completed"
              >
                Compare completed replays →
              </Link>
            ) : null}
          </div>
          {saveError ? (
            <p role="alert">
              This browser could not save the result. Keep this page open to inspect it.
            </p>
          ) : null}
          <details className="border-t border-border pt-3" data-testid="strategy-evidence">
            <summary className={action}>Methodology, assumptions &amp; evidence</summary>
            <div className="min-w-0 space-y-3 py-4 text-xs text-muted-foreground [overflow-wrap:anywhere]">
              <p>
                Current accepted pricing at {result.rulesAt}, not a reconstructed historical
                invoice. Catalog {result.catalogHash}. Scope {result.scopeDigest}.{" "}
                {result.policy
                  ? `Local user-approved translation ${result.policy.id} v${result.policy.version}.`
                  : "Recorded models preserved."}
              </p>
              <p>
                Exact APIs reuse the admitted route scenarios. Translated API replays use the
                existing provider API evaluator with the selected models’ accepted per-category rate
                records, context tiers and reasoning rules. Missing prices are never assigned zero.
              </p>
              {outcome?.receipt ? (
                <>
                  <p>
                    Pricing references:{" "}
                    {[...new Set(outcome.receipt.lines.map((l) => l.pricingId))].join(", ")}
                  </p>
                  <ul className="space-y-2">
                    {[...new Set(outcome.receipt.lines.map((l) => l.pricingId))].flatMap((id) =>
                      (loadBundledCatalog().pricing[id]?.sources ?? []).map((source) => (
                        <li key={`${id}:${source.url}`}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline"
                          >
                            {id}: {source.title}
                          </a>
                        </li>
                      )),
                    )}
                  </ul>
                  <ul>
                    {outcome.receipt.lines.map((l) => (
                      <li
                        key={`${l.modelId}:${l.pricingId}:${l.tierId}:${l.category}:${l.multiplier}`}
                      >
                        {modelName(l.modelId)} · {l.category} · {l.tokens.toLocaleString()} × $
                        {l.ratePerMillion}/M × {l.multiplier} = ${l.subtotal}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="space-y-3">
                  <p>
                    API assumptions: {DECISION_MARKET.scenarios.map((s) => s.assumption).join(" ")}
                  </p>
                  <Link
                    className={action}
                    href={`/app/stats?import=${encodeURIComponent(record.id)}`}
                  >
                    Inspect accepted route receipts in Workload →
                  </Link>
                </div>
              )}
            </div>
          </details>
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="space-y-2 text-sm text-negative">
          <p>{error}</p>
          {!baseline ? (
            <button type="button" className={action} onClick={() => setRetry((n) => n + 1)}>
              Retry preparation
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
function Suggestion({
  title,
  mode,
  why,
  onClick,
  id,
}: {
  title: string;
  mode: string;
  why: string;
  onClick: () => void;
  id: string;
}) {
  return (
    <button
      type="button"
      className="group grid w-full gap-3 py-6 text-left sm:grid-cols-[minmax(0,1fr)_auto]"
      data-testid={id}
      id={id}
      onClick={onClick}
    >
      <span>
        <span className="block text-xl font-medium tracking-tight group-hover:text-accent">
          {title}
        </span>
        <span className="mt-2 block text-sm text-muted-foreground">{why}</span>
      </span>
      <span className="text-xs text-accent">{mode} →</span>
    </button>
  );
}
