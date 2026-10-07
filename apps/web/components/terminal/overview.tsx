"use client";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { PartialScanNotice } from "@/components/import/evidence";
import { combinedActivity } from "@/lib/github-activity";
import { pricingCoverage, type Recap, type RecapPeriod, requestCountOf } from "@/lib/recap";
import { recapInsights } from "@/lib/recap-insights";
import { developerNames, harnessNames, providerNames } from "@/lib/recap-names";
import { recapPeriodOptions } from "@/lib/recap-periods";
import type { SkippedSource } from "@/lib/skipped-sources";
import {
  activeDays,
  compact,
  dateLabel,
  dollarRate,
  dollars,
  integer,
  modelDisplayName,
  namedModelCount,
  periodFirstSeen,
  plural,
  presentation,
  pricedRequestShare,
  tokenSplit,
  unresolvedModel,
} from "@/lib/terminal-presentation";
import { useGitHubActivity } from "@/lib/use-github-activity";
import type { PaidFigure } from "@/lib/use-paid-multiplier";
import type { ImportRecord } from "@/lib/worker-protocol";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import { DailyChart } from "./daily-chart";
import { InsightStrip } from "./insights";
import { BarList, HeatLegend, Readout, Section, TightNumber } from "./primitives";
import { TerminalShare } from "./share";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function Overview({
  recap: r,
  period,
  onPeriod,
  record,
  paid,
  skipped,
}: {
  recap: Recap;
  period: RecapPeriod;
  onPeriod: (p: RecapPeriod) => void;
  record?: ImportRecord | undefined;
  paid?: PaidFigure | undefined;
  /** Tools discovery found but this recap left out on purpose. */
  skipped?: SkippedSource[] | undefined;
}) {
  const p = useMemo(() => presentation(r), [r]);
  const activeCount = activeDays(r);
  const named = namedModelCount(r);
  const requests = requestCountOf(r);
  const split = tokenSplit(r);
  const pricedShare = pricedRequestShare(r);
  const debuts = periodFirstSeen(r);
  const gh = useGitHubActivity();
  const [login, setLogin] = useState("");
  // The all-history span decides which shorter periods add anything. The saved
  // scan metadata is available before the all-time recap is recomputed.
  const historySpanDays = useMemo(() => {
    const first = record?.summary.firstEventAt;
    if (!first) return r.period === "all" ? r.days.length : undefined;
    const firstMs = Date.parse(`${first.slice(0, 10)}T12:00:00Z`);
    const endMs = Date.parse(`${r.end}T12:00:00Z`);
    if (!Number.isFinite(firstMs) || !Number.isFinite(endMs)) return undefined;
    return Math.max(1, Math.round((endMs - firstMs) / 86_400_000) + 1);
  }, [record, r.end, r.period, r.days.length]);
  const periodOptions = useMemo(() => recapPeriodOptions(historySpanDays), [historySpanDays]);
  useEffect(() => {
    if (!periodOptions.some(([value]) => value === period)) onPeriod("all");
  }, [periodOptions, period, onPeriod]);
  const activity = useMemo(
    () => (gh.calendar ? combinedActivity(gh.calendar, p.days) : undefined),
    [gh.calendar, p.days],
  );
  const ghDays = activity
    ? new Map(activity.days.map((d) => [d.date, d.contributions]))
    : undefined;
  const name = (id: string) => p.names.get(id) ?? modelDisplayName(id);
  const buckets = r.deep?.buckets;
  const maxHeat = Math.max(1, ...(r.deep?.hours.flat() ?? []));
  const labels = new Map(record?.localProjects?.map((x) => [x.hash, x.label]) ?? []);
  const githubMatchesPeriod =
    Boolean(gh.calendar) && p.days.every((d) => Object.hasOwn(gh.calendar!.days, d.date));
  const insights = useMemo(
    () => recapInsights(r, githubMatchesPeriod ? activity : undefined, paid),
    [r, githubMatchesPeriod, activity, paid],
  );
  return (
    <div data-testid="recap-ready" data-period={period}>
      <div className="cmd">
        <div>
          <div className="path">
            <b>›</b> {dateLabel(r.start, true)} to {dateLabel(r.end, true)} ·{" "}
            {plural(r.days.length, "DAY", "DAYS")} ·{" "}
            {plural(r.tools.length, "LOG SOURCE", "LOG SOURCES")} · {integer(requests)} REQUESTS
            LOGGED
            {r.aggregateRecords > 0
              ? ` · ${integer(r.aggregateRecords)} SESSION SUMMARIES EXCLUDED`
              : ""}
          </div>
          <h1>Your AI coding, all of it.</h1>
        </div>
        <div className="cmdr">
          <fieldset className="seg" aria-label="Recap period">
            <legend className="sr-only">Recap period</legend>
            {periodOptions.map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="recap-period"
                  checked={period === value}
                  aria-label={value === "all" ? "All time" : `${value} days`}
                  onChange={() => onPeriod(value)}
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
      {skipped !== undefined && skipped.length > 0 && (
        <p className="recap-skipped" data-testid="skipped-tool-notice">
          {skipped.map((source) => source.name).join(" · ")} {skipped.length === 1 ? "was" : "were"}{" "}
          found but not included · <Link href="/app/scan">Connect it</Link>
        </p>
      )}
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
          {split && (
            <p className="cache-share">
              {Math.round(split.cacheShare * 100)}% is cached context your tools re-read
            </p>
          )}
          <div className="sub">
            <b>{integer(r.total)}</b> tokens through {p.models.length} models · {named} named
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
            note={
              r.priced
                ? `LIST-PRICE ESTIMATE · ${pricedShare}% OF REQUESTS PRICED`
                : "NO REQUESTS PRICED"
            }
            testId="recap-value"
          />
          <Readout
            label="New tokens"
            value={split ? compact(split.newTokens) : "Unreported"}
            note="INPUT + OUTPUT + CACHE WRITE"
          />
          {paid ? (
            <Readout
              label="vs. plan price"
              value={paid.text}
              note={`${dollars((Number(paid.monthlyUsd) * paid.days) / 30.4)} PLAN PRICE OVER ${paid.days} DAYS`}
              testId="recap-paid"
            />
          ) : (
            <Readout
              label="vs. plan price"
              value={
                <Link className="paid-link" href="/app/settings#what-you-pay">
                  Add plan price ↗
                </Link>
              }
              note="OPTIONAL · SAVED HERE"
            />
          )}
          <Readout
            label="Current streak"
            value={integer(r.streak)}
            unit="days"
            note={`ALL TIME · LONGEST ${integer(r.longestStreak)}`}
          />
          <Readout
            label="Sessions"
            value={integer(r.sessions)}
            note={`${integer(activeCount)} OF ${plural(r.days.length, "DAY", "DAYS")} ACTIVE`}
          />
        </div>
      </div>
      <InsightStrip insights={insights} />
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
          </div>
          {!activity ? (
            <div className="actside connect-side">
              <div className="cell">
                <div className="label">GitHub</div>
                <p className="connect-copy">
                  Add your GitHub username to mirror your public contributions under the token bars
                  and see how the two line up.
                </p>
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
              </div>
            </div>
          ) : (
            <div className="actside">
              <Readout label="GitHub contributions" value={integer(activity.contributions)} />
              <Readout
                label="Tokens per contribution"
                value={
                  activity.tokensPerContribution ? compact(activity.tokensPerContribution) : "None"
                }
              />
              <Readout
                label="Days with AI and GitHub"
                value={activity.longestJointStreak}
                unit="days"
                note="LONGEST RUN"
              />
              <Readout
                label="Most GitHub contributions in a day"
                value={activity.bestDay ? integer(activity.bestDay.count) : "None"}
                note={activity.bestDay ? dateLabel(activity.bestDay.date).toUpperCase() : undefined}
              />
            </div>
          )}
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
                <div
                  className={`sname${unresolvedModel(s.id, r.models.find((m) => m.id === s.id)?.name) ? " dim" : ""}`}
                >
                  <i style={{ background: p.colors.get(s.id) }} />
                  {name(s.id)}
                </div>
                <div
                  role="img"
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
                p.speeds.length < 2
                  ? "One timed model"
                  : p.fastest && p.slowest && p.slowest.median > 0
                    ? `${(p.fastest.median / p.slowest.median).toFixed(1)}×`
                    : "Unreported"
              }
              note={
                p.speeds.length < 2
                  ? "NEEDS TWO TIMED MODELS"
                  : p.fastest && p.slowest
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
        note={`${p.models.length} models · ${named} named. API value is a low-bound list-price estimate for priced requests only. A session can span models.`}
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
                    "FIRST USED (ALL TIME)",
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
                    first = r.deep?.firstSeen.find((f) => f.id === m.id),
                    coverage = pricingCoverage(m);
                  return (
                    <tr key={m.id}>
                      <td className="num dim">{String(i + 1).padStart(2, "0")}</td>
                      <td data-label="MODEL">
                        <span className={`mn${unresolvedModel(m.id, m.name) ? " dim" : ""}`}>
                          <i style={{ background: p.colors.get(m.id) }} />
                          {name(m.id)}
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
                        {coverage === "none" ? (
                          <span className="faint">unpriced</span>
                        ) : coverage === "partial" ? (
                          <span className="faint">partly priced</span>
                        ) : (
                          dollars(m.usd)
                        )}
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
            <section className="mobile-models" aria-label="Models in this period">
              {p.top.map((m) => {
                const speed = p.speeds.find((s) => s.id === m.id);
                const first = r.deep?.firstSeen.find((f) => f.id === m.id);
                const coverage = pricingCoverage(m);
                return (
                  <div className="mobile-model" key={m.id}>
                    <div className="mobile-model-main">
                      <span className={`mn${unresolvedModel(m.id, m.name) ? " dim" : ""}`}>
                        <i style={{ background: p.colors.get(m.id) }} />
                        {name(m.id)}
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
                      {coverage === "none"
                        ? "unpriced"
                        : coverage === "partial"
                          ? "partly priced"
                          : dollars(m.usd)}{" "}
                      · {plural(r.explorer?.modelSessions[m.id] ?? 0, "session", "sessions")} ·{" "}
                      {speed ? `${speed.median.toFixed(1)} tok/s` : "timing unreported"} ·{" "}
                      {first ? dateLabel(first.date).toUpperCase() : "first use unreported"}
                    </p>
                  </div>
                );
              })}
            </section>
            {p.tail.length > 0 && (
              <details className="tail" open>
                <summary className="label">Unidentified labels ({p.tail.length})</summary>
                <p className="tail-note">
                  Log entries whose model the catalog does not name. No identity is guessed.
                </p>
                {p.tail.map((m) => {
                  const s = p.speeds.find((speed) => speed.id === m.id);
                  const first = r.deep?.firstSeen.find((f) => f.id === m.id);
                  const sessions = r.explorer?.modelSessions[m.id] ?? 0;
                  const coverage = pricingCoverage(m);
                  return (
                    <span className={`tl${unresolvedModel(m.id, m.name) ? " dim" : ""}`} key={m.id}>
                      <i style={{ background: p.colors.get(m.id) }} />
                      <b>{name(m.id)}</b>
                      <span>{compact(m.total)} tokens</span>
                      <span>{plural(sessions, "session", "sessions")}</span>
                      <span>{s ? `${s.median.toFixed(1)} tok/s` : "timing unreported"}</span>
                      <span>
                        {first
                          ? `first used ${dateLabel(first.date).toUpperCase()}`
                          : "first use unreported"}
                      </span>
                      <span>
                        {coverage === "none"
                          ? "unpriced"
                          : coverage === "partial"
                            ? "partly priced"
                            : dollars(m.usd)}
                      </span>
                      <span>{developerNames[m.family] ?? "developer unknown"}</span>
                    </span>
                  );
                })}
              </details>
            )}
          </div>
        </div>
      </Section>
      <Section
        number="04"
        title="Value"
        note={`Estimated at list prices. Calculated ${dateLabel(r.rulesAsOf, true)}. Not an invoice.`}
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
              label="Per active day"
              value={r.priced ? dollars(Number(r.usd) / Math.max(1, activeCount)) : "unpriced"}
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
              label="Cache discount"
              value={r.deep?.cacheSavingsRecords ? dollars(r.deep.cacheSavings) : "Unreported"}
              signal
              note="FULL INPUT PRICE VS CACHED"
            />
            <div className="cell kv">
              <div className="label">Highest API value model</div>
              <div className="model-value">
                {p.topCost
                  ? `${name(p.topCost.id)} · ${dollars(p.topCost.usd)}${
                      pricingCoverage(p.topCost) === "partial" ? " · partly priced" : ""
                    }`
                  : "unpriced"}
              </div>
            </div>
          </div>
        </div>
      </Section>
      <Section
        number="05"
        title="Rhythm"
        note="Requests by hour, in your local time. Monday first."
      >
        <div className="grid12">
          <div className="cell rhythm">
            <div className="heat" role="img" aria-label="Model calls by weekday and local hour">
              {[1, 2, 3, 4, 5, 6, 0].map((d, i) => (
                <div className="heat-row" key={d}>
                  {<div className="hd">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][i]}</div>}
                  {HOURS.map((h) => (
                    <div
                      className="hc"
                      key={h}
                      style={
                        { "--v": ((r.deep?.hours[d]?.[h] ?? 0) / maxHeat) ** 0.7 } as CSSProperties
                      }
                      title={`${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]} ${String(h).padStart(2, "0")}:00 · ${integer(r.deep?.hours[d]?.[h] ?? 0)} requests`}
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
            <HeatLegend max={maxHeat} />
          </div>
          <div className="rside">
            <Readout label="Peak hour" value={`${String(p.peakHour).padStart(2, "0")}:00`} />
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
            label="Apps & agents"
            rows={(r.deep?.harnesses ?? r.tools).map((t) => ({
              id: t.id,
              name: harnessNames[t.id] ?? t.id,
              total: t.total,
            }))}
          />
          <BarList
            label="Served by · inferred where unrecorded"
            rows={(r.deep?.providers ?? []).map((t) => ({
              id: t.id,
              name: providerNames[t.id] ?? t.id,
              total: t.total,
            }))}
          />
          <BarList
            label="Projects · private"
            rows={(r.deep?.projects ?? []).map((t, i) => ({
              id: t.hash,
              name: labels.get(t.hash) ?? `Local project ${i + 1}`,
              total: t.total,
            }))}
          />
        </div>
      </Section>
      <Section
        number="07"
        title={r.period === "all" ? "First seen" : "New this period"}
        note={
          r.period === "all"
            ? `The day each model first showed up in your history. ${debuts.length} so far.`
            : `Models first seen in this period: ${debuts.length}. Earlier first-use dates stay in the table.`
        }
      >
        <div className="grid12">
          <div className="cell logbox">
            {debuts.length === 0 ? (
              <p className="dim">No new models in this period.</p>
            ) : (
              debuts.map((f) => (
                <div className="logl" key={f.id}>
                  <time dateTime={f.date}>{dateLabel(f.date).toUpperCase()}</time>
                  <span className="plus">+</span>
                  <i style={{ background: p.colors.get(f.id) ?? "var(--dim)" }} />
                  <span>{name(f.id)}</span>
                </div>
              ))
            )}
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
          githubDays={ghDays}
          headline={insights[0]?.headline}
          synthetic={record && isSyntheticWorkload(record)}
        />
      </Section>
    </div>
  );
}
