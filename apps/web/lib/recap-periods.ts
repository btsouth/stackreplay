import type { RecapPeriod } from "./recap";
import { plural } from "./terminal-presentation";

/**
 * Periods that reveal something. 30D and 90D are hidden when the recorded span
 * is no longer than them, because they would duplicate ALL. The ALL label names
 * the span it covers. An unknown span keeps every option.
 */
export function recapPeriodOptions(spanDays: number | undefined): [RecapPeriod, string][] {
  const list: [RecapPeriod, string][] = [];
  if (spanDays === undefined || spanDays > 30) list.push(["30", "30D"]);
  if (spanDays === undefined || spanDays > 90) list.push(["90", "90D"]);
  list.push(["all", spanDays ? `ALL · ${plural(spanDays, "DAY", "DAYS")}` : "ALL"]);
  return list;
}
