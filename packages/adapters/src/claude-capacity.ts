import type { ObservedCapacityEvent } from "@stackreplay/schema";
import { epochMsFromIso, nativeEventHash, nativeSessionHash } from "./identity.js";
import { asRecord, readString } from "./parse.js";

/** Only client-generated structured evidence. User text, tool results and model prose are ignored. */
export function claudeCapacityEvent(
  record: Record<string, unknown>,
  resourceInstanceId: string,
  salt: string,
): ObservedCapacityEvent | undefined {
  const message = asRecord(record.message);
  const apiError = asRecord(record.error);
  const genericRateLimit =
    record.type === "system" && record.subtype === "api_error" && apiError?.status === 429;
  if (
    !genericRateLimit &&
    (record.type !== "assistant" ||
      record.isApiErrorMessage !== true ||
      message?.model !== "<synthetic>")
  )
    return;
  const timestamp = readString(record, "timestamp");
  const session = readString(record, "sessionId");
  const identity = (message ? readString(message, "id") : undefined) ?? readString(record, "uuid");
  if (!timestamp || epochMsFromIso(timestamp) === undefined || !session || !identity) return;
  const quota = asRecord(record.quotaLimits);
  const text = Array.isArray(message?.content)
    ? message.content
        .map((v) => {
          const block = asRecord(v);
          return block?.type === "text" ? (readString(block, "text") ?? "") : "";
        })
        .join("\n")
    : "";
  let code: ObservedCapacityEvent["code"];
  let eventType: ObservedCapacityEvent["eventType"] = "hard_limit_reached";
  let windowType: ObservedCapacityEvent["windowType"] = "unknown";
  let modelLabel: ObservedCapacityEvent["modelLabel"];
  if (genericRateLimit) {
    code = "api_rate_limit";
    eventType = "unknown_capacity_message";
  } else if (record.error === "rate_limit" && quota?.status === "rejected") {
    code = "quota_rejected";
    if (quota.rateLimitType === "five_hour") windowType = "five_hour";
  } else if (
    record.error === "rate_limit" &&
    /^You've reached your (Fable(?: 5)?) limit\./u.test(text)
  ) {
    code = "model_limit";
    windowType = "model";
    modelLabel = text.startsWith("You've reached your Fable 5 limit.") ? "Fable 5" : "Fable";
  } else if (record.error === "rate_limit" && text.startsWith("You're out of usage credits.")) {
    code = "credits_exhausted";
    eventType = "unknown_capacity_message";
  } else return;
  // A displayed reset is a scheduled time, not evidence that a reset actually occurred.
  const resetMs = typeof quota?.resetsAt === "number" ? quota.resetsAt * 1000 : NaN;
  const resetAt =
    Number.isFinite(resetMs) && Math.abs(resetMs) < 8.64e15
      ? new Date(resetMs).toISOString()
      : undefined;
  return {
    id: nativeEventHash(
      salt,
      "claude-code",
      JSON.stringify([resourceInstanceId, session, identity]),
    ),
    resourceInstanceId,
    timestamp: new Date(timestamp).toISOString(),
    eventType,
    windowType,
    ...(modelLabel ? { modelLabel } : {}),
    ...(resetAt ? { resetAt } : {}),
    sessionId: nativeSessionHash(salt, session),
    evidence: "native-client",
    code,
    duplicateRows: 0,
  };
}

/** Identity is root scoped. Different native records remain distinct blocked attempts. */
export function dedupeCapacityEvents(
  events: readonly ObservedCapacityEvent[],
): ObservedCapacityEvent[] {
  const byId = new Map<string, ObservedCapacityEvent>();
  for (const event of events) {
    const key = JSON.stringify([event.resourceInstanceId, event.id]);
    const previous = byId.get(key);
    byId.set(
      key,
      previous
        ? { ...previous, duplicateRows: previous.duplicateRows + event.duplicateRows + 1 }
        : { ...event },
    );
  }
  return [...byId.values()].sort(
    (a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id),
  );
}
