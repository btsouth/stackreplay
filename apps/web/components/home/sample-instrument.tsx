"use client";
import type { CSSProperties } from "react";
import { DailyChart } from "@/components/terminal/daily-chart";
import { InsightStrip } from "@/components/terminal/insights";
import { Readout, Section, TightNumber } from "@/components/terminal/primitives";
import { TerminalShare } from "@/components/terminal/share";
import { sampleGithub, sampleInsights } from "@/lib/home/recap-sample";
import type { Recap } from "@/lib/recap";
import { developerNames } from "@/lib/recap-deep";
import {
  activeDays,
  compact,
  dateLabel,
  dollars,
  integer,
  namedModelCount,
  plural,
  presentation,
  pricedRequestShare,
  tokenSplit,
} from "@/lib/terminal-presentation";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function SampleInstrument({ recap: r }: { recap: Recap }) {
  const p = presentation(r);
  const deep = r.deep;
  if (!deep) throw new Error("Sample details are missing.");
  const buckets = deep.buckets;
  const named = namedModelCount(r);
  const split = tokenSplit(r);
  const pricedShare = pricedRequestShare(r);
  const activeCount = activeDays(r);
  const github = new Map(Object.entries(sampleGithub));
  const ghTotal = [...github.values()].reduce((a, b) => a + b, 0);
  const maxHeat = Math.max(1, ...deep.hours.flat());
  return (
    <>
      <section id="sample" className="home-sample" aria-labelledby="sample-heading">
        <div className="home-sample-caption">
          <h2 id="sample-heading" className="label">
            SAMPLE / 30 DAYS
          </h2>
          <p>Fictional history. Real components. Your scan supplies your numbers.</p>
        </div>
        <div className="grid12 hero">
          <div className="cell big">
            <div className="label">Total tokens</div>
            <div className="mega" data-testid="sample-total">
              <TightNumber value={compact(r.total)} />
            </div>
            {split && (
              <p className="cache-share">
                {Math.round(split.cacheShare * 100)}% is cached context your tools re-read
              </p>
            )}
            <div className="sub">
              <b>{integer(r.total)}</b> tokens through {p.models.length} models · {named} named
            </div>
            <div className="anat">
              <div className="abar" role="img" aria-label="Sample token composition">
                {(["read", "input", "write", "output"] as const).map((k) => (
                  <div
                    key={k}
                    style={{
                      flex: buckets[k],
                      background: `var(--c-${k === "input" ? "in" : k === "output" ? "out" : k})`,
                    }}
                  />
                ))}
              </div>
              <div className="alegend">
                {(
                  [
                    ["read", "Cache read", "read"],
                    ["input", "Input", "in"],
                    ["write", "Cache write", "write"],
                    ["output", "Output", "out"],
                  ] as const
                ).map(([k, label, c]) => (
                  <div className="al" key={k}>
                    <i style={{ background: `var(--c-${c})` }} />
                    <span>{label}</span>
                    <b>{compact(buckets[k])}</b>
                    <em>{((buckets[k] / r.total) * 100).toFixed(1)}%</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="side">
            <Readout
              label="API value"
              value={dollars(r.usd)}
              signal
              note={`LIST-PRICE ESTIMATE · ${pricedShare}% OF REQUESTS PRICED`}
            />
            <Readout
              label="New tokens"
              value={split ? compact(split.newTokens) : "Unreported"}
              note="INPUT + OUTPUT + CACHE WRITE"
            />
            <Readout label="Models" value={p.models.length} note={`${named} NAMED · SAMPLE`} />
            <Readout
              label="Current streak · all time"
              value={r.streak}
              unit="days"
              note={`LONGEST ${r.longestStreak} DAYS · ALL TIME`}
            />
            <Readout
              label="Sessions"
              value={integer(r.sessions)}
              note={`${plural(activeCount, "DAY", "DAYS")} ACTIVE`}
            />
          </div>
        </div>
        <InsightStrip insights={sampleInsights} />
      </section>
      <Section
        number="01"
        title="Tokens in, code out"
        note="Tokens above the line. Public GitHub contributions below."
      >
        <div className="grid12">
          <div className="cell act">
            <div className="legend">
              <span>
                <i style={{ background: "var(--signal)" }} />
                TOKENS / DAY
              </span>
              <span>
                <i style={{ background: "var(--gh)" }} />
                GITHUB / DAY / SAMPLE
              </span>
            </div>
            <DailyChart
              days={p.days.map((d) => ({ date: d.date, value: d.total }))}
              github={github}
            />
          </div>
          <div className="actside sample-readouts">
            <Readout
              label="GitHub contributions"
              value={integer(ghTotal)}
              note="ILLUSTRATIVE PUBLIC CALENDAR"
            />
            <Readout
              label="Tokens / contribution"
              value={compact(r.total / ghTotal)}
              note="COUNTS ACTIVITY, NOT CODE QUALITY"
            />
          </div>
        </div>
      </Section>
      <Section
        number="02"
        title="Speed"
        note="Output tokens per second. Band shows the middle half of replies."
      >
        <div className="grid12">
          <div className="cell speed">
            <div className="shead">
              <span>MODEL</span>
              <span className="axis2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} style={{ left: `${i * 25}%` }}>
                    {(p.speedAxis * i) / 4}
                  </span>
                ))}
              </span>
              <span className="num">MEDIAN</span>
              <span className="num">WAIT</span>
              <span className="num">REPLIES</span>
            </div>
            <div className="mobile-axis">
              <span>0 tok/s</span>
              <span>{p.speedAxis} tok/s</span>
            </div>
            {p.speeds.map((s) => (
              <div className="srow" key={s.id}>
                <div className="sname">
                  <i style={{ background: p.colors.get(s.id) }} />
                  {p.names.get(s.id)}
                </div>
                <div
                  className="strack"
                  role="img"
                  aria-label={`${s.p25.toFixed(1)} to ${s.p75.toFixed(1)} tokens per second`}
                >
                  <div
                    className="sband"
                    style={{
                      left: `${(s.p25 / p.speedAxis) * 100}%`,
                      width: `${((s.p75 - s.p25) / p.speedAxis) * 100}%`,
                      background: p.colors.get(s.id),
                    }}
                  />
                  <div className="smed" style={{ left: `${(s.median / p.speedAxis) * 100}%` }} />
                </div>
                <div className="sval">
                  <b>{s.median.toFixed(1)}</b>
                  <small>tok/s</small>
                </div>
                <div className="snum">{s.wait.toFixed(1)}s</div>
                <div className="snum">{integer(s.n)}</div>
              </div>
            ))}
          </div>
          <div className="sins sample-readouts">
            <Readout
              label="Fastest median"
              value={p.fastest?.median.toFixed(1)}
              unit="tok/s"
              note={p.names.get(p.fastest?.id ?? "")}
            />
            <Readout
              label="Replies timed"
              value={integer(p.speeds.reduce((n, s) => n + s.n, 0))}
              note="FROM PROMPT TO FINISHED REPLY"
            />
          </div>
        </div>
      </Section>
      <Section
        number="03"
        title="Models"
        note="Where the tokens went, and their value at API list prices."
      >
        <div className="grid12">
          <div className="cell tablecell">
            <table aria-label="Sample model totals">
              <thead>
                <tr>
                  <th>MODEL</th>
                  <th>DEVELOPER</th>
                  <th className="num">TOKENS</th>
                  <th className="num">SHARE</th>
                  <th className="num">API VALUE</th>
                  <th className="num">TOK/S</th>
                </tr>
              </thead>
              <tbody>
                {p.top.slice(0, 5).map((m) => (
                  <tr key={m.id}>
                    <td data-label="MODEL">
                      <span className="mn">
                        <i style={{ background: p.colors.get(m.id) }} />
                        {p.names.get(m.id)}
                      </span>
                    </td>
                    <td data-label="DEVELOPER" className="dim">
                      {developerNames[m.family] ?? m.family}
                    </td>
                    <td data-label="TOKENS" className="num">
                      {compact(m.total)}
                    </td>
                    <td data-label="SHARE" className="num">
                      {((m.total / r.total) * 100).toFixed(1)}%
                    </td>
                    <td data-label="API VALUE" className="num">
                      {m.priced ? dollars(m.usd) : "Unpriced"}
                    </td>
                    <td data-label="TOK/S" className="num">
                      {p.speeds.find((s) => s.id === m.id)?.median.toFixed(1) ?? "Unreported"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
      <Section
        number="04"
        title="Rhythm"
        note="Requests by weekday and hour. Sample times are UTC."
      >
        <div className="grid12">
          <div className="cell rhythm">
            <div className="heat" role="img" aria-label="Sample model calls by weekday and hour">
              {[1, 2, 3, 4, 5, 6, 0].map((d, i) => (
                <div className="heat-row" key={d}>
                  <div className="hd">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][i]}</div>
                  {HOURS.map((h) => (
                    <div
                      className="hc"
                      key={h}
                      style={
                        { "--v": ((deep.hours[d]?.[h] ?? 0) / maxHeat) ** 0.7 } as CSSProperties
                      }
                      title={`${String(h).padStart(2, "0")}:00 / ${deep.hours[d]?.[h] ?? 0} requests`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="hticks">
              <span />
              {HOURS.map((h) => (
                <span key={h}>{h % 3 === 0 ? String(h).padStart(2, "0") : ""}</span>
              ))}
            </div>
          </div>
          <div className="rside">
            <Readout
              label="Peak hour"
              value={`${String(p.peakHour).padStart(2, "0")}:00`}
              note="UTC"
            />
            <Readout
              label="Busiest day"
              value={dateLabel(r.busiestDay).toUpperCase()}
              note="BY REQUESTS"
            />
            <Readout
              label="After midnight"
              value={`${Math.round(r.lateNightShare * 100)}%`}
              note="MIDNIGHT TO 5 AM"
            />
            <Readout label="Weekends" value={`${Math.round(deep.weekendShare * 100)}%`} />
          </div>
        </div>
      </Section>
      <Section
        number="05"
        title="Made to share"
        note="Landscape, square top models and story. Make one from your history."
        id="share"
      >
        <TerminalShare
          recap={r}
          github={ghTotal}
          githubDays={github}
          headline={sampleInsights[0]?.headline}
          synthetic
          previewOnly
        />
      </Section>
    </>
  );
}
