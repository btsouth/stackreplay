"use client";

import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { useMemo, useState } from "react";
import { PHASE_CAPTIONS } from "./choreography";
import { ConstraintTrace } from "./constraint-trace";
import { CostCounterfactual } from "./cost-counterfactual";
import { EvidenceLedger } from "./evidence-ledger";
import { ExecutionStack } from "./execution-stack";
import { ModelLanes } from "./model-lanes";
import { OutcomeLedger } from "./outcome-ledger";
import { ReplayPath } from "./replay-path";
import { ResultSettlement } from "./result-settlement";
import { type TargetOption, TargetSelector } from "./target-selector";
import { useReplayChoreography } from "./use-replay-choreography";
import { WorkloadSpecimen } from "./workload-specimen";

export interface InstrumentTarget {
  option: TargetOption;
  projection: ProjectedReplayV1;
}

/**
 * The Replay Instrument.
 *
 * One component serves the homepage demonstration and the application, which is
 * the point: both read `ProjectedReplayV1`, so a reader cannot be shown one set
 * of facts on the marketing surface and a different set inside the product. The
 * differences between the two surfaces are copy and density, not semantics.
 *
 * What it owns: the selected target, the choreography for the current run, and
 * the composition. What it does not own: any statement about the workload or
 * the result. Every figure and every sentence comes from the projection.
 */
export function ReplayInstrument({
  targets,
  initialTargetId,
  selectedId: controlledId,
  onSelectedChange,
  animate = true,
  provenanceNote,
  rerunLabel = "Replay again",
  testId = "replay-instrument",
}: {
  targets: readonly InstrumentTarget[];
  initialTargetId?: string;
  /** Controlled selection. Omit both to let the instrument own its target. */
  selectedId?: string | undefined;
  onSelectedChange?: ((id: string) => void) | undefined;
  animate?: boolean | undefined;
  provenanceNote?: string | undefined;
  rerunLabel?: string | undefined;
  testId?: string | undefined;
}) {
  const [internalId, setInternalId] = useState<string | undefined>(
    initialTargetId ?? targets[0]?.option.id,
  );
  const selectedId = controlledId ?? internalId;
  const selectTarget = (id: string): void => {
    setInternalId(id);
    onSelectedChange?.(id);
  };
  const current = useMemo(
    () => targets.find((target) => target.option.id === selectedId) ?? targets[0],
    [targets, selectedId],
  );
  const projection = current?.projection;
  const translated = projection?.mode === "translated";
  const { phase, effects, running, replay } = useReplayChoreography({
    runKey: `${selectedId ?? "none"}:${translated === true ? "t" : "e"}`,
    translated: translated === true,
    animate: animate && projection !== undefined,
  });

  if (projection === undefined || current === undefined) {
    return (
      <div className="border border-border px-4 py-6 text-sm text-muted-foreground">
        No target is available to replay against.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-phase={phase} data-testid={testId}>
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <TargetSelector
            onChange={selectTarget}
            options={targets.map((target) => target.option)}
            value={current.option.id}
          />
          <ReplayPath
            crossingCount={projection.crossings.length}
            phase={phase}
            translated={translated === true}
          />
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p
              aria-live="polite"
              className="text-[11px] leading-relaxed text-muted-foreground"
              data-testid="instrument-status"
            >
              {PHASE_CAPTIONS[phase]}
            </p>
            <button
              className="w-fit border border-border-strong px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
              data-testid="instrument-rerun"
              disabled={running}
              onClick={replay}
              type="button"
            >
              {running ? "replaying" : rerunLabel}
            </button>
          </div>
          {provenanceNote === undefined ? null : (
            <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
              {provenanceNote}
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <ResultSettlement projection={projection} settled={effects.settled} />
          <div className="grid gap-x-10 gap-y-8 xl:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-8">
              <WorkloadSpecimen active={effects.workloadActive} projection={projection} />
              <ModelLanes
                identityActive={effects.identityActive}
                projection={projection}
                translationActive={effects.translationActive}
              />
              <ExecutionStack projection={projection} targetActive={effects.targetActive} />
            </div>
            <div className="flex min-w-0 flex-col gap-8">
              <ConstraintTrace
                chronologyActive={effects.chronologyActive}
                projection={projection}
              />
              <OutcomeLedger projection={projection} settled={effects.settled} />
              <CostCounterfactual projection={projection} settled={effects.settled} />
              <EvidenceLedger projection={projection} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Builds the instrument's props from the demonstration artifact. */
export function instrumentTargetsFromArtifact(
  artifactTargets: readonly {
    id: string;
    label: string;
    detail: string;
    kind: "subscription" | "api";
    translated: boolean;
    projection: ProjectedReplayV1;
  }[],
): InstrumentTarget[] {
  return artifactTargets.map((target) => ({
    option: {
      id: target.id,
      label: target.label,
      detail: target.detail,
      kind: target.kind,
      reference: referenceOf(target.projection),
      translated: target.translated,
    },
    projection: target.projection,
  }));
}

function referenceOf(projection: ProjectedReplayV1): string {
  return projection.provenance.planVersion ?? projection.target.reference;
}
