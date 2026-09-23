import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { formatCount, formatTokens } from "./format";
import { modeMicroLabel } from "./mode-label";
import { MicroLabel, ProportionBar, SectionIndex, StatusWord } from "./primitives";

/**
 * Model identity, as lanes.
 *
 * The approved direction is that the observed mix resolves toward canonical
 * identities and that anything unresolved stays visible. So an unresolved
 * spelling is never dropped, dimmed to invisibility or merged into a
 * neighbouring row: it keeps its own lane, marked as unresolved, with the
 * identifiers the sources actually reported.
 *
 * When the scenario translates, the crossing is drawn where it happens: the
 * source lane is connected to the substitute lane, and the band says what the
 * assumption is. The words "equivalent" and "matches" do not appear here.
 */
export function ModelLanes({
  projection,
  index = "02",
  identityActive,
  translationActive,
}: {
  projection: ProjectedReplayV1;
  index?: string;
  identityActive: boolean;
  translationActive: boolean;
}) {
  const workload = projection.workload;
  const totalTokens = workload.knownTokens;
  const totalEvents = workload.eventCount;
  /**
   * How much identity stayed unresolved, and whether the result counted it at
   * all. `undefined` is a third state: the lane then says identity evidence was
   * not recorded instead of claiming every identifier resolved.
   */
  const unresolved = workload.unresolvedEventCount;
  const translation = projection.translation;
  const substituted = new Map(
    (translation?.applied ?? []).map((entry) => [entry.sourceModelId, entry.targetModelId]),
  );

  return (
    <section
      className={`flex flex-col gap-3 border-t pt-4 transition-colors duration-300 motion-reduce:transition-none ${
        identityActive ? "border-accent" : "border-border"
      }`}
      data-testid="model-lanes"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionIndex index={index} label="Model identity" />
        <MicroLabel>
          {modeMicroLabel(projection.mode)} ·{" "}
          {projection.replayability.class ?? "replayability not established"}
        </MicroLabel>
      </div>
      <ul className="flex flex-col">
        {workload.modelShare.map((share) => {
          const substitute = substituted.get(share.modelId);
          const tokens = share.tokenCount;
          const tokenShare =
            tokens === undefined || totalTokens === undefined || totalTokens === 0
              ? undefined
              : (tokens / totalTokens) * 100;
          const eventShare = totalEvents === 0 ? undefined : (share.eventCount / totalEvents) * 100;
          return (
            <li
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
              data-testid={`model-lane-${share.modelId}`}
              key={share.modelId}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-mono text-sm text-foreground">
                    {share.modelId}
                  </span>
                  {substitute === undefined ? null : (
                    <span
                      className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-accent"
                      data-testid="translation-crossing"
                    >
                      <span aria-hidden="true">→</span>
                      {substitute}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatCount(share.eventCount) ?? "—"} events
                  {eventShare === undefined ? "" : ` · ${eventShare.toFixed(1)}% of demand`}
                </span>
              </span>
              <span className="hidden flex-col gap-1 sm:flex">
                {tokenShare === undefined ? null : (
                  <ProportionBar
                    percent={tokenShare}
                    tone={substitute === undefined ? "muted" : "accent"}
                  />
                )}
                <span className="text-xs text-muted-foreground">
                  {tokens === undefined || totalTokens === undefined
                    ? "token share unknown"
                    : `${formatTokens(tokens)} tokens`}
                </span>
              </span>
              <StatusWord tone={substitute === undefined ? "neutral" : "accent"}>
                {substitute === undefined ? "as recorded" : "substituted"}
              </StatusWord>
            </li>
          );
        })}
        {unresolved === 0 ? null : (
          <li
            className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-border-strong py-3"
            data-testid="model-lane-unresolved"
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-mono text-sm text-foreground">
                {workload.modelCount} identities observed ·{" "}
                {unresolved === undefined
                  ? "unresolved events not established"
                  : `${formatCount(unresolved) ?? "—"} events unresolved`}
              </span>
              <span className="text-xs text-muted-foreground">
                {unresolved === undefined
                  ? "this result carries no resolution count, so whether every identifier resolved is not recorded"
                  : projection.models
                      .filter((model) => model.unresolved && model.observed !== undefined)
                      .map((model) => model.observed)
                      .join(", ")}
              </span>
            </span>
            <StatusWord tone={unresolved === undefined ? "neutral" : "warning"}>
              {unresolved === undefined
                ? "identity evidence not recorded"
                : "identity not established"}
            </StatusWord>
          </li>
        )}
      </ul>
      {translation === undefined ? (
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {projection.modeNote}
        </p>
      ) : (
        <div
          className={`flex flex-col gap-2 border border-accent px-3 py-2 transition-opacity duration-300 motion-reduce:transition-none ${
            translationActive ? "opacity-100" : "opacity-60"
          }`}
          data-testid="translation-assumption"
        >
          <MicroLabel>Scenario assumption</MicroLabel>
          <p className="text-xs leading-relaxed text-foreground">
            {formatCount(translation.substitutedEvents) ?? "—"} events recorded against{" "}
            {translation.applied.map((entry) => entry.sourceModelId).join(", ")} were replayed
            against {translation.applied.map((entry) => entry.targetModelId).join(", ")}.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Method: {translation.method.replace(/-/gu, " ")} · policy {translation.policyId}@
            {translation.policyVersion}. {projection.modeNote}
          </p>
        </div>
      )}
    </section>
  );
}
