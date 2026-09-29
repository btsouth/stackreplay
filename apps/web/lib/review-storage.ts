import { z } from "zod";
import { COMPLETED_REPLAYS_KEY, readCompletedReplays } from "./completed-replays";
import {
  type BillingFact,
  billingFactSchema,
  type ReviewChoice,
  reviewChoiceSchema,
} from "./review-period";

export const REVIEW_STORAGE_KEY = "stackreplay.billing-review.v1";
const schema = z.object({
  version: z.literal(1),
  billing: z.record(z.string().max(310), billingFactSchema),
  reviews: z.record(z.string().max(150), reviewChoiceSchema),
});
export type ReviewState = z.infer<typeof schema>;
/** Stable root identity across local rescans, cleared with billing/local data. */
export function localSourceRootSalt(): string {
  try {
    const key = `${REVIEW_STORAGE_KEY}.root-salt`;
    const saved = window.localStorage.getItem(key);
    if (saved && /^[a-zA-Z0-9-]{32,80}$/u.test(saved)) return saved;
    const salt = crypto.randomUUID();
    window.localStorage.setItem(key, salt);
    return salt;
  } catch {
    return crypto.randomUUID();
  }
}
export function readReviewState(namespace = ""): ReviewState {
  try {
    const result = schema.safeParse(
      JSON.parse(window.localStorage.getItem(REVIEW_STORAGE_KEY + namespace) ?? "null"),
    );
    if (result.success) return result.data;
  } catch {
    /* Missing or unavailable storage is an empty local setup. */
  }
  return { version: 1, billing: {}, reviews: {} };
}
export function saveReview(
  importId: string,
  choice: ReviewChoice,
  billing?: { key: string; fact: BillingFact },
  namespace = "",
): boolean {
  try {
    const state = readReviewState(namespace);
    if (billing) state.billing[billing.key] = billing.fact;
    delete state.reviews[importId];
    state.reviews[importId] = choice;
    // Bounded preferences only. No imported events or private labels.
    while (Object.keys(state.reviews).length > 30)
      delete state.reviews[Object.keys(state.reviews)[0] ?? ""];
    window.localStorage.setItem(
      REVIEW_STORAGE_KEY + namespace,
      JSON.stringify(schema.parse(state)),
    );
    window.dispatchEvent(new Event("stackreplay-billing-review"));
    return true;
  } catch {
    return false;
  }
}
export function subscribeReview(listener: () => void): () => void {
  window.addEventListener("stackreplay-billing-review", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("stackreplay-billing-review", listener);
    window.removeEventListener("storage", listener);
  };
}

/** Clear billing facts with the user's existing clear-local-data action. */
export function clearReviewState(importId?: string): void {
  try {
    if (importId) {
      window.localStorage.setItem(
        COMPLETED_REPLAYS_KEY,
        JSON.stringify(readCompletedReplays().filter((r) => r.importId !== importId)),
      );
      const state = readReviewState();
      delete state.reviews[importId];
      window.localStorage.removeItem(`${REVIEW_STORAGE_KEY}.burden-context.${importId}`);
      window.localStorage.removeItem(`${REVIEW_STORAGE_KEY}.episode-impact.${importId}`);
      window.localStorage.removeItem(`${REVIEW_STORAGE_KEY}.capacity.${importId}`);
      window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(state));
      window.localStorage.removeItem(`${REVIEW_STORAGE_KEY}.demo.${importId}`);
      window.localStorage.removeItem(`stackreplay.current-stack.demo.${importId}`);
    } else {
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i);
        if (
          key?.startsWith(REVIEW_STORAGE_KEY) ||
          key?.startsWith("stackreplay.current-stack") ||
          key === COMPLETED_REPLAYS_KEY
        )
          window.localStorage.removeItem(key);
      }
    }
    window.dispatchEvent(new Event("stackreplay-billing-review"));
    window.dispatchEvent(new Event("stackreplay-current-stack"));
    window.dispatchEvent(new Event("stackreplay-completed-replays"));
  } catch {
    /* Storage may be unavailable. */
  }
}
