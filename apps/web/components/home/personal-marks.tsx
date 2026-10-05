"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  canonicalUsage,
  type HomeCatalogIndex,
  lineupCoverage,
  modelUsage,
  personalRelevance,
} from "@/lib/home/personal";
import { useLocalWorkload } from "@/lib/local-workload";

/**
 * Personal layers over the public homepage. Each one reads the shared local
 * snapshot (never a scan, never the replay Worker) and renders nothing until
 * this browser's own saved workload or Current Stack establishes a relation.
 */

const count = new Intl.NumberFormat("en-US");

function usePersonalUsage() {
  const local = useLocalWorkload();
  const record = local.personal.status === "ready" ? local.personal.record : undefined;
  const usage = useMemo(
    () => (record === undefined ? undefined : canonicalUsage(record.summary)),
    [record],
  );
  return { local, record, usage };
}

const MARK_TEXT = {
  stack: "In your stack",
  workload: "In your workload",
} as const;

/** "In your stack" / "In your workload" for a market change, plan or model. */
export function PersonalMark({
  planIds = [],
  modelIds = [],
  usedLabel,
}: {
  planIds?: readonly string[];
  modelIds?: readonly string[];
  /** Wording for a model the workload used ("Used by you"). */
  usedLabel?: string;
}) {
  const { local, usage } = usePersonalUsage();
  const relation = personalRelevance({ planIds, modelIds }, local.stack, usage);
  if (relation === undefined) return null;
  return (
    <span className="home-mark" data-testid="personal-mark" data-relation={relation}>
      <span aria-hidden="true" className="home-mark-dot" />
      {relation === "workload" && usedLabel !== undefined ? usedLabel : MARK_TEXT[relation]}
    </span>
  );
}

const percent = (share: number) =>
  share > 0 && share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`;

/**
 * The model table's personal row. Without a saved workload it invites a scan;
 * with one, each column says how much recorded work used that exact model, or
 * which other release of the same family was used instead.
 */
export function ModelUsageRow({
  columns,
  index,
}: {
  columns: readonly { id: string; familyId: string | undefined }[];
  index: HomeCatalogIndex;
}) {
  const { record, usage } = usePersonalUsage();
  if (record === undefined || usage === undefined)
    return (
      <tr className="home-usage-row" data-testid="model-usage-row" data-state="public">
        <th scope="row">Your workload</th>
        <td colSpan={columns.length}>
          <span className="home-usage-invite">
            <span className="text-muted-foreground">
              Scan your history to see which of these models your work actually used.{" "}
            </span>
            <Link href="/app/scan" className="home-inline-link">
              Scan my AI history <span aria-hidden="true">→</span>
            </Link>
          </span>
        </td>
      </tr>
    );
  return (
    <tr className="home-usage-row" data-testid="model-usage-row" data-state="personal">
      <th scope="row">Your workload</th>
      {columns.map((column) => {
        const view = modelUsage(column.id, column.familyId, usage, index);
        return (
          <td key={column.id} data-testid={`model-usage-${column.id}`} data-usage={view.kind}>
            {view.kind === "used" ? (
              <>
                <span className="home-cell-value">{count.format(view.calls)} calls</span>
                <span className="home-cell-detail">{percent(view.share)} of recorded calls</span>
              </>
            ) : view.kind === "related" ? (
              <>
                <span className="home-cell-value text-muted-foreground">Not this release</span>
                <span className="home-cell-detail">
                  {view.related
                    .slice(0, 2)
                    .map((entry) =>
                      entry.familyOnly
                        ? `${count.format(entry.calls)} calls named only “${entry.name}”`
                        : `${entry.name}: ${count.format(entry.calls)} calls`,
                    )
                    .join(" · ")}
                </span>
              </>
            ) : (
              <span className="home-cell-value text-muted-foreground">Not in your workload</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

/** A plan card's lineup check against recorded calls, once a workload is saved. */
export function PlanLineupNote({ includedModelIds }: { includedModelIds: readonly string[] }) {
  const { usage } = usePersonalUsage();
  if (usage === undefined || usage.total === 0) return null;
  const share = lineupCoverage(includedModelIds, usage);
  return (
    <p className="home-lineup" data-testid="plan-lineup-note">
      <span className="home-evidence-word">Measured</span> Its lineup includes the models behind{" "}
      {percent(share)} of your recorded calls.
    </p>
  );
}
