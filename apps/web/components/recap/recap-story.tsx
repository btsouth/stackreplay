/* biome-ignore-all lint/a11y/noNoninteractiveTabindex: The scrolling model timeline needs keyboard focus. */
import { type CSSProperties, type ReactNode, useId, useRef, useState } from "react";
import { familyColors, type Recap, type RecapPeriod } from "@/lib/recap";
import { compactNumber, recapUsd } from "@/lib/recap-card";
import { harnessNames, providerNames } from "@/lib/recap-deep";
import { CostTrend, Heatmap, Mix, shortDate } from "./recap-charts";
export function Info({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const popup = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  return (
    <span className="recap-info">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const width = Math.min(320, window.innerWidth - 32);
          setPosition({
            left: Math.max(16, Math.min(window.innerWidth - width - 16, box.right - width)),
            top: Math.max(16, Math.min(box.bottom + 8, window.innerHeight - 280)),
          });
          popup.current?.togglePopover();
        }}
      >
        i
      </button>
      <span
        id={id}
        ref={popup}
        popover="auto"
        role="note"
        style={position}
        onToggle={(event) => setOpen((event.nativeEvent as ToggleEvent).newState === "open")}
      >
        {children}
      </span>
    </span>
  );
}

function Heading({ number, title, note }: { number: string; title: string; note: string }) {
  return (
    <div className="recap-section-heading">
      <div>
        <span className="recap-eyebrow">{number.split(" / ")[0]}</span>
        <h2>{title}</h2>
      </div>
      <p>{note}</p>
    </div>
  );
}
function Facts({ values }: { values: [string, string][] }) {
  return (
    <div className="recap-fact-strip">
      {values.map(([v, l]) => (
        <div key={l}>
          <strong>{v}</strong>
          <span>
            {l}
            {l === "active days" && (
              <Info label="What counts as an active day">
                An active day has at least one usage record from any scanned source, in your local
                timezone. Hermes aggregates without per-call timestamps mark the days they were
                first and last seen. Tokens and costs stay on the recorded end date. Current streak
                counts back from today, or from yesterday until today's first activity. Longest
                streak uses all supplied history. The period filter only scopes volume, costs and
                charts.
              </Info>
            )}
            {l === "sessions" && (
              <Info label="What counts as a session">
                Sessions include recorded child agents; they are not a count of human conversations.
              </Info>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
function Routes({
  rows,
  names,
  total,
}: {
  rows: { id: string; total: number; records: number }[];
  names: Record<string, string>;
  total: number;
}) {
  return (
    <div className="recap-routes">
      {rows
        .filter((r) => r.total > 0)
        .map((r, i) => (
          <div
            key={r.id}
            style={
              {
                "--route-color": i % 2 ? "var(--recap-card-accent)" : "var(--accent)",
              } as CSSProperties
            }
          >
            <div>
              <span className="recap-route-index">{String(i + 1).padStart(2, "0")}</span>
              <strong>{names[r.id] ?? r.id}</strong>
              <span>
                {compactNumber(r.total)} <small>tokens</small>
              </span>
              <b>{((r.total / Math.max(1, total)) * 100).toFixed(1)}%</b>
            </div>
            <div className="recap-route-track">
              <i style={{ width: `${(r.total / Math.max(1, total)) * 100}%` }} />
            </div>
          </div>
        ))}
    </div>
  );
}
export function RecapStory({
  recap,
  period,
  projects,
  multiplierText,
}: {
  recap: Recap;
  period: RecapPeriod;
  projects: { hash: string; label: string }[];
  multiplierText?: string;
}) {
  const d = recap.deep;
  const total = recap.total;
  const names = new Map(recap.models.map((m) => [m.id, m.name]));
  const topCost = [...recap.models]
    .filter((m) => m.priced)
    .sort((a, b) => Number(b.usd) - Number(a.usd))[0];
  const peakCost = [...(d?.costDays ?? [])].sort((a, b) => Number(b.usd) - Number(a.usd))[0];
  const maxSpeed = Math.max(1, ...(d?.speeds ?? []).map((s) => s.p75));
  const maxHour = Math.max(1, ...(d?.hours.flat() ?? []));
  const projectRows = (d?.projects ?? []).flatMap((p) => {
    const label = projects.find((x) => x.hash === p.hash)?.label;
    return label ? [{ ...p, label }] : [];
  });
  return (
    <>
      <section className="recap-hero" aria-label="Volume">
        <div className="recap-hero-top">
          <span className="recap-eyebrow">
            01 · {shortDate(recap.start)} to {shortDate(recap.end)}
          </span>
          <span className="recap-local">● ONLY IN YOUR BROWSER</span>
        </div>
        <div className="recap-volume-layout">
          <div>
            <div className="recap-hero-number">
              {compactNumber(recap.totalKnown ? total : recap.records)}
            </div>
            <p className="recap-volume-caption">
              {recap.totalKnown ? (
                <>
                  tokens through
                  <br />
                  your stack.
                </>
              ) : (
                "logged activity records."
              )}
            </p>
            <p className="recap-volume-note">
              Your AI coding, replayed.
              <Info label="About token volume">
                <span className="recap-info-paragraph">
                  Reported categories only. Input, output and cache are made disjoint using each
                  source's accounting declarations. Output includes separately reported reasoning.
                  Missing categories are excluded.
                </span>
                <span className="recap-info-paragraph">
                  {recap.totalKnown.toLocaleString()} of {recap.records.toLocaleString()} records
                  report tokens. This is local logged activity, including agents, not human work
                  time.
                </span>
              </Info>
            </p>
          </div>
          {d && total > 0 && (
            <div className="recap-token-composition">
              <span className="recap-eyebrow">The anatomy of your volume</span>
              <div className="recap-token-stack" role="img" aria-label="Token category composition">
                {(
                  [
                    ["input", "Input"],
                    ["output", "Output"],
                    ["read", "Cache read"],
                    ["write", "Cache write"],
                  ] as const
                )
                  .filter(([k]) => d.buckets[k] > 0)
                  .map(([k, label]) => (
                    <i
                      key={k}
                      className={`bucket-${k}`}
                      style={{ flex: d.buckets[k] }}
                      title={`${label}: ${d.buckets[k].toLocaleString()} tokens`}
                    />
                  ))}
              </div>
              <div className="recap-token-labels">
                {(
                  [
                    ["input", "Uncached input"],
                    ["output", "Output + reasoning"],
                    ["read", "Cache read"],
                    ["write", "Cache write"],
                  ] as const
                )
                  .filter(([k]) => d.buckets[k] > 0)
                  .map(([k, label]) => (
                    <div key={k}>
                      <span>
                        <i className={`bucket-${k}`} />
                        {label}
                      </span>
                      <strong>{compactNumber(d.buckets[k])}</strong>
                      <small>{((d.buckets[k] / total) * 100).toFixed(1)}%</small>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <Facts
          values={[
            ...(recap.sessions
              ? [[recap.sessions.toLocaleString(), "sessions"] as [string, string]]
              : []),
            [String(recap.days.filter((x) => x.records).length), "active days"],
            [String(recap.streak), "current streak"],
          ]}
        />
      </section>
      <section className="recap-chapter recap-activity">
        <Heading
          number="02 / CONSISTENCY"
          title="You kept showing up."
          note={`${recap.longestStreak} days · longest streak (all time)`}
        />
        <Heatmap recap={recap} period={period} />
      </section>
      {recap.priced > 0 && (
        <section className="recap-chapter recap-cost">
          <Heading
            number="03 / API EQUIVALENT"
            title="The scale behind the work."
            note="Current list prices. A scenario, not an invoice."
          />
          <div className="recap-cost-layout">
            <div>
              <strong className="recap-cost-number">{recapUsd(recap.usd)}</strong>
              <div className="recap-hero-caption">
                of AI coding at API prices
                <Info label="How API-equivalent value is calculated">
                  <span className="recap-info-paragraph">
                    Repriced at each model developer's direct API catalog list rates as of{" "}
                    {recap.rulesAsOf}. This is independent of the serving provider and
                    subscriptions.
                  </span>
                  <span className="recap-info-paragraph">
                    {recap.priced.toLocaleString()} of {recap.records.toLocaleString()} records
                    priced ({Math.round((recap.priced / recap.records) * 100)}%). Unknown prices and
                    incomplete usage are excluded.
                  </span>
                  {recap.usdHigh !== recap.usd && (
                    <span className="recap-info-paragraph">
                      Unreported cache-write lifetimes yield {recapUsd(recap.usd)} to{" "}
                      {recapUsd(recap.usdHigh)}. The headline uses the lower documented cache-write
                      scenario.
                    </span>
                  )}
                  <span className="recap-info-paragraph">
                    Not historical spending or money saved.
                  </span>
                </Info>
              </div>
              {multiplierText && (
                <p className="recap-plan-comparison">
                  <strong>{multiplierText}</strong>
                  <Info label="How the payment multiplier is calculated">
                    <span className="recap-info-paragraph">
                      API value divided by confirmed monthly list-price subscriptions ×{" "}
                      {recap.days.length} / 30.4. A scenario excluding taxes, discounts, plan
                      changes and separate API charges.
                    </span>
                  </Info>
                </p>
              )}
              <p className="recap-priced-coverage">
                {Math.round((recap.priced / recap.records) * 100)}% of usage records priced
              </p>
            </div>
            {d && <CostTrend recap={recap} period={period} />}
          </div>
          <div className="recap-cost-facts">
            {topCost && (
              <div>
                <span>Most expensive model</span>
                <strong>{topCost.name}</strong>
                <small>
                  {recapUsd(topCost.usd)}
                  <Info label="About the model API equivalent">
                    {topCost.priced.toLocaleString()} of {topCost.records.toLocaleString()} records
                    priced. Unknown prices and incomplete usage are excluded. A scenario, not an
                    invoice.
                  </Info>
                </small>
              </div>
            )}
            {peakCost && (
              <div>
                <span>Most expensive day</span>
                <strong>{shortDate(peakCost.date)}</strong>
                <small>
                  {recapUsd(peakCost.usd)}
                  <Info label="About the day API equivalent">
                    Only records with established prices and complete usage contribute to this
                    value. A scenario, not an invoice.
                  </Info>
                </small>
              </div>
            )}
            {d && d.cacheSavingsRecords > 0 && (
              <div>
                <span>
                  Cache read advantage{" "}
                  <Info label="About cache savings">
                    <span className="recap-info-paragraph">
                      List-price difference between recorded cache reads and the same input
                      uncached, using the same engine rate conditions. Only{" "}
                      {d.cacheSavingsRecords.toLocaleString()} records with both prices established.
                      Not subscription savings.
                    </span>
                  </Info>
                </span>
                <strong>{recapUsd(d.cacheSavings)}</strong>
                <small>versus uncached input at list prices</small>
              </div>
            )}
          </div>
        </section>
      )}
      {recap.totalKnown > 0 && (
        <section className="recap-chapter recap-model-chapter">
          <Heading
            number="04 / MODELS"
            title="Your evolving cast."
            note="Model mix by developer. Every bar shares a token scale."
          />
          <Mix recap={recap} />
          <div className="recap-model-lineup">
            {recap.models
              .filter((m) => m.total > 0)
              .slice(0, 10)
              .map((m, i) => (
                <div
                  key={m.id}
                  style={
                    {
                      "--model-color": familyColors[m.family] ?? familyColors.other,
                    } as CSSProperties
                  }
                >
                  <div className="recap-model-identity">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <strong>{m.name}</strong>
                    <b>{((m.total / total) * 100).toFixed(1)}%</b>
                  </div>
                  <div className="recap-model-meter">
                    <i style={{ width: `${(m.total / total) * 100}%` }} />
                  </div>
                  <p>
                    <span>{compactNumber(m.total)} tokens</span>
                    <span>
                      {m.priced > 0 ? (
                        <>
                          {recapUsd(m.usd)} API equivalent
                          {m.priced < m.records && (
                            <Info label={`About pricing for ${m.name}`}>
                              {m.priced.toLocaleString()} of {m.records.toLocaleString()} records
                              priced. Unknown prices and incomplete usage are excluded.
                            </Info>
                          )}
                        </>
                      ) : (
                        <span className="recap-unpriced">not priced</span>
                      )}
                    </span>
                  </p>
                </div>
              ))}
          </div>
          {d && (d.firstSeen.length > 0 || (d.omittedFirstSeen ?? 0) > 0) && (
            <div className="recap-adoption">
              <h3>When your models entered the story.</h3>
              <p>
                First seen in this local history, across all periods. Not an inferred launch or a
                switch count.
                <Info label="About the model timeline">
                  Only catalog-resolved models appear, using their catalog display names.
                  {!!d.omittedFirstSeen && (
                    <span className="recap-info-paragraph">
                      {d.omittedFirstSeen} internal or unresolved model IDs omitted.
                    </span>
                  )}
                </Info>
              </p>
              <ol tabIndex={0} aria-label="First-seen model timeline, scroll for more models">
                {d.firstSeen.map((m) => (
                  <li key={m.id}>
                    <time>
                      {shortDate(m.date)} {m.date.slice(0, 4)}
                    </time>
                    <span>{m.name}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}
      {d && d.speeds.length > 0 && (
        <section className="recap-chapter recap-speed">
          <Heading
            number="05 / RESPONSE SPEED"
            title="The pace of your models."
            note="Measured on your work"
          />
          <p className="recap-speed-method">
            Median output tokens/s. Lines show p25 to p75.
            <Info label="How response speed is measured">
              <span className="recap-info-paragraph">
                Final Claude streamed response with the same message ID minus its preceding user or
                tool-result timestamp. Codex uses the last user message or function-call output
                before the model response, ending at its token-count event. Tool execution before
                the last output is excluded.
              </span>
              <span className="recap-info-paragraph">
                Includes time to first token, thinking and local scheduling. Known subagents and
                sidechains excluded. Positive output; 0.25 to 600 seconds; at most 500 tokens/s; at
                least 50 samples per model. A personal latency proxy, not a provider benchmark.
              </span>
            </Info>
          </p>
          <div className="recap-speed-scale">
            <span>0</span>
            <span>{Math.ceil(maxSpeed)} tokens/s</span>
          </div>
          {d.speeds.map((s) => (
            <div className="recap-speed-row" key={s.id}>
              <div>
                <strong>{names.get(s.id) ?? s.id}</strong>
                <span>
                  {s.median.toFixed(1)}
                  <small> tokens/s</small>
                </span>
              </div>
              <div className="recap-speed-track">
                <i
                  style={{
                    left: `${(s.p25 / maxSpeed) * 100}%`,
                    width: `${((s.p75 - s.p25) / maxSpeed) * 100}%`,
                  }}
                />
                <b style={{ left: `${(s.median / maxSpeed) * 100}%` }} />
              </div>
              <p>
                <span>
                  p25 {s.p25.toFixed(1)} · p75 {s.p75.toFixed(1)} · n={s.n.toLocaleString()}
                </span>
                <span>{s.wait.toFixed(1)}s median response wait</span>
              </p>
            </div>
          ))}
        </section>
      )}
      {d && (
        <section className="recap-chapter recap-habits">
          <Heading
            number="06 / RHYTHM"
            title="Your hours have a signature."
            note="Requests · your local time"
          />
          <div
            className="recap-hour-heatmap"
            role="img"
            aria-label="Logged usage by weekday and hour"
          >
            <div className="recap-hour-head">
              <span />
              {[0, 6, 12, 18, 23].map((h) => (
                <span key={String(h)} style={{ gridColumn: h + 2 }}>
                  {String(h).padStart(2, "0")}
                </span>
              ))}
            </div>
            {[1, 2, 3, 4, 5, 6, 0].map((day, i) => (
              <div className="recap-hour-row" key={day}>
                <span>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</span>
                {d.hours[day]!.map((n, hour) => ({ n, hour })).map(({ n, hour: h }) => (
                  <i
                    key={`${day}-${h}:00`}
                    className={`intensity-${n ? Math.max(1, Math.ceil(4 * Math.sqrt(n / maxHour))) : 0}`}
                    title={`${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]} ${h}:00 · ${n.toLocaleString()} records`}
                  />
                ))}
              </div>
            ))}
          </div>
          <Facts
            values={[
              [shortDate(recap.busiestDay), "busiest day by records"],
              [`${Math.round(recap.lateNightShare * 100)}%`, "late night · midnight to 5 AM"],
              [`${Math.round(d.weekendShare * 100)}%`, "weekend activity"],
            ]}
          />
        </section>
      )}
      {d && total > 0 && (
        <section className="recap-chapter recap-tool-chapter">
          <Heading
            number="07 / HARNESSES"
            title="Where you worked."
            note="Apps and agents driving your sessions. Share of all reported tokens."
          />
          <Routes rows={d.harnesses} names={harnessNames} total={total} />
          {recap.sourceCoverage && (
            <details className="recap-coverage">
              <summary>What this history covers</summary>
              <ul>
                {recap.sourceCoverage.map((s) => (
                  <li key={s.name}>
                    <span>{s.name}</span>
                    <span>{s.status}</span>
                  </li>
                ))}
              </ul>
              <p>
                Finding an installation is not usage evidence. A failed or excluded source cannot
                contribute tokens; rescan missing histories. Provider-session stores and harness
                attribution are separate.
              </p>
            </details>
          )}
          <p className="recap-method-note">
            T3 attribution replaces the underlying harness on matched sessions; it adds no usage.
            Hermes aggregates remain Hermes activity. Rounded shares may not sum to exactly 100%.
          </p>
        </section>
      )}
      {d && total > 0 && (
        <section className="recap-chapter recap-provider-chapter">
          <Heading
            number="08 / SERVING PROVIDERS"
            title="Who served it."
            note="Serving routes from billing metadata, route prefixes and first-party sessions."
          />
          <Routes rows={d.providers} names={providerNames} total={total} />
          <p className="recap-method-note">
            Unattributed means no established serving route. Model developers never establish
            billing; first-party recorders identify their default route. Hermes usage is placed on
            its recorded last-seen day; an aggregate spanning a boundary cannot be split reliably.
          </p>
        </section>
      )}
      {projectRows.length > 0 && (
        <section className="recap-chapter recap-projects">
          <Heading
            number="09 / LOCAL PROJECTS"
            title="Where the tokens went."
            note="Repositories and meaningful local folders. Excluded from every share card."
          />
          <ol>
            {projectRows.slice(0, 8).map((p, i) => (
              <li key={p.hash}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <strong>{p.label}</strong>
                <b>{compactNumber(p.total)}</b>
                <small>tokens</small>
              </li>
            ))}
          </ol>
          <p className="recap-method-note">
            Only projects with locally saved folder labels appear. Portable imports contain hashes,
            not names. Projects are never uploaded.
          </p>
        </section>
      )}
    </>
  );
}
