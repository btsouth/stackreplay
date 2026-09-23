import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import type { DemoArtifactScenario } from "@/lib/demo-artifact";
import { formatCount, formatExactTokens, formatTokens, formatWindow } from "./format";
import { LedgerRow, MicroLabel, ProportionBar, SectionIndex, StatusWord } from "./primitives";

/**
 * Workload anatomy: what the observed demand actually is.
 *
 * Every figure comes from the engine's own workload summary, and the sources
 * come from the export the engine replayed, so this section cannot drift from
 * the result below it. Where a fact is not established (sessions, for instance,
 * when the sources never declared them) the row says so instead of printing a
 * plausible number: the old synthetic mockup's numbers are not a reason to
 * publish one we cannot support.
 */
export function WorkloadAnatomy({
  projection,
  scenario,
  index = "02",
}: {
  projection: ProjectedReplayV1;
  scenario: DemoArtifactScenario;
  index?: string;
}) {
  const workload = projection.workload;
  const window = formatWindow(workload.from, workload.to);
  const totalTokens = workload.knownTokens;
  const usageSources = scenario.sources.filter((source) => source.role === "usage");
  const attributionSources = scenario.sources.filter((source) => source.role !== "usage");

  return (
    <section
      className="flex flex-col gap-4 border-t border-border pt-6"
      data-testid="workload-anatomy"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionIndex index={index} label="Workload anatomy" />
        <MicroLabel>
          observed ·{" "}
          {projection.provenance.workloadScopeKind === undefined
            ? "scope not recorded"
            : `${projection.provenance.workloadScopeKind.replace(/_/gu, " ")} scope`}
        </MicroLabel>
      </div>
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-3">
        <div className="flex flex-col">
          <LedgerRow
            label="Time window"
            note={
              window === undefined
                ? "no events"
                : workload.windowDays === undefined
                  ? "days not established"
                  : `${workload.windowDays} days`
            }
            testId="anatomy-window"
            value={window ?? "—"}
          />
          <LedgerRow
            label="Events"
            testId="anatomy-events"
            value={formatCount(workload.eventCount) ?? "—"}
          />
          <LedgerRow
            label="Sessions"
            note={
              workload.sessionCount === undefined
                ? "the sources did not declare session identity"
                : "deduplicated across harnesses"
            }
            testId="anatomy-sessions"
            value={formatCount(workload.sessionCount) ?? "unknown"}
          />
          <LedgerRow
            label="Sources"
            note={usageSources.map((source) => source.name).join(", ")}
            testId="anatomy-sources"
            value={formatCount(usageSources.length) ?? "0"}
          />
          {attributionSources.length === 0 ? null : (
            <LedgerRow
              label="Orchestrators"
              note="attribution only: these ran the calls, they did not record tokens"
              value={formatCount(attributionSources.length) ?? "0"}
            />
          )}
        </div>
        <div className="flex flex-col">
          <LedgerRow
            label="Known tokens"
            note={
              totalTokens === undefined
                ? "no total: the sources established no complete category set"
                : workload.complete === undefined
                  ? "whether every event reports every canonical category is not recorded for this result"
                  : workload.complete
                    ? "every event reports every canonical category"
                    : "incomplete: some events report an incomplete category set"
            }
            testId="anatomy-tokens"
            title={formatExactTokens(totalTokens)}
            value={formatTokens(totalTokens) ?? "unknown"}
          />
          {(
            [
              ["Uncached input", workload.tokens.uncachedInput],
              ["Cache read", workload.tokens.cacheRead],
              ["Cache write", workload.tokens.cacheWrite],
              ["Output", workload.tokens.output],
              ["Reasoning", workload.tokens.reasoning],
            ] as const
          ).map(([label, value]) => (
            <div
              className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0"
              key={label}
            >
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="flex items-center gap-3">
                <span className="hidden w-20 sm:block">
                  {value === undefined || totalTokens === undefined || totalTokens === 0 ? (
                    <span className="block h-px w-full bg-border" />
                  ) : (
                    <ProportionBar percent={(value / totalTokens) * 100} tone="muted" />
                  )}
                </span>
                <span
                  className="font-mono text-sm tabular-nums text-foreground"
                  title={value === undefined ? "not reported" : formatExactTokens(value)}
                >
                  {value === undefined ? "unknown" : (formatTokens(value) ?? "—")}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col">
          <span className="flex items-baseline justify-between gap-2 pb-2">
            <MicroLabel>model mix</MicroLabel>
            {workload.unresolvedEventCount === undefined ? (
              <StatusWord tone="neutral">resolution count not recorded</StatusWord>
            ) : workload.unresolvedEventCount === 0 ? (
              <StatusWord tone="positive">fully resolved</StatusWord>
            ) : (
              <StatusWord tone="warning">
                {formatCount(workload.unresolvedEventCount)} events unresolved
              </StatusWord>
            )}
          </span>
          {workload.modelShare.map((share) => {
            const sharePercent =
              totalTokens === undefined || totalTokens === 0 || share.tokenCount === undefined
                ? undefined
                : (share.tokenCount / totalTokens) * 100;
            return (
              <div
                className="flex flex-col gap-1 border-b border-border py-2 last:border-b-0"
                key={share.modelId}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-xs text-foreground">{share.modelId}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatCount(share.eventCount) ?? "—"} events
                  </span>
                </span>
                {sharePercent === undefined ? (
                  <span className="h-px w-full bg-border" />
                ) : (
                  <ProportionBar percent={sharePercent} tone="muted" />
                )}
                <span className="text-xs text-muted-foreground">
                  {share.tokenCount === undefined
                    ? "token share unknown"
                    : `${formatTokens(share.tokenCount)} tokens · ${sharePercent?.toFixed(1) ?? "—"}% of known tokens`}
                </span>
              </div>
            );
          })}
          {workload.unresolvedEventCount === 0 ? null : (
            <p className="pt-2 text-xs leading-relaxed text-warning">
              {workload.unresolvedEventCount === undefined
                ? "This result carries no resolution count, so whether every observed identifier resolved against the catalog is not established."
                : "Unresolved identifiers are not folded into a neighbouring model. They keep their own lane below, because a share that was never established is not a share of zero."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
