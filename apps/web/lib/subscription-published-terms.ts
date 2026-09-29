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
  afterLimit?: string;
  privacySummary?: string;
  billingSummary?: string;
  availabilityNote?: string;
}
const records: Record<string, SubscriptionPublishedTerms> = { ...subscriptions, ...opencode };
export function subscriptionPublishedTerms(
  id: string,
  asOf: string,
): SubscriptionPublishedTerms | undefined {
  const value = records[id];
  return value && value.checkedAt <= asOf ? value : undefined;
}
