import { z } from "zod";

/**
 * Who pays for a call, kept apart from who made it.
 *
 * Harness, provider, model and billing source are four different facts. A call
 * recorded by OpenCode can run an OpenAI model and be paid by a direct API key,
 * by a ChatGPT plan through Sign in with ChatGPT, or by a provider bundle. None
 * of the four is ever derived from another: the harness does not decide the
 * billing source, and neither does the model's developer.
 *
 * - `direct_api`: metered by the provider's API at its published rates.
 * - `subscription`: drawn from a plan's included usage.
 * - `subscription_credits`: paid with credits bought on top of a plan.
 * - `provider_bundle`: a third party's bundle that routes to the provider.
 * - `local`: run on the person's own hardware.
 */
export const billingSourceKindV1Schema = z.enum([
  "direct_api",
  "subscription",
  "subscription_credits",
  "provider_bundle",
  "local",
]);
export type BillingSourceKindV1 = z.infer<typeof billingSourceKindV1Schema>;

/**
 * Optional billing context on a recorded event (decision 5 anticipated it).
 * `exact` means the source itself recorded how the call was paid; `inferred`
 * means something else established it. No adapter emits this yet, and an
 * event without it has an unknown billing source.
 */
export const billingContextV1Schema = z.strictObject({
  kind: billingSourceKindV1Schema,
  /** The catalog plan that paid, when the kind is a subscription. */
  planId: z.string().min(1).optional(),
  /** The provider account that billed, when the source records it. */
  providerId: z.string().min(1).optional(),
  attribution: z.enum(["exact", "inferred"]),
});
export type BillingContextV1 = z.infer<typeof billingContextV1Schema>;

/** The billing source a replay target simulates. */
export interface TargetBillingSourceV1 {
  kind: BillingSourceKindV1;
  planId?: string;
  providerId?: string;
}

/**
 * A replay target states its billing source by its type, never by the harness
 * the workload was recorded in: a subscription target is paid by the plan, a
 * Direct API target by the provider's API.
 */
export function billingSourceOfTarget(
  target:
    | { type: "subscription"; planId?: string | undefined }
    | { type: "api"; providerId: string }
    | { type: "local" }
    | { type: "hybrid" },
): TargetBillingSourceV1 | undefined {
  switch (target.type) {
    case "subscription":
      return {
        kind: "subscription",
        ...(target.planId === undefined ? {} : { planId: target.planId }),
      };
    case "api":
      return { kind: "direct_api", providerId: target.providerId };
    case "local":
      return { kind: "local" };
    default:
      // A hybrid target has one billing source per route, not one overall.
      return undefined;
  }
}
