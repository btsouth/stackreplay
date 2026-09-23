import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { formatCount } from "./format";
import { MicroLabel, ProportionBar, SectionIndex, StatusWord } from "./primitives";

/**
 * What happened to each unit of demand.
 *
 * The five dispositions stay five dispositions: included, overage, blocked,
 * unavailable and unknown are not folded into a pass or a fail, because they
 * mean different things to a reader deciding whether a plan is worth it.
 *
 * For a Direct API target, overage and blocked are impossible by construction.
 * They are labelled not applicable rather than shown as zeroes, so nobody reads
 * a measured zero where the target has no such state at all.
 */
export function OutcomeLedger({
  projection,
  index = "05",
  settled,
}: {
  projection: ProjectedReplayV1;
  index?: string;
  settled: boolean;
}) {
  const isApi = projection.target.kind === "api";
  const total = projection.workload.eventCount;
  /**
   * The count of demand no evidence decided. It is the engine's own `unknown`
   * disposition, so the sentence below and the row above it cannot disagree; a
   * second tally derived elsewhere was how they could.
   */
  const undecided = projection.outcomes.find((outcome) => outcome.key === "unknown")?.count;
  return (
    <section
      className={`flex flex-col gap-3 border-t pt-4 transition-opacity duration-500 motion-reduce:transition-none ${
        settled ? "opacity-100" : "opacity-80"
      }`}
      data-testid="outcome-ledger"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {/* The title states what these rows are: how the target treated each
            unit of demand. Pricing is a different question with its own panel,
            and saying "priced" here made a service outcome a price claim. */}
        <SectionIndex index={index} label="Replay outcomes" />
        <MicroLabel>{formatCount(total) ?? "—"} events replayed</MicroLabel>
      </div>
      <ul className="flex flex-col">
        {projection.outcomes.map((outcome) => {
          const impossible = isApi && (outcome.key === "overage" || outcome.key === "blocked");
          return (
            <li
              className="flex flex-col gap-1 border-b border-border py-2.5 last:border-b-0"
              data-testid={`outcome-${outcome.key}`}
              key={outcome.key}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs text-foreground">{outcome.label}</span>
                  <span className="text-xs text-muted-foreground">{outcome.note}</span>
                </span>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {impossible ? "not applicable" : (formatCount(outcome.count) ?? "unknown")}
                </span>
              </div>
              {impossible || total === 0 || outcome.count === undefined ? null : (
                <span className="block w-full sm:w-2/5">
                  <ProportionBar
                    percent={(outcome.count / total) * 100}
                    tone={
                      outcome.key === "included"
                        ? "accent"
                        : outcome.key === "unknown"
                          ? "muted"
                          : "negative"
                    }
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {undecided === undefined || undecided === 0 ? null : (
        <p className="text-xs text-muted-foreground" data-testid="outcome-undecided">
          <StatusWord tone="warning">undecided</StatusWord> {formatCount(undecided)} events are
          counted as unknown rather than assumed to fit: the engine&apos;s evidence does not
          establish a disposition for them.
        </p>
      )}
    </section>
  );
}
