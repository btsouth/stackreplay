import type { ModelLifecycleV1, PlanLimitV1, PlanPriceV1 } from "@stackreplay/catalog";

/**
 * Human wording for catalog facts on the public pages (launch).
 *
 * The public default views answer plain questions, so every helper here turns
 * one structured catalog field into a sentence fragment. Nothing is inferred:
 * each function reads exactly one fact and says it in words. Exact catalog
 * terms (ids, limit types, window durations) stay in the inspect views.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-23" -> "Sep 23, 2026". Deterministic, so server and client agree. */
export function formatCatalogDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/u.exec(isoDate);
  if (match === null) return isoDate;
  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  return name === undefined ? isoDate : `${name} ${Number(day)}, ${year}`;
}

/** "70.00" -> "$70", "19.99" -> "$19.99", "200000" -> "$200,000". */
export function formatUsd(amount: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `$${amount}`;
  const whole = Number.isInteger(value);
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

export function formatWholeNumber(amount: string): string {
  const value = Number(amount);
  return Number.isFinite(value) ? value.toLocaleString("en-US") : amount;
}

/** "$200 / month", or "Free" for a zero price. */
export function priceText(price: PlanPriceV1): string {
  if (Number(price.amount) === 0) return "Free";
  return `${formatUsd(price.amount)} / ${price.interval}`;
}

const VERIFICATION_WORD = {
  verified: "Verified",
  measured: "Measured",
  estimated: "Estimated",
  unknown: "Not verified",
} as const;

/** "Verified Sep 23, 2026" or "Estimated, checked Sep 23, 2026". */
export function verificationText(
  status: keyof typeof VERIFICATION_WORD,
  lastVerifiedAt: string,
): string {
  const date = formatCatalogDate(lastVerifiedAt);
  return status === "verified" || status === "measured"
    ? `${VERIFICATION_WORD[status]} ${date}`
    : `${VERIFICATION_WORD[status] ?? "Not verified"}, checked ${date}`;
}

export function lifecycleText(lifecycle: ModelLifecycleV1 | undefined): string | undefined {
  if (lifecycle === "current") return "Current";
  if (lifecycle === "legacy") return "Legacy";
  return undefined;
}

/** ISO-8601 duration in words: PT5H -> "5 hours", P7D -> "7 days". */
export function durationText(duration: string): string {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/u.exec(duration);
  if (match === null) return duration;
  const parts: string[] = [];
  const units = ["day", "hour", "minute", "second"];
  for (const [index, unit] of units.entries()) {
    const raw = match[index + 1];
    if (raw === undefined) continue;
    const count = Number(raw);
    parts.push(`${count} ${unit}${count === 1 ? "" : "s"}`);
  }
  return parts.length === 0 ? duration : parts.join(" ");
}

/** "per month", "per 5 hours", "per week". */
export function windowText(limit: PlanLimitV1): string {
  if (limit.window.type === "calendar") return `per ${limit.window.unit}`;
  return `per ${durationText(limit.window.duration)}`;
}

/** One numeric limit in words: "$70 of usage credit per month". */
export function limitSentence(limit: PlanLimitV1): string {
  if (limit.type === "credit_pool")
    return `${formatUsd(limit.amount)} of usage credit ${windowText(limit)}`;
  if (limit.type === "token_limit")
    return `${formatWholeNumber(limit.amount)} tokens ${windowText(limit)}`;
  return `${formatWholeNumber(limit.amount)} requests ${windowText(limit)}`;
}

/** What happens once a numeric limit is reached, in words. */
export function exceedText(limit: PlanLimitV1): string {
  switch (limit.exceed) {
    case "allow_overage":
      return limit.overageRate === undefined
        ? "Usage can continue past the included amount and the extra is billed."
        : `Usage can continue past the included amount at ${formatUsd(limit.overageRate.amount)} ${limit.overageRate.unit === "per_request" ? "per request" : "per million tokens"}.`;
    case "latch_until_reset":
      return "Usage stops until the limit resets.";
    case "reject_request":
      return "Requests are refused once the limit is reached.";
    case "record_only":
      return "The provider records usage against this limit but does not enforce it.";
  }
}
