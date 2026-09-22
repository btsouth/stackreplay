/**
 * Typed application error codes (spec point 91). The specification's list is
 * illustrative; the engine adds codes for conditions it can detect directly.
 */
export const STACKREPLAY_ERROR_CODES = [
  "CATALOG_INVALID",
  "CATALOG_OUTDATED",
  "MODEL_UNKNOWN",
  "MODEL_UNSUPPORTED",
  "ADAPTER_FORMAT_UNSUPPORTED",
  "IMPORT_SCHEMA_INVALID",
  "REPLAY_INCOMPLETE",
  "AUTH_REQUIRED",
  "ENTITLEMENT_REQUIRED",
  "PLAN_VERSION_NOT_FOUND",
  "TARGET_NOT_IMPLEMENTED",
  /**
   * A Direct API target names a provider this catalog does not contain. The
   * replay refuses rather than pricing against a provider it cannot identify.
   */
  "TARGET_PROVIDER_UNKNOWN",
  /**
   * A Direct API target carries the legacy `pricingVersionId`. M4C prices each
   * effective model with the API-list-price record valid for it at the pinned
   * instant, so one global pricing reference is refused rather than applied.
   */
  "API_PRICING_REFERENCE_NOT_SUPPORTED",
  /**
   * A Direct API target carries the legacy `modelMapping`. Cross-model
   * substitution happens only through an explicit M4B translation policy, so
   * the unlabelled mapping is refused rather than executed as an assumption.
   */
  "API_MODEL_MAPPING_NOT_SUPPORTED",
] as const;

export type StackReplayErrorCode = (typeof STACKREPLAY_ERROR_CODES)[number];
