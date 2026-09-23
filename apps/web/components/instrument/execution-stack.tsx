import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { formatMoney } from "./format";
import { LedgerRow, MicroLabel, SectionIndex, StatusWord } from "./primitives";

/**
 * The target's execution stack.
 *
 * A subscription shows what a plan pins: the plan, its version, its price, its
 * overage behaviour and the reset phase the result declares. A Direct API target
 * shows a provider and no plan: the brief is explicit that a provider must never
 * be labelled as a plan, so the rows differ by target type rather than showing a
 * plan row with an empty value.
 *
 * The reset phase is quoted, not summarised. When the engine could not establish
 * one, the stack says so; it does not pick the more convenient of the two window
 * kinds the target mixes.
 */
export function ExecutionStack({
  projection,
  index = "03",
  targetActive,
}: {
  projection: ProjectedReplayV1;
  index?: string;
  targetActive: boolean;
}) {
  const target = projection.target;
  const provenance = projection.provenance;
  const isApi = target.kind === "api";
  return (
    <section
      className={`flex flex-col gap-3 border-t pt-4 transition-colors duration-300 motion-reduce:transition-none ${
        targetActive ? "border-accent" : "border-border"
      }`}
      data-testid="execution-stack"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionIndex index={index} label="Target execution stack" />
        <span className="flex items-center gap-3">
          <MicroLabel>{isApi ? "direct api" : "subscription"}</MicroLabel>
          {provenance.syntheticTarget ? (
            <StatusWord tone="neutral">synthetic catalog namespace</StatusWord>
          ) : null}
        </span>
      </div>
      <div className="flex flex-col">
        <LedgerRow label="Provider" value={target.providerName} testId="stack-provider" />
        {isApi ? (
          <LedgerRow
            label="Target type"
            note="Priced at the provider's published API list price; no allowance, no rules to exceed"
            value="Direct API"
          />
        ) : (
          <>
            <LedgerRow
              label="Plan"
              note={
                provenance.planVersion === undefined ? "version not pinned" : provenance.planVersion
              }
              testId="stack-plan"
              value={target.label}
            />
            <LedgerRow
              label="Price"
              note={
                target.priceInterval === undefined
                  ? undefined
                  : `fixed ${target.priceInterval} price`
              }
              value={formatMoney(target.priceAmount, "USD") ?? "unknown"}
            />
            <LedgerRow
              label="Paid overage"
              note={overageNote(target.overageMode)}
              value={target.overageMode === undefined ? "unknown" : target.overageMode}
            />
          </>
        )}
        <LedgerRow
          label={target.referenceLabel}
          note="what this result is pinned to"
          value={target.reference}
        />
        <LedgerRow
          label="Reset phase"
          note={provenance.resetPhase}
          testId="stack-reset-phase"
          value={isApi ? "not applicable" : ""}
        />
        <LedgerRow
          label="Rules as of"
          note={`catalog ${provenance.catalogVersion.replace(/^sha256:/u, "sha256 ").slice(0, 18)}… · engine ${provenance.engineVersion} · methodology ${provenance.methodologyVersion}`}
          value={provenance.rulesAsOf}
        />
      </div>
    </section>
  );
}

/**
 * What the plan's overage mode says, and only that: this field describes
 * billing. It is not evidence about admission, because a plan can bill overage,
 * refuse it, latch on it, or record it without doing either, and only the
 * rule's own `exceed` behaviour states which. Claiming refusal here would
 * contradict a record-only rule on the same plan.
 */
function overageNote(mode: "enabled" | "disabled" | "unknown" | undefined): string | undefined {
  switch (mode) {
    case "enabled":
      return "the plan defines paid overage above its allowance; what the rule does with excess demand is stated by the rule itself";
    case "disabled":
      return "paid overage disabled: nothing above the allowance is billed";
    case "unknown":
      return "the target does not state whether overage above the allowance is billable";
    default:
      return undefined;
  }
}
