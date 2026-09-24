/**
 * The viewer's IANA timezone, or UTC when the runtime does not report one.
 *
 * Every user-facing calendar day and clock position is read in this zone
 * (decision 57), so it is resolved in one place.
 */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
