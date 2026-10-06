"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { PartialScanNotice } from "@/components/import/evidence";
import type { Recap, RecapPeriod } from "@/lib/recap";
import { developerNames, harnessNames, providerNames } from "@/lib/recap-names";
import {
  compact,
  dateLabel,
  dollars,
  dollarRate,
  integer,
  modelName,
  presentation,
} from "@/lib/terminal-presentation";
import { combinedActivity } from "@/lib/github-activity";
import { useGitHubActivity } from "@/lib/use-github-activity";
import type { PaidFigure } from "@/lib/use-paid-multiplier";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import type { ImportRecord } from "@/lib/worker-protocol";
import { DailyChart } from "./daily-chart";
import { BarList, Readout, Section, TightNumber } from "./primitives";
import { TerminalShare } from "./share";

export function Overview({
  recap: r,
  period,
  onPeriod,
  record,
  paid,
}: {
  recap: Recap;
  period: RecapPeriod;
  onPeriod: (p: RecapPeriod) => void;
  record?: ImportRecord | undefined;
  paid?: PaidFigure | undefined;
}) {
  const p = useMemo(() => presentation(r), [r]);
  const gh = useGitHubActivity();
  const [login, setLogin] = useState("");
  const activity = useMemo(
    () => (gh.calendar ? combinedActivity(gh.calendar, p.days) : undefined),
    [gh.calendar, p.days],
  );
  const ghDays = activity
    ? new Map(activity.days.map((d) => [d.date, d.contributions]))
    : undefined;
  const name = (id: string) => p.names.get(id) ?? id;
  const buckets = r.deep?.buckets;
  const maxHeat = Math.max(1, ...(r.deep?.hours.flat() ?? []));
  const labels = new Map(record?.localProjects?.map((x) => [x.hash, x.label]) ?? []);
  return (
    <div data-testid="recap-ready" data-period={period}>
      <div className="cmd">
        <div>
          <div className="path">
            <b>›</b> {dateLabel(r.start, true)} to {dateLabel(r.end, true)} · {r.days.length} DAYS ·{" "}
            {r.tools.length} TOOLS · {integer(r.records)} MODEL CALLS
          </div>
          <h1>Your AI coding, all of it.</h1>
        </div>
        <div className="cmdr">
          <fieldset className="seg" aria-label="Recap period">
            <legend className="sr-only">Recap period</legend>
            {(
              [
                ["30", "30D"],
                ["90", "90D"],
                ["all", "ALL"],
              ] as const
            ).map(([v, label]) => (
              <label key={v}>
                <input
                  type="radio"
                  name="recap-period"
                  checked={period === v}
                  aria-label={v === "all" ? "All time" : `${v} days`}
                  onChange={() => onPeriod(v)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <a className="btn primary" href="#share">
            SHARE ↗
          </a>
        </div>
      </div>
      {record && (
        <PartialScanNotice
          record={record}
          briefing
          action={<Link href="/app/scan">Scan again</Link>}
        />
      )}
      {record && isSyntheticWorkload(record) && (
        <p className="demo-note">Fictional demo. Scan your own history for your numbers.</p>
      )}
      <div className="grid12 hero">
        <div className="cell big">
          <div className="label">Total tokens</div>
          <div className="mega">
            <TightNumber value={compact(r.total)} />
          </div>
          <div className="sub">
            <b>{integer(r.total)}</b> tokens through {p.models.length} models
          </div>
          {buckets && (
            <div className="anat">
              <div className="abar" role="img" aria-label="Token composition">
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
                    <span>{label.toUpperCase()}</span>
                    <b>{compact(buckets[k])}</b>
                    <em>{((buckets[k] / Math.max(1, r.total)) * 100).toFixed(1)}%</em>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="side">
          <Readout
            label="API value"
            value={r.priced ? dollars(r.usd) : "unpriced"}
            signal
            note="AT LIST PRICES"
            testId="recap-value"
          />
          {paid ? (
            <Readout
              label="vs. what you paid"
              value={paid.text}
              note={`${dollars((Number(paid.monthlyUsd) * paid.days) / 30.4)} PAID OVER ${paid.days} DAYS`}
              testId="recap-paid"
            />
          ) : (
            <Readout
              label="vs. what you paid"
              value={
                <Link className="paid-link" href="/app/settings#what-you-pay">
                  Add plan price ↗
                </Link>
              }
              note="OPTIONAL · SAVED HERE"
            />
          )}
          <Readout
            label="Streak"
            value={integer(r.streak)}
            unit="days"
            note={`LONGEST ${r.longestStreak} DAYS`}
          />
          <Readout
            label="Sessions"
            value={integer(r.sessions)}
            note={`${r.days.filter((d) => d.records > 0).length} OF ${r.days.length} DAYS ACTIVE`}
          />
        </div>
      </div>
      <Section
        number="01"
        title="Tokens in, code out"
        note="AI tokens above the line. GitHub contributions below when connected."
      >
        <div className="grid12">
          <div className="cell act">
            <div className="legend">
              <span>
                <i style={{ background: "var(--signal)" }} />
                TOKENS / DAY
              </span>
              {activity && (
                <span>
                  <i style={{ background: "var(--gh)" }} />
                  GITHUB / DAY
                </span>
              )}
              {gh.login && (
                <span className="ghuser">
                  @{gh.login.toUpperCase()} ·
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => void gh.refresh()}
                    aria-label="Refresh GitHub"
                  >
                    REFRESH
                  </button>
                  ·{" "}
                  <button
                    className="text-button"
                    type="button"
                    aria-label="Disconnect"
                    onClick={gh.disconnect}
                  >
                    DISCONNECT
                  </button>
                </span>
              )}
            </div>
            <DailyChart
              days={p.days.map((d) => ({ date: d.date, value: d.total }))}
              github={ghDays}
            />
            {gh.state !== "ready" && (
              <form
                className="connect"
                onSubmit={(e) => {
                  e.preventDefault();
                  void gh.connect(login);
                }}
              >
                <label htmlFor="github-login">GitHub username</label>
                <input
                  id="github-login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="username"
                  autoComplete="off"
                  required
                />
                <button className="btn" type="submit" disabled={gh.state === "loading"}>
                  {gh.state === "loading" ? "Connecting…" : "Connect"}
                </button>
                {gh.error && <p role="alert">{gh.error}</p>}
              </form>
            )}
          </div>
          <div className="actside">
            <Readout
              label="GitHub contributions"
              value={activity ? integer(activity.contributions) : "Connect GitHub"}
            />
            <Readout
              label="Tokens per contribution"
              value={
                activity?.tokensPerContribution
                  ? compact(activity.tokensPerContribution)
                  : "No count yet"
              }
            />
            <Readout
              label="Days shipping with AI"
              value={activity ? activity.longestJointStreak : "Connect to compare"}
              unit={activity ? "days" : undefined}
            />
            <Readout
              label="Biggest shipping day"
              value={activity?.bestDay ? integer(activity.bestDay.count) : "See your best day"}
              note={activity?.bestDay ? dateLabel(activity.bestDay.date).toUpperCase() : undefined}
            />
          </div>
        </div>
      </Section>
      <Section
        number="02"
        title="Speed"
        note="Output tokens per second, from prompt to finished reply. Band shows the middle half."
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
                  {name(s.id)}
                </div>
                <div
                  className="strack"
                  aria-label={`${s.p25.toFixed(1)} to ${s.p75.toFixed(1)} tokens per second`}
                >
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i
                      key={i}
                      className="sgrid"
                      style={i === 4 ? { right: 0 } : { left: `${i * 25}%` }}
                    />
                  ))}
                  <div
                    className="sband"
                    style={{
                      left: `${(s.p25 / p.speedAxis) * 100}%`,
                      width: `${((s.p75 - s.p25) / p.speedAxis) * 100}%`,
                      background: p.colors.get(s.id) ?? "var(--signal)",
                    }}
                  />
                  <div className="smed" style={{ left: `${(s.median / p.speedAxis) * 100}%` }} />
                </div>
                <div className="sval">
                  <b>{s.median.toFixed(1)}</b>
                  <small>tok/s</small>
                </div>
                <div className="snum swait">
                  <span className="mobile-only">WAIT </span>
                  {s.wait.toFixed(1)}s
                </div>
                <div className="snum sreplies">
                  {integer(s.n)}
                  <span className="mobile-only"> REPLIES</span>
                </div>
              </div>
            ))}
            {!p.speeds.length && (
              <p className="empty-speed">No reply timing in this history yet.</p>
            )}
          </div>
          <div className="sins">
            <Readout
              label="Fastest"
              value={p.fastest ? p.fastest.median.toFixed(1) : "Unreported"}
              unit={p.fastest ? "tok/s" : undefined}
              note={p.fastest ? name(p.fastest.id) : undefined}
            />
            <Readout
              label="Your workhorse"
              value={p.workhorse ? p.workhorse.median.toFixed(1) : "Unreported"}
              unit={p.workhorse ? "tok/s" : undefined}
              note={
                p.workhorse
                  ? `${name(p.workhorse.id)} · ${integer(p.workhorse.n)} REPLIES`
                  : undefined
              }
            />
            <Readout
              label="Spread"
              value={
                p.fastest && p.slowest && p.slowest.median > 0
                  ? `${(p.fastest.median / p.slowest.median).toFixed(1)}×`
                  : "Unreported"
              }
              note={
                p.fastest && p.slowest
                  ? `${name(p.fastest.id)} vs ${name(p.slowest.id)}`
                  : undefined
              }
            />
            {p.workhorse && (
              <div className="cell">
                <p className="callout">
                  <b>{name(p.workhorse.id)}</b> wrote {p.workhorse.median.toFixed(1)} tokens a
                  second across {integer(p.workhorse.n)} replies.
                </p>
              </div>
            )}
          </div>
        </div>
      </Section>
      <Section
        number="03"
        title="Models"
        note={`${p.models.length} models. API value uses each developer's list price.`}
      >
        <div className="grid12">
          <div className="cell tablecell">
            <table className="desktop-models" aria-label="Models in this period">
              <thead>
                <tr>
                  {[
                    "#",
                    "MODEL",
                    "DEVELOPER",
                    "TOKENS",
                    "SHARE",
                    "API VALUE",
                    "SESSIONS",
                    "TOK/S",
                    "FIRST USED",
                  ].map((s, i) => (
                    <th key={s} className={[0, 3, 5, 6, 7].includes(i) ? "num" : undefined}>
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.top.map((m, i) => {
                  const s = p.speeds.find((s) => s.id === m.id),
                    first = r.deep?.firstSeen.find((f) => f.id === m.id);
                  return (
                    <tr key={m.id}>
                      <td className="num dim">{String(i + 1).padStart(2, "0")}</td>
                      <td data-label="MODEL">
                        <span className="mn">
                          <i style={{ background: p.colors.get(m.id) }} />
                          {modelName(m.name)}
                        </span>
                      </td>
                      <td className="dim" data-label="DEVELOPER">
                        {developerNames[m.family] ?? m.family}
                      </td>
                      <td className="num" data-label="TOKENS">
                        {compact(m.total)}
                      </td>
                      <td data-label="SHARE">
                        <div className="sharecell">
                          <div className="sharebar">
                            <div
                              style={{
                                width: `${(m.total / Math.max(1, p.top[0]?.total ?? 0)) * 100}%`,
                                background: p.colors.get(m.id),
                              }}
                            />
                          </div>
                          <span>{((m.total / Math.max(1, r.total)) * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="num" data-label="API VALUE">
                        {m.priced ? dollars(m.usd) : <span className="faint">unpriced</span>}
                      </td>
                      <td className="num" data-label="SESSIONS">
                        {integer(r.explorer?.modelSessions[m.id] ?? 0)}
                      </td>
                      <td className="num" data-label="TOK/S">
                        {s ? s.median.toFixed(1) : "·"}
                      </td>
                      <td className="num dim" data-label="FIRST USED">
                        {first ? dateLabel(first.date).toUpperCase() : "·"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mobile-models" role="group" aria-label="Models in this period">
              {p.top.map((m) => {
                const speed = p.speeds.find((s) => s.id === m.id);
                const first = r.deep?.firstSeen.find((f) => f.id === m.id);
                return (
                  <div className="mobile-model" key={m.id}>
                    <div className="mobile-model-main">
                      <span className="mn">
                        <i style={{ background: p.colors.get(m.id) }} />
                        {modelName(m.name)}
                      </span>
                      <span className="num">{compact(m.total)}</span>
                      <div className="sharecell">
                        <div className="sharebar">
                          <div
                            style={{
                              width: `${(m.total / Math.max(1, r.total)) * 100}%`,
                              background: p.colors.get(m.id),
                            }}
                          />
                        </div>
                        <span>{((m.total / Math.max(1, r.total)) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <p className="mobile-model-meta">
                      {m.priced ? dollars(m.usd) : "unpriced"} ·{" "}
                      {integer(r.explorer?.modelSessions[m.id] ?? 0)} sessions ·{" "}
                      {speed ? `${speed.median.toFixed(1)} tok/s` : "timing unreported"} ·{" "}
                      {first ? dateLabel(first.date).toUpperCase() : "first use unreported"}
                    </p>
                  </div>
                );
              })}
            </div>
            {p.tail.length > 0 && (
              <div className="tail">
                <span className="label">+ {p.tail.length} more</span>
                {p.tail.map((m) => (
                  <span className="tl" key={m.id}>
                    <i style={{ background: p.colors.get(m.id) }} />
                    {m.family === "other" ? m.id : modelName(m.name)}
                    <b>{compact(m.total)}</b>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>
      <Section
        number="04"
        title="Value"
        note={`Estimated at list prices checked ${dateLabel(r.rulesAsOf, true)}. Not an invoice.`}
      >
        <div className="grid12">
          <div className="cell cost">
            <div className="legend">
              <span>
                <i style={{ background: "var(--signal)" }} />
                API VALUE / DAY
              </span>
            </div>
            <DailyChart days={p.costDays} cost />
          </div>
          <div className="costside">
            <Readout
              label="Per day"
              value={r.priced ? dollars(Number(r.usd) / Math.max(1, r.days.length)) : "unpriced"}
            />
            <Readout
              label="Per 1M tokens"
              value={
                r.priced ? dollarRate((Number(r.usd) / Math.max(1, r.total)) * 1e6) : "unpriced"
              }
            />
            <Readout
              label="Priciest day"
              value={p.peakCost?.value ? dollars(p.peakCost.value) : "unpriced"}
              note={p.peakCost?.value ? dateLabel(p.peakCost.date).toUpperCase() : undefined}
            />
            <Readout
              label="Saved by cache"
              value={r.deep?.cacheSavingsRecords ? dollars(r.deep.cacheSavings) : "Unreported"}
              signal
            />
            <div className="cell kv">
              <div className="label">Most valuable model</div>
              <div className="model-value">
                {p.topCost
                  ? `${modelName(p.topCost.name)} · ${dollars(p.topCost.usd)}`
                  : "unpriced"}
              </div>
            </div>
          </div>
        </div>
      </Section>
      <Section
        number="05"
        title="Rhythm"
        note="Model calls by hour, in your local time. Monday first."
      >
        <div className="grid12">
          <div className="cell rhythm">
            <div className="heat" role="img" aria-label="Model calls by weekday and local hour">
              {[1, 2, 3, 4, 5, 6, 0].map((d, i) => (
                <div className="heat-row" key={d}>
                  {<div className="hd">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][i]}</div>}
                  {Array.from({ length: 24 }, (_, h) => (
                    <div
                      className="hc"
                      key={h}
                      style={
                        { "--v": ((r.deep?.hours[d]?.[h] ?? 0) / maxHeat) ** 0.7 } as CSSProperties
                      }
                      title={`${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]} ${String(h).padStart(2, "0")}:00 · ${integer(r.deep?.hours[d]?.[h] ?? 0)} calls`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="hticks">
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h}>{h % 3 === 0 ? String(h).padStart(2, "0") : ""}</span>
              ))}
            </div>
          </div>
          <div className="rside">
            <Readout label="Peak hour" value={`${String(p.peakHour).padStart(2, "0")}:00`} />
            <Readout label="Busiest day" value={dateLabel(r.busiestDay).toUpperCase()} />
            <Readout
              label="After midnight"
              value={`${Math.round(r.lateNightShare * 100)}%`}
              note="MIDNIGHT TO 5 AM"
            />
            <Readout label="Weekends" value={`${Math.round((r.deep?.weekendShare ?? 0) * 100)}%`} />
          </div>
        </div>
      </Section>
      <Section
        number="06"
        title="Your stack"
        note="Where tokens ran, who served them, and what you built."
      >
        <div className="grid12">
          <BarList
            label="Tools"
            rows={(r.deep?.harnesses ?? r.tools).map((t) => ({
              name: harnessNames[t.id] ?? t.id,
              total: t.total,
            }))}
          />
          <BarList
            label="Served by"
            rows={(r.deep?.providers ?? []).map((t) => ({
              name: providerNames[t.id] ?? t.id,
              total: t.total,
            }))}
          />
          <BarList
            label="Projects · private"
            rows={(r.deep?.projects ?? []).map((t, i) => ({
              name: labels.get(t.hash) ?? `Local project ${i + 1}`,
              total: t.total,
            }))}
          />
        </div>
      </Section>
      <Section
        number="07"
        title="Debuts"
        note={`The day each model first showed up in your history. ${r.deep?.firstSeen.length ?? 0} so far.`}
      >
        <div className="grid12">
          <div className="cell logbox">
            {(r.deep?.firstSeen ?? []).map((f) => (
              <div className="logl" key={f.id}>
                <time dateTime={f.date}>{dateLabel(f.date).toUpperCase()}</time>
                <span className="plus">+</span>
                <i style={{ background: p.colors.get(f.id) ?? "var(--dim)" }} />
                <span>{name(f.id)}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>
      <Section
        number="08"
        title="Share"
        note="Pick the numbers. Projects never appear on cards."
        id="share"
      >
        <TerminalShare
          recap={r}
          paid={paid}
          github={activity?.contributions}
          synthetic={record && isSyntheticWorkload(record)}
        />
      </Section>
    </div>
  );
}
