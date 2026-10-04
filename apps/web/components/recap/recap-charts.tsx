import { familyColors, type Recap } from "@/lib/recap";
import { activityDays, compactNumber } from "@/lib/recap-card";

const color = (family: string) => familyColors[family] ?? familyColors.other;
export function Heatmap({ recap }: { recap: Recap }) {
  const days = activityDays(recap.days);
  const offset = new Date(`${days[0]?.date ?? recap.start}T00:00:00Z`).getUTCDay();
  const count = Math.ceil((days.length + offset) / 7);
  const gap = Math.min(5, 100 / count);
  const max = Math.max(1, ...days.map((d) => d.records));
  return (
    <div className="recap-calendar-scroll">
      <div className="recap-calendar-labels">
        <span>{days[0]?.date ?? recap.start}</span>
        <span>{recap.end}</span>
      </div>
      <div
        className="recap-calendar-grid"
        role="img"
        aria-label={`${days.filter((d) => d.records).length} active days. Activity by local day, from ${days[0]?.date ?? recap.start} to ${recap.end}.`}
        style={{
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
          maxWidth: `${count * 26 + (count - 1) * gap}px`,
          gap: `${gap}px`,
        }}
      >
        {Array.from({ length: count }, (_, col) => (
          <div
            className="recap-calendar-week"
            key={days[Math.max(0, col * 7 - offset)]?.date ?? col}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday, row) => {
              const day = days[col * 7 + row - offset];
              return (
                <div
                  key={weekday}
                  className={day?.records ? "active" : day ? "empty" : "blank"}
                  style={{ opacity: day?.records ? 0.3 + 0.7 * Math.sqrt(day.records / max) : 1 }}
                  title={
                    day ? `${day.date}: ${day.records.toLocaleString()} usage records` : undefined
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
export function Mix({ recap }: { recap: Recap }) {
  const families = [...new Set(recap.models.map((m) => m.family))];
  const max = Math.max(
    1,
    ...recap.weeks.map((w) => Object.values(w.families).reduce((a, b) => a + b, 0)),
  );
  const bw = 600 / Math.max(1, recap.weeks.length);
  return (
    <>
      <svg
        className="recap-mix"
        role="img"
        aria-label="Weekly total token mix by model developer"
        viewBox="0 0 640 220"
      >
        {recap.weeks.map((w, i) => {
          let base = 180;
          return (
            <g key={w.date}>
              {families.map((f) => {
                const height = ((w.families[f] ?? 0) / max) * 155;
                base -= height;
                return (
                  <rect
                    key={f}
                    x={20 + i * bw}
                    y={base}
                    width={Math.max(2, bw - 8)}
                    height={height}
                    rx="2"
                    fill={color(f)}
                  >
                    <title>
                      {w.date}, {f}: {compactNumber(w.families[f] ?? 0)} total tokens
                    </title>
                  </rect>
                );
              })}
              {(recap.weeks.length < 10 || i % Math.ceil(recap.weeks.length / 6) === 0) && (
                <text x={20 + i * bw} y="208">
                  {w.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="recap-legend">
        {families.map((f) => (
          <span key={f}>
            <i style={{ background: color(f) }} />
            {f === "other" ? "Other / unresolved" : f}
          </span>
        ))}
      </div>
    </>
  );
}
