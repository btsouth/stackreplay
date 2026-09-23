import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { formatCount, formatMoney, formatPercent, listPriceWindowLabel } from "./format";
import { MicroLabel, StatusWord } from "./primitives";

/**
 * The result, settled.
 *
 * One figure dominates: the share of modelled demand the target would have
 * served, or the explicit statement that the share is not established. When the
 * engine reports no percentage, this renders the engine's own sentence instead
 * of inventing a number or showing a dash, because "unknown" is a result here
 * and not an error state.
 *
 * The secondary line carries the two things a reader asks next: what happened
 * to the demand that did not fit, and how much of the answer is established. It
 * stays a small ledger; the result does not explode into a dashboard.
 */
export function ResultSettlement({
  projection,
  settled,
}: {
  projection: ProjectedReplayV1;
  settled: boolean;
}) {
  const headline = projection.headline;
  const percent = headline.percent;
  // A count the result does not carry is absent, not a zero: this line prints
  // "unknown" rather than claiming nothing was blocked.
  const blocked = projection.outcomes.find((outcome) => outcome.key === "blocked")?.count;
  const overage = projection.outcomes.find((outcome) => outcome.key === "overage")?.count;
  const unknown = projection.outcomes.find((outcome) => outcome.key === "unknown")?.count;
  const partial = projection.evidence.filter((row) => row.status === "partial").length;
  const cost = projection.economics.targetCost;
  const economics = projection.economics;

  return (
    <div
      className={`flex flex-col gap-4 border-t border-accent pt-4 transition-opacity duration-700 motion-reduce:transition-none ${
        settled ? "opacity-100" : "opacity-70"
      }`}
      data-testid="result-settlement"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1">
          <MicroLabel>
            {projection.target.kind === "api"
              ? "counterfactual at list price"
              : "simulated outcome"}
          </MicroLabel>
          {percent === undefined ? (
            <span
              className="font-mono text-3xl leading-none text-warning sm:text-4xl"
              data-testid="result-figure"
            >
              not established
            </span>
          ) : (
            <span
              className="font-mono text-3xl leading-none tracking-tight text-foreground sm:text-5xl"
              data-testid="result-figure"
            >
              {formatPercent(percent)}
            </span>
          )}
          <span className="text-xs text-foreground">
            {percent === undefined
              ? "the engine could not decide every event"
              : `of modelled ${headline.dimension === "usage" ? "token demand" : "requests"} would have fit`}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1 sm:items-end">
          <MicroLabel>
            {projection.target.kind === "api"
              ? listPriceWindowLabel(projection.workload.windowDays)
              : "simulated target cost"}
          </MicroLabel>
          {/* A total the engine did not establish is stated as such. It used to
              be shown as a figure covering part of the demand, which read as
              the whole workload's cost. */}
          {cost === undefined ? (
            <span
              className="font-mono text-2xl leading-none text-warning sm:text-3xl"
              data-testid="result-cost"
            >
              not determinable
            </span>
          ) : (
            <span
              className="font-mono text-2xl leading-none text-foreground sm:text-3xl"
              data-testid="result-cost"
              title={cost}
            >
              {formatMoney(cost) ?? "—"}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">{economics.costReading}</span>
        </div>
      </div>
      {economics.consumptionEstablished ? null : (
        <p
          className="max-w-prose text-[11px] leading-relaxed text-muted-foreground"
          data-testid="cost-consumption"
        >
          {/* The consumption sentence comes from the projection, so the two
              surfaces that show this number cannot describe it differently. */}
          {economics.consumptionReading}.
        </p>
      )}
      <p
        className="max-w-prose text-xs leading-relaxed text-foreground"
        data-testid="result-statement"
      >
        {headline.statement}
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-xs tabular-nums text-foreground">
            {formatCount(blocked) ?? "unknown"}
          </span>
          <MicroLabel>blocked</MicroLabel>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-xs tabular-nums text-foreground">
            {formatCount(overage) ?? "unknown"}
          </span>
          <MicroLabel>billed above allowance</MicroLabel>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-xs tabular-nums text-foreground">
            {formatCount(unknown) ?? "unknown"}
          </span>
          <MicroLabel>undecided</MicroLabel>
        </span>
        <span className="flex items-baseline gap-2">
          {projection.evidenceEstablished ? (
            <StatusWord tone={partial === 0 ? "positive" : "warning"}>
              {partial === 0 ? "evidence complete" : `${partial} dimensions partial`}
            </StatusWord>
          ) : (
            <StatusWord tone="neutral">no evidence recorded</StatusWord>
          )}
        </span>
        <span className="flex items-baseline gap-2">
          <MicroLabel>replayability</MicroLabel>
          <span className="font-mono text-xs text-foreground">
            {projection.replayability.class ?? "not established"}
          </span>
        </span>
      </div>
    </div>
  );
}
