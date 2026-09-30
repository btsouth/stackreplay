"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Layers3,
  LockKeyhole,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { readCurrentStack, subscribeCurrentStack, writeCurrentStack } from "@/lib/current-stack";
import { buildMyStack, publishedPriceText, restoreRemovedTarget } from "@/lib/my-stack";
import type { TargetKey } from "@/lib/routes";
import {
  DISCOVERY_FAMILIES,
  type DiscoveryAnswer,
  type DiscoveryGroup,
  type DiscoveryGroupId,
  initialDiscoveryAnswer,
} from "@/lib/stack-discovery";
import {
  confirmDiscovery,
  type DiscoveryPreferences,
  dismissDiscovery,
  readDiscoveryPreferences,
  writeDiscoveryPreferences,
} from "@/lib/stack-discovery-storage";
import { useWorkloadProfileResult } from "@/lib/use-workload-profile";
import { getWorkerClient } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import { FamilyPlanChoices, NON_PLAN_CHOICES } from "./family-plan-choices";
import { SelectedPlanCard } from "./selected-plan-card";

export function MyStackSurface({ initialImportId }: { initialImportId?: string | undefined }) {
  const [stack, setStack] = useState<TargetKey[]>();
  const [importRead, setImportRead] = useState<{
    attempt: number;
    records?: ImportRecord[];
    failed: boolean;
  }>();
  const [importAttempt, setImportAttempt] = useState(0);
  const [selectedImport, setSelectedImport] = useState(initialImportId ?? "");
  const [editing, setEditing] = useState<DiscoveryGroupId>();
  const [answer, setAnswer] = useState<DiscoveryAnswer>();
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [undo, setUndo] = useState<{ key: TargetKey; index: number; name: string }>();
  const [saveFailed, setSaveFailed] = useState(false);
  const [preferences, setPreferences] = useState<DiscoveryPreferences>({ version: 1, groups: {} });
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const editorTrigger = useRef<HTMLButtonElement | null>(null);
  const familyButtons = useRef(new Map<DiscoveryGroupId, HTMLButtonElement>());

  const currentRead = importRead?.attempt === importAttempt ? importRead : undefined;
  const imports = currentRead?.records;
  const importError = currentRead?.failed ?? false;

  useEffect(() => {
    setSelectedImport(initialImportId ?? "");
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

  const requested = imports?.find((record) => record.id === selectedImport);
  const demo = requested !== undefined && isSyntheticWorkload(requested);
  const record = requested && !demo && requested.savedLocally !== false ? requested : undefined;
  const {
    profile,
    failed: profileFailed,
    retry: retryProfile,
  } = useWorkloadProfileResult(record?.id);
  const model = useMemo(
    () =>
      buildMyStack({
        currentStack: stack ?? [],
        rulesAsOf: DECISION_MARKET.rulesAt,
        workload:
          record && profile
            ? {
                recordedCalls: profile.overview.events,
                sources: profile.sources,
                sourceNames: record.summary.usageSources,
              }
            : undefined,
      }),
    [stack, record, profile],
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
              ? [
                  {
                    id: target.id,
                    name: target.name,
                    price: target.publishedPrice,
                  },
                ]
              : [],
          ),
        ),
    [model],
  );
  const activeGroup = model.families.find((group) => group.groupId === editing);
  const savedImports = (imports ?? []).filter(
    (item) => !isSyntheticWorkload(item) && item.savedLocally !== false,
  );
  const canEdit =
    stack !== undefined &&
    (imports !== undefined || (importError && !selectedImport)) &&
    !demo &&
    (!selectedImport || record !== undefined);
  const selectedPlans = model.targets.filter((target) => target.kind === "plan").length;

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
    setUndo({ key, index, name });
    setNotice(
      saved
        ? `${name} removed from Current Stack.`
        : `${name} removed. Prompt dismissal could not be saved beyond this visit.`,
    );
    setNoticeError(false);
  };
  const undoRemoval = () => {
    if (!undo || !canEdit) return;
    // Restore only this exact target, respecting selections changed in other tabs.
    if (!writeCurrentStack(restoreRemovedTarget(readCurrentStack(), undo.key, undo.index))) {
      setNotice("Could not restore this selection. Browser storage is unavailable.");
      setNoticeError(true);
      return;
    }
    setNotice(`${undo.name} restored to Current Stack.`);
    setNoticeError(false);
    setUndo(undefined);
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

  return (
    <div className="my-stack" data-testid="my-stack">
      <header className="stack-page-header">
        <div>
          <p className="stack-eyebrow">Your workspace</p>
          <h1>My Stack</h1>
          <p>Your plans and published prices, alongside the work you record.</p>
        </div>
        <div className="stack-header-actions">
          <span className="stack-local">
            <LockKeyhole aria-hidden="true" className="size-3.5" /> Kept in this browser
          </span>
          <Link href="/app/import" className="stack-link">
            Scan history <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
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
              onClick={undoRemoval}
              disabled={!canEdit}
              className="stack-link"
              aria-label="Undo removal"
            >
              <RotateCcw aria-hidden="true" className="size-4" /> Undo
            </button>
          ) : null}
        </div>
      ) : null}

      <section aria-labelledby="selected-stack-heading" className="stack-selected-section">
        <div className="stack-overview" data-testid="stack-overview">
          <div className="stack-overview-main">
            <p className="stack-eyebrow">
              <Layers3 aria-hidden="true" className="size-4" /> Current Stack
            </p>
            <h2 id="selected-stack-heading">
              {model.targets.length > 0 ? "Your selected stack" : "Build your current stack"}
            </h2>
            {stack === undefined ? (
              <p role="status">Reading your Current Stack…</p>
            ) : model.targets.length === 0 ? (
              <>
                <p>
                  No plans selected yet. Choose what you currently pay for, or scan your history to
                  narrow the choices.
                </p>
                <a href="#stack-families-heading" className="stack-primary">
                  Choose your plans <ArrowRight aria-hidden="true" className="size-4" />
                </a>
              </>
            ) : (
              <div className="stack-counts">
                <p>
                  <strong>{selectedPlans}</strong>
                  <span>{selectedPlans === 1 ? "selected plan" : "selected plans"}</span>
                </p>
                <p>
                  <strong>{model.apiTargets}</strong>
                  <span>{model.apiTargets === 1 ? "API target" : "API targets"}</span>
                </p>
              </div>
            )}
          </div>
          <div className="stack-published-prices" data-testid="stack-published-total">
            <p className="stack-eyebrow">Published price subtotals</p>
            {stack === undefined ? (
              <p className="stack-caption">Reading selected plans…</p>
            ) : model.totals.length > 0 ? (
              model.totals.map((total) => (
                <p className="stack-total" key={`${total.currency}-${total.interval}`}>
                  {publishedPriceText(total)}
                </p>
              ))
            ) : (
              <p className="stack-no-price">
                {model.unpricedPlans > 0
                  ? "Published plan price unavailable"
                  : model.targets.length > 0
                    ? "No fixed plan price"
                    : "Add a plan to see its price"}
              </p>
            )}
            <p className="stack-caption">Published prices are not your actual bill.</p>
            <details className="stack-price-note">
              <summary>What is included?</summary>
              <p>
                One published price per selected plan, grouped by currency and billing interval.
                Account and seat quantities, taxes, discounts and actual payments are not included.
                {model.unpricedPlans > 0
                  ? ` ${model.unpricedPlans} selected plans have no current published price.`
                  : ""}
                {model.apiTargets > 0
                  ? ` ${model.apiTargets} API targets are excluded from these subtotals.`
                  : ""}
              </p>
            </details>
            <p className="stack-facts-date">
              Accepted facts · {DECISION_MARKET.rulesAt.slice(0, 10)}
            </p>
          </div>
        </div>
        {model.targets.length > 0 ? (
          <div className="stack-targets" data-testid="selected-stack">
            {model.targets.map((target) => {
              const family = model.families.find((group) =>
                group.currentTargets.includes(target.key),
              );
              return (
                <SelectedPlanCard
                  key={target.key}
                  target={target}
                  disabled={!canEdit}
                  onRemove={() => remove(target.key, target.name)}
                  onEdit={family ? (trigger) => openEditor(family, trigger) : undefined}
                />
              );
            })}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="stack-families-heading" className="stack-section">
        <div className="stack-section-header">
          <div>
            <p className="stack-eyebrow">Make it yours</p>
            <h2 id="stack-families-heading" tabIndex={-1}>
              Confirm or edit your plans
            </h2>
          </div>
          <Link href="/app/settings#manual-plans" className="stack-link">
            Can't find your plan? Choose manually →
          </Link>
        </div>
        <p className="stack-section-description">
          Which plans do you currently pay for? Your answers are shared with Workload, Replay and
          Compare; they do not assign past calls to a plan.
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
                  <span className="stack-family-mark" aria-hidden="true">
                    {name === "ChatGPT"
                      ? "GPT"
                      : name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                  </span>
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
                    ? `${group.recordedCalls.toLocaleString("en-US")} ${group.recordedCalls === 1 ? "call" : "calls"} · ${(group.shareOfWorkload * 100).toFixed(0)}% of recorded calls`
                    : `${group.candidates.length} personal plan choices`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

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
                {(activeGroup.shareOfWorkload * 100).toFixed(0)}% of recorded calls in the selected
                workload.
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

      <section
        aria-labelledby="stack-activity-heading"
        className="stack-section stack-activity-section"
      >
        <div className="stack-section-header">
          <div>
            <p className="stack-eyebrow">From your history</p>
            <h2 id="stack-activity-heading">
              <Activity aria-hidden="true" className="size-5" /> Recorded tool activity
            </h2>
          </div>
        </div>
        <p className="stack-section-description">
          Activity from one saved workload, separate from your selected plans. Call share describes
          recorded activity, not spend or subscription usage.
        </p>
        {savedImports.length > 0 || selectedImport || importError ? (
          <label className="stack-workload-select">
            Workload to review
            <select
              value={demo ? "" : (record?.id ?? "")}
              disabled={imports === undefined || demo}
              data-testid="stack-workload"
              onChange={(event) => {
                setSelectedImport(event.target.value);
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
                  {item.label} · {item.eventCount.toLocaleString("en-US")} calls · saved{" "}
                  {item.createdAt.slice(0, 10)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {importError ? (
          <div className="stack-empty-state" role="status">
            <p>Saved workloads could not be read. Your stack is still available.</p>
            <button
              type="button"
              onClick={() => setImportAttempt((value) => value + 1)}
              className="stack-link"
            >
              <RotateCcw aria-hidden="true" className="size-4" /> Retry workloads
            </button>
          </div>
        ) : imports === undefined ? (
          <p role="status" className="stack-caption">
            Reading saved workloads…
          </p>
        ) : selectedImport && !requested ? (
          <p className="stack-caption">
            This workload is unavailable in this browser. Select another saved workload.
          </p>
        ) : requested?.savedLocally === false ? (
          <p className="stack-caption">
            This workload was not saved. Save a workload in Import to review its activity here.
          </p>
        ) : record && profileFailed ? (
          <div className="stack-empty-state" role="status">
            <p>
              This workload's activity could not be prepared. Your selected plans are still
              available.
            </p>
            <button type="button" onClick={retryProfile} className="stack-link">
              <RotateCcw aria-hidden="true" className="size-4" /> Retry activity
            </button>
          </div>
        ) : record && !profile ? (
          <p role="status" className="stack-caption">
            Preparing the selected workload's activity…
          </p>
        ) : !record && !demo ? (
          <div className="stack-empty-state">
            <Layers3 aria-hidden="true" className="size-6 text-muted-foreground" />
            <div>
              <h3>
                {savedImports.length > 0
                  ? "Choose a workload to see its activity"
                  : "See the work behind your stack"}
              </h3>
              <p>
                {savedImports.length > 0
                  ? "Review one saved workload at a time. Your selected plans stay independent."
                  : "Scan your history to add recorded calls and model activity here. You can manage your plans without a scan."}
              </p>
            </div>
            {savedImports.length === 0 ? (
              <Link href="/app/import" className="stack-link">
                Scan history →
              </Link>
            ) : null}
          </div>
        ) : null}
        {selectedImport && !record && !demo && (imports !== undefined || importError) ? (
          <Link href="/app/stack" className="stack-link">
            Manage plans without this workload →
          </Link>
        ) : null}
        {record && profile ? (
          <>
            <div className="stack-activity-period">
              <span>
                {record.summary.firstEventAt && record.summary.lastEventAt
                  ? `${record.summary.firstEventAt.slice(0, 10)} – ${record.summary.lastEventAt.slice(0, 10)}`
                  : "Recorded dates unavailable"}
              </span>
              <span>
                {profile.overview.events.toLocaleString("en-US")} recorded{" "}
                {profile.overview.events === 1 ? "call" : "calls"} · one workload
              </span>
            </div>
            <div className="stack-activity-grid" data-testid="stack-activity">
              {model.activity.map((source) => (
                <article
                  key={source.sourceId}
                  className="stack-activity-card"
                  data-testid={`stack-activity-${source.sourceId}`}
                >
                  <div className="stack-activity-card-heading">
                    <h3>{source.name}</h3>
                    <span>{(source.shareOfWorkload * 100).toFixed(0)}% of recorded calls</span>
                  </div>
                  <p className="stack-call-count">
                    {source.recordedCalls.toLocaleString("en-US")}{" "}
                    <span>{source.recordedCalls === 1 ? "call" : "calls"}</span>
                  </p>
                  <div className="stack-share-track" aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.max(0, Math.min(100, source.shareOfWorkload * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="stack-caption">
                    Observed models:{" "}
                    {source.observedModelNames.length > 0
                      ? source.observedModelNames.slice(0, 4).join(" · ")
                      : "No resolved model identities"}
                  </p>
                  {source.observedModelNames.length > 4 ? (
                    <details className="stack-more-models">
                      <summary>All {source.observedModelNames.length} observed models</summary>
                      <p>{source.observedModelNames.join(" · ")}</p>
                    </details>
                  ) : null}
                  {source.unresolvedCalls > 0 ? (
                    <p className="stack-caption">
                      {source.unresolvedCalls.toLocaleString("en-US")} calls have unresolved model
                      identities. They are not assigned to a plan.
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
            <div className="stack-workload-actions">
              <Link
                href={`/app/replay?import=${encodeURIComponent(record.id)}`}
                className="stack-primary"
              >
                Replay this workload →
              </Link>
              <Link
                href={`/app/workload?import=${encodeURIComponent(record.id)}`}
                className="stack-link"
              >
                Open Workload →
              </Link>
              <Link
                href={`/app/compare?view=billing&import=${encodeURIComponent(record.id)}`}
                className="stack-link"
              >
                Compare and review billing →
              </Link>
            </div>
            <p className="stack-caption">
              Actual amounts paid belong in billing-period review. Workloads are never added
              together here.
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}
