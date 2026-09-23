import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { formatCount } from "./format";
import { modeLabel } from "./mode-label";
import { LedgerRow, MicroLabel, SectionIndex, StatusWord } from "./primitives";

/**
 * Exact versus Translated, demonstrated rather than asserted.
 *
 * The section exists to make four things visible at once, and the fourth is the
 * one readers get wrong:
 *
 * 1. Exact means no cross-model substitution was applied.
 * 2. Translated means the scenario applied one, explicitly.
 * 3. The substitution's own terms are inspectable: source model, substitute,
 *    event count and the token transform that was assumed.
 * 4. Exact is not a completeness claim. In this very comparison the exact target
 *    blocks demand while the translated one serves everything, so "exact" cannot
 *    be read as "fully served".
 *
 * The words that would turn the assumption into a claim (equivalent, matches,
 * same capability) are deliberately absent.
 */
export function ExactTranslated({
  exact,
  translated,
  index = "03",
}: {
  exact: ProjectedReplayV1;
  translated: ProjectedReplayV1;
  index?: string;
}) {
  return (
    <section
      className="flex flex-col gap-4 border-t border-border pt-6"
      data-testid="exact-translated"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionIndex index={index} label="Exact versus translated replay" />
        <MicroLabel>
          the replay mode states one thing: whether a substitution was applied
        </MicroLabel>
      </div>
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
        <ReplayModeColumn projection={exact} testId="exact-column" tone="neutral" />
        <ReplayModeColumn projection={translated} testId="translated-column" tone="accent" />
      </div>
      <div
        className="flex flex-col gap-2 border border-accent px-3 py-3"
        data-testid="translation-terms"
      >
        <MicroLabel>what the substitution assumed</MicroLabel>
        {translated.translation === undefined ? (
          <p className="text-xs text-muted-foreground">
            No substitution is recorded for this target.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-1">
              {translated.translation.applied.map((entry) => (
                <li
                  className="flex flex-wrap items-baseline gap-x-3 font-mono text-xs text-foreground"
                  key={`${entry.sourceModelId}-${entry.targetModelId}`}
                >
                  <span>{entry.sourceModelId}</span>
                  <span aria-hidden="true" className="text-accent">
                    →
                  </span>
                  <span>{entry.targetModelId}</span>
                  <span className="text-muted-foreground">
                    {formatCount(entry.eventCount) ?? "—"} events substituted
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Transform: {translated.translation.method.replace(/-/gu, " ")} · policy{" "}
              {translated.translation.policyId}@{translated.translation.policyVersion}.{" "}
              {translated.modeNote}
            </p>
          </>
        )}
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          A translated replay is a scenario authored for this demonstration. It is not a claim that
          these two models behave alike, cost alike, or produce the same number of tokens.
        </p>
      </div>
    </section>
  );
}

function ReplayModeColumn({
  projection,
  testId,
  tone,
}: {
  projection: ProjectedReplayV1;
  testId: string;
  tone: "neutral" | "accent";
}) {
  // The heading is the result's own mode; a result carrying none says that
  // rather than being described as the mode that was not applied.
  const headline = modeLabel(projection.mode);
  const blocked = projection.outcomes.find((outcome) => outcome.key === "blocked")?.count;
  const included = projection.outcomes.find((outcome) => outcome.key === "included")?.count;
  const unavailable = projection.outcomes.find((outcome) => outcome.key === "unavailable")?.count;
  /**
   * Why the demand did not get through is the rules' own answer, so the note is
   * read from the constraints that refused it: a latch blocks until the window
   * resets, a per-request rule refuses individual requests, and neither is the
   * other.
   */
  const blockers = projection.constraints.filter((constraint) => constraint.rejectedEvents > 0);
  const blockNote =
    blockers.length === 0
      ? "nothing was refused or blocked"
      : blockers.every((constraint) => constraint.exceed === "latch_until_reset")
        ? "blocked until the window reset"
        : blockers.every((constraint) => constraint.exceed === "reject_request")
          ? "individual requests refused because they exceeded a constraint"
          : "refused or blocked by rules with different behaviours";
  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid={testId}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground">{headline}</span>
        <StatusWord tone={tone}>{projection.mode ?? "not recorded"}</StatusWord>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {projection.target.label} · {projection.target.reference}
      </p>
      <div className="flex flex-col">
        <LedgerRow label="Served within allowance" value={formatCount(included) ?? "unknown"} />
        <LedgerRow
          label="Blocked by the target's own rule"
          note={
            blocked !== undefined && blocked > 0 && blockers.length === 0
              ? "the engine counted them without naming the rule's behaviour"
              : blockNote
          }
          value={blocked === undefined ? "unknown" : (formatCount(blocked) ?? "unknown")}
        />
        <LedgerRow
          label="Not served by the target"
          note={
            unavailable === undefined || unavailable === 0
              ? "every model is served here"
              : "the target does not offer the effective model"
          }
          value={unavailable === undefined ? "unknown" : (formatCount(unavailable) ?? "unknown")}
        />
        <LedgerRow
          label="Crossings recorded"
          value={formatCount(projection.crossings.length) ?? "0"}
        />
      </div>
      <p className="max-w-prose text-[11px] leading-relaxed text-muted-foreground">
        {projection.modeNote}
      </p>
      {projection.mode === "exact" && blocked !== undefined && blocked > 0 ? (
        <p className="text-[11px] leading-relaxed text-foreground" data-testid="exact-not-complete">
          This exact replay still refused {formatCount(blocked)} events: exact says nothing about
          whether the target serves everything.
        </p>
      ) : null}
    </div>
  );
}
