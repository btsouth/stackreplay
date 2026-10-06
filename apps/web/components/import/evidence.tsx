"use client";

import { Button } from "@stackreplay/ui/components/button";
import { type ReactNode, useState } from "react";
import type { ImportRecord } from "@/lib/worker-protocol";
import { count } from "./format";

/** Different selected directories can contain the same basename and warning. */
export function repeatedRows<T>(items: readonly T[], keyOf: (item: T) => string) {
  const rows = new Map<string, { item: T; count: number }>();
  for (const item of items) {
    const key = keyOf(item);
    const previous = rows.get(key);
    rows.set(key, { item, count: (previous?.count ?? 0) + 1 });
  }
  return [...rows].map(([key, row]) => ({ key, ...row }));
}

export function skippedOutcomesOf(record: ImportRecord) {
  return record.intake?.outcomes.filter((item) => item.status !== "imported") ?? [];
}

/** Supported source files that were not fully included: material, so never hidden. */
export function incompleteSourceFilesOf(record: ImportRecord) {
  return skippedOutcomesOf(record).filter(
    (item) =>
      item.status === "unreadable" ||
      (item.status !== "duplicate" &&
        /\.(?:json|jsonl|zip)$/iu.test(item.path) &&
        (item.status === "malformed" ||
          /exceeds|could not read|recognized structure produced no replayable/u.test(item.reason))),
  );
}

/**
 * Whether a scan is partial, and why, in the terms the scan itself proved: a
 * file the browser could not read to the end, or a supported file that was not
 * fully included for another stated reason.
 */
export function partialScanOf(record: ImportRecord): { unreadable: number; other: number } {
  const incomplete = incompleteSourceFilesOf(record);
  const unreadable = incomplete.filter((item) => item.status === "unreadable").length;
  return { unreadable, other: incomplete.length - unreadable };
}

/**
 * The partial-scan notice, shown beside the primary totals so nobody reads a
 * partial workload as the whole history. The action is supplied by the surface:
 * a rescan where the scan can be repeated, a link to intake elsewhere.
 */
export function PartialScanNotice({
  record,
  action,
  briefing = false,
}: {
  record: ImportRecord;
  action?: ReactNode;
  briefing?: boolean;
}) {
  const { unreadable, other } = partialScanOf(record);
  if (unreadable + other === 0) return null;
  const parts: string[] = [];
  if (unreadable > 0)
    parts.push(
      `${count(unreadable)} source ${unreadable === 1 ? "file" : "files"} could not be read to the end, so ${unreadable === 1 ? "its" : "their"} usage is not in these totals`,
    );
  if (other > 0)
    parts.push(
      `${count(other)} supported ${other === 1 ? "file was" : "files were"} not fully included`,
    );
  return (
    <div
      className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-l-2 border-warning bg-surface-2 px-3 py-2.5"
      data-testid="partial-scan"
      role="status"
    >
      <p className="min-w-0 text-sm leading-relaxed">
        <span className="font-mono text-[11px] tracking-[0.12em] text-warning uppercase">
          Partial scan
        </span>{" "}
        {briefing
          ? `${count(unreadable + other)} source ${unreadable + other === 1 ? "file was" : "files were"} incomplete; missing usage is outside these totals.`
          : `${parts.join("; ")}. If a tool was still writing to a file, scanning again once it is idle usually includes it.`}
      </p>
      {action}
    </div>
  );
}

/** Per-file outcomes and parser notes from the scan, with local basenames only. */
export function IntakeFileReview({ record }: { record: ImportRecord }) {
  const [visible, setVisible] = useState(30);
  const intake = record.intake;
  if (intake === undefined) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="intake-file-review">
      <p className="text-xs text-muted-foreground">
        {intake.exactDuplicates} exact duplicate calls removed · {intake.overlaps} recognized
        overlaps
      </p>
      <ul className="divide-y divide-border text-xs">
        {repeatedRows(intake.outcomes.slice(0, visible), (item) =>
          JSON.stringify([item.path, item.status, item.reason, item.source, item.events]),
        ).map(({ key, item, count: repeats }) => (
          <li key={key} className="flex min-w-0 flex-wrap justify-between gap-2 py-2">
            <span className="min-w-0 break-all font-mono">{item.path}</span>
            <span className="min-w-0 break-words">
              {item.status === "imported"
                ? (item.source ?? item.status)
                : `${item.status}${item.source === undefined ? "" : ` (${item.source})`}`}{" "}
              · {item.reason} · {item.events} calls
              {repeats > 1 ? ` · ${repeats} matching files` : ""}
            </span>
          </li>
        ))}
      </ul>
      {intake.outcomes.length > visible ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setVisible((value) => value + 30)}
        >
          Show more files ({intake.outcomes.length - visible} remaining)
        </Button>
      ) : null}
      {intake.warnings.length > 0 ? (
        <div className="mt-2 text-xs text-muted-foreground">
          <h4 className="font-medium">Source notes ({intake.warnings.length})</h4>
          <ul className="mt-1 list-inside list-disc">
            {repeatedRows(intake.warnings.slice(0, 12), (warning) =>
              JSON.stringify([warning.code, warning.message]),
            ).map(({ key, item: warning, count: repeats }) => (
              <li key={key} className="break-words">
                {warning.code}: {warning.message}
                {repeats > 1 ? ` · ${repeats} matching notes` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
