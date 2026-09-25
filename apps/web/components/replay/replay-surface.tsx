"use client";

import {
  bundledPlanFacts,
  bundledPlansAt,
  bundledProviderFacts,
  bundledPublicApiProviders,
  bundledUsageCreditModels,
  loadBundledCatalog,
} from "@stackreplay/catalog/bundled";
import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import type { ExecutionTargetV1 } from "@stackreplay/schema";
import { isSyntheticCatalogId, shareText } from "@stackreplay/share";
import { Badge, Button, Card, CardContent, Metric } from "@stackreplay/ui";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImportSurface } from "@/components/import/import-surface";
import { ConstraintTrace } from "@/components/instrument/constraint-trace";
import { CostCounterfactual } from "@/components/instrument/cost-counterfactual";
import { CoverageDimensions } from "@/components/instrument/coverage-dimensions";
import { EvidenceLedger } from "@/components/instrument/evidence-ledger";
import { ExecutionStack } from "@/components/instrument/execution-stack";
import { formatTokens } from "@/components/instrument/format";
import { modeLabel } from "@/components/instrument/mode-label";
import { ModelLanes } from "@/components/instrument/model-lanes";
import { OutcomeLedger } from "@/components/instrument/outcome-ledger";
import { MicroLabel } from "@/components/instrument/primitives";
import { ReplayPath } from "@/components/instrument/replay-path";
import { ResultSettlement } from "@/components/instrument/result-settlement";
import { useReplayChoreography } from "@/components/instrument/use-replay-choreography";
import { WorkloadSpecimen } from "@/components/instrument/workload-specimen";
import { MissingWorkload } from "@/components/missing-workload";
import { ReplayReading } from "@/components/replay/replay-reading";
import { ReplayVerdict } from "@/components/replay/replay-verdict";
import {
  compatibility,
  type ModelMapping,
  TranslationEditor,
  TranslationEntry,
  targetModels,
  translationPolicy,
  workloadModels,
} from "@/components/replay/translation";
import { SharePanelV2 } from "@/components/share/share-panel-v2";
import { plainRange } from "@/components/workload/format";
import { formatUsd } from "@/lib/money-display";
import { type TargetCoverage, targetCoverages, workloadSlice } from "@/lib/routes";
import { defaultRulesDate } from "@/lib/rules-date";
import { createRunGuard } from "@/lib/run-guard";
import { replayShareV2, type ShareOptions } from "@/lib/share-v2";
import { browserTimeZone } from "@/lib/time-zone";
import { localDayOf } from "@/lib/timeline";
import { useWorkloadProfile } from "@/lib/use-workload-profile";
import { verdictOfOutcome } from "@/lib/verdict-facts";
import {
  type ReplayOutcome as ClientReplayOutcome,
  describeWorkerFailure,
  getWorkerClient,
  SupersededError,
} from "@/lib/worker-client";
import type { ImportRecord, ModelSummary, SafeError } from "@/lib/worker-protocol";
import { isSyntheticWorkload } from "@/lib/workload-kind";

/** Styling for the execution-target switch (M4C). */
function segmentedClass(active: boolean): string {
  return [
    "rounded-md border px-3 py-1.5 text-xs",
    active
      ? "border-accent bg-surface-2 text-foreground"
      : "border-control-border text-muted-foreground",
  ].join(" ");
}

/**
 * Replay surface: the signature product surface (M3 brief).
 *
 * The visual story is deliberate and linear:
 *   your actual workload -> target plan -> replay result -> why
 *
 * Coverage dimensions stay separate and unknown stays visibly unknown. The
 * engine's rules instant is always explicit and shown. Charting code loads
 * dynamically so the result renders immediately.
 */

const ReplayTimeline = dynamic(() => import("./replay-timeline"), {
  ssr: false,
  loading: () => (
    <div className="text-xs text-muted-foreground" data-testid="timeline-loading">
      <div className="h-40 animate-pulse rounded-md border border-border bg-surface-2" />
    </div>
  ),
});

type Phase = "idle" | "loading" | "replaying" | "done";

/** What a displayed result was computed from (benchmark finding F026). */
interface ComputedFor {
  workloadLabel: string;
  workloadId?: string;
  target: string;
  rulesAsOf: string;
  /** The tool slice, when the replay was scoped to one. */
  scopeLabel?: string;
}

/**
 * Engine warnings are written for a CLI result surface and may name rule
 * enums verbatim ("a latch_until_reset rule"); this UI humanizes them exactly
 * like the constraint detail rows do.
 */
function humanizeWarningMessage(message: string): string {
  return message.replaceAll("_", " ");
}

type ReplayOutcome = ClientReplayOutcome;

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Plan and economic amounts are money and always render with cents, so $50 and
 * $50.00 can never appear in the same column. Amounts are rounded for display
 * only, exactly and half-up; the exported result keeps the exact decimal string.
 */
function formatMoney(amount: string): string {
  return formatUsd(amount) ?? `$${amount}`;
}

export function ReplaySurface({
  initialImportId,
  initialTarget,
  initialApi,
  initialScope,
}: {
  initialImportId?: string | undefined;
  /** Plan id preselected from a public plan page, never a workload detail. */
  initialTarget?: string | undefined;
  /** Direct API provider id preselected from the workload page. */
  initialApi?: string | undefined;
  /** Recording tools the replay is scoped to, by adapter id, from a suggested route. */
  initialScope?: readonly string[] | undefined;
}) {
  const client = getWorkerClient();
  const [imports, setImports] = useState<ImportRecord[] | undefined>(undefined);
  const [importsError, setImportsError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialImportId);
  const [rulesAsOf, setRulesAsOf] = useState<string>(() => defaultRulesDate());
  const [query, setQuery] = useState("");
  const [planId, setPlanId] = useState<string | undefined>(initialTarget);
  /**
   * Which kind of execution target this surface replays against (M4C). A
   * subscription plan is the default; a Direct API target prices the same
   * workload at the selected provider's published list prices instead, with no
   * plan, allowance or admission involved.
   */
  const [targetKind, setTargetKind] = useState<"subscription" | "api">(
    initialApi !== undefined && initialTarget === undefined ? "api" : "subscription",
  );
  const [providerId, setProviderId] = useState<string | undefined>(initialApi);
  /**
   * Model substitutions the person chose, kept per target so switching back to a
   * target restores its scenario. Never pre-filled: an empty mapping is exact.
   */
  const [mappings, setMappings] = useState<Record<string, ModelMapping>>({});
  const [translationOpen, setTranslationOpen] = useState(false);
  /** Explicit scope: leave out events whose model identity is unresolved. */
  const [excludeUnresolved, setExcludeUnresolved] = useState(false);
  /** Explicit scope: only the calls these recording tools made. Empty is the whole workload. */
  const [scopeSources, setScopeSources] = useState<string[]>(() => [...(initialScope ?? [])]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const resultAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "idle") return;
    resultAnchorRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }, [phase]);
  const [outcome, setOutcome] = useState<ReplayOutcome | undefined>(undefined);
  /**
   * What the displayed result was computed from. The panel reads its labels from
   * the result itself, and this record lets it say which workload produced it
   * (benchmark finding F026).
   */
  const [outcomeSelection, setOutcomeSelection] = useState<ComputedFor | undefined>(undefined);
  const [error, setError] = useState<SafeError | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  /**
   * Every replay is tagged with the selection it was run for. A response whose
   * tag is no longer current is dropped instead of displayed (finding F026,
   * extended to a run that is still in flight when the target changes).
   */
  const guardRef = useRef<ReturnType<typeof createRunGuard> | null>(null);
  if (guardRef.current === null) guardRef.current = createRunGuard();
  const guard = guardRef.current;

  /** Drops the displayed result and any replay still in flight for it. */
  const dropResult = useCallback(() => {
    guard.invalidate();
    setOutcome(undefined);
    setOutcomeSelection(undefined);
    setPhase("idle");
  }, [guard]);

  const workload = useMemo(
    () => imports?.find((entry) => entry.id === selectedId),
    [imports, selectedId],
  );
  const requestedWorkloadMissing =
    imports !== undefined && selectedId !== undefined && workload === undefined;
  const selectedWorkloadIsDemo = useMemo(
    () => (workload === undefined ? false : isSyntheticWorkload(workload)),
    [workload],
  );
  const profile = useWorkloadProfile(workload?.id);
  const usageSources = useMemo(
    () => workload?.summary.usageSources.filter((source) => source.role === "usage") ?? [],
    [workload],
  );
  const sourceNames = useMemo(
    () => new Map(usageSources.map((source) => [source.adapterId, source.name])),
    [usageSources],
  );
  /** The tool slice in force: only tools this workload has, and none when it is every tool. */
  const scopeKey = useMemo(() => {
    const known = scopeSources.filter((id) => sourceNames.has(id));
    return known.length === 0 || known.length === sourceNames.size ? "" : known.join(",");
  }, [scopeSources, sourceNames]);
  // Keyed by its content, so a re-render that finds the same tools keeps the
  // same array and does not count as a new slice of work.
  const scope = useMemo(() => (scopeKey === "" ? [] : scopeKey.split(",")), [scopeKey]);
  const slice = useMemo(
    () => (profile === undefined ? undefined : workloadSlice(profile.sources, sourceNames, scope)),
    [profile, scope, sourceNames],
  );
  /**
   * How much of the work in scope each target runs, by target key, in the
   * order a person should meet them. Measured with the engine's own model rule
   * (`lib/routes.ts`), so a row's figure is the replay's own count.
   */
  const coverages = useMemo(() => {
    if (slice === undefined) return undefined;
    const real = targetCoverages(slice, rulesAsOf, { synthetic: false });
    return selectedWorkloadIsDemo
      ? [...targetCoverages(slice, rulesAsOf, { synthetic: true }), ...real]
      : real;
  }, [rulesAsOf, selectedWorkloadIsDemo, slice]);
  const coverageByKey = useMemo(
    () => new Map((coverages ?? []).map((coverage, index) => [coverage.key, { coverage, index }])),
    [coverages],
  );
  /**
   * Once a person starts using a list, its order holds still: coverage that
   * arrives afterwards fills in the figures without moving a row under their
   * pointer or keyboard. A new slice of work or a new workload orders afresh.
   */
  const [heldOrder, setHeldOrder] = useState<ReadonlyMap<string, number> | undefined>(undefined);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new scope or workload releases the held order.
  useEffect(() => setHeldOrder(undefined), [scope, workload?.id]);
  const rankOf = useCallback(
    (key: string) =>
      heldOrder?.get(key) ??
      coverageByKey.get(key as TargetCoverage["key"])?.index ??
      Number.MAX_SAFE_INTEGER,
    [coverageByKey, heldOrder],
  );

  /**
   * Synthetic `example-` targets exist for the synthetic demo workloads only. A
   * real workload never sees them: they would read as real plans beside real
   * ones, and a replay against them says nothing about the person's own stack.
   */
  const plans = useMemo(() => {
    const available = bundledPlansAt(rulesAsOf);
    const listed = selectedWorkloadIsDemo
      ? [
          ...available.filter((plan) => isSyntheticCatalogId(plan.id)),
          ...available.filter((plan) => !isSyntheticCatalogId(plan.id)),
        ]
      : available.filter((plan) => !isSyntheticCatalogId(plan.id));
    // Ordered by how much of this work each plan runs, once that is known.
    return [...listed].sort((a, b) => rankOf(`plan:${a.id}`) - rankOf(`plan:${b.id}`));
  }, [rankOf, rulesAsOf, selectedWorkloadIsDemo]);
  const filteredPlans = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return plans;
    return plans.filter(
      (plan) =>
        plan.name.toLowerCase().includes(needle) ||
        plan.id.toLowerCase().includes(needle) ||
        plan.providerId.toLowerCase().includes(needle),
    );
  }, [plans, query]);

  const selectedPlan = useMemo(
    () =>
      filteredPlans.find((plan) => plan.id === planId) ?? plans.find((plan) => plan.id === planId),
    [filteredPlans, planId, plans],
  );

  /**
   * Providers a Direct API replay can be run against. The list comes from the
   * same bundled catalog the worker replays against, and each entry carries the
   * counts a visitor needs: how many models the catalog records this provider as
   * offering, and how many of those have API list prices, so a replay that can
   * only price part of the demand says so before it runs.
   */
  const providers = useMemo(() => {
    const available = bundledPublicApiProviders(rulesAsOf);
    const listed = selectedWorkloadIsDemo
      ? [
          ...available.filter((provider) => isSyntheticCatalogId(provider.id)),
          ...available.filter((provider) => !isSyntheticCatalogId(provider.id)),
        ]
      : available.filter((provider) => !isSyntheticCatalogId(provider.id));
    return [...listed].sort((a, b) => rankOf(`api:${a.id}`) - rankOf(`api:${b.id}`));
  }, [rankOf, rulesAsOf, selectedWorkloadIsDemo]);
  const holdOrder = useCallback(() => {
    setHeldOrder(
      (current) =>
        current ??
        new Map([
          ...plans.map((plan, index) => [`plan:${plan.id}`, index] as const),
          ...providers.map((provider, index) => [`api:${provider.id}`, index] as const),
        ]),
    );
  }, [plans, providers]);
  const filteredProviders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return providers;
    return providers.filter(
      (provider) =>
        provider.name.toLowerCase().includes(needle) || provider.id.toLowerCase().includes(needle),
    );
  }, [providers, query]);
  const selectedProvider = useMemo(
    () =>
      filteredProviders.find((provider) => provider.id === providerId) ??
      providers.find((provider) => provider.id === providerId),
    [filteredProviders, providerId, providers],
  );
  const targetReady =
    targetKind === "api" ? selectedProvider !== undefined : selectedPlan !== undefined;
  const targetKey =
    targetKind === "api"
      ? selectedProvider === undefined
        ? undefined
        : `api:${selectedProvider.id}`
      : selectedPlan === undefined
        ? undefined
        : `plan:${selectedPlan.id}`;
  const targetName =
    targetKind === "api" ? `the ${selectedProvider?.name ?? ""} API` : (selectedPlan?.name ?? "");
  /**
   * The models in scope. A tool slice keeps the models its calls used, with
   * that slice's counts, so a substitution is offered only for demand the
   * replay will actually carry.
   */
  const models = useMemo(() => {
    if (workload === undefined) return undefined;
    const all = workloadModels(workload.summary.models);
    if (scope.length === 0) return all;
    // A tool slice's models come from the profile; until it is ready, nothing
    // scoped is shown rather than the whole workload's models under its name.
    if (slice === undefined) return undefined;
    return {
      sources: all.sources
        .filter((source) => slice.models.has(source.modelId))
        .map((source) => ({ ...source, events: slice.models.get(source.modelId) ?? 0 }))
        .sort((a, b) => b.events - a.events),
      unresolved:
        slice.unresolvedEvents === 0
          ? []
          : [{ rawName: "unresolved model IDs", events: slice.unresolvedEvents }],
    };
  }, [scope, slice, workload]);
  const available = useMemo(
    () =>
      targetKind === "api"
        ? selectedProvider === undefined
          ? []
          : targetModels({ kind: "api", providerId: selectedProvider.id }, rulesAsOf)
        : selectedPlan === undefined
          ? []
          : targetModels({ kind: "subscription", planId: selectedPlan.id }, rulesAsOf),
    [rulesAsOf, selectedPlan, selectedProvider, targetKind],
  );
  const compat = useMemo(
    () => (models === undefined ? undefined : compatibility(models, available)),
    [available, models],
  );
  const mapping = targetKey === undefined ? {} : (mappings[targetKey] ?? {});
  const policy = translationPolicy(mapping);
  const unresolvedEvents = models?.unresolved.reduce((sum, model) => sum + model.events, 0) ?? 0;
  /** Calls in scope: the tool slice's, or the whole workload's. */
  const scopedEvents =
    scope.length === 0 ? (workload?.summary.eventCount ?? 0) : (slice?.events ?? 0);
  /**
   * The workload the surface is working on, and only that one.
   *
   * A stale `?import=` used to be answered with `imports[0]`, so a link naming a
   * workload that is no longer stored silently replayed a different one
   * (benchmark finding F027). The surface now says the named workload is gone and
   * waits to be told which one to use.
   */
  // The first-run intake changes only this route's query string. React keeps
  // the Replay surface mounted, so the selected id must follow the new prop.
  useEffect(() => {
    if (initialImportId !== undefined) setSelectedId(initialImportId);
  }, [initialImportId]);
  // A suggested route's link can change only the query string, too.
  const initialScopeKey = (initialScope ?? []).join(",");
  useEffect(() => {
    // Unchanged when the URL only echoes the current choice back (see below),
    // so a held plan order is not released under the pointer.
    setScopeSources((current) =>
      current.join(",") === initialScopeKey
        ? current
        : initialScopeKey === ""
          ? []
          : initialScopeKey.split(","),
    );
  }, [initialScopeKey]);

  /**
   * A link can change the target while this surface stays mounted (a result's
   * "same work at API prices", or Back to an earlier choice). When the address
   * names a different target than the one selected, the address wins and the
   * old result goes; when it only echoes the current choice, nothing changes.
   */
  const selectionRef = useRef({ targetKind, planId, providerId });
  selectionRef.current = { targetKind, planId, providerId };
  useEffect(() => {
    const current = selectionRef.current;
    if (initialTarget !== undefined) {
      if (current.targetKind === "subscription" && current.planId === initialTarget) return;
      setTargetKind("subscription");
      setPlanId(initialTarget);
    } else if (initialApi !== undefined) {
      if (current.targetKind === "api" && current.providerId === initialApi) return;
      setTargetKind("api");
      setProviderId(initialApi);
    } else return;
    setTranslationOpen(false);
    dropResult();
  }, [dropResult, initialApi, initialTarget]);

  /**
   * The choices live in the address too (replacing, not adding, history
   * entries), so Back, Forward and a reload return to the same work and
   * target. Only an opaque local id, catalog ids and tool ids are written.
   */
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (workload === undefined) return;
    const params = new URLSearchParams({ import: workload.id });
    if (targetKind === "api") {
      if (providerId !== undefined) params.set("api", providerId);
    } else if (planId !== undefined) params.set("target", planId);
    if (scope.length > 0) params.set("scope", scope.join(","));
    const next = `?${params.toString()}`;
    if (next !== window.location.search) router.replace(`${pathname}${next}`, { scroll: false });
  }, [pathname, planId, providerId, router, scope, targetKind, workload]);

  /**
   * The bundled demo workloads are synthetic and use the `example-` model
   * namespace, so they only map onto the synthetic demo plans. Saying so beats a
   * result that reads as a failure when a visitor replays a demo against a
   * catalogued plan.
   */
  const importsRef = useRef(imports);
  importsRef.current = imports;
  useEffect(() => {
    // The address echoing a workload this list already holds needs no re-read.
    if (
      initialImportId !== undefined &&
      importsRef.current?.some((entry) => entry.id === initialImportId)
    )
      return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await client.listImports();
        if (cancelled) return;
        setImports(list);
        if (initialImportId === undefined && list.length > 0)
          setSelectedId((current) => current ?? list[0]?.id);
      } catch {
        if (!cancelled) setImportsError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, initialImportId]);

  const runReplay = useCallback(async () => {
    const translation = policy === undefined ? {} : { modelTranslation: policy };
    const target: ExecutionTargetV1 | undefined =
      targetKind === "api"
        ? selectedProvider === undefined
          ? undefined
          : { type: "api", providerId: selectedProvider.id, ...translation }
        : selectedPlan === undefined
          ? undefined
          : { type: "subscription", planId: selectedPlan.id, ...translation };
    if (workload === undefined || target === undefined) return;
    const token = guard.begin();
    setPhase("loading");
    setError(undefined);
    setOutcome(undefined);
    setOutcomeSelection(undefined);
    try {
      const response = await client.runReplay(
        workload.id,
        target,
        rulesAsOf,
        (next, nextDetail) => {
          if (!guard.isCurrent(token)) return;
          setPhase(next === "loading" ? "loading" : "replaying");
          setDetail(nextDetail);
        },
        { excludeUnresolved: excludeUnresolved && unresolvedEvents > 0, sources: scope },
      );
      // The target, workload or rules date may have changed while this ran: the
      // result belongs to a selection the surface no longer shows.
      if (!guard.isCurrent(token)) return;
      setOutcome(response);
      setOutcomeSelection({
        workloadLabel: workload.label,
        workloadId: workload.id,
        target: target.type === "api" ? target.providerId : (selectedPlan?.id ?? ""),
        rulesAsOf,
        ...(scope.length === 0
          ? {}
          : { scopeLabel: scope.map((id) => sourceNames.get(id) ?? id).join(" + ") }),
      });
      setDetail(undefined);
      setPhase("done");
    } catch (failure) {
      if (!guard.isCurrent(token)) return;
      // A superseded request is not a failure: a newer replay owns this surface.
      if (failure instanceof SupersededError) return;
      setError(describeWorkerFailure(failure));
      setPhase("idle");
    }
  }, [
    client,
    excludeUnresolved,
    guard,
    policy,
    rulesAsOf,
    scope,
    selectedPlan,
    selectedProvider,
    sourceNames,
    targetKind,
    unresolvedEvents,
    workload,
  ]);

  /**
   * Choosing a different target or rules date drops the displayed result: it was
   * computed for the previous selection, and leaving it on screen under the new
   * labels described a replay that never ran (benchmark finding F026).
   */
  const selectPlan = useCallback(
    (id: string) => {
      setPlanId(id);
      setTranslationOpen(false);
      dropResult();
    },
    [dropResult],
  );

  const selectProvider = useCallback(
    (id: string) => {
      setProviderId(id);
      setTranslationOpen(false);
      dropResult();
    },
    [dropResult],
  );

  /**
   * Switching the target kind drops the displayed result for the same reason
   * choosing a different target does: the panel would otherwise describe a
   * replay that was never run against what the surface now shows.
   */
  /** A different slice of the work is a different replay: the old result goes. */
  const selectScope = useCallback(
    (ids: string[]) => {
      setScopeSources(ids);
      setTranslationOpen(false);
      dropResult();
    },
    [dropResult],
  );

  const selectTargetKind = useCallback(
    (kind: "subscription" | "api") => {
      setTargetKind(kind);
      dropResult();
    },
    [dropResult],
  );

  const onPlanKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLUListElement>) => {
      if (filteredPlans.length === 0) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const next = Math.min(Math.max(activeIndex + delta, 0), filteredPlans.length - 1);
        setActiveIndex(next);
        const option = filteredPlans[next];
        if (option !== undefined) selectPlan(option.id);
        const node = listRef.current?.querySelectorAll<HTMLElement>("[data-plan-option]")[next];
        node?.focus();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void runReplay();
      }
    },
    [activeIndex, filteredPlans, runReplay, selectPlan],
  );

  /**
   * After an exact result that leaves calls on models the target does not
   * offer, the next honest question is a move: open the substitution editor
   * where the choices are made, instead of implying one.
   */
  const openMove = useCallback(() => {
    setTranslationOpen(true);
    requestAnimationFrame(() =>
      document.querySelector('[data-testid="translation-editor"]')?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      }),
    );
  }, []);
  /**
   * A plan whose limits are unpublished cannot say whether it keeps up, but the
   * same work at its maker's API list prices is a figure the evidence supports.
   */
  const apiAlternative = useMemo(() => {
    if (targetKind !== "subscription" || selectedPlan === undefined || workload === undefined)
      return undefined;
    const provider = providers.find((entry) => entry.id === selectedPlan.providerId);
    if (provider === undefined || provider.pricedModelCount === 0) return undefined;
    // Only where the maker's API offers these calls' models: otherwise the
    // link would lead to a result that prices nothing.
    const coverage = coverageByKey.get(`api:${provider.id}`)?.coverage;
    if (coverage === undefined || coverage.runnable === 0) return undefined;
    const params = new URLSearchParams({ import: workload.id, api: provider.id });
    if (scope.length > 0) params.set("scope", scope.join(","));
    return { href: `/app/replay?${params.toString()}`, name: provider.name };
  }, [coverageByKey, providers, scope, selectedPlan, targetKind, workload]);

  if (importsError)
    return (
      <p role="alert" className="border-l-2 border-warning pl-4 text-sm">
        Local workloads could not be read from this browser. Reload to try again.
      </p>
    );

  if (imports === undefined)
    return (
      <div role="status" data-testid="replay-restoring" className="border-t border-border pt-6">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Opening your workload
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Looking up recorded work in this browser before choosing what to test…
        </p>
      </div>
    );

  if (imports.length === 0) {
    return (
      <div data-testid="replay-empty">
        <ImportSurface initialImports={[]} initialTarget={initialTarget} />
      </div>
    );
  }

  // A named workload that is gone is said once, with a way on; the setup below
  // would otherwise wait for a workload that will never arrive.
  if (requestedWorkloadMissing)
    return (
      <MissingWorkload
        latest={imports[0]}
        onOpenLatest={(id) => {
          setSelectedId(id);
          dropResult();
        }}
      />
    );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <WorkloadStrip
        workload={workload}
        imports={imports}
        onSelect={(id) => {
          setSelectedId(id);
          dropResult();
        }}
      />

      <Card className="rounded-none border-x-0 border-b-0 bg-transparent p-0">
        <CardContent className="flex flex-col gap-5 py-5">
          {usageSources.length > 1 ? (
            <fieldset
              className="flex flex-col gap-4 border-b border-border pb-6"
              data-testid="replay-scope-picker"
            >
              <legend className="text-sm font-medium">1. Which work are you testing?</legend>
              <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                This is one chronological workload. Test all of it, or focus on the calls recorded
                by one tool.
              </p>
              <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={scope.length === 0}
                  data-testid="scope-all"
                  onClick={() => selectScope([])}
                  className={`flex min-h-24 flex-col items-start justify-center gap-1 px-4 py-3 text-left ${scope.length === 0 ? "bg-surface-2 text-foreground outline outline-2 outline-accent -outline-offset-2" : "bg-background text-muted-foreground hover:text-foreground"}`}
                >
                  <span className="text-sm font-medium">All recorded work</span>
                  <span className="font-mono text-xs tabular-nums">
                    {formatCount(workload?.summary.eventCount ?? 0)} calls ·{" "}
                    {usageSources.map((source) => source.name).join(" + ")}
                  </span>
                  <span className="text-xs">
                    Keep each model exactly as recorded. A target serves only models it offers.
                  </span>
                </button>
                {usageSources.map((source) => {
                  const active = scope.length === 1 && scope[0] === source.adapterId;
                  return (
                    <button
                      key={source.adapterId}
                      type="button"
                      aria-pressed={active}
                      data-testid={`scope-${source.adapterId}`}
                      onClick={() => selectScope([source.adapterId])}
                      className={`flex min-h-24 flex-col items-start justify-center gap-1 px-4 py-3 text-left ${active ? "bg-surface-2 text-foreground outline outline-2 outline-accent -outline-offset-2" : "bg-background text-muted-foreground hover:text-foreground"}`}
                    >
                      <span className="text-sm font-medium">{source.name} work</span>
                      <span className="font-mono text-xs tabular-nums">
                        {formatCount(source.events)} calls ·{" "}
                        {((source.events / (workload?.summary.eventCount || 1)) * 100).toFixed(1)}%
                        of all work
                      </span>
                      <span className="text-xs">
                        Only calls recorded by {source.name}.{" "}
                        {source.name === "Command Code"
                          ? "This tool may have used models from several providers."
                          : "The models and demand stay as recorded."}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="max-w-prose text-xs text-muted-foreground" data-testid="scope-note">
                {scope.length === 0
                  ? "Selected: all recorded work. A single-provider plan may naturally cover only part of this mixed workload."
                  : slice === undefined
                    ? `Reading your ${scope.map((id) => sourceNames.get(id) ?? id).join(" + ")} calls in this browser…`
                    : `Only the calls your ${scope.map((id) => sourceNames.get(id) ?? id).join(" + ")} work recorded: ${formatCount(scopedEvents)} of ${formatCount(workload?.summary.eventCount ?? 0)}. The result states this scope.`}
              </p>
            </fieldset>
          ) : null}

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-medium">
                {usageSources.length > 1
                  ? "2. What do you want to test it against?"
                  : "What do you want to test this work against?"}
              </h2>
              <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
                A plan with published limits shows whether and when it would have run out. API list
                prices show what the same calls would cost. Every model stays as recorded unless you
                choose to move work to other models.
              </p>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <fieldset className="flex flex-col gap-2" data-testid="target-kind">
                <legend className="text-xs uppercase tracking-widest text-muted-foreground">
                  Test against
                </legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={targetKind === "subscription"}
                    data-testid="target-kind-subscription"
                    onClick={() => selectTargetKind("subscription")}
                    className={segmentedClass(targetKind === "subscription")}
                  >
                    Subscription plan
                  </button>
                  <button
                    type="button"
                    aria-pressed={targetKind === "api"}
                    data-testid="target-kind-api"
                    onClick={() => selectTargetKind("api")}
                    className={segmentedClass(targetKind === "api")}
                  >
                    API list prices
                  </button>
                </div>
              </fieldset>
              <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground sm:w-72">
                {targetKind === "api" ? "Find a provider" : "Find a plan"}
                <input
                  type="search"
                  value={query}
                  placeholder={
                    targetKind === "api"
                      ? "Search providers or IDs"
                      : "Search plans, providers, or IDs"
                  }
                  data-testid="plan-search"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  className="w-full rounded-md border border-control-border bg-surface px-3 py-2 text-sm"
                />
              </label>
            </div>
            <p className="max-w-prose text-xs text-muted-foreground" data-testid="target-note">
              {selectedWorkloadIsDemo
                ? "This synthetic workload uses example models. Demo targets appear first; their prices and limits are illustrative. Other targets can show unavailable demand."
                : targetKind === "api"
                  ? "A Direct API target applies the provider's published API list prices to every call it offers a model for. No plan, allowance, discount, batch price, tax or negotiated rate is assumed."
                  : coverages === undefined
                    ? "Plans with their sourced rules at the rules date."
                    : "Ordered by how much of this work each plan runs, from the plans' own model rules."}
            </p>
            {selectedWorkloadIsDemo ? (
              <p
                className="max-w-xl text-xs text-muted-foreground"
                data-testid="demo-workload-note"
              >
                Import your own workload to compare catalogued plans and providers.
              </p>
            ) : null}
            {targetKind === "api" ? (
              <ul
                aria-label="Direct API providers"
                data-testid="provider-list"
                onFocusCapture={holdOrder}
                onPointerDown={holdOrder}
                className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border"
              >
                {filteredProviders.length === 0 ? (
                  <li className="p-3 text-sm text-muted-foreground">
                    No catalogued provider is recorded as offering a model.
                  </li>
                ) : (
                  filteredProviders.map((provider, index) => (
                    <li key={provider.id}>
                      {startsUnavailableGroup(
                        coverageByKey.get(`api:${provider.id}`)?.coverage,
                        index === 0
                          ? undefined
                          : coverageByKey.get(`api:${filteredProviders[index - 1]?.id}`)?.coverage,
                      ) ? (
                        <p className="border-b border-border bg-surface-2/60 px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                          Offer none of these models · test them with a substitution
                        </p>
                      ) : null}
                      <button
                        type="button"
                        aria-pressed={provider.id === providerId}
                        data-provider-option={provider.id}
                        data-testid={`provider-${provider.id}`}
                        onClick={() => selectProvider(provider.id)}
                        className={[
                          "flex w-full items-baseline justify-between gap-4 border-l-2 px-3 py-2.5 text-left",
                          provider.id === providerId
                            ? "border-accent bg-surface-2"
                            : "border-transparent bg-transparent",
                        ].join(" ")}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm">
                            {provider.name}
                            {isSyntheticCatalogId(provider.id) ? (
                              <span className="ml-2 rounded border border-warning/50 px-1 text-[10px] text-warning">
                                demo
                              </span>
                            ) : null}
                          </span>
                          <CoverageLine
                            coverage={coverageByKey.get(`api:${provider.id}`)?.coverage}
                            fallback={
                              profile === undefined
                                ? "Checking which of these calls' models it offers…"
                                : `${formatCount(provider.pricedModelCount)} of ${formatCount(provider.modelCount)} offered models have API list prices`
                            }
                            testId={`provider-coverage-${provider.id}`}
                          />
                        </span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          list prices
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <ul
                ref={listRef}
                aria-label="Target plans"
                data-testid="plan-list"
                onFocusCapture={holdOrder}
                onKeyDown={onPlanKeyDown}
                onPointerDown={holdOrder}
                className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border"
              >
                {filteredPlans.length === 0 ? (
                  <li className="p-3 text-sm text-muted-foreground">
                    No plan is effective at this rules date.
                  </li>
                ) : (
                  filteredPlans.map((plan, index) => (
                    <li key={plan.id}>
                      {startsUnavailableGroup(
                        coverageByKey.get(`plan:${plan.id}`)?.coverage,
                        index === 0
                          ? undefined
                          : coverageByKey.get(`plan:${filteredPlans[index - 1]?.id}`)?.coverage,
                      ) ? (
                        <p className="border-b border-border bg-surface-2/60 px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                          Offer none of these models · test them with a substitution
                        </p>
                      ) : null}
                      <button
                        type="button"
                        aria-pressed={plan.id === planId}
                        data-plan-option={plan.id}
                        data-testid={`plan-${plan.id}`}
                        onClick={() => selectPlan(plan.id)}
                        onFocus={() => setActiveIndex(index)}
                        className={[
                          "flex w-full items-baseline justify-between gap-4 border-l-2 px-3 py-2.5 text-left",
                          plan.id === planId
                            ? "border-accent bg-surface-2"
                            : "border-transparent bg-transparent",
                        ].join(" ")}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm">
                            {plan.name}
                            {isSyntheticCatalogId(plan.id) ? (
                              <span className="ml-2 rounded border border-warning/50 px-1 text-[10px] text-warning">
                                demo
                              </span>
                            ) : null}
                          </span>
                          <CoverageLine
                            coverage={coverageByKey.get(`plan:${plan.id}`)?.coverage}
                            fallback={
                              profile === undefined
                                ? "Checking which of these calls' models it offers…"
                                : `${plan.providerId} · rules from ${plan.effectiveFrom}`
                            }
                            testId={`plan-coverage-${plan.id}`}
                          />
                        </span>
                        <span className="shrink-0 font-mono text-sm tabular-nums">
                          {formatMoney(plan.price.amount)}/{plan.price.interval}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {compat !== undefined &&
          models !== undefined &&
          targetReady &&
          compat.unserved.length > 0 ? (
            <TranslationEntry
              onOpen={() => setTranslationOpen(true)}
              open={translationOpen || policy !== undefined}
              targetName={targetName}
              totalEvents={scopedEvents}
              unserved={compat.unserved}
              unservedEvents={compat.unservedEvents}
              workload={models}
            />
          ) : null}
          {models !== undefined &&
          targetReady &&
          targetKey !== undefined &&
          (translationOpen || policy !== undefined) ? (
            <TranslationEditor
              apiTarget={targetKind === "api"}
              available={available}
              mapping={mapping}
              onChange={(next) => {
                setMappings((current) => ({ ...current, [targetKey]: next }));
                dropResult();
              }}
              targetName={targetName}
              workload={models}
            />
          ) : null}
          {models !== undefined &&
          targetReady &&
          (compat?.unserved.length ?? 0) === 0 &&
          !translationOpen &&
          models.sources.length > 0 ? (
            <button
              type="button"
              className="min-h-11 self-start text-xs text-muted-foreground underline-offset-4 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0"
              onClick={() => setTranslationOpen(true)}
              data-testid="open-translation"
            >
              This target runs every observed model. Substitute models anyway…
            </button>
          ) : null}
          {unresolvedEvents > 0 && targetReady ? (
            <label
              className="flex max-w-prose items-start gap-2 text-xs leading-relaxed text-muted-foreground"
              data-testid="exclude-unresolved"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0"
                checked={excludeUnresolved}
                onChange={(event) => {
                  setExcludeUnresolved(event.target.checked);
                  dropResult();
                }}
              />
              <span>
                Leave out the {formatCount(unresolvedEvents)} calls whose model identity is
                unresolved. With them in, the engine cannot establish a coverage total or an API
                cost; without them, the result covers {formatCount(scopedEvents - unresolvedEvents)}{" "}
                of {formatCount(scopedEvents)} calls in scope and says so.
              </span>
            </label>
          ) : null}

          <details
            className="border-t border-border pt-3 text-xs text-muted-foreground"
            data-testid="replay-advanced"
          >
            <summary className="min-h-11 cursor-pointer focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
              Advanced · rules as of{" "}
              <span className="font-mono tabular-nums text-foreground">{rulesAsOf}</span>
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1 self-start">
                Rules as of
                <input
                  type="date"
                  value={rulesAsOf}
                  data-testid="rules-as-of"
                  onChange={(event) => {
                    setRulesAsOf(event.target.value);
                    dropResult();
                  }}
                  className="rounded-md border border-control-border bg-surface px-2 py-1.5 font-mono text-sm tabular-nums"
                />
              </label>
              <p className="max-w-prose">
                Replay applies the plan and price records in force on this date. Today is the
                default; an earlier date replays the rules as they stood then.
              </p>
              {targetKind === "api" ? (
                selectedProvider === undefined ? null : (
                  <div className="flex flex-wrap items-center gap-3" data-testid="provider-facts">
                    <Badge variant="outline">{selectedProvider.id}</Badge>
                    <span>
                      {formatCount(selectedProvider.pricedModelCount)} of{" "}
                      {formatCount(selectedProvider.modelCount)} offered models carry API list
                      prices in force at this rules date
                    </span>
                    <Badge
                      variant={
                        selectedProvider.verificationStatus === "verified" ? "positive" : "warning"
                      }
                    >
                      catalog: {selectedProvider.verificationStatus}
                    </Badge>
                  </div>
                )
              ) : selectedPlan !== undefined ? (
                <div className="flex flex-wrap items-center gap-3" data-testid="plan-facts">
                  <Badge variant="outline">{selectedPlan.versionId}</Badge>
                  <span>
                    {selectedPlan.limitCount} limit{" "}
                    {selectedPlan.limitCount === 1 ? "rule" : "rules"}
                  </span>
                  <span>
                    {selectedPlan.modelCount} model{" "}
                    {selectedPlan.modelCount === 1 ? "rule" : "rules"}
                  </span>
                  <Badge
                    variant={
                      selectedPlan.verificationStatus === "verified" ? "positive" : "warning"
                    }
                  >
                    catalog: {selectedPlan.verificationStatus}
                  </Badge>
                </div>
              ) : null}
            </div>
          </details>
          {targetKind === "api" && selectedProvider?.pricedModelCount === 0 ? (
            <p className="text-xs text-warning" data-testid="provider-unpriced-note">
              No model this provider offers has an API list price record, so a replay will report
              the demand as unpriced rather than invent a cost.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              data-testid="run-replay"
              disabled={
                !targetReady ||
                workload === undefined ||
                phase === "loading" ||
                phase === "replaying"
              }
              onClick={() => void runReplay()}
            >
              {phase === "loading" || phase === "replaying"
                ? "Replaying…"
                : policy !== undefined
                  ? "Run replay with your substitutions"
                  : "Run replay · models as recorded"}
            </Button>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {phase === "idle"
                ? "Replay runs in this browser; nothing is sent to a server."
                : phase === "done"
                  ? "Replay completed in this browser."
                  : (detail ?? "Working in a background Worker.")}
            </span>
          </div>
        </CardContent>
      </Card>

      {error !== undefined ? (
        <Card role="alert" className="border-negative/40" data-testid="replay-error">
          <CardContent className="flex flex-col gap-2 p-5">
            <h2 className="text-sm font-medium text-negative">{error.title}</h2>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            {error.hint !== undefined ? (
              <p className="text-xs text-muted-foreground">{error.hint}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div ref={resultAnchorRef} className="scroll-mt-40" />
      {phase === "loading" || phase === "replaying" ? (
        <section
          className="grid gap-5 border-y border-accent/50 bg-surface-2 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
          data-testid="replay-in-progress"
          aria-label="Replay in progress"
        >
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-accent uppercase">
              Replay / executing
            </p>
            <h2 className="mt-2 text-xl font-medium">Following your workload through the target</h2>
            <p className="mt-2 text-sm text-muted-foreground" role="status">
              {detail ?? "Preparing the local replay."}
            </p>
          </div>
          <ReplayPath phase="observed" translated={false} crossingCount={0} />
        </section>
      ) : null}

      {outcome !== undefined ? (
        <ReplayResult
          outcome={outcome}
          computedFor={outcomeSelection}
          workload={imports.find((entry) => entry.id === outcomeSelection?.workloadId)}
          onMove={
            policy === undefined &&
            compat !== undefined &&
            compat.unserved.length > 0 &&
            available.some((model) => model.available)
              ? openMove
              : undefined
          }
          apiAlternative={apiAlternative}
        />
      ) : null}
    </div>
  );
}

/** The first target in the ordered list that offers none of the work's models. */
function startsUnavailableGroup(
  coverage: TargetCoverage | undefined,
  previous: TargetCoverage | undefined,
): boolean {
  return coverage?.runnable === 0 && (previous === undefined || previous.runnable > 0);
}

/**
 * How much of the work in scope a target runs, from the plan's own model rules:
 * the same count the replay will report.
 */
function CoverageLine({
  coverage,
  fallback,
  testId,
}: {
  coverage: TargetCoverage | undefined;
  fallback: string;
  testId: string;
}) {
  // Availability, never capacity: a plan that offers a model has not been
  // shown to carry the calls that use it.
  const text =
    coverage === undefined
      ? fallback
      : coverage.runnable === 0
        ? "Offers none of these calls' models"
        : `${
            coverage.runnable === coverage.events
              ? `Offers every model in these ${formatCount(coverage.events)} calls`
              : `Offers the models behind ${shareText(coverage.runnable / coverage.events)} of these calls`
          }${coverage.kind === "api" && coverage.priced === false ? " · not all priced" : ""}`;
  return (
    <span className="truncate text-xs text-muted-foreground" data-testid={testId}>
      {text}
    </span>
  );
}

function WorkloadStrip({
  workload,
  imports,
  onSelect,
}: {
  workload: ImportRecord | undefined;
  imports: ImportRecord[];
  onSelect: (id: string) => void;
}) {
  if (workload === undefined) return null;
  const { summary } = workload;
  const unmapped = summary.models.filter((model) => !model.mapped).length;
  const day = localDayOf(browserTimeZone());
  const range =
    summary.firstEventAt !== undefined && summary.lastEventAt !== undefined
      ? plainRange(day(summary.firstEventAt), day(summary.lastEventAt))
      : "no recorded dates";
  return (
    <Card
      data-testid="workload-strip"
      className="min-w-0 rounded-none border-x-0 border-b-0 bg-transparent p-0"
    >
      <CardContent className="flex min-w-0 flex-col gap-4 py-5">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-full">
            <h2 className="text-sm font-medium">Your actual workload</h2>
            <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {workload.label} · {range} ·{" "}
              <Link
                className="text-accent underline underline-offset-4"
                href={`/app/workload?import=${workload.id}`}
                data-testid="strip-workload-link"
              >
                Open workload
              </Link>
            </p>
          </div>
          {imports.length > 1 ? (
            <label className="flex w-full min-w-0 max-w-full flex-col gap-1 text-xs text-muted-foreground sm:w-auto sm:max-w-xs">
              Stored workload
              <select
                value={workload.id}
                data-testid="workload-select"
                onChange={(event) => onSelect(event.target.value)}
                className="block w-full min-w-0 max-w-full rounded-md border border-control-border bg-surface px-2 py-1.5 text-sm"
              >
                {imports.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <p className="text-sm text-foreground" data-testid="workload-strip-summary">
          <span className="tabular-nums">{formatCount(summary.eventCount)}</span> calls
          {summary.usageSources.length === 0
            ? ""
            : ` · ${summary.usageSources.map((source) => `${source.name} ${formatCount(source.events)}`).join(" · ")}`}
          {unmapped === 0
            ? ""
            : ` · ${formatCount(unmapped)} unresolved model ${unmapped === 1 ? "ID" : "IDs"}`}
        </p>
        <details className="border-t border-border pt-3" data-testid="workload-details">
          <summary className="min-h-11 cursor-pointer text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
            Workload details and model identities
          </summary>
          <div className="mt-4 flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-x-5 gap-y-6 border-y border-border py-5 sm:grid-cols-4">
              <Metric label="Calls" value={formatCount(summary.eventCount)} size="lg" />
              <Metric
                label="Tokens processed"
                value={formatTokens(summary.tokens.known) ?? "0"}
                size="lg"
                title={`${formatCount(summary.tokens.known)} reported tokens processed, including reused context read from cache`}
              />
              <Metric label="Sessions" value={formatCount(summary.sessionCount)} size="lg" />
              <Metric
                label="Incomplete token data"
                value={formatCount(summary.tokens.unknownEvents)}
                unit="calls"
                size="lg"
                tone={summary.tokens.unknownEvents > 0 ? "warning" : "default"}
              />
            </div>
            <div className="flex flex-wrap justify-between gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <p>Uncached input: {formatTokens(summary.tokens.buckets.uncachedInputTokens)}</p>
              <p>Cache writes: {formatTokens(summary.tokens.buckets.cacheWriteTokens)}</p>
              <p>
                Reused context read from cache:{" "}
                {formatTokens(summary.tokens.buckets.cacheReadTokens)}
              </p>
              <p>Output: {formatTokens(summary.tokens.buckets.outputTokens)}</p>
              {summary.tokens.buckets.reasoningTokens > 0 ? (
                <p>Reasoning: {formatTokens(summary.tokens.buckets.reasoningTokens)}</p>
              ) : null}
              <p className="tabular-nums">
                Exact known tokens in this workload: {formatCount(summary.tokens.known)}
              </p>
            </div>
            <ModelIdentityList models={summary.models} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

/**
 * How each observed model name maps onto the catalog (M4A).
 *
 * The observed identifier is always shown as it was reported, next to the
 * canonical model it was resolved to and the basis for that mapping. Identifiers
 * the catalog cannot justify are listed as unmapped, because leaving a name
 * unresolved and saying so is the honest outcome: nothing here guesses an
 * identity from a similar-looking name.
 */
function ModelIdentityList({ models }: { models: ModelSummary[] }) {
  if (models.length === 0) return null;
  const ordered = [...models].sort((a, b) => b.events - a.events);
  const unmapped = ordered.filter((model) => !model.mapped).length;
  const basisLabel: Record<NonNullable<ModelSummary["basis"]>, string> = {
    canonical_id: "exact id",
    canonical_name: "catalog name",
    alias: "catalog alias",
  };
  return (
    <div data-testid="model-identities" className="border-t border-border pt-4">
      <h3 className="text-xs font-medium text-muted-foreground">Models in this workload</h3>
      <ul className="mt-2 flex flex-col gap-1 font-mono text-xs">
        {ordered.slice(0, 12).map((model) => (
          <li key={model.rawName} className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="min-w-0 text-foreground [overflow-wrap:anywhere]">
              {model.rawName}
            </span>
            {model.mapped ? (
              <>
                <span aria-hidden="true" className="text-muted-foreground">
                  →
                </span>
                <span className="min-w-0 text-muted-foreground [overflow-wrap:anywhere]">
                  {model.canonicalId}
                </span>
                <span className="rounded border border-border px-1 text-[10px] text-muted-foreground">
                  {model.basis === undefined ? "mapped" : basisLabel[model.basis]}
                </span>
              </>
            ) : (
              <span className="rounded border border-border px-1 text-[10px] text-warning">
                unmapped
              </span>
            )}
            <span className="tabular-nums text-muted-foreground">
              {formatCount(model.events)} calls
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        {unmapped === 0
          ? "Every observed model name resolved to a catalog model."
          : `${formatCount(unmapped)} observed model ${unmapped === 1 ? "name" : "names"} did not resolve. Unresolved names are left unmapped and reported: StackReplay never guesses a model identity.`}
      </p>
    </div>
  );
}

/**
 * The result composition: one primary result, then the detail behind it.
 *
 * Everything above the detail rule is the projection read back: the engine's own
 * status word, the request dimension, the three coverage dimensions kept apart,
 * the target stack, the constraints with their recorded crossings, the
 * dispositions, the cost basis and the evidence ledger. Nothing here recomputes
 * a figure the engine produced or restates one in its own words.
 *
 * The detail section carries what the instrument does not: the day-by-day shape
 * of the workload, the engine's warnings, the scope and reset disclaimers, and
 * the provenance rows an audit asks for. The share panel is last, because
 * possession of that URL is access to every number above it.
 */
function ReplayResult({
  outcome,
  computedFor,
  workload,
  onMove,
  apiAlternative,
}: {
  outcome: ReplayOutcome;
  /** What this result was computed from; may be absent for older callers. */
  computedFor: ComputedFor | undefined;
  workload: ImportRecord | undefined;
  /** Opens the substitution editor for calls on models the target does not offer. */
  onMove?: (() => void) | undefined;
  /** The same work at the plan maker's API list prices. */
  apiAlternative?: { href: string; name: string } | undefined;
}) {
  const { result, timeline, projection } = outcome;
  const apiTarget = projection.target.kind === "api";
  const translated = projection.mode === "translated";
  const choreography = useReplayChoreography({
    runKey: `${computedFor?.target ?? projection.target.label}:${computedFor?.rulesAsOf ?? projection.provenance.rulesAsOf}`,
    translated,
  });
  /**
   * Each rule's declared behaviour, by constraint id. The timeline classifies a
   * crossing by what its rule declared it does, never by which quantities the
   * violation happens to carry: a record-only rule measures overage units
   * without billing anything.
   */
  const constraintBehaviours = useMemo(
    () =>
      new Map<string, ProjectedReplayV1["constraints"][number]["exceed"]>(
        projection.constraints.map((constraint) => [constraint.id, constraint.exceed]),
      ),
    [projection.constraints],
  );
  const planVersionId = projection.target.planVersionId;
  const shareTarget =
    apiTarget || planVersionId === undefined ? undefined : bundledPlanFacts(planVersionId);
  const providerFacts =
    apiTarget && projection.provenance.apiProvider !== undefined
      ? bundledProviderFacts(projection.provenance.apiProvider)
      : undefined;
  const targetName = providerFacts?.name ?? shareTarget?.planName ?? projection.target.label;
  // Models the plan leaves out of its included usage but runs with paid usage
  // credits: still unavailable to the replayed allowance, but not unusable.
  const usageCreditModels = new Set(
    apiTarget || planVersionId === undefined ? [] : bundledUsageCreditModels(planVersionId),
  );
  const creditOnly = (entry: { reason: string; canonicalId?: string | undefined }) =>
    entry.reason === "excluded" &&
    entry.canonicalId !== undefined &&
    usageCreditModels.has(entry.canonicalId);
  const usageCreditEntries = result.unsupportedModels.filter(creditOnly);

  const verdictTarget = apiTarget ? `${targetName} API` : targetName;
  const composed = verdictOfOutcome(outcome, verdictTarget, {
    timeZone: browserTimeZone(),
    catalog: loadBundledCatalog(),
  });
  const provenanceFacts = shareTarget ?? providerFacts;
  const shareBuild = useCallback(
    (options: ShareOptions) =>
      composed === undefined || provenanceFacts === undefined
        ? undefined
        : replayShareV2(
            {
              facts: composed.facts,
              projection,
              sourceIds: outcome.scope?.source?.ids,
              target: {
                verificationStatus: provenanceFacts.verificationStatus,
                lastVerifiedAt: provenanceFacts.lastVerifiedAt,
                sources: provenanceFacts.sources,
              },
              catalog: loadBundledCatalog(),
            },
            options,
          ),
    [composed, outcome.scope, projection, provenanceFacts],
  );
  const computedLine =
    computedFor === undefined ? null : (
      <p
        className="text-xs text-muted-foreground [overflow-wrap:anywhere]"
        data-testid="result-computed-for"
      >
        Computed from &ldquo;{computedFor.workloadLabel}&rdquo;
        {computedFor.scopeLabel === undefined ? "" : `, your ${computedFor.scopeLabel} work`} ·{" "}
        {formatCount(result.workload.eventCount)} calls · target{" "}
        <span className="font-mono">{computedFor.target}</span> · rules as of{" "}
        <span className="font-mono">{computedFor.rulesAsOf}</span>
      </p>
    );

  return (
    <div className="flex min-w-0 flex-col gap-7" data-testid="replay-result">
      <header className="border-y border-accent/60 py-4" data-testid="replay-result-object">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">Work tested</p>
        <h2 className="mt-1 text-lg font-medium">
          {computedFor?.scopeLabel === undefined
            ? "All recorded work"
            : `${computedFor.scopeLabel} work`}{" "}
          → {verdictTarget}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatCount(result.workload.eventCount)} of{" "}
          {formatCount(outcome.scope?.recordedEvents ?? result.workload.eventCount)} recorded calls
          ·{" "}
          {projection.mode === "exact"
            ? "Models as recorded"
            : projection.mode === "translated"
              ? "Explicit model substitutions"
              : "Routing assumption not recorded"}{" "}
          · {modeLabel(projection.mode)}
        </p>
      </header>
      {composed === undefined ? (
        <section className="flex flex-col gap-2" data-testid="replay-headline">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Replay result</p>
          <span
            className="self-start border border-border px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase"
            data-testid="replay-mode"
          >
            {/* A result carrying no mode is not labelled with the mode it
                certainly did not apply. */}
            {modeLabel(projection.mode)}
          </span>
          <p className="text-sm text-muted-foreground">{targetName}</p>
        </section>
      ) : (
        <ReplayVerdict
          context={
            <>
              {verdictTarget} · rules as of {projection.provenance.rulesAsOf}
            </>
          }
          verdict={composed.verdict}
        />
      )}
      {composed === undefined ||
      ((onMove === undefined || composed.facts.calls.unavailable === 0) &&
        (apiAlternative === undefined ||
          composed.facts.target.capacity !== "unpublished" ||
          translated)) ? null : (
        <div
          className="-mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm"
          data-testid="result-next"
        >
          {onMove === undefined || composed.facts.calls.unavailable === 0 ? null : (
            <button
              type="button"
              className="min-h-11 text-left text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              onClick={onMove}
              data-testid="result-move"
            >
              Move the {formatCount(composed.facts.calls.unavailable)} unavailable{" "}
              {composed.facts.calls.unavailable === 1 ? "call" : "calls"} to {targetName} models →
            </button>
          )}
          {apiAlternative === undefined ||
          composed.facts.target.capacity !== "unpublished" ||
          translated ? null : (
            <Link
              className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              href={apiAlternative.href}
              data-testid="result-api-alternative"
            >
              See this work at {apiAlternative.name} API list prices →
            </Link>
          )}
        </div>
      )}
      <ReplayReading
        importId={computedFor?.workloadId}
        projection={projection}
        scope={outcome.scope}
        priceability={outcome.priceability}
        receipt={outcome.receipt}
        resolvedScope={outcome.resolvedScope}
        targetName={targetName}
        usageCredits={
          usageCreditEntries.length === 0
            ? undefined
            : {
                events: usageCreditEntries.reduce((total, entry) => total + entry.eventCount, 0),
                modelIds: [
                  ...new Set(usageCreditEntries.flatMap((entry) => entry.canonicalId ?? [])),
                ],
              }
        }
      />

      <details
        className="max-w-[80rem] min-w-0 border-t border-border pt-4"
        data-testid="replay-evidence-details"
      >
        <summary className="min-h-11 cursor-pointer text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          Inspect the mechanics: outcomes, coverage, constraints, cost and evidence
        </summary>
        <div className="mt-5 flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-3" data-testid="engine-reading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <MicroLabel>Engine reading</MicroLabel>
              <span className="text-sm text-foreground" data-testid="headline-status">
                {projection.headline.statusLabel}
              </span>
            </div>
            {outcome.resolvedScope === undefined ? null : (
              <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
                The price above covers the calls with recognized models. Everything below is the
                replay of all {formatCount(result.workload.eventCount)} recorded calls, including
                why no price is established for all of them.
              </p>
            )}
            <div
              className="grid gap-5 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
              data-testid="app-replay-instrument"
              data-phase={choreography.phase}
            >
              <div>
                <ReplayPath
                  phase={choreography.phase}
                  translated={translated}
                  crossingCount={projection.crossings.length}
                />
                <p className="sr-only" role="status">
                  {choreography.phase === "settled"
                    ? "Replay result settled"
                    : `Replay ${choreography.phase}`}
                </p>
              </div>
              <ResultSettlement projection={projection} settled={choreography.effects.settled} />
            </div>
            <CoverageDimensions index="01" projection={projection} />
            <p
              className="max-w-prose text-[11px] leading-relaxed text-muted-foreground"
              data-testid="replay-mode-note"
            >
              {projection.modeNote}
            </p>
          </section>
          <WorkloadSpecimen
            active={choreography.effects.workloadActive}
            index="02"
            projection={projection}
          />
          <ModelLanes
            identityActive={choreography.effects.identityActive}
            index="03"
            projection={projection}
            translationActive={choreography.effects.translationActive}
          />
          <ExecutionStack
            index="04"
            projection={projection}
            targetActive={choreography.effects.targetActive}
          />
          <ConstraintTrace
            chronologyActive={choreography.effects.chronologyActive}
            index="05"
            projection={projection}
          />
          <OutcomeLedger
            index="06"
            projection={projection}
            settled={choreography.effects.settled}
          />
          <EvidenceLedger index="07" projection={projection} />
          <section className="flex flex-col gap-3 border-t border-border pt-4">
            <h2 className="text-sm text-foreground" data-testid="cost-heading">
              Cost on this target
            </h2>
            <CostCounterfactual index="08" projection={projection} settled />
          </section>
        </div>
      </details>

      <details className="border-t border-border pt-4" data-testid="replay-detail">
        <summary className="min-h-11 cursor-pointer text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          Timeline and provenance
        </summary>
        <div className="mt-4 flex flex-col gap-6">
          {computedLine}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Detail and provenance</h2>
            <MicroLabel>the same recorded crossings, day by day</MicroLabel>
          </div>

          <Card>
            <CardContent className="flex flex-col gap-5 p-5">
              <h3 className="text-sm font-medium">
                {apiTarget
                  ? "Activity over the workload window"
                  : "When this plan would have failed"}
              </h3>
              <p className="text-xs text-muted-foreground" data-testid="timeline-note">
                {apiTarget
                  ? "A Direct API target rejects nothing, so there are no failure windows to shade. The bars show the recorded activity the list prices were applied to."
                  : "Shaded bands are the windows where the target's own rules would have pushed back on this workload."}
              </p>
              <ReplayTimeline
                behaviours={constraintBehaviours}
                points={timeline}
                timeZone={browserTimeZone()}
                violations={result.violations}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-medium">Calculation details</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <Detail label="Engine" value={projection.provenance.engineVersion} />
                <Detail label="Methodology" value={projection.provenance.methodologyVersion} />
                <Detail label="Catalog" value={projection.provenance.catalogVersion.slice(0, 22)} />
                <Detail label="Rules as of" value={projection.provenance.rulesAsOf} />
                <Detail
                  label={apiTarget ? "Direct API provider" : "Plan version"}
                  value={projection.target.reference}
                />
                <Detail label="Calls replayed" value={formatCount(result.workload.eventCount)} />
              </dl>
              {result.warnings.length > 0 ? (
                <div data-testid="replay-warnings">
                  <h3 className="text-xs font-medium text-muted-foreground">Warnings</h3>
                  <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                    {result.warnings.map((warning) => (
                      <li key={warning.code}>
                        {humanizeWarningMessage(warning.message)}
                        {warning.eventCount === undefined
                          ? ""
                          : ` (${formatCount(warning.eventCount)} calls)`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.unsupportedModels.length > 0 ? (
                <div data-testid="unserved-models">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Models this target does not serve
                  </h3>
                  <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                    {result.unsupportedModels.slice(0, 8).map((model) => (
                      <li key={model.rawName} className="[overflow-wrap:anywhere]">
                        {model.rawName} · {formatCount(model.eventCount)} calls ·{" "}
                        {creditOnly(model) ? "usage credits only" : model.reason}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Consumption for these identifiers is left unknown rather than estimated. A name
                    StackReplay cannot map to the catalog is never guessed at.
                  </p>
                </div>
              ) : null}
              {workload === undefined ? null : (
                <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  Workload stored locally in this browser: {workload.label}. No workload data has
                  left this browser.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">What this result is not</h3>
              <p
                className="max-w-prose text-[11px] leading-relaxed text-muted-foreground"
                data-testid="replay-scope"
              >
                {projection.provenance.workloadScope}
              </p>
              <p
                className="max-w-prose text-[11px] leading-relaxed text-muted-foreground"
                data-testid="replay-reset-phase"
              >
                {projection.provenance.resetPhase}
              </p>
            </div>
          </div>
          {workload?.summary.models.length ? (
            <details
              className="border-t border-border pt-4"
              data-testid="replay-model-distribution"
            >
              <summary className="min-h-11 cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
                Observed models · {workload.summary.models.length} identities
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Local identifiers and counts are kept with this workload. Unresolved names are never
                matched by similarity. A model with no rejection here may still encounter a capacity
                constraint.
              </p>
              <div className="mt-4 grid gap-2">
                {[...workload.summary.models]
                  .sort((a, b) => b.events - a.events)
                  .map((model) => {
                    const unsupported = result.unsupportedModels.find(
                      (entry) => entry.rawName === model.rawName,
                    );
                    const reason = unsupported?.reason;
                    const availability =
                      unsupported !== undefined && creditOnly(unsupported)
                        ? "Usage credits only"
                        : reason === "unresolved" || reason === "offering_unestablished"
                          ? "Unknown"
                          : reason === "not_supported" ||
                              reason === "not_offered" ||
                              reason === "excluded"
                            ? "Unavailable"
                            : "No model rejection recorded";
                    const method =
                      model.basis === "canonical_id"
                        ? "Exact catalog ID"
                        : model.basis === "canonical_name"
                          ? "Catalog name"
                          : model.basis === "alias"
                            ? "Documented alias"
                            : "Unresolved";
                    return (
                      <div
                        key={model.rawName}
                        className="grid gap-1 border-b border-border py-2 text-xs sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-4"
                      >
                        <div className="min-w-0 [overflow-wrap:anywhere]">
                          <span className="font-mono text-foreground">{model.rawName}</span>
                          <span className="ml-2 tabular-nums text-muted-foreground">
                            {formatCount(model.events)} calls
                          </span>
                        </div>
                        <div className="min-w-0 [overflow-wrap:anywhere] text-muted-foreground">
                          {model.canonicalId ?? "No canonical identity"} · {method}
                        </div>
                        <div className="text-muted-foreground">
                          {availability}
                          {reason === undefined ? "" : ` · ${reason.replaceAll("_", " ")}`}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </details>
          ) : null}
        </div>
      </details>

      {/* The panel is always present: a result that cannot become a link says
          why (a Direct API target has no plan facts a V1 link could carry). */}
      {/* Every kind of replay can become a link (share V2): it carries the
          verdict's facts, so the public page states the same thing, scope and
          substitution included. */}
      <SharePanelV2
        build={shareBuild}
        kind="replay"
        refusal={
          composed === undefined
            ? "this result carries no replay semantics a link could state."
            : undefined
        }
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}
