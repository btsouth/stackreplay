/* biome-ignore-all lint/a11y/noNoninteractiveTabindex: Scrollable year calendars need focus for WCAG keyboard access. */

import { familyColors, type Recap, type RecapPeriod } from "@/lib/recap";
import { compactNumber } from "@/lib/recap-card";
import { costTrendBuckets, developerNames } from "@/lib/recap-deep";

const color = (family: string) => familyColors[family] ?? familyColors.other;
export const shortDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
export function Heatmap({ recap, period = "all" }: { recap: Recap; period?: RecapPeriod }) {
  const max = Math.max(1, ...recap.days.map((d) => d.records));
  const offset = new Date(recap.start + "T00:00:00Z").getUTCDay();
  const cells = [...Array.from({ length: offset }, () => undefined), ...recap.days];
  const weeks = Math.ceil(cells.length / 7);
  const level = (records: number) =>
    records ? Math.min(4, Math.max(1, Math.ceil(4 * Math.sqrt(records / max)))) : 0;
  const years = [...new Set(recap.days.map((d) => d.date.slice(0, 4)))];
  const dayCell = (d: Recap["days"][number] | undefined, i: number, numbered: boolean) => (
    <div
      key={d?.date ?? `blank-${i}`}
      className={`recap-day intensity-${level(d?.records ?? 0)} ${d ? "" : "blank"}`}
      title={d ? `${d.date}: ${d.records.toLocaleString()} usage records` : undefined}
    >
      {numbered && d && (
        <>
          <span>{Number(d.date.slice(-2))}</span>
        </>
      )}
    </div>
  );
  return (
    <div className={`recap-calendar recap-calendar-${period}`}>
      <div className="recap-calendar-labels">
        <span>{shortDate(recap.start)}</span>
        <span>
          {shortDate(recap.end)} · {recap.end.slice(0, 4)}
        </span>
      </div>
      {period === "30" ? (
        <>
          <div className="recap-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div
            className="recap-month"
            role="img"
            aria-label="30-day calendar with day numbers and activity intensity"
          >
            {cells.map((d, i) => dayCell(d, i, true))}
          </div>
        </>
      ) : period === "90" ? (
        <div
          className="recap-weeks"
          role="img"
          aria-label="90-day activity by week"
          style={{ gridTemplateColumns: `repeat(${weeks},minmax(0,1fr))` }}
        >
          {Array.from({ length: weeks }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed calendar positions, never sortable items.
            <div className="recap-calendar-week" key={`week-${recap.start}-${i}`}>
              {Array.from({ length: 7 }, (_, j) => dayCell(cells[i * 7 + j], i * 7 + j, false))}
              <small>{i % 3 === 0 && cells[i * 7 + offset]?.date.slice(5)}</small>
            </div>
          ))}
        </div>
      ) : (
        years.map((year) => {
          const days = recap.days.filter((d) => d.date.startsWith(year));
          const from = `${year}-01-01`,
            to = `${year}-12-31`;
          const count = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
          const yearOffset = new Date(from + "T00:00:00Z").getUTCDay();
          const byDate = new Map(days.map((d) => [d.date, d]));
          return (
            <div className="recap-year" key={year}>
              <span>{year}</span>
              <section
                className="recap-year-scroll"
                tabIndex={0}
                aria-label={`${year} activity calendar, scroll for later months`}
              >
                <div className="recap-year-months">
                  {[
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ].map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
                <div
                  className="recap-year-grid"
                  role="img"
                  aria-label={`${year} activity calendar`}
                  style={{
                    gridTemplateColumns: `repeat(${Math.ceil((count + yearOffset) / 7)},minmax(0,1fr))`,
                  }}
                >
                  {Array.from({ length: Math.ceil((count + yearOffset) / 7) }, (_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Fixed calendar positions, never sortable items.
                    <div className="recap-calendar-week" key={`week-${recap.start}-${i}`}>
                      {Array.from({ length: 7 }, (_, j) => {
                        const at = i * 7 + j - yearOffset;
                        const date = new Date(Date.parse(from) + at * 86400000)
                          .toISOString()
                          .slice(0, 10);
                        return dayCell(
                          at >= 0 && at < count
                            ? (byDate.get(date) ?? { date, records: 0, output: 0 })
                            : undefined,
                          at,
                          false,
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          );
        })
      )}
      <div className="recap-calendar-footer">
        <span>Intensity counts usage records, including agents.</span>
        <span>
          Less{" "}
          {[0, 1, 2, 3, 4].map((n) => (
            <i key={n} className={`intensity-${n}`} />
          ))}{" "}
          More
        </span>
      </div>
    </div>
  );
}
export function Mix({ recap }: { recap: Recap }) {
  const families = [...new Set(recap.models.map((m) => m.family))];
  const sums = recap.weeks.map((w) => Object.values(w.families).reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...sums),
    width = 850 / Math.max(1, recap.weeks.length);
  const peak = sums.indexOf(max);
  return (
    <>
      <svg
        className="recap-mix"
        role="img"
        aria-label="Weekly total tokens stacked by model developer, with token scale"
        viewBox="0 0 960 280"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <g key={p}>
            <line
              x1="140"
              x2="935"
              y1={225 - p * 180}
              y2={225 - p * 180}
              className="recap-chart-grid"
            />
            <text x="132" y={229 - p * 180} textAnchor="end">
              {compactNumber(max * p)}
            </text>
          </g>
        ))}
        {recap.weeks.map((w, i) => {
          let base = 225;
          return (
            <g key={w.date}>
              {families.map((f) => {
                const height = ((w.families[f] ?? 0) / max) * 180;
                base -= height;
                return (
                  <rect
                    key={f}
                    x={150 + i * width}
                    y={base}
                    width={Math.max(1, width * 0.75)}
                    height={height}
                    rx="2"
                    fill={color(f)}
                  >
                    <title>{`${shortDate(w.date)} · ${developerNames[f] ?? f}: ${compactNumber(w.families[f] ?? 0)} tokens`}</title>
                  </rect>
                );
              })}
              {!sums[i] && (
                <line
                  x1={150 + i * width}
                  x2={150 + i * width + width * 0.75}
                  y1="224"
                  y2="224"
                  stroke="var(--muted-foreground)"
                  strokeWidth="2"
                />
              )}
              {(i === 0 ||
                i === recap.weeks.length - 1 ||
                i % Math.ceil(recap.weeks.length / 5) === 0) && (
                <text x={150 + i * width} y="251">
                  {w.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
        <text x="150" y="22">
          peak week: {shortDate(recap.weeks[peak]?.date ?? recap.start)} · {compactNumber(max)}{" "}
          tokens
        </text>
      </svg>
      <div className="recap-legend">
        {families.map((f) => (
          <span key={f}>
            <i style={{ background: color(f) }} />
            {developerNames[f] ?? f}
          </span>
        ))}
      </div>
    </>
  );
}
export function CostTrend({ recap, period }: { recap: Recap; period: RecapPeriod }) {
  const rows = costTrendBuckets(recap, period);
  const max = Math.max(1, ...rows.map((m) => Number(m.usd)));
  const peak = rows.reduce((a, b) => (Number(b.usd) > Number(a.usd) ? b : a), rows[0]!);
  const width = 780 / Math.max(1, rows.length);
  const label = (date: string) =>
    period === "all"
      ? new Date(date + "-15T12:00:00Z").toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
      : shortDate(date);
  return (
    <svg
      className="recap-cost-svg"
      viewBox="0 0 960 250"
      role="img"
      aria-label={`${period === "30" ? "Daily" : period === "90" ? "Weekly" : "Monthly"} API-equivalent value with dollar scale`}
    >
      {[0, 0.5, 1].map((p) => (
        <g key={p}>
          <line
            x1="140"
            x2="930"
            y1={205 - p * 150}
            y2={205 - p * 150}
            stroke="currentColor"
            opacity=".2"
          />
          <text x="130" y={210 - p * 150} textAnchor="end">
            ${Math.round(max * p).toLocaleString()}
          </text>
        </g>
      ))}
      {rows.map((m, i) => (
        <g key={m.date}>
          <rect
            x={145 + i * width}
            y={205 - (Number(m.usd) / max) * 150}
            width={width * 0.75}
            height={(Number(m.usd) / max) * 150}
            fill="currentColor"
            rx="2"
          >
            <title>
              {label(m.date)} · ${Number(m.usd).toLocaleString()}
            </title>
          </rect>
          {(i === 0 || i === rows.length - 1 || i % Math.ceil(rows.length / 5) === 0) && (
            <text x={145 + i * width} y="231" textAnchor={i === rows.length - 1 ? "end" : "start"}>
              {label(m.date)}
            </text>
          )}
        </g>
      ))}
      {peak && (
        <text x="140" y="25">
          Peak: {label(peak.date)} · ${Math.round(Number(peak.usd)).toLocaleString()}
        </text>
      )}
    </svg>
  );
}
