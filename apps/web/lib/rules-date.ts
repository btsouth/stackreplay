/**
 * The default "Rules as of" date.
 *
 * `rulesAsOf` is a calendar date (decision 17): it selects the plan version and
 * price records in force on that day, and nothing about that contract changes
 * here. Only the default changes: it is the viewer's own calendar date rather
 * than the UTC one, so an evening in the US does not preselect tomorrow's rules
 * because UTC already crossed midnight.
 */
export function calendarDateIn(instant: Date, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

/** Today in the viewer's timezone, as the rules date a picker starts on. */
export function defaultRulesDate(now: Date = new Date()): string {
  return calendarDateIn(now);
}
