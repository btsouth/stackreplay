import type { VerdictV1 } from "@stackreplay/share";
import type { ReactNode } from "react";

/**
 * The verdict a result leads with: what happened, in one or two sentences
 * composed from the engine's facts, with the one figure worth setting large.
 *
 * The engine's own reading (status word, dispositions, coverage dimensions,
 * replayability, evidence) is not removed: it sits one step down, under
 * Inspect. This component states known facts first; the uncertainty is in the
 * sentences that follow, quiet and specific.
 */
export function ReplayVerdict({
  verdict,
  context,
  testId = "replay-headline",
  children,
}: {
  verdict: VerdictV1;
  /** "Copilot Pro+ · rules as of 2026-09-23". */
  context: ReactNode;
  testId?: string;
  /** Anything that belongs under the verdict before the reading, e.g. a scope. */
  children?: ReactNode;
}) {
  const translated = verdict.modeLabel === "Translated replay";
  // The first sentence is the answer and is set large; a second sentence (the
  // overage, what does not run) follows in the same block at reading size.
  const boundary = verdict.headline.search(/(?<=[.;])\s(?=[A-Z])/u);
  const lead = boundary === -1 ? verdict.headline : verdict.headline.slice(0, boundary);
  const rest = boundary === -1 ? "" : verdict.headline.slice(boundary + 1);
  return (
    <section
      aria-labelledby={`${testId}-sentence`}
      className="sr-verdict"
      data-mode={translated ? "translated" : "exact"}
      data-testid={testId}
      data-weight={verdict.weight}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className={`sr-mode ${translated ? "sr-mode--translated" : ""}`}
          data-testid="replay-mode"
        >
          {verdict.modeLabel}
        </span>
        <span className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase [overflow-wrap:anywhere]">
          {context}
        </span>
      </div>
      <div className="sr-verdict-body">
        <h2
          className="sr-verdict-headline"
          data-testid="verdict-headline"
          id={`${testId}-sentence`}
        >
          {lead}
          {rest === "" ? null : <span className="sr-verdict-rest"> {rest}</span>}
        </h2>
        <div className="sr-verdict-figures" data-testid="verdict-figures">
          <p className="sr-figure" data-kind={verdict.figure.kind} data-testid="verdict-figure">
            {verdict.figure.value}
            {verdict.figure.minor === undefined ? null : (
              <small className="sr-figure-minor">{verdict.figure.minor}</small>
            )}
          </p>
          <p className="sr-micro sr-caption">{verdict.figure.caption}</p>
          {verdict.secondary === undefined ? null : (
            <p className="sr-verdict-secondary" data-testid="verdict-secondary">
              <strong>{verdict.secondary.value}</strong>
              <span className="sr-micro text-muted-foreground">{verdict.secondary.caption}</span>
            </p>
          )}
        </div>
      </div>
      {verdict.support.length === 0 ? null : (
        <ul className="sr-verdict-support" data-testid="verdict-support">
          {verdict.support.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {children}
    </section>
  );
}
