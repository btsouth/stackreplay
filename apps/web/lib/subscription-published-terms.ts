import opencode from "./opencode-published-terms-data.json";
import subscriptions from "./subscription-published-terms-data.json";

export interface PublishedTermsTable {
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
  note: string;
  sourceUrl: string;
}
/** Reviewed commercial facts for people, independent of executable replay constraints. */
export interface SubscriptionPublishedTerms {
  checkedAt: string;
  sourceUrls: string[];
  allowanceSummary: string;
  terms: { label: string; value: string; sourceUrl: string }[];
  tables?: PublishedTermsTable[];
  codingTools?: string[];
  /** Whether apps the provider does not make can use the subscription, and how. */
  otherApps?: string;
  afterLimit?: string;
  privacySummary?: string;
  billingSummary?: string;
  availabilityNote?: string;
  /**
   * The day these terms start, when a plan's terms change on a stated date.
   * A plan with announced revised terms keeps one record per set of terms, so
   * the page describes the terms in force on the day it is read.
   */
  effectiveFrom?: string;
}
const records = { ...subscriptions, ...opencode } as Record<
  string,
  SubscriptionPublishedTerms | SubscriptionPublishedTerms[]
>;

/** The reviewed terms in force on `asOf`: reviewed by then, and started by then. */
export function subscriptionPublishedTerms(
  id: string,
  asOf: string,
): SubscriptionPublishedTerms | undefined {
  const stored = records[id];
  const candidates = stored === undefined ? [] : Array.isArray(stored) ? stored : [stored];
  let selected: SubscriptionPublishedTerms | undefined;
  for (const terms of candidates) {
    if (terms.checkedAt > asOf || (terms.effectiveFrom ?? "") > asOf) continue;
    if (
      selected === undefined ||
      (terms.effectiveFrom ?? "") > (selected.effectiveFrom ?? "") ||
      ((terms.effectiveFrom ?? "") === (selected.effectiveFrom ?? "") &&
        terms.checkedAt > selected.checkedAt)
    )
      selected = terms;
  }
  return selected;
}
