import { Decimal } from "@stackreplay/replay-engine";
import { z } from "zod";
import { fixedDifference, marketRange } from "./decision-presentation";
import type { MarketDecision } from "./market-decision";

/** UTC date boundaries, start inclusive and renewal/end exclusive. No inferred cycle. */
export interface ReviewPeriod {
  start: string;
  end: string;
}
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((s) => {
    const ms = Date.parse(`${s}T00:00:00Z`);
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === s;
  });
export const periodSchema = z
  .object({ start: dateSchema, end: dateSchema })
  .refine(
    (p) => p.end > p.start && daysInPeriod(p) <= 31,
    "Choose a period of 1 to 31 days; the end date is excluded.",
  );
export function daysInPeriod(p: ReviewPeriod): number {
  return (Date.parse(`${p.end}T00:00:00Z`) - Date.parse(`${p.start}T00:00:00Z`)) / 86_400_000;
}
export function nextDate(date: string, days = 1): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
export function periodKey(p: ReviewPeriod): string {
  return `${p.start}/${p.end}`;
}
export function periodLabel(p: ReviewPeriod): string {
  const format = (date: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
  return `${format(p.start)} – ${format(nextDate(p.end, -1))}`;
}
export const billingFactSchema = z.object({
  resourceInstanceId: z.string().min(1).max(150).optional(),
  cycle: periodSchema.optional(),
  paid: z
    .string()
    .regex(/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/u)
    .optional(),
  provenance: z.enum(["local-user", "synthetic"]),
});
export type BillingFact = z.infer<typeof billingFactSchema>;
export const reviewChoiceSchema = z.object({
  resourceInstanceId: z.string().min(1).max(150).optional(),
  accountLabel: z.string().trim().max(80).optional(),
  mode: z.enum(["history", "custom", "cycle"]),
  period: periodSchema.optional(),
  subscription: z.string().max(150).optional(),
  /** Explicit declaration, tied to this import and exact dates. Never inferred from events. */
  historyConfirmed: z.string().max(30).optional(), // Legacy D2 declaration; real reviews must reconfirm.
  historyConfirmation: z
    .object({
      importId: z.string().min(1).max(150),
      resourceInstanceId: z.string().min(1).max(150).optional(),
      scopeDigest: z.string().min(1).max(150),
      period: periodSchema,
      confirmedAt: z.iso.datetime(),
      provenance: z.enum(["local-user", "synthetic"]),
    })
    .optional(),
});
export type ReviewChoice = z.infer<typeof reviewChoiceSchema>;
export interface ReviewHistory {
  firstDate?: string;
  lastDate?: string;
  calls: number;
  knownTokens: number;
  unknownTokenCalls: number;
  activeDays: number;
  importedCalls: number;
  outsideCalls: number;
  scanGapCodes?: string[];
  resourceInstanceId?: string;
  nativeResponses?: number;
  duplicateRows?: number;
  accounts?: { resourceInstanceId: string; source: string; calls: number }[];
}
export interface ReviewComposition {
  period?: ReviewPeriod;
  history: ReviewHistory;
  historyConfirmed: boolean;
  complete: boolean;
  reason: string;
  confirmedSpend?: string;
  confirmedCount: number;
  selectedCount: number;
  unmatchedCount: number;
  difference?: { low: string; high: string };
  conclusion: string;
  synthetic: boolean;
}
export function resolveReviewPeriod(
  choice: ReviewChoice,
  billing: Record<string, BillingFact>,
): ReviewPeriod | undefined {
  return choice.mode === "cycle"
    ? billing[choice.subscription ?? ""]?.cycle
    : choice.mode === "custom"
      ? choice.period
      : undefined;
}
export function composeReview(input: {
  decision: MarketDecision;
  importId?: string;
  choice: ReviewChoice;
  billing: Record<string, BillingFact>;
  selected: readonly string[];
  partialScan?: boolean;
  synthetic?: boolean;
  /** Injectable review clock for deterministic tests. */
  asOf?: string;
}): ReviewComposition {
  const { decision, choice, billing, selected } = input;
  const history = decision.history ?? {
    calls: 0,
    knownTokens: 0,
    unknownTokenCalls: 0,
    activeDays: 0,
    importedCalls: 0,
    outsideCalls: 0,
  };
  const period =
    resolveReviewPeriod(choice, billing) ??
    (choice.mode === "history" && history.firstDate && history.lastDate
      ? { start: history.firstDate, end: nextDate(history.lastDate) }
      : undefined);
  const periodEnded =
    input.synthetic === true ||
    (!!period && period.end <= (input.asOf ?? new Date().toISOString().slice(0, 10)));
  const hasScanGaps = input.partialScan || !!history.scanGapCodes?.length;
  const confirmation = choice.historyConfirmation;
  const declarationMatches =
    confirmation !== undefined &&
    confirmation.importId === input.importId &&
    confirmation.resourceInstanceId === choice.resourceInstanceId &&
    choice.resourceInstanceId === history.resourceInstanceId &&
    confirmation.scopeDigest === decision.scenarios[0]?.summary.scope.digest &&
    !!period &&
    periodKey(confirmation.period) === periodKey(period) &&
    (input.synthetic === true || confirmation.provenance === "local-user");
  const historyConfirmed =
    !!period &&
    (!history.accounts?.length || !!choice.resourceInstanceId) &&
    periodEnded &&
    !hasScanGaps &&
    (declarationMatches ||
      (input.synthetic === true && choice.historyConfirmed === periodKey(period)));
  const matching = selected.filter(
    (key) =>
      period &&
      billing[key]?.cycle &&
      periodKey(billing[key].cycle) === periodKey(period) &&
      billing[key]?.resourceInstanceId === choice.resourceInstanceId,
  );
  const confirmed = matching.filter((key) => billing[key]?.paid !== undefined);
  const confirmedSpend = confirmed.length
    ? confirmed.reduce((sum, key) => sum.add(billing[key]?.paid ?? "0"), new Decimal(0)).toString()
    : undefined;
  const range = marketRange(decision);
  const partialRange = marketRange(decision.pricedScope);
  const complete =
    !!period &&
    periodSchema.safeParse(period).success &&
    historyConfirmed &&
    history.calls > 0 &&
    !!range &&
    range.priced === history.calls &&
    selected.length > 0 &&
    confirmed.length === selected.length;
  const reason =
    !period || !periodSchema.safeParse(period).success
      ? "Choose a review period of 1 to 31 days."
      : history.accounts?.length && !choice.resourceInstanceId
        ? "Choose one local source account for this billing-cycle review. Other accounts remain separate."
        : hasScanGaps
          ? "This import has scan gaps. Resolve them before confirming a complete period."
          : !history.calls
            ? "No recorded calls fall within this review period."
            : !periodEnded
              ? "This review period has not ended yet. Its complete history cannot be confirmed."
              : !historyConfirmed
                ? "History coverage for this period is not confirmed. Event dates alone do not prove complete logs."
                : !selected.length
                  ? "Select the subscriptions paid for during this period."
                  : matching.length !== selected.length
                    ? "Selected subscriptions do not share this full billing period. Review one subscription cycle by selecting only that subscription, or enter matching full-cycle facts. No charges are prorated."
                    : confirmed.length !== selected.length
                      ? "Enter the amount actually paid for every selected subscription in this period. Published prices are not confirmed spend."
                      : !range || range.priced !== history.calls
                        ? "Some recorded calls lack modeled API pricing. A same-period difference is unavailable."
                        : "Same period for recorded workload and confirmed fixed subscription spend. History coverage is your local confirmation, not independently verified.";
  const dollars = (s: string) => `$${new Decimal(s).toFixed(2)}`;
  const api = range ? `${dollars(range.low)}–${dollars(range.high)}` : "an unavailable total";
  const conclusion =
    complete && confirmedSpend !== undefined && range
      ? choice.resourceInstanceId &&
        history.accounts?.find((a) => a.resourceInstanceId === choice.resourceInstanceId)
          ?.source === "claude-code" &&
        selected.length === 1 &&
        selected[0] === "plan:anthropic-claude-max-5x"
        ? `You paid ${dollars(confirmedSpend)} for this confirmed Claude billing cycle. The exact recorded workload from the same period would cost ${api} at the currently modeled published API rates. This is an economic comparison, not proof that API usage would provide the same experience or that Max 5x could be replaced without interruption.`
        : `${input.synthetic ? "In this synthetic example, you paid" : "You paid"} ${dollars(confirmedSpend)} in confirmed fixed subscriptions during this period. The exact recorded workload would have cost ${api} through the currently modeled published API routes. ${new Decimal(confirmedSpend).lt(range.low) ? "StackReplay cannot prove those subscriptions alone could have handled every burst without interruption because their published capacity is not deterministic." : "That difference does not prove the subscriptions were unnecessary or that API usage would provide an equivalent experience."} This does not establish that API usage provides the same product experience or that the subscriptions could be replaced without interruptions.`
      : `Not directly comparable yet. ${reason} ${partialRange ? `Published API equivalent for ${partialRange.priced.toLocaleString()} priced calls only: ${dollars(partialRange.low)}–${dollars(partialRange.high)}. Unpriced calls remain outside this subtotal; their cost is unknown.` : range ? "The published API equivalent describes only the recorded calls, with no extrapolation." : "A full published API equivalent is also unavailable for these recorded calls. No missing usage or prices are estimated."}`;
  return {
    ...(period ? { period } : {}),
    history,
    historyConfirmed,
    complete,
    reason,
    ...(confirmedSpend !== undefined ? { confirmedSpend } : {}),
    confirmedCount: confirmed.length,
    selectedCount: selected.length,
    unmatchedCount: selected.length - matching.length,
    ...(complete && confirmedSpend !== undefined && range
      ? { difference: fixedDifference(confirmedSpend, range) }
      : {}),
    conclusion,
    synthetic: input.synthetic === true,
  };
}
