"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { readCurrentStack, subscribeCurrentStack, writeCurrentStack } from "@/lib/current-stack";
import { buildMyStack, publishedPriceText } from "@/lib/my-stack";
import type { TargetKey } from "@/lib/routes";
import {
  DISCOVERY_FAMILIES,
  type DiscoveryAnswer,
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
import { useWorkloadProfile } from "@/lib/use-workload-profile";
import { getWorkerClient } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import { FamilyPlanChoices, NON_PLAN_CHOICES } from "./family-plan-choices";

const ACTION = "inline-flex min-h-11 items-center text-sm text-accent";

export function MyStackSurface({ initialImportId }: { initialImportId?: string | undefined }) {
  const [stack, setStack] = useState<TargetKey[]>();
  const [imports, setImports] = useState<ImportRecord[]>();
  const [importError, setImportError] = useState(false);
  const [selectedImport, setSelectedImport] = useState(initialImportId ?? "");
  const [editing, setEditing] = useState<DiscoveryGroupId>();
  const [answer, setAnswer] = useState<DiscoveryAnswer>();
  const [notice, setNotice] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [preferences, setPreferences] = useState<DiscoveryPreferences>({ version: 1, groups: {} });
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const editorActions = useRef(new Map<DiscoveryGroupId, HTMLButtonElement>());

  useEffect(() => {
    setSelectedImport(initialImportId ?? "");
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
    getWorkerClient()
      .listImports()
      .then((records) => {
        if (!cancelled) setImports(records);
      })
      .catch(() => {
        if (!cancelled) setImportError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const requested = imports?.find((record) => record.id === selectedImport);
  const demo = requested !== undefined && isSyntheticWorkload(requested);
  const record = requested && !demo && requested.savedLocally !== false ? requested : undefined;
  const profile = useWorkloadProfile(record?.id);
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
              ? [{ id: target.id, name: target.name, price: target.publishedPrice }]
              : [],
          ),
        ),
    [model],
  );
  const activeGroup = model.families.find((group) => group.groupId === editing);
  const savedImports = (imports ?? []).filter(
    (record) => !isSyntheticWorkload(record) && record.savedLocally !== false,
  );
  const canEdit =
    stack !== undefined &&
    (imports !== undefined || (importError && !selectedImport)) &&
    !demo &&
    (!selectedImport || record !== undefined);

  useEffect(() => {
    if (editing) editorHeading.current?.focus({ preventScroll: true });
  }, [editing]);
  const closeEditor = () => {
    if (editing) editorActions.current.get(editing)?.focus({ preventScroll: true });
    setEditing(undefined);
    setSaveFailed(false);
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
    closeEditor();
  };
  const remove = (key: TargetKey) => {
    if (!canEdit) return;
    if (!writeCurrentStack(readCurrentStack().filter((target) => target !== key))) {
      setNotice("Could not remove this selection. Browser storage is unavailable.");
      return;
    }
    const family = model.families.filter((group) => group.currentTargets.includes(key));
    const saved = writeDiscoveryPreferences(
      dismissDiscovery(family, readDiscoveryPreferences(), Date.now()),
    );
    setPreferences(readDiscoveryPreferences());
    setNotice(
      saved
        ? "Selection removed from Current Stack."
        : "Selection removed. Prompt dismissal could not be saved beyond this visit.",
    );
  };

  return (
    <div className="min-w-0 space-y-8" data-testid="my-stack">
      <PageHeader
        title="My Stack"
        description="The plans you currently pay for and the API targets you selected. Kept in this browser, shared with Workload, Replay and Compare."
        actions={
          <Link href="/app/import" className={ACTION}>
            Scan history →
          </Link>
        }
      />
      {demo ? (
        <div
          role="status"
          className="border border-border p-4 text-sm"
          data-testid="stack-demo-notice"
        >
          Demo workloads are excluded from My Stack. Your real selections are shown below; editing
          is disabled in this demo view.{" "}
          <Link href="/app/stack" className={ACTION}>
            Open your real stack →
          </Link>
        </div>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}

      <section aria-labelledby="selected-stack-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="selected-stack-heading" className="text-lg font-medium">
            Your selected stack
          </h2>
          <p className="text-xs text-muted-foreground">
            Published facts · {DECISION_MARKET.rulesAt.slice(0, 10)}
          </p>
        </div>
        {stack === undefined ? (
          <p role="status" className="text-sm text-muted-foreground">
            Reading your Current Stack…
          </p>
        ) : model.targets.length === 0 ? (
          <p className="border border-border p-5 text-sm text-muted-foreground">
            No plans selected yet. Confirm a family below, or scan your history to narrow the
            choices.
          </p>
        ) : (
          <div className="grid min-w-0 gap-3 md:grid-cols-2" data-testid="selected-stack">
            {model.targets.map((target) => (
              <article
                key={target.key}
                className="min-w-0 space-y-3 border border-border p-5"
                data-testid={`stack-target-${target.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words font-medium">{target.name}</h3>
                  <button
                    type="button"
                    onClick={() => remove(target.key)}
                    disabled={!canEdit}
                    className="min-h-11 shrink-0 text-sm text-accent disabled:opacity-50"
                    aria-label={`Remove ${target.name}`}
                  >
                    Remove
                  </button>
                </div>
                <p className="font-mono text-sm">
                  {target.publishedPrice
                    ? `Published price: ${publishedPriceText(target.publishedPrice)}`
                    : target.kind === "api" && target.available
                      ? "API target · billed by usage"
                      : "Current catalog facts unavailable"}
                </p>
                {target.kind === "api" ? (
                  <p className="text-xs text-muted-foreground">
                    Your explicit target selection. History does not establish an account, actual
                    charges or which calls were billed here.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your selection, independent of recorded call billing. Published prices are not
                    your actual bill.
                  </p>
                )}
                {target.access ? (
                  <details>
                    <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
                      Published model access
                    </summary>
                    <div className="space-y-2 pb-2 text-xs text-muted-foreground">
                      <p>{target.access.summary}</p>
                      <p>{target.access.models.map((model) => model.name).join(" · ")}</p>
                      <p>
                        Reviewed {target.access.checkedAt}. Access does not establish exact capacity
                        or that this plan paid recorded calls.
                      </p>
                    </div>
                  </details>
                ) : null}
                {target.kind === "plan" && target.available ? (
                  <Link href={`/plans/${encodeURIComponent(target.id)}`} className={ACTION}>
                    View published plan facts →
                  </Link>
                ) : null}
                {!target.available ? (
                  <p className="text-xs text-muted-foreground">
                    This selection is preserved. It may be retired or unlisted; edit or remove it
                    when you know your current plan.
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
        {model.targets.length > 0 ? (
          <div
            className="space-y-2 border-y border-border py-4"
            data-testid="stack-published-total"
          >
            <p className="text-sm font-medium">Published price subtotals</p>
            {model.totals.map((total) => (
              <p key={`${total.currency}-${total.interval}`} className="font-mono text-lg">
                {publishedPriceText(total)}
              </p>
            ))}
            <p className="max-w-2xl text-xs text-muted-foreground">
              One published price per selected plan, grouped by currency and billing interval.
              Account and seat quantities, taxes, discounts and actual payments are not included.
              {model.unpricedPlans > 0
                ? ` ${model.unpricedPlans} selected plans have no current published price.`
                : ""}
              {model.apiTargets > 0
                ? ` ${model.apiTargets} API targets are excluded from these subtotals.`
                : ""}
            </p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="stack-families-heading" className="space-y-4">
        <h2 id="stack-families-heading" className="text-lg font-medium">
          Confirm or edit your plans
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Which plans do you currently pay for? A tool can mix subscriptions, API keys and work
          access. Your answers do not assign past calls to a plan.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {model.families.map((group) => {
            const name = DISCOVERY_FAMILIES.find(
              (family) => family.groupId === group.groupId,
            )?.name;
            const response = preferences.groups[group.groupId]?.response;
            return (
              <button
                key={group.groupId}
                type="button"
                ref={(node) => {
                  if (node) editorActions.current.set(group.groupId, node);
                  else editorActions.current.delete(group.groupId);
                }}
                disabled={!canEdit}
                aria-expanded={editing === group.groupId}
                aria-controls={editing === group.groupId ? "stack-family-editor" : undefined}
                onClick={() => {
                  setAnswer(initialDiscoveryAnswer(group, response));
                  setSaveFailed(false);
                  setEditing(group.groupId);
                }}
                className="min-h-20 min-w-0 space-y-1 border border-control-border p-4 text-left disabled:opacity-50"
                data-testid={`edit-family-${group.groupId}`}
              >
                <span className="block text-sm font-medium">{name}</span>
                <span className="block text-xs text-muted-foreground">
                  {group.currentTargets.length > 0
                    ? `${group.currentTargets.length} selected · Edit`
                    : response
                      ? `${NON_PLAN_CHOICES.find((choice) => choice.value === response)?.label} · Edit`
                      : "Choose plans →"}
                </span>
              </button>
            );
          })}
        </div>
        {activeGroup && !demo ? (
          <fieldset
            id="stack-family-editor"
            className="space-y-4 border border-border p-4 sm:p-5"
            aria-labelledby="stack-editor-heading"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                closeEditor();
              }
            }}
          >
            <h3
              id="stack-editor-heading"
              ref={editorHeading}
              tabIndex={-1}
              className="text-lg font-medium outline-none"
            >
              {activeGroup.question}
            </h3>
            {activeGroup.recordedCalls > 0 ? (
              <p className="text-xs text-muted-foreground">
                We found {activeGroup.sourceNames.join(" + ")} activity:{" "}
                {activeGroup.recordedCalls.toLocaleString("en-US")} calls ·{" "}
                {(activeGroup.shareOfWorkload * 100).toFixed(0)}% of recorded calls in the selected
                workload. This does not establish a subscription.
              </p>
            ) : null}
            {activeGroup.groupId === "opencode" ? (
              <p className="text-xs text-muted-foreground">
                OpenCode can also use ChatGPT sign-in, API keys, other bundles or local models.
                OpenCode activity does not establish an OpenCode subscription.
              </p>
            ) : null}
            <FamilyPlanChoices
              group={activeGroup}
              plans={plans}
              answer={answer}
              onChange={setAnswer}
              prefix="stack-editor"
            />
            {saveFailed ? (
              <p role="alert" className="text-sm text-warning">
                Could not save all choices in this browser. Your choices remain here; retry or
                cancel.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={save}
                disabled={
                  !canEdit ||
                  !answer ||
                  (typeof answer === "object" && answer.planTargets.length === 0)
                }
                className="min-h-11 border border-accent bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-50"
              >
                Save stack
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="min-h-11 px-3 text-sm text-accent"
              >
                Cancel
              </button>
            </div>
          </fieldset>
        ) : null}
        <Link href="/app/settings#manual-plans" className={ACTION}>
          Can't find your plan? Choose manually →
        </Link>
      </section>

      <section
        aria-labelledby="stack-activity-heading"
        className="space-y-4 border-t border-border pt-6"
      >
        <h2 id="stack-activity-heading" className="text-lg font-medium">
          Recorded tool activity
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Activity from one saved workload, separate from your selected plans. Calls are not
          assigned to subscriptions. Workloads are never added together here.
        </p>
        <label className="flex max-w-2xl flex-col gap-2 text-sm">
          Workload to review
          <select
            value={demo ? "" : (record?.id ?? "")}
            disabled={imports === undefined || demo}
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
            className="min-h-11 min-w-0 max-w-full border border-control-border bg-background px-3 text-foreground"
            data-testid="stack-workload"
          >
            <option value="">No workload selected</option>
            {savedImports.map((record) => (
              <option key={record.id} value={record.id}>
                {record.label} · {record.eventCount.toLocaleString("en-US")} calls · saved{" "}
                {record.createdAt.slice(0, 10)}
              </option>
            ))}
          </select>
        </label>
        {importError ? (
          <p role="status" className="text-sm text-muted-foreground">
            Saved workloads could not be read. Your stack is still available.
          </p>
        ) : imports === undefined ? (
          <p role="status" className="text-sm text-muted-foreground">
            Reading saved workloads…
          </p>
        ) : selectedImport && !requested ? (
          <p className="text-sm text-muted-foreground">
            This workload is unavailable in this browser. Select another saved workload.
          </p>
        ) : requested?.savedLocally === false ? (
          <p className="text-sm text-muted-foreground">
            This workload was not saved. Save a workload in Import to review its activity here.
          </p>
        ) : record && !profile ? (
          <p role="status" className="text-sm text-muted-foreground">
            Preparing the selected workload's activity…
          </p>
        ) : !record ? (
          <p className="text-sm text-muted-foreground">
            Select a saved workload or scan your history. You can manage your plans without one.
          </p>
        ) : null}
        {record && profile ? (
          <>
            <p className="text-xs text-muted-foreground">
              {record.summary.firstEventAt?.slice(0, 10)} –{" "}
              {record.summary.lastEventAt?.slice(0, 10)} ·{" "}
              {profile.overview.events.toLocaleString("en-US")} recorded calls
            </p>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2" data-testid="stack-activity">
              {model.activity.map((source) => (
                <article
                  key={source.sourceId}
                  className="min-w-0 space-y-2 border border-border p-4"
                  data-testid={`stack-activity-${source.sourceId}`}
                >
                  <h3 className="font-medium">{source.name}</h3>
                  <p className="font-mono text-sm">
                    {source.recordedCalls.toLocaleString("en-US")} calls ·{" "}
                    {(source.shareOfWorkload * 100).toFixed(0)}% of recorded calls
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    Observed models:{" "}
                    {source.observedModelIds.length > 0
                      ? source.observedModelIds.join(" · ")
                      : "No resolved model identities"}
                  </p>
                  {source.unresolvedCalls > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {source.unresolvedCalls.toLocaleString("en-US")} calls have unresolved model
                      identities. They are not assigned to a plan.
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link
                href={`/app/workload?import=${encodeURIComponent(record.id)}`}
                className={ACTION}
              >
                Open Workload →
              </Link>
              <Link href={`/app/replay?import=${encodeURIComponent(record.id)}`} className={ACTION}>
                Replay this workload →
              </Link>
              <Link
                href={`/app/compare?view=billing&import=${encodeURIComponent(record.id)}`}
                className={ACTION}
              >
                Compare and review billing →
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Actual amounts paid belong in billing-period review, where you confirm the account,
              period and history separately.
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}
