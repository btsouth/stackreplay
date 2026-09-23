import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { formatCount, formatPercent } from "./format";
import { MicroLabel, ProportionBar, SectionIndex, StatusWord } from "./primitives";

/**
 * The coverage dimensions, kept apart.
 *
 * Decision 3 and decision 16: requests, usage and models each carry their own
 * denominator, and one may be known while another is not. There is deliberately
 * no blended figure here and no average across the three, because a single
 * percentage over unlike denominators would read as a confidence score the
 * engine never produced.
 *
 * The unknown case is rendered as a word, never as 0% or 100%: a dimension that
 * could not be established must not look like one that was.
 */
export function CoverageDimensions({
  projection,
  index,
}: {
  projection: ProjectedReplayV1;
  index: string;
}) {
  return (
    <section
      className="flex flex-col gap-3 border-t border-border pt-4"
      data-testid="coverage-dimensions"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionIndex index={index} label="Coverage dimensions" />
        <MicroLabel>each with its own denominator</MicroLabel>
      </div>
      <ul className="flex flex-col">
        {projection.dimensions.map((dimension) => {
          const percent = dimension.percent;
          return (
            <li
              className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0"
              data-status={dimension.status}
              data-testid={`coverage-${dimension.id}`}
              key={dimension.id}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs text-foreground">{dimension.label}</span>
                  <span className="text-xs text-muted-foreground">{dimension.note}</span>
                </span>
                <span className="flex items-baseline gap-3">
                  {percent === undefined ? (
                    <StatusWord tone="warning">unknown</StatusWord>
                  ) : (
                    <span className="font-mono text-sm tabular-nums text-foreground">
                      {formatPercent(percent)}
                    </span>
                  )}
                </span>
              </div>
              {percent === undefined ? (
                <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
                  {dimension.reason ?? "This dimension could not be established."}
                  {dimension.unknownCount === undefined
                    ? ""
                    : ` ${formatCount(dimension.unknownCount)} events are undecided rather than counted as covered or blocked.`}
                </p>
              ) : (
                <>
                  <ProportionBar percent={percent} />
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {formatCount(dimension.covered) ?? "—"} of{" "}
                      {formatCount(dimension.total) ?? "—"} covered
                    </span>
                    {dimension.unknownCount === undefined ? null : (
                      <span>{formatCount(dimension.unknownCount)} undecided</span>
                    )}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
        These dimensions are reported separately on purpose. A request covered in full says nothing
        about the model dimension, and the figure above the list is the request dimension only.
      </p>
    </section>
  );
}
