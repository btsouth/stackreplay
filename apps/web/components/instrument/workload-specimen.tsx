import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { formatCount, formatExactTokens, formatTokens, formatWindow } from "./format";
import { LedgerRow, MicroLabel, ProportionBar, SectionIndex } from "./primitives";

/**
 * The observed workload, as a specimen.
 *
 * Everything here is a fact about the imported demand stream and nothing else.
 * The panel says "observed" in its own heading because the replay is a
 * counterfactual over this stream, not a generation of one, and it says the
 * workload is imported rather than an account history because that is the scope
 * the result carries (`imported_workload`). A reader should never come away
 * thinking StackReplay saw an entire provider account.
 */
export function WorkloadSpecimen({
  projection,
  index = "01",
  active,
}: {
  projection: ProjectedReplayV1;
  index?: string;
  active?: boolean;
}) {
  const workload = projection.workload;
  const window = formatWindow(workload.from, workload.to);
  const complete = workload.complete;
  return (
    <section
      className={`flex flex-col gap-3 border-t px-0 pt-4 transition-colors duration-300 motion-reduce:transition-none ${
        active === false ? "border-border" : "border-accent"
      }`}
      data-testid="workload-specimen"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionIndex index={index} label="Observed workload" />
        {/* The scope is quoted from the result. A result that never stated one
            says so instead of borrowing the scope a demo import uses. */}
        <MicroLabel>
          {projection.provenance.workloadScopeKind === undefined
            ? "scope not recorded"
            : projection.provenance.workloadScopeKind.replace(/_/gu, " ")}
        </MicroLabel>
      </div>
      <p className="max-w-prose text-[11px] leading-relaxed text-muted-foreground">
        {projection.provenance.workloadScope}
      </p>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <div className="flex flex-col">
          <LedgerRow
            label="Window"
            note={
              window === undefined
                ? "no events"
                : workload.windowDays === undefined
                  ? "days covered not established"
                  : `${workload.windowDays} days covered`
            }
            testId="workload-window"
            value={window ?? "—"}
          />
          <LedgerRow
            label="Events"
            note={
              workload.sessionCount === undefined
                ? "sessions not established"
                : `${formatCount(workload.sessionCount) ?? "—"} sessions`
            }
            testId="workload-events"
            value={formatCount(workload.eventCount) ?? "—"}
          />
          <LedgerRow
            label="Models observed"
            note={
              workload.unresolvedEventCount === undefined
                ? "this result carries no resolution count, so whether every identifier resolved is not established"
                : workload.unresolvedEventCount === 0
                  ? "every identifier resolved against the catalog"
                  : `${formatCount(workload.unresolvedEventCount) ?? "—"} events with no resolved identity`
            }
            value={formatCount(workload.modelCount) ?? "—"}
          />
        </div>
        <div className="flex flex-col">
          <LedgerRow
            label="Known tokens"
            note={
              workload.knownTokens === undefined
                ? "no total: the sources established no complete category set"
                : complete === undefined
                  ? "whether every event reports every canonical category is not recorded for this result"
                  : complete
                    ? "every event reports every canonical category"
                    : "incomplete: some events report an incomplete category set"
            }
            testId="workload-tokens"
            title={formatExactTokens(workload.knownTokens)}
            value={formatTokens(workload.knownTokens) ?? "unknown"}
          />
          <TokenLine
            label="Uncached input"
            total={workload.knownTokens}
            value={workload.tokens.uncachedInput}
          />
          <TokenLine
            label="Cache read"
            value={workload.tokens.cacheRead}
            total={workload.knownTokens}
          />
          <TokenLine
            label="Cache write"
            value={workload.tokens.cacheWrite}
            total={workload.knownTokens}
          />
          <TokenLine label="Output" value={workload.tokens.output} total={workload.knownTokens} />
          <TokenLine
            label="Reasoning"
            value={workload.tokens.reasoning}
            total={workload.knownTokens}
          />
        </div>
      </div>
      {complete === true ? null : (
        <p className="text-[11px] text-muted-foreground">
          {complete === undefined
            ? "This result does not record whether every event reports every canonical category, so the sum above is not a completeness claim."
            : workload.knownTokens === undefined
              ? "No category total is established for this workload. A category an event never reported is absent rather than zero, so there is no sum to report here."
              : "The category totals above are what the sources established. A category an event never reported is absent rather than zero, so the sum covers the categories that were established."}
        </p>
      )}
    </section>
  );
}

function TokenLine({
  label,
  value,
  total,
}: {
  label: string;
  value: number | undefined;
  total?: number | undefined;
}) {
  const share =
    value === undefined || total === undefined || total === 0 ? undefined : (value / total) * 100;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-3">
        <span className="hidden w-24 sm:block">
          {share === undefined ? (
            <span className="block h-px w-full bg-border" />
          ) : (
            <ProportionBar percent={share} tone="muted" />
          )}
        </span>
        <span
          className="font-mono text-sm tabular-nums text-foreground"
          title={value === undefined ? "not reported by the sources" : formatExactTokens(value)}
        >
          {value === undefined ? "unknown" : (formatTokens(value) ?? "—")}
        </span>
      </span>
    </div>
  );
}
