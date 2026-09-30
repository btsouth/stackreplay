"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Check, ChevronDown, ChevronRight, LockKeyhole, Plus, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { partialScanOf } from "@/components/workload/evidence";
import { readCurrentStack, subscribeCurrentStack, writeCurrentStack } from "@/lib/current-stack";
import { buildMyStack, restoreRemovedTarget } from "@/lib/my-stack";
import type { TargetKey } from "@/lib/routes";
import {
  analyzeScenario,
  analyzeStack,
  familyOfPlan,
  rangeText,
  shareText,
  stackParam,
} from "@/lib/stack-analysis";
import {
  DISCOVERY_FAMILIES,
  type DiscoveryAnswer,
  type DiscoveryGroup,
  type DiscoveryGroupId,
  initialDiscoveryAnswer,
  type NonPlanResponse,
} from "@/lib/stack-discovery";
import {
  confirmDiscovery,
  type DiscoveryPreferences,
  dismissDiscovery,
  readDiscoveryPreferences,
  writeDiscoveryPreferences,
} from "@/lib/stack-discovery-storage";
import { useReview } from "@/lib/use-review";
import { useStackWorkload } from "@/lib/use-stack-workload";
import { getWorkerClient } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import { FamilyPlanChoices, NON_PLAN_CHOICES } from "./family-plan-choices";
import { StackOpportunities } from "./stack-opportunities";
import { StackPeriodLine, StackPeriodPanel } from "./stack-period";
import { ScenarioEditor, ScenarioOutcome } from "./stack-scenario";
import { StackSummary, WorkloadMissing } from "./stack-summary";
import { ApiTargetRow, SubscriptionReportRow } from "./subscription-report";

type Undo =
  | { kind: "removal"; key: TargetKey; index: number; name: string }
  | { kind: "replace"; previous: TargetKey[] };

const sameKeys = (a: readonly TargetKey[], b: readonly TargetKey[]) =>
  a.length === b.length && a.every((key, index) => key === b[index]);

/**
 * My Stack: am I buying the right AI subscriptions for the work I actually
 * ran? The selected workload, scoped to its billing period, is read against
 * the subscriptions the person confirmed. Configuration stays available but
 * secondary; every section leads toward keeping, changing or removing
 * something, with its evidence.
 */
export function MyStackSurface({ initialImportId }: { initialImportId?: string | undefined }) {
  const [stack, setStack] = useState<TargetKey[]>();
  const [importRead, setImportRead] = useState<{
    attempt: number;
    records?: ImportRecord[];
    failed: boolean;
  }>();
  const [importAttempt, setImportAttempt] = useState(0);
  /** Undefined until chosen: the most recent saved workload is used by default. */
  const [selectedImport, setSelectedImport] = useState<string | undefined>(initialImportId);
  const [editing, setEditing] = useState<DiscoveryGroupId>();
  const [answer, setAnswer] = useState<DiscoveryAnswer>();
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [undo, setUndo] = useState<Undo>();
  const [saveFailed, setSaveFailed] = useState(false);
  const [preferences, setPreferences] = useState<DiscoveryPreferences>({ version: 1, groups: {} });
  const [setupOpen, setSetupOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [proposed, setProposed] = useState<TargetKey[]>();
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const editorTrigger = useRef<HTMLButtonElement | null>(null);
  const familyButtons = useRef(new Map<DiscoveryGroupId, HTMLButtonElement>());
  const setupHeading = useRef<HTMLHeadingElement>(null);
  const scenarioHeading = useRef<HTMLHeadingElement>(null);

  const currentRead = importRead?.attempt === importAttempt ? importRead : undefined;
  const imports = currentRead?.records;
  const importError = currentRead?.failed ?? false;

  useEffect(() => {
    setSelectedImport(initialImportId);
    setEditing(undefined);
  }, [initialImportId]);
  useEffect(() => {
    const refresh = () => {
      setStack(readCurrentStack());
      setPreferences(readDiscoveryPreferences());
    };
    refresh();
    return subscribeCurrentStack(refresh);
  }, []);
  useEffect(() => {
    let cancelled = false;
    setImportRead(undefined);
    getWorkerClient()
      .listImports()
      .then((records) => {
        if (!cancelled) setImportRead({ attempt: importAttempt, records, failed: false });
      })
      .catch(() => {
        if (!cancelled) setImportRead({ attempt: importAttempt, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [importAttempt]);

  const savedImports = (imports ?? []).filter(
    (item) => !isSyntheticWorkload(item) && item.savedLocally !== false,
  );
  const chosenImport = selectedImport ?? savedImports[0]?.id ?? "";
  const requested = imports?.find((record) => record.id === chosenImport);
  const demo = requested !== undefined && isSyntheticWorkload(requested);
  const record = requested && !demo && requested.savedLocally !== false ? requested : undefined;

  const local = useReview(record);
  const partialScan = record
    ? (() => {
        const scan = partialScanOf(record);
        return scan.unreadable + scan.other > 0;
      })()
    : false;
  const stackWork = useStackWorkload({
    record,
    choice: local.choice,
    billing: local.billing,
    ready: local.ready && record !== undefined,
    partialScan,
  });
  const workload = stackWork.workload;

  const familyResponses = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(preferences.groups).flatMap(([group, value]) =>
          value?.response ? [[group, value.response]] : [],
        ),
      ) as Partial<Record<DiscoveryGroupId, NonPlanResponse>>,
    [preferences],
  );
  const analysis = useMemo(
    () =>
      analyzeStack({
        currentStack: stack ?? [],
        rulesAsOf: DECISION_MARKET.rulesAt,
        workload,
        familyResponses,
      }),
    [stack, workload, familyResponses],
  );
  const model = useMemo(
    () =>
      buildMyStack({
        currentStack: stack ?? [],
        rulesAsOf: DECISION_MARKET.rulesAt,
        workload:
          record && workload
            ? {
                recordedCalls: workload.overall.calls,
                sources: Object.entries(workload.sources).map(([id, facts]) => ({
                  id,
                  events: facts.calls,
                  models: facts.models.map((m) => ({ modelId: m.id, events: m.calls })),
                  unresolvedEvents: facts.unresolvedCalls,
                })),
                sourceNames: record.summary.usageSources,
              }
            : undefined,
      }),
    [stack, record, workload],
  );
  const currentStack = stack ?? [];
  const currentPlans = currentStack.filter((key) => key.startsWith("plan:"));
  const proposal = proposed ?? currentStack;
  const scenario = useMemo(
    () => analyzeScenario({ current: currentStack, proposed: proposal, workload }),
    [currentStack, proposal, workload],
  );
  const plans = useMemo(
    () =>
      model.families
        .flatMap((group) =>
          group.candidates.map((candidate) => ({
            id: candidate.planId,
            name: candidate.planName,
            price: candidate.publishedPrice,
          })),
        )
        .concat(
          model.targets.flatMap((target) =>
            target.publishedPrice
              ? [{ id: target.id, name: target.name, price: target.publishedPrice }]
              : [],
          ),
        ),
    [model],
  );
  const activeGroup = model.families.find((group) => group.groupId === editing);
  const canEdit =
    stack !== undefined &&
    (imports !== undefined || (importError && !selectedImport)) &&
    !demo &&
    (!chosenImport || record !== undefined);

  // A proposal nobody has edited follows the saved stack.
  const lastStack = useRef<TargetKey[]>([]);
  useEffect(() => {
    if (!stack) return;
    setProposed((value) => (value && !sameKeys(value, lastStack.current) ? value : undefined));
    lastStack.current = stack;
  }, [stack]);

  // Native modal behavior supplies focus containment, Escape and background inertness.
  useEffect(() => {
    if (!editing || !dialog.current) return;
    const node = dialog.current;
    const previousOverflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    editorHeading.current?.focus({ preventScroll: true });
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [editing]);

  const closeEditor = () => {
    const family = editing;
    const trigger = editorTrigger.current;
    dialog.current?.close();
    setEditing(undefined);
    setSaveFailed(false);
    requestAnimationFrame(() => {
      (trigger?.isConnected
        ? trigger
        : family
          ? familyButtons.current.get(family)
          : undefined
      )?.focus({ preventScroll: true });
    });
  };
  const openEditor = (group: DiscoveryGroup, trigger: HTMLButtonElement) => {
    editorTrigger.current = trigger;
    setAnswer(initialDiscoveryAnswer(group, preferences.groups[group.groupId]?.response));
    setSaveFailed(false);
    setEditing(group.groupId);
  };
  const openSetup = () => {
    setSetupOpen(true);
    requestAnimationFrame(() => {
      setupHeading.current?.scrollIntoView({ block: "start" });
      setupHeading.current?.focus({ preventScroll: true });
    });
  };
  const save = () => {
    if (!activeGroup || !answer || !canEdit) return;
    const result = confirmDiscovery(
      record,
      [activeGroup],
      { [activeGroup.groupId]: answer },
      Date.now(),
    );
    setStack(readCurrentStack());
    setPreferences(readDiscoveryPreferences());
    if (!result.stackSaved || !result.preferencesSaved) {
      setSaveFailed(true);
      return;
    }
    // The first plan turns setup into a collapsible section; keep it open where the person is.
    if (empty) setSetupOpen(true);
    setNotice("Stack choices saved in this browser.");
    setNoticeError(false);
    setUndo(undefined);
    closeEditor();
  };
  const remove = (key: TargetKey, name: string) => {
    if (!canEdit) return;
    const current = readCurrentStack();
    const index = current.indexOf(key);
    if (index < 0) return;
    if (!writeCurrentStack(current.filter((target) => target !== key))) {
      setNotice("Could not remove this selection. Browser storage is unavailable.");
      setNoticeError(true);
      return;
    }
    const family = model.families.filter((group) => group.currentTargets.includes(key));
    const saved = writeDiscoveryPreferences(
      dismissDiscovery(family, readDiscoveryPreferences(), Date.now()),
    );
    setPreferences(readDiscoveryPreferences());
    setUndo({ kind: "removal", key, index, name });
    setNotice(
      saved
        ? `${name} removed from Current Stack.`
        : `${name} removed. Prompt dismissal could not be saved beyond this visit.`,
    );
    setNoticeError(false);
  };
  const undoChange = () => {
    if (!undo || !canEdit) return;
    // Restore only this exact target, respecting selections changed in other tabs.
    const next =
      undo.kind === "removal"
        ? restoreRemovedTarget(readCurrentStack(), undo.key, undo.index)
        : undo.previous;
    if (!writeCurrentStack(next)) {
      setNotice(
        undo.kind === "removal"
          ? "Could not restore this selection. Browser storage is unavailable."
          : "Could not restore your previous stack. Browser storage is unavailable.",
      );
      setNoticeError(true);
      return;
    }
    setNotice(
      undo.kind === "removal"
        ? `${undo.name} restored to Current Stack.`
        : "Your previous stack is restored.",
    );
    setNoticeError(false);
    setUndo(undefined);
  };
  const testChange = (next: TargetKey[], _trigger?: HTMLButtonElement) => {
    setProposed(next);
    requestAnimationFrame(() => {
      scenarioHeading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      scenarioHeading.current?.focus({ preventScroll: true });
    });
  };
  const inspect = (anchor: string) => {
    const node = document.getElementById(anchor);
    const details = node?.querySelector("details");
    if (details) details.open = true;
    node?.scrollIntoView({ block: "start", behavior: "smooth" });
    node?.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
  };
  const applyProposal = () => {
    if (!canEdit || !proposed) return;
    const previous = readCurrentStack();
    const next = [
      ...proposed.filter((key) => key.startsWith("plan:")),
      ...previous.filter((key) => key.startsWith("api:")),
    ];
    if (!writeCurrentStack(next)) {
      setNotice("Could not update your stack. Browser storage is unavailable.");
      setNoticeError(true);
      return;
    }
    const emptied = model.families.filter(
      (group) =>
        group.currentTargets.length > 0 &&
        !next.some((key) => familyOfPlan(key.slice(5))?.groupId === group.groupId),
    );
    if (emptied.length)
      writeDiscoveryPreferences(dismissDiscovery(emptied, readDiscoveryPreferences(), Date.now()));
    setPreferences(readDiscoveryPreferences());
    setUndo({ kind: "replace", previous });
    setNotice("My Stack now matches the proposed stack.");
    setNoticeError(false);
    setProposed(undefined);
  };
  const selectionLabel =
    typeof answer === "object"
      ? `${answer.planTargets.length} plans selected`
      : answer === "keep-current"
        ? "Keeping your current selections"
        : (activeGroup?.candidates.find((candidate) => `plan:${candidate.planId}` === answer)
            ?.planName ??
          NON_PLAN_CHOICES.find((choice) => choice.value === answer)?.label ??
          "Choose a plan or another answer");
  const empty = stack !== undefined && model.targets.length === 0;
  const loading = record !== undefined && !workload && !stackWork.failed;
  const plansWithReports = analysis.subscriptions;
  const apiTargets = model.targets.filter((target) => target.kind === "api");

  const setupBody = (
    <div className="stack-setup-body">
      <p className="stack-section-description">
        Your answers are shared with Workload, Replay and Compare. They describe what you pay for
        today; they do not assign past calls to a plan.
      </p>
      <div className="stack-families">
        {model.families.map((group) => {
          const name =
            DISCOVERY_FAMILIES.find((family) => family.groupId === group.groupId)?.name ??
            group.groupId;
          const response = preferences.groups[group.groupId]?.response;
          const selected = group.currentTargets.map(
            (key) => model.targets.find((target) => target.key === key)?.name ?? key,
          );
          return (
            <button
              key={group.groupId}
              type="button"
              ref={(node) => {
                if (node) familyButtons.current.set(group.groupId, node);
                else familyButtons.current.delete(group.groupId);
              }}
              disabled={!canEdit}
              aria-haspopup="dialog"
              aria-expanded={editing === group.groupId}
              aria-controls={editing === group.groupId ? "stack-family-editor" : undefined}
              onClick={(event) => openEditor(group, event.currentTarget)}
              className="stack-family"
              data-testid={`edit-family-${group.groupId}`}
            >
              <span className="stack-family-heading">
                <span>{name}</span>
                <ChevronRight aria-hidden="true" className="size-4" />
              </span>
              <span className="stack-family-selection">
                {selected.length > 0 ? (
                  <>
                    <Check aria-hidden="true" className="size-3.5 shrink-0 text-positive" />
                    <span>
                      {selected.slice(0, 2).join(" · ")}
                      {selected.length > 2 ? ` +${selected.length - 2}` : ""}
                    </span>
                  </>
                ) : response ? (
                  NON_PLAN_CHOICES.find((choice) => choice.value === response)?.label
                ) : (
                  <>
                    <Plus aria-hidden="true" className="size-3.5" /> Choose plans
                  </>
                )}
              </span>
              <span className="stack-caption">
                {group.recordedCalls > 0
                  ? `${group.recordedCalls.toLocaleString("en-US")} ${group.recordedCalls === 1 ? "call" : "calls"} · ${shareText(group.shareOfWorkload)} of recorded calls`
                  : `${group.candidates.length} personal plan choices`}
              </span>
            </button>
          );
        })}
      </div>
      <Link href="/app/settings#manual-plans" className="stack-link">
        Can't find your plan? Choose manually →
      </Link>
    </div>
  );

  const workloadState =
    importError || imports === undefined ? (
      <p className="stack-caption" role="status">
        {importError ? "Saved workloads could not be read." : "Reading saved workloads…"}
      </p>
    ) : demo ? (
      <p className="stack-caption">Demo workloads are excluded from My Stack.</p>
    ) : chosenImport && !requested ? (
      <p className="stack-caption">This workload is unavailable in this browser.</p>
    ) : requested?.savedLocally === false ? (
      <p className="stack-caption">This workload was not saved in this browser.</p>
    ) : stackWork.failed ? (
      <div role="status">
        <p className="stack-caption">
          {stackWork.failed.interrupted
            ? "Another calculation interrupted this analysis."
            : "This workload's recorded value could not be calculated."}
        </p>
        <button type="button" onClick={stackWork.retry} className="stack-link">
          <RotateCcw aria-hidden="true" className="size-4" /> Retry analysis
        </button>
      </div>
    ) : loading ? (
      <p className="stack-caption" role="status" data-testid="stack-analyzing">
        Pricing recorded work in this browser
        {stackWork.progress && stackWork.progress.total > 1
          ? ` · ${stackWork.progress.done} of ${stackWork.progress.total} scopes`
          : ""}
        …
      </p>
    ) : (
      <WorkloadMissing hasSaved={savedImports.length > 0} />
    );

  return (
    <div className="my-stack" data-testid="my-stack">
      <header className="stack-page-header">
        <div>
          <p className="stack-eyebrow">Your workspace</p>
          <h1>My Stack</h1>
          <p>Are you buying the right AI subscriptions for the work you actually ran?</p>
        </div>
        <div className="stack-header-actions">
          {savedImports.length > 0 || chosenImport || importError ? (
            <label className="stack-workload-select">
              <span>Workload</span>
              <select
                value={demo ? "" : (record?.id ?? "")}
                disabled={imports === undefined || demo}
                data-testid="stack-workload"
                onChange={(event) => {
                  setSelectedImport(event.target.value);
                  setProposed(undefined);
                  setPeriodOpen(false);
                  window.history.replaceState(
                    null,
                    "",
                    event.target.value
                      ? `/app/stack?import=${encodeURIComponent(event.target.value)}`
                      : "/app/stack",
                  );
                  closeEditor();
                }}
              >
                <option value="">No workload selected</option>
                {savedImports.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.summary.usageSources.map((source) => source.name).join(" + ") ||
                      item.label}{" "}
                    · {item.eventCount.toLocaleString("en-US")} calls · saved{" "}
                    {item.createdAt.slice(0, 10)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            className="stack-secondary"
            onClick={openSetup}
            data-testid="stack-edit"
          >
            Edit stack
          </button>
          <span className="stack-local">
            <LockKeyhole aria-hidden="true" className="size-3.5" /> Kept in this browser
          </span>
        </div>
      </header>

      {demo ? (
        <div role="status" className="stack-notice" data-testid="stack-demo-notice">
          <p>
            Demo workloads are excluded from My Stack. Your real selections are shown below; editing
            is disabled in this demo view.
          </p>
          <Link href="/app/stack" className="stack-link">
            Open your real stack →
          </Link>
        </div>
      ) : null}
      {notice ? (
        <div role={noticeError ? "alert" : "status"} className="stack-notice">
          <span className={noticeError ? "text-warning" : "text-foreground"}>{notice}</span>
          {undo ? (
            <button
              type="button"
              onClick={undoChange}
              disabled={!canEdit}
              className="stack-link"
              aria-label={undo.kind === "removal" ? "Undo removal" : "Undo stack update"}
            >
              <RotateCcw aria-hidden="true" className="size-4" /> Undo
            </button>
          ) : null}
        </div>
      ) : null}
      {importError ? (
        <div className="stack-notice" role="status">
          <p>Saved workloads could not be read. Your stack is still available.</p>
          <button
            type="button"
            onClick={() => setImportAttempt((value) => value + 1)}
            className="stack-link"
          >
            <RotateCcw aria-hidden="true" className="size-4" /> Retry workloads
          </button>
        </div>
      ) : chosenImport && imports !== undefined && !record && !demo ? (
        <div className="stack-notice" role="status">
          <p>
            {requested?.savedLocally === false
              ? "This workload was not saved. Save a workload in Import to analyze your stack against it."
              : "This workload is unavailable in this browser. Select another saved workload."}
          </p>
          <Link href="/app/stack" className="stack-link">
            Manage plans without this workload →
          </Link>
        </div>
      ) : null}

      {stack === undefined ? (
        <p role="status" className="stack-caption">
          Reading your Current Stack…
        </p>
      ) : (
        <StackSummary
          analysis={analysis}
          workload={workload}
          workloadState={workloadState}
          onSetup={openSetup}
          period={
            record ? (
              <>
                <StackPeriodLine
                  period={stackWork.period}
                  confirmation={workload?.confirmation}
                  open={periodOpen}
                  onToggle={() => setPeriodOpen((value) => !value)}
                />
                {periodOpen ? (
                  <StackPeriodPanel
                    record={record}
                    local={local}
                    review={stackWork.review}
                    accounts={stackWork.accounts}
                    scopeDigest={stackWork.scopeDigest}
                    partialScan={partialScan}
                    needsPeriod={stackWork.period.kind === "unbounded"}
                  />
                ) : null}
              </>
            ) : null
          }
        />
      )}

      {!empty && stack !== undefined ? (
        <section className="stack-section" aria-labelledby="stack-opportunities-heading">
          <div className="stack-section-header">
            <div>
              <p className="stack-eyebrow">01 / Opportunities</p>
              <h2 id="stack-opportunities-heading">What this workload says about your stack</h2>
            </div>
            {workload ? (
              <p className="stack-caption">
                {analysis.opportunities.length === 0
                  ? "Nothing to act on"
                  : `${analysis.opportunities.length} ${analysis.opportunities.length === 1 ? "finding" : "findings"}`}{" "}
                from {workload.overall.calls.toLocaleString("en-US")} recorded calls
              </p>
            ) : null}
          </div>
          {!record ? (
            <p className="stack-section-description">
              Select a workload to see which subscriptions its recorded work supports.
            </p>
          ) : loading ? (
            <p className="stack-section-description" role="status">
              Reading this workload against your stack…
            </p>
          ) : !workload ? null : analysis.opportunities.length > 0 ? (
            <StackOpportunities
              opportunities={analysis.opportunities}
              onTest={testChange}
              onInspect={inspect}
            />
          ) : (
            <p className="stack-section-description" data-testid="stack-no-opportunities">
              {workload.overall.calls === 0
                ? "No recorded calls fall in this period, so there is nothing to compare yet."
                : "Nothing in this period points to removing, downgrading or consolidating a subscription. Each report below shows what the workload does establish."}
            </p>
          )}
        </section>
      ) : null}

      {!empty && stack !== undefined ? (
        <section className="stack-section" aria-labelledby="stack-reports-heading">
          <div className="stack-section-header">
            <div>
              <p className="stack-eyebrow">02 / Your subscriptions</p>
              <h2 id="stack-reports-heading">How each subscription relates to this workload</h2>
            </div>
          </div>
          <div className="stack-reports" data-testid="selected-stack">
            <div className="stack-report-head" aria-hidden="true">
              <span>Subscription</span>
              <span>Price</span>
              <span>Recorded calls</span>
              <span>API-equivalent</span>
              <span>Leverage</span>
            </div>
            {plansWithReports.map((report) => {
              const target = model.targets.find((entry) => entry.key === report.key);
              if (!target) return null;
              const family = model.families.find((group) =>
                group.currentTargets.includes(report.key),
              );
              return (
                <SubscriptionReportRow
                  key={report.key}
                  report={report}
                  target={target}
                  period={workload?.period}
                  disabled={!canEdit}
                  currentStack={currentStack}
                  onRemove={() => remove(report.key, report.name)}
                  onEdit={family ? (trigger) => openEditor(family, trigger) : undefined}
                  onTest={record ? testChange : undefined}
                />
              );
            })}
            {apiTargets.map((target) => (
              <ApiTargetRow
                key={target.key}
                target={target}
                disabled={!canEdit}
                onRemove={() => remove(target.key, target.name)}
              />
            ))}
          </div>
          {analysis.outside.length > 0 ? (
            <div className="stack-outside" data-testid="stack-outside">
              <p className="stack-eyebrow">Recorded work outside your subscriptions</p>
              <ul>
                {analysis.outside.map((work) => (
                  <li key={work.sourceId}>
                    <span>{work.name}</span>
                    <span className="stack-mono">
                      {work.facts.calls.toLocaleString("en-US")} calls · {shareText(work.share)}
                    </span>
                    <span className="stack-mono">
                      {work.facts.value
                        ? rangeText(work.facts.value)
                        : work.facts.pricedValue
                          ? `${rangeText(work.facts.pricedValue)} priced`
                          : "Not priced"}
                    </span>
                    <span className="stack-caption">
                      {work.familyName
                        ? `No ${work.familyName} plan in your stack`
                        : "No subscription family StackReplay can associate"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {!empty && stack !== undefined && currentPlans.length > 0 ? (
        <section
          className="stack-section stack-scenario"
          aria-labelledby="stack-scenario-heading"
          data-testid="stack-scenario"
        >
          <div className="stack-section-header">
            <div>
              <p className="stack-eyebrow">03 / Test a change</p>
              <h2 id="stack-scenario-heading" ref={scenarioHeading} tabIndex={-1}>
                What happens to this workload if you change your subscriptions?
              </h2>
            </div>
          </div>
          <ScenarioEditor
            current={currentStack}
            proposed={proposal}
            onChange={(next) => setProposed(next)}
            idPrefix="scenario"
          />
          <ScenarioOutcome result={scenario} />
          {!scenario.unchanged ? (
            <div className="stack-scenario-actions">
              {record ? (
                <Link
                  className="stack-primary"
                  data-testid="scenario-replay"
                  href={`/app/replay?import=${encodeURIComponent(record.id)}&stack=${encodeURIComponent(stackParam(proposal))}`}
                >
                  Inspect in Replay →
                </Link>
              ) : null}
              <button
                type="button"
                className="stack-secondary"
                onClick={applyProposal}
                disabled={!canEdit}
                data-testid="scenario-apply"
              >
                Make this my stack
              </button>
              <button
                type="button"
                className="stack-quiet-action"
                onClick={() => setProposed(undefined)}
                data-testid="scenario-reset"
              >
                <RotateCcw aria-hidden="true" className="size-3.5" /> Reset
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section
        className="stack-section stack-setup"
        aria-labelledby="stack-families-heading"
        data-testid="stack-setup"
      >
        {/* One stable tree: the grid a person just used stays mounted. */}
        <div className="stack-section-header">
          <div>
            <p className="stack-eyebrow">{empty ? "Start here" : "04 / Stack setup"}</p>
            <h2 id="stack-families-heading" ref={setupHeading} tabIndex={-1}>
              {empty ? "Which subscriptions do you pay for?" : "Confirm or edit your plans"}
            </h2>
          </div>
          {empty ? null : (
            <button
              type="button"
              className="stack-link"
              aria-expanded={setupOpen}
              aria-controls="stack-setup-body"
              onClick={() => setSetupOpen((value) => !value)}
              data-testid="stack-setup-toggle"
            >
              {setupOpen ? "Hide plan choices" : "Show plan choices"}
              <ChevronDown aria-hidden="true" className="stack-disclosure-icon size-4" />
            </button>
          )}
        </div>
        <div id="stack-setup-body" hidden={!empty && !setupOpen}>
          {setupBody}
        </div>
      </section>

      {record && workload ? (
        <details className="stack-methodology" data-testid="stack-methodology">
          <summary>Methodology, assumptions &amp; evidence</summary>
          <div className="stack-methodology-body">
            <p>
              Recorded work is associated with a subscription through the recording tool (Claude
              Code with Claude plans, Codex with ChatGPT plans, Command Code and OpenCode with their
              own plans). That is where the work was recorded, not proof of which account paid for
              it. Calls are never split between two plans of the same family.
            </p>
            <p>
              API-equivalent values reuse Workload's accepted market calculation: exact recorded
              models at accepted API prices ({DECISION_MARKET.rulesAt.slice(0, 10)} snapshot), both
              Claude cache-write scenarios, no extrapolation. Unpriced calls stay unknown, never
              zero. Leverage divides that value by one monthly price and is not money saved.
            </p>
            <p>
              No selected subscription publishes a fixed token allowance, so StackReplay never
              claims a plan would or would not fit this work. Recorded limit events are shown only
              where the history contains them (Claude Code).
            </p>
            <table className="stack-model-table" data-testid="stack-scope-table">
              <caption>Recording tools in this period</caption>
              <thead>
                <tr>
                  <th scope="col">Tool</th>
                  <th scope="col">Calls</th>
                  <th scope="col">Priced</th>
                  <th scope="col">Unresolved</th>
                  <th scope="col">API-equivalent</th>
                </tr>
              </thead>
              <tbody>
                {workload.importSources.map((source) => {
                  const facts = workload.sources[source.id];
                  return (
                    <tr key={source.id}>
                      <th scope="row">{source.name}</th>
                      <td>{facts?.calls.toLocaleString("en-US") ?? "0"}</td>
                      <td>{facts?.priced.toLocaleString("en-US") ?? "0"}</td>
                      <td>{facts?.unresolvedCalls.toLocaleString("en-US") ?? "0"}</td>
                      <td>
                        {facts?.value
                          ? rangeText(facts.value)
                          : facts?.pricedValue
                            ? `${rangeText(facts.pricedValue)} (priced calls)`
                            : "Not priced"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Link
              href={`/app/workload?import=${encodeURIComponent(record.id)}`}
              className="stack-link"
            >
              Inspect pricing receipts in Workload →
            </Link>
          </div>
        </details>
      ) : null}

      {activeGroup && !demo ? (
        <dialog
          ref={dialog}
          id="stack-family-editor"
          className="stack-editor"
          aria-labelledby="stack-editor-heading"
          aria-describedby="stack-editor-description"
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const controls = [
              ...event.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
              ),
            ].filter((node) => node.getClientRects().length > 0);
            const first = controls[0];
            const last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onCancel={(event) => {
            event.preventDefault();
            closeEditor();
          }}
        >
          <div className="stack-editor-header">
            <button
              type="button"
              className="stack-close"
              aria-label="Close plan editor"
              onClick={closeEditor}
            >
              <X aria-hidden="true" className="size-5" />
            </button>
            <div>
              <p className="stack-eyebrow">Current plan confirmation</p>
              <h3 ref={editorHeading} id="stack-editor-heading" tabIndex={-1}>
                {activeGroup.question}
              </h3>
            </div>
          </div>
          <div className="stack-editor-body">
            <p id="stack-editor-description" className="stack-caption">
              Choose what you currently pay for. History can narrow this question; your answer does
              not assign past calls to a plan.
            </p>
            {activeGroup.recordedCalls > 0 ? (
              <p className="stack-editor-evidence">
                {activeGroup.sourceNames.join(" + ")} activity ·{" "}
                {activeGroup.recordedCalls.toLocaleString("en-US")}{" "}
                {activeGroup.recordedCalls === 1 ? "call" : "calls"} ·{" "}
                {shareText(activeGroup.shareOfWorkload)} of recorded calls in the selected period.
              </p>
            ) : null}
            {activeGroup.groupId === "opencode" ? (
              <p className="stack-caption">
                OpenCode can also use ChatGPT sign-in, API keys, other bundles or local models.
                OpenCode activity does not establish an OpenCode subscription.
              </p>
            ) : null}
            <fieldset aria-label="Your current plan">
              <FamilyPlanChoices
                group={activeGroup}
                plans={plans}
                answer={answer}
                onChange={setAnswer}
                prefix="stack-editor"
              />
            </fieldset>
            {saveFailed ? (
              <p role="alert" className="stack-save-error">
                Could not save all choices in this browser. Your choices remain here; retry or
                cancel.
              </p>
            ) : null}
          </div>
          <div className="stack-editor-footer">
            <p aria-live="polite">{selectionLabel}</p>
            <div>
              <button type="button" onClick={closeEditor} className="stack-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={
                  !canEdit ||
                  !answer ||
                  (typeof answer === "object" && answer.planTargets.length === 0)
                }
                className="stack-primary"
              >
                Save stack <Check aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
