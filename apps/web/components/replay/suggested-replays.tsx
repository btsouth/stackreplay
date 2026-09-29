"use client";
import { bundledApiProviderModels, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatTokens } from "@/components/instrument/format";
import { MicroLabel } from "@/components/instrument/primitives";
import { type CompletedReplay, saveCompletedReplay } from "@/lib/completed-replays";
import { readCurrentStack, subscribeCurrentStack } from "@/lib/current-stack";
import { marketRange } from "@/lib/decision-presentation";
import type { MarketDecision } from "@/lib/market-decision";
import {
  approvedPolicy,
  baselineRange,
  mappingCoverage,
  marketModelCosts,
  priceRangeText,
  replayCost,
  replayDifference,
  suggestedMapping,
  TRANSLATION_PROFILES,
  type TranslationProfile,
} from "@/lib/replay-strategies";
import type { TargetKey } from "@/lib/routes";
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

export function SuggestedReplays({ initialImportId }: { initialImportId?: string | undefined }) {
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
  if (state.error) return <p role="alert">Local workloads could not be read. Reload to retry.</p>;
  if (!state.loaded)
    return (
      <p role="status" data-testid="replay-restoring">
        Opening your recorded workload…
      </p>
    );
  if (!state.record)
    return (
      <div className="space-y-4" data-testid="replay-empty">
        <h2 className="text-2xl font-medium">
          {initialImportId
            ? "That workload is no longer stored in this browser"
            : "Start with your recorded work"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Import history to discover exact API routes and explicit counterfactual strategies.
          Everything runs locally.
        </p>
        <Link href="/app/import" className={action}>
          Import a workload →
        </Link>
      </div>
    );
  return <StrategyWorkspace key={state.record.id} record={state.record} />;
}
function StrategyWorkspace({ record }: { record: ImportRecord }) {
  const [baseline, setBaseline] = useState<MarketDecision>();
  const [profile, setProfile] = useState<WorkloadProfile>();
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0);
  const [stack, setStack] = useState<TargetKey[]>([]);
  const [choice, setChoice] = useState<"exact" | "stack" | TranslationProfile["id"]>();
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
    const read = () => setStack(readCurrentStack(namespace));
    read();
    return subscribeCurrentStack(read);
  }, [record]);
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
    else if (lastChoice.current) document.getElementById(`suggest-${lastChoice.current}`)?.focus();
  }, [choice]);
  useEffect(() => {
    if (result) resultAnchor.current?.focus();
  }, [result]);
  const workload = workloadModels(record.summary.models);
  const selected = TRANSLATION_PROFILES.find((p) => p.id === choice);
  const suggestions = TRANSLATION_PROFILES.filter(
    (p) =>
      Object.keys(suggestedMapping(p, workload)).length > 0 &&
      !(p.providerId === "anthropic" && record.summary.tokens.buckets.cacheWriteTokens > 0),
  );
  const market = baseline ? baselineRange(baseline) : undefined;
  const published = market ?? marketRange(baseline?.pricedScope);
  const currentPlans = stack
    .filter((k) => k.startsWith("plan:"))
    .map((k) => DECISION_MARKET.plans.find((p) => p.id === k.slice(5)))
    .filter((p) => p !== undefined);
  const currentApis = stack.filter((k) => k.startsWith("api:"));
  const coverage = selected ? mappingCoverage(workload, selected.providerId, mapping) : undefined;
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
    setMapping(p ? suggestedMapping(p, workload) : {});
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
        catalogHash: DECISION_MARKET.catalogHash,
        rulesAt: DECISION_MARKET.rulesAt,
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
        completed = {
          ...common,
          title: "Current stack",
          mode: "assessment",
          priced: 0,
          translatedCalls: 0,
          mappings: [],
          contributions: [],
          limitations: [
            "No deterministic combined capacity result is claimed. Selected subscriptions retain their published model access and full-cycle purchase terms.",
            ...currentPlans
              .slice(0, 10)
              .map(
                (p) =>
                  `${p.name}: ${p.artifact.purchase.kind === "subscription" ? `$${p.artifact.purchase.fixedUsd} published per ${p.artifact.purchase.term}; ` : ""}${p.artifact.computation.kind === "not_computable" ? "capacity not deterministically published" : "test this plan individually in Build your own"}.`,
              ),
            ...(currentApis.length
              ? [
                  "Selected APIs can be tested individually in Build your own. Their availability is not extra subscription capacity.",
                ]
              : []),
            "Published subscription prices are not confirmed spend for this imported period. No prorating or allocation between overlapping plans is inferred.",
          ],
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
          DECISION_MARKET.rulesAt.slice(0, 10),
        );
        if (guard.current !== token) return;
        setOutcome(next);
        const { cost, priced } = replayCost(next);
        const totals = new Map<string, Decimal>();
        for (const line of next.receipt?.lines ?? [])
          totals.set(line.modelId, (totals.get(line.modelId) ?? new Decimal(0)).add(line.subtotal));
        const available = new Set(
          bundledApiProviderModels(selected.providerId, DECISION_MARKET.rulesAt)
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
          mode: policy.rules.length ? "translated" : "exact",
          cost,
          priced,
          translatedCalls: rows
            .filter((m) => m.target !== "unmapped" && m.target !== m.source)
            .reduce((n, m) => n + m.calls, 0),
          policy: { id: policy.id, version: policy.version },
          difference: replayDifference(base, cost, calls, priced),
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
        ? "Current stack"
        : selected?.name;
  return (
    <div className="space-y-10" data-testid="suggested-replays">
      <header className="space-y-4">
        <MicroLabel>
          {record.summary.usageSources.map((s) => s.name).join(" + ") || "Recorded workload"}
        </MicroLabel>
        {!choice ? (
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Suggested replays for this workload
          </h1>
        ) : null}
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
              Current recorded API equivalent{baseline && !market ? " · priced scope" : ""}
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
          {!baseline?.coverage || baseline.coverage.priced > 0 ? (
            <Suggestion
              number="01"
              title="Same models → direct APIs"
              mode="Exact models"
              onClick={() => choose("exact")}
              id="suggest-exact"
              why={
                baseline?.coverage
                  ? `${baseline.coverage.priced.toLocaleString()} of ${record.eventCount.toLocaleString()} calls have complete published API pricing. Recorded models stay unchanged.`
                  : "Use accepted API routes for the exact recorded models."
              }
            />
          ) : null}
          {suggestions.map((p, i) => {
            const c = mappingCoverage(workload, p.providerId, suggestedMapping(p, workload));
            return (
              <Suggestion
                key={p.id}
                number={`0${i + 2}`}
                title={p.name}
                mode="Explicit translation"
                onClick={() => choose(p.id)}
                id={`suggest-${p.id}`}
                why={`${c.mapped.toLocaleString()} calls have an explicit frontier mapping. ${c.applicable === c.recorded ? "Every recorded call has an applicable target model." : `${c.recorded - c.applicable} calls need mapping or pricing review.`}`}
              />
            );
          })}
          {stack.length ? (
            <Suggestion
              number="+"
              title="Current stack"
              mode="Commercial assessment"
              id="suggest-stack"
              onClick={() => choose("stack")}
              why={`${stack.length} locally selected targets. Inspect known access and price; opaque capacity remains unknown.`}
            />
          ) : null}
          <Link
            href={`/app/replay?import=${encodeURIComponent(record.id)}&mode=custom`}
            data-testid="build-own"
            className="flex min-h-20 items-center justify-between gap-4 py-5"
          >
            <span className="text-lg">Build your own</span>
            <span className="text-sm text-accent">Browse all targets →</span>
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
                ? "Capacity remains unknown"
                : "Exact recorded models"}
          </MicroLabel>
          <h1 className="text-2xl font-medium">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Full imported workload · {record.eventCount.toLocaleString()} calls retained. No dates
            or sources excluded.
          </p>
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
                    <label key={m.modelId} className="grid gap-2 py-3 text-sm sm:grid-cols-2">
                      <span>
                        {m.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {m.events.toLocaleString()} calls
                        </span>
                      </span>
                      <select
                        aria-label={`Replay model for ${m.name}`}
                        className="min-h-11 min-w-0 border border-control-border bg-background px-3"
                        value={mapping[m.modelId] ?? ""}
                        onChange={(e) => edit(m.modelId, e.target.value)}
                      >
                        <option value="">Keep recorded model / no mapping</option>
                        {bundledApiProviderModels(selected.providerId, DECISION_MARKET.rulesAt)
                          .filter((m) => m.available && m.priced)
                          .map((m) => (
                            <option value={m.id} key={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </label>
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
            <div className="space-y-3">
              {currentPlans.map((p) => (
                <div key={p.id} className="border-b border-border py-3">
                  <p>{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.artifact.purchase.kind === "subscription"
                      ? `${p.artifact.purchase.fixedUsd} USD published price per billing cycle`
                      : "Published catalog terms"}{" "}
                    ·{" "}
                    {p.artifact.computation.kind === "not_computable"
                      ? "Capacity not deterministically published"
                      : "Individual replay available in Build your own"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Published model access:{" "}
                    {[...new Set((p.artifact.knownAccess ?? []).flatMap((a) => a.models))]
                      .map(modelName)
                      .join(", ") || "No deterministic model list recorded"}
                    . Exact access is distinct from a computable capacity allowance.
                  </p>
                </div>
              ))}
              {currentApis.map((k) => (
                <p key={k} className="text-sm">
                  {k.slice(4)} API selected · inspect independently in Build your own
                </p>
              ))}
              <p className="text-sm text-muted-foreground">
                This assessment does not invent a combined quota or assign overlapping calls to
                subscriptions.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || !baseline || !profile}
            className="min-h-11 border border-accent bg-accent px-6 text-sm font-medium text-accent-foreground disabled:opacity-50"
            data-testid="run-strategy"
          >
            {running
              ? "Replaying locally…"
              : choice === "stack"
                ? "Assess current stack"
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
                href={`/app/compare?import=${encodeURIComponent(record.id)}`}
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
                    href={`/app/workload?import=${encodeURIComponent(record.id)}`}
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
  number,
  title,
  mode,
  why,
  onClick,
  id,
}: {
  number: string;
  title: string;
  mode: string;
  why: string;
  onClick: () => void;
  id: string;
}) {
  return (
    <button
      type="button"
      className="group grid w-full gap-3 py-6 text-left sm:grid-cols-[2rem_minmax(0,1fr)_auto]"
      data-testid={id}
      id={id}
      onClick={onClick}
    >
      <span className="font-mono text-xs text-muted-foreground">{number}</span>
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
