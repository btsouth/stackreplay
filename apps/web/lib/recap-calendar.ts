/** Calendar parts cached by 15-minute UTC bucket, including half/quarter-hour zones.
 * Modern IANA offset changes align with these boundaries. For historical sub-minute
 * offsets, cache by exact instant rather than applying a modern offset assumption.
 */
export function localCalendar(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const cache = new Map<number, { date: string; hour: number }>();
  return (at: string) => {
    const ms = Date.parse(at);
    const key = ms < 0 ? ms : Math.floor(ms / 900000);
    const cached = cache.get(key);
    if (cached) return cached;
    const p = Object.fromEntries(
      formatter.formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
    );
    const value = { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
    cache.set(key, value);
    return value;
  };
}

export function nextDay(date: string, offset = 1) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
}
