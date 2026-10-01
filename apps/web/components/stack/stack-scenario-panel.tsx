"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { partialScanOf } from "@/components/workload/evidence";
import type { StackSubscription } from "@/lib/current-stack";
import {
  analyzeScenario,
  type ScenarioResult,
  type StackWorkload,
  stackPeriodLabel,
} from "@/lib/stack-analysis";
import { useReview } from "@/lib/use-review";
import { useStackWorkload } from "@/lib/use-stack-workload";
import type { ImportRecord } from "@/lib/worker-protocol";
import { periodStatus } from "./stack-period";
import { ScenarioEditor, ScenarioOutcome } from "./stack-scenario";

/**
 * Replay's stack scenario: the same period, association and evidence rules as
 * My Stack, over the same cached market results. A proposed stack is a
 * decision surface over recorded work, not a second simulation engine.
 */
export function StackScenarioPanel({
  record,
  current,
  proposed,
  onChange,
  enabled,
  onResult,
}: {
  record: ImportRecord;
  current: readonly StackSubscription[];
  proposed: readonly StackSubscription[];
  onChange: (next: StackSubscription[]) => void;
  /** The caller's own market calculation must finish first: the Worker runs one at a time. */
  enabled: boolean;
  onResult?: (result: ScenarioResult, workload: StackWorkload | undefined) => void;
}) {
  const local = useReview(record);
  const scan = partialScanOf(record);
  const stackWork = useStackWorkload({
    record,
    choice: local.choice,
    billing: local.billing,
    ready: enabled && local.ready,
    partialScan: scan.unreadable + scan.other > 0,
    stack: current,
  });
  const workload = stackWork.workload;
  const result = useMemo(
    () => analyzeScenario({ current, proposed, workload }),
    [current, proposed, workload],
  );
  useEffect(() => {
    onResult?.(result, workload);
  }, [onResult, result, workload]);
  const status = periodStatus(stackWork.period, workload?.confirmation);
  return (
    <div className="stack-replay-scenario" data-testid="replay-stack-scenario">
      <p className="stack-caption" data-testid="replay-stack-period">
        {status.label} · {stackPeriodLabel(stackWork.period)} · {status.detail}.{" "}
        <Link className="stack-link" href={`/app/stack?import=${encodeURIComponent(record.id)}`}>
          Change the period in My Stack →
        </Link>
      </p>
      <ScenarioEditor
        current={current}
        proposed={proposed}
        onChange={onChange}
        accountNames={
          new Map((workload?.accounts ?? []).map((account) => [account.key, account.name]))
        }
        idPrefix="replay-scenario"
      />
      {stackWork.failed ? (
        <div role="alert" className="stack-caption">
          This workload's period could not be analyzed.{" "}
          <button type="button" className="stack-link" onClick={stackWork.retry}>
            Retry
          </button>
        </div>
      ) : workload ? (
        <ScenarioOutcome result={result} testId="replay-scenario-outcome" />
      ) : (
        <p role="status" className="stack-caption">
          Reading this workload's billing period
          {stackWork.progress && stackWork.progress.total > 1
            ? ` · ${stackWork.progress.done} of ${stackWork.progress.total} scopes`
            : ""}
          …
        </p>
      )}
    </div>
  );
}
