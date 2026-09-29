"use client";

import { Button } from "@stackreplay/ui";
import { type ReactNode, useState } from "react";
import type { ImportRecord } from "@/lib/worker-protocol";
import type { WorkloadProfile } from "@/lib/workload-profile";
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

/**
 * Scan quality and evidence, summarized in one line and inspectable below it.
 * Material problems stay visible in the summary; the forensic detail does not
 * compete with the workload for the page.
 */
export function ScanEvidence({
  record,
  profile,
}: {
  record: ImportRecord;
  profile: WorkloadProfile;
}) {
  const skipped = skippedOutcomesOf(record);
  const incomplete = incompleteSourceFilesOf(record);
  const { summary } = record;
  const parts = [
    record.intake === undefined
      ? record.label.startsWith("Demo:")
        ? "synthetic demo workload"
        : "portable workload file"
      : `${count(skipped.length)} ${skipped.length === 1 ? "file" : "files"} skipped`,
    profile.overview.unresolvedIds === 0
      ? "every model identity resolved"
      : `${count(profile.overview.unresolvedIds)} unresolved model ${profile.overview.unresolvedIds === 1 ? "ID" : "IDs"}`,
    profile.overview.unknownUsageEvents === 0
      ? "token totals known for included calls"
      : `${count(profile.overview.unknownUsageEvents)} calls with unknown usage`,
  ];
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-sm" data-testid="evidence-summary">
        {parts.join(" · ")}
      </p>
      {incomplete.length > 0 ? (
        <p className="text-sm leading-relaxed text-warning">
          {count(incomplete.length)} supported source{" "}
          {incomplete.length === 1 ? "file was" : "files were"} not fully included. The file review
          below names {incomplete.length === 1 ? "it" : "them"} and the reason.
        </p>
      ) : null}
      <details className="border-t border-border pt-3" data-testid="scan-evidence-details">
        <summary className="min-h-11 cursor-pointer text-sm text-accent focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
          Inspect scan evidence
        </summary>
        <div className="mt-4 grid min-w-0 gap-6 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Usage sources
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm" data-testid="usage-sources">
                {summary.usageSources.map((source) => (
                  <li key={source.adapterId} className="flex justify-between gap-3">
                    <span>{source.name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {count(source.events)} calls
                      {source.sessions === undefined ? "" : ` · ${count(source.sessions)} sessions`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                A usage source recorded the tokens. Consumption is always counted from it, once.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Orchestration
              </h3>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="orchestration">
                {summary.orchestration.length === 0
                  ? "No orchestration metadata in this workload."
                  : summary.orchestration
                      .map((entry) =>
                        entry.precise
                          ? `${entry.name}: ${count(entry.sessions)} sessions attributed`
                          : `${entry.name}: attribution available`,
                      )
                      .join(" · ")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                A control surface that drove a session is attribution, not a second copy of its
                usage.
              </p>
            </div>
            {summary.otherSources.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Detected with no calls:{" "}
                {summary.otherSources.map((source) => source.name).join(", ")}.
              </p>
            ) : null}
            <div>
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Observed identifiers
              </h3>
              <ul
                className="mt-2 flex flex-col gap-1 font-mono text-xs"
                data-testid="intake-models"
              >
                {summary.models.map((model) => (
                  <li key={model.rawName} className="flex flex-wrap justify-between gap-3">
                    <span className="[overflow-wrap:anywhere]">
                      {model.rawName}
                      {model.canonicalId === undefined || model.canonicalId === model.rawName
                        ? ""
                        : ` → ${model.canonicalId}`}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {count(model.events)} calls
                      {model.canonicalId === undefined ? " · no catalog match" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="min-w-0">
            {record.intake === undefined ? (
              <p className="text-sm text-muted-foreground">
                This workload did not come from a folder scan in this browser, so there is no
                per-file scan record.
              </p>
            ) : (
              <IntakeFileReview record={record} />
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
