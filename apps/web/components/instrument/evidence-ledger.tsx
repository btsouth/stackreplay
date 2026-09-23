import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { evidenceSummary } from "./evidence-summary";
import { MicroLabel, SectionIndex, StatusWord } from "./primitives";

/**
 * The evidence ledger.
 *
 * Each dimension is its own answer to its own question. There is no combined
 * score, no progress bar and no grade: "how much of the answer is actually
 * established" is answerable only dimension by dimension, which is why the
 * engine reports them that way and why the interface must not collapse them.
 *
 * A `not_applicable` dimension shows the engine's own reason for being
 * inapplicable, since that reason is a fact about the target rather than an
 * absence of work.
 */
export function EvidenceLedger({
  projection,
  index = "06",
}: {
  projection: ProjectedReplayV1;
  index?: string;
}) {
  const rows = projection.evidence;
  return (
    <section
      className="flex flex-col gap-3 border-t border-border pt-4"
      data-testid="evidence-ledger"
    >
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
        <SectionIndex index={index} label="Replay evidence" />
        <MicroLabel>{evidenceSummary(rows)}</MicroLabel>
      </div>
      {rows.length === 0 ? (
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          This result carries no evidence dimensions, so nothing is established about its evidence.
        </p>
      ) : null}
      <ul className="flex flex-col">
        {rows.map((row) => (
          <li
            className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0"
            data-testid={`evidence-${row.id}`}
            key={row.id}
          >
            <div className="grid min-w-0 gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)] sm:items-baseline">
              <span className="flex min-w-0 flex-col">
                <span className="text-xs text-foreground">{row.label}</span>
                <span className="text-xs leading-snug text-muted-foreground">{row.note}</span>
              </span>
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 sm:justify-end">
                <span className="min-w-0 break-words font-mono text-xs tabular-nums text-foreground">
                  {row.reading}
                </span>
                <EvidenceStatus status={row.status} />
              </span>
            </div>
            {row.reason === undefined ? null : (
              <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
                {row.reason}
              </p>
            )}
          </li>
        ))}
      </ul>
      <details className="group border-t border-border pt-3" data-testid="evidence-assumptions">
        <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <span className="group-open:hidden">+ </span>
          <span className="hidden group-open:inline">− </span>
          assumptions this result rests on
        </summary>
        <ul className="mt-2 flex flex-col gap-1.5">
          {projection.assumptions.map((assumption) => (
            <li className="text-xs leading-relaxed text-muted-foreground" key={assumption}>
              {assumption}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function EvidenceStatus({ status }: { status: ProjectedReplayV1["evidence"][number]["status"] }) {
  switch (status) {
    case "complete":
      return <StatusWord tone="positive">established</StatusWord>;
    case "partial":
      return <StatusWord tone="warning">partial</StatusWord>;
    default:
      return <StatusWord tone="neutral">not applicable</StatusWord>;
  }
}
