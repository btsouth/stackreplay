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
] as const;

export type StackReplayErrorCode = (typeof STACKREPLAY_ERROR_CODES)[number];
