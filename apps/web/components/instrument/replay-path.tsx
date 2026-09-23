import {
  PHASE_CAPTIONS,
  phaseAtLeast,
  phaseIndex,
  type ReplayPhase,
  sequenceFor,
} from "./choreography";

/**
 * The Replay path: the instrument's spine.
 *
 * It is the composition the approved direction fixes: observed workload at the
 * top, identity, an optional explicit translation, the target's execution
 * stack, then the chronology in which the target's own constraints are crossed,
 * ending in the settled result. Signal blue carries exactly this path and the
 * state that is currently active; nothing else in the instrument uses it as
 * decoration.
 *
 * It is drawn from CSS, not from a computed SVG path: the instrument has to
 * stay responsive while the phase advances, and recalculating geometry per
 * frame is the cost the brief rules out.
 */
export function ReplayPath({
  phase,
  translated,
  crossingCount,
  className,
}: {
  phase: ReplayPhase;
  translated: boolean;
  crossingCount: number;
  className?: string;
}) {
  const steps = sequenceFor(translated);
  const total = Math.max(1, steps.length - 1);
  const index = Math.max(0, phaseIndex(phase, translated));
  const progress = `${(index / total) * 100}%`;

  return (
    <div className={`relative flex flex-col ${className ?? ""}`} data-testid="replay-path">
      {/* The rail and the lit portion of it. The rail is a positioned box so the
          lit segment can be a percentage of it without recomputing geometry. */}
      <div aria-hidden="true" className="absolute bottom-3 left-[5px] top-3 w-px">
        <div className="h-full w-px bg-border" />
        <div
          className="absolute left-0 top-0 w-px bg-accent transition-[height] duration-500 ease-out motion-reduce:transition-none"
          style={{ height: progress }}
        />
      </div>
      {steps.map((step) => {
        const reached = phaseAtLeast(phase, step.phase, translated);
        const active = step.phase === phase;
        const isCrossingStage = step.phase === "pressure" && crossingCount > 0;
        return (
          <div className="flex gap-3 py-2" key={step.phase}>
            <span
              aria-hidden="true"
              className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border transition-colors duration-300 motion-reduce:transition-none ${
                active
                  ? "border-accent bg-accent"
                  : reached
                    ? "border-accent bg-background"
                    : "border-border-strong bg-background"
              }`}
            />
            <span className="flex min-w-0 flex-col">
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
                  active ? "text-accent" : reached ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.phase === "translation" ? "Scenario translation" : step.phase}
                {isCrossingStage ? (
                  <span className="ml-2 normal-case tracking-normal text-muted-foreground">
                    {crossingCount === 1 ? "1 crossing" : `${crossingCount} crossings`}
                  </span>
                ) : null}
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {PHASE_CAPTIONS[step.phase]}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
