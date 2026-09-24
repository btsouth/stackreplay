"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  formatCount,
  formatDay,
  formatPercent,
  formatTokens,
  formatYear,
  type HeroTargetView,
  type HeroWorkload,
  heroTargetView,
} from "@/lib/hero-workload";

/** One run, start to settled. The result resolves last, at about 1.64s. */
export const HERO_RUN_MS = 1900;

/**
 * The homepage Replay Instrument, restored from the locked v1.1 study.
 *
 * The visitor sees a real, anonymized workload replayed against a real target:
 * the observed workload resolves, the Signal Blue path travels into and through
 * the stacked execution object, each layer reacts as the path passes it, the
 * recorded chronology is processed, and only then does the counterfactual
 * result appear. The run is finite. Changing the target starts a new run; a
 * reader who asked for reduced motion gets the settled state immediately.
 *
 * Every figure comes from `lib/generated/hero-workload.json`, which the
 * production engine wrote. This component draws; it never computes a result.
 */
export function HomeReplay({ hero }: { hero: HeroWorkload }) {
  const views = useMemo(() => hero.targets.map((target) => heroTargetView(hero, target)), [hero]);
  const [selectedId, setSelectedId] = useState(views[0]?.id ?? "");
  const reducedMotion = usePrefersReducedMotion();
  const load = (id: string): void => {
    setSelectedId(id);
    document
      .querySelector('[data-testid="replay-hero"]')
      ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };
  return (
    <div className="flex flex-col gap-12">
      <ReplayHero hero={hero} onSelect={setSelectedId} selectedId={selectedId} views={views} />
      <ManyTargets onLoad={load} selectedId={selectedId} views={views} />
    </div>
  );
}

export function ReplayHero({
  hero,
  views,
  selectedId,
  onSelect,
}: {
  hero: HeroWorkload;
  views: readonly HeroTargetView[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [nonce, setNonce] = useState(0);
  const [phase, setPhase] = useState<"pending" | "running" | "resolved">("running");
  const reducedMotion = usePrefersReducedMotion();
  const canvas = useRef<HTMLDivElement>(null);
  const seen = useSeen(canvas);
  const view = views.find((entry) => entry.id === selectedId) ?? views[0];
  const run = `${view?.id ?? "none"}-${nonce}`;

  // The first run waits until the execution object is on screen, so a reader
  // who scrolls to it (a phone, a short window) still sees the replay happen.
  // The server's first frame is already the start of a run, so the first run
  // continues it; every later run shows its first frame for one paint, then
  // plays, which restarts the animations without remounting any control.
  const started = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `run` changes for every new run.
  useEffect(() => {
    if (reducedMotion) {
      started.current = true;
      setPhase("resolved");
      return;
    }
    // Not measured yet (the first commit after hydration): leave the server's
    // frame alone rather than flash a pending state over a run already playing.
    if (seen === undefined) return;
    if (!seen) {
      setPhase("pending");
      return;
    }
    let frame = 0;
    if (started.current) {
      setPhase("pending");
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setPhase("running"));
      });
    } else {
      setPhase("running");
    }
    started.current = true;
    const timer = setTimeout(() => setPhase("resolved"), HERO_RUN_MS + 40);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [run, reducedMotion, seen]);

  if (view === undefined) return null;

  const select = (id: string): void => {
    if (id !== view.id) onSelect(id);
  };

  return (
    <section
      aria-label="Replay instrument: an anonymized real workload replayed against a real target"
      className="sr-hero"
      data-run={phase}
      data-target={view.id}
      data-testid="replay-hero"
    >
      <div className="sr-stage">
        <Observed hero={hero} />
        <Execution
          canvasRef={canvas}
          onSelect={select}
          selectedId={view.id}
          view={view}
          views={views}
          workloadRange={`${formatDay(hero.workload.from)} to ${formatDay(hero.workload.to)}`}
        />
        <Result view={view} />
      </div>
      <Tape hero={hero} view={view} />
      <div className="sr-readout" data-testid="hero-readout">
        <span className="sr-micro text-muted-foreground">05 / Replay readout</span>
        <div>
          <p className="sr-readout-line sr-settle">{view.readout}</p>
          <p
            className="mt-2 max-w-[80ch] text-xs leading-relaxed text-muted-foreground"
            data-testid="hero-provenance"
          >
            Replayed by the production engine ({hero.engineVersion}) against catalog rules as of{" "}
            {formatDay(hero.rulesAsOf)}, {formatYear(hero.rulesAsOf)}.{" "}
            {hero.workload.unresolvedEvents > 0
              ? `${formatCount(hero.workload.unresolvedEvents)} events with model IDs the catalog does not recognize are left out, rather than guessed. `
              : ""}
            No project names, paths, session IDs or times of day are in this sample.
          </p>
          <button
            className="mt-3 inline-flex min-h-11 items-center font-mono text-[11px] tracking-[0.16em] text-accent uppercase underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
            data-testid="hero-rerun"
            disabled={phase !== "resolved"}
            onClick={() => setNonce((value) => value + 1)}
            type="button"
          >
            {phase === "running" ? "Replaying" : "Replay again"}
          </button>
        </div>
      </div>
      <p aria-live="polite" className="sr-only" data-testid="hero-status">
        {phase === "resolved"
          ? view.announcement
          : phase === "running"
            ? `Replaying ${formatCount(hero.workload.replayedEvents)} events against ${view.label}.`
            : ""}
      </p>
    </section>
  );
}

function Observed({ hero }: { hero: HeroWorkload }) {
  const workload = hero.workload;
  const cacheShare = formatPercent(workload.cacheReadTokens, workload.knownTokens, 1);
  const mix = workload.modelMix;
  const shown = mix.slice(0, 3);
  const rest = mix.slice(3);
  const restEvents = rest.reduce((sum, row) => sum + row.events, 0);
  const metrics = [
    {
      label: "History window",
      value: `${workload.rangeDays} days`,
      note: `${formatDay(workload.from)} to ${formatDay(workload.to)}, ${formatYear(workload.to)}`,
    },
    {
      label: "Events",
      value: formatCount(workload.recordedEvents),
      note: "recorded model calls",
    },
    {
      label: "Known tokens",
      value: formatTokens(workload.knownTokens),
      note: `${cacheShare} cache reads`,
    },
    {
      label: "Sessions",
      value: formatCount(workload.sessions),
      note: `${workload.projects} projects · ${workload.activeDays} active days`,
    },
  ];
  return (
    <aside className="sr-col sr-col--observed" data-testid="hero-observed">
      <p className="sr-micro sr-section-id">01 / Observed workload</p>
      <p className="sr-micro mb-4 text-accent" data-testid="hero-sample-label">
        {hero.label}
      </p>
      <dl className="sr-metrics">
        {metrics.map((metric, index) => (
          <div className="sr-metric" key={metric.label}>
            <dt className="sr-micro">{metric.label}</dt>
            <dd style={{ "--d": `${0.04 + index * 0.05}s` } as CSSProperties}>
              {metric.value}
              <small>{metric.note}</small>
            </dd>
          </div>
        ))}
      </dl>
      <div className="sr-mix">
        <p className="sr-micro text-muted-foreground">Model mix</p>
        {shown.map((row) => {
          const share = formatPercent(row.events, workload.recordedEvents);
          return (
            <div className="sr-mix-row" key={row.name}>
              <span title={row.name}>{row.name}</span>
              <i aria-hidden="true">
                <b style={{ width: `${(row.events / workload.recordedEvents) * 100}%` }} />
              </i>
              <strong>{share}</strong>
            </div>
          );
        })}
        {rest.length > 0 ? (
          <div className="sr-mix-row">
            <span>+{rest.length} more</span>
            <i aria-hidden="true">
              <b style={{ width: `${(restEvents / workload.recordedEvents) * 100}%` }} />
            </i>
            <strong>{formatPercent(restEvents, workload.recordedEvents)}</strong>
          </div>
        ) : null}
      </div>
      <p className="sr-observed-note">
        <strong>Observed, not generated.</strong> One developer&apos;s {hero.source} history,
        aggregates only. Same demand, different target.
      </p>
    </aside>
  );
}

function Execution({
  view,
  views,
  selectedId,
  onSelect,
  workloadRange,
  canvasRef,
}: {
  canvasRef: RefObject<HTMLDivElement | null>;
  view: HeroTargetView;
  views: readonly HeroTargetView[];
  selectedId: string;
  onSelect: (id: string) => void;
  workloadRange: string;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const index = views.findIndex((entry) => entry.id === selectedId);
    let next: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = views.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    const wrapped = (next + views.length) % views.length;
    const target = views[wrapped];
    if (target === undefined) return;
    onSelect(target.id);
    buttons.current[wrapped]?.focus();
  };
  const [resolution, rules, limits] = view.layers;
  return (
    <div className="sr-col sr-col--execution" data-testid="hero-execution">
      <p className="sr-micro sr-section-id sr-section-id--signal">02 / Target execution</p>
      <div
        aria-label="Target to replay against"
        className="sr-targets"
        onKeyDown={onKeyDown}
        role="radiogroup"
      >
        {views.map((entry, index) => (
          // biome-ignore lint/a11y/useSemanticElements: each option carries a name and a provider line and reruns the instrument; a radio-role button keeps that structure with radiogroup keyboard semantics.
          <button
            aria-checked={entry.id === selectedId}
            className="sr-target"
            data-testid={`hero-target-${entry.id}`}
            key={entry.id}
            onClick={() => onSelect(entry.id)}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            role="radio"
            tabIndex={entry.id === selectedId ? 0 : -1}
            type="button"
          >
            <strong>{entry.label}</strong>
            <span>
              {entry.provider} · {entry.priceLabel}
            </span>
          </button>
        ))}
      </div>
      <div className="sr-target-head">
        <span className="sr-target-name" data-testid="hero-target-name">
          {view.label}
        </span>
        <span className="sr-target-meta">
          {view.provider} · {view.kindLabel} · {view.priceLabel}
        </span>
      </div>
      <div className="sr-mapping" data-testid="hero-mapping">
        <span
          className={`sr-class ${view.replayClass === "Translated replay" ? "sr-class--translated" : ""}`}
        >
          {view.replayClass}
        </span>
        {view.mapping.length > 0 ? (
          view.mapping.map((row) => (
            <span key={row.to}>
              {row.from} → <b className="sr-mapping-to">{row.to}</b>
            </span>
          ))
        ) : (
          <span>Same models, same chronology, this target&apos;s rules.</span>
        )}
      </div>
      <div className="sr-canvas" ref={canvasRef}>
        <svg
          aria-labelledby="sr-hero-title sr-hero-desc"
          className="sr-svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox="0 0 760 300"
        >
          <title id="sr-hero-title">{`Replay path through the ${view.label} execution stack`}</title>
          <desc id="sr-hero-desc">
            {`The recorded sequence (${workloadRange}) travels through three layers: ${resolution.label} ${resolution.value}, ${rules.label} ${rules.value}, ${limits.label} ${limits.value}.`}
          </desc>
          <path
            className="sr-guide"
            d="M18 230 C105 230 142 216 214 216 L286 216 C334 216 350 233 396 233 L514 233 C538 233 550 220 550 202 C550 184 536 176 512 176 L354 176 C326 176 312 162 312 147 C312 130 328 121 353 121 L487 121 C521 121 539 106 558 88 C594 54 629 61 662 76 C697 92 713 82 742 60"
          />
          {/* Lower lead: the path enters behind the execution object. */}
          <path
            className="sr-trace"
            d="M18 230 C105 230 142 216 214 216 L286 216 C310 216 325 221 339 226"
            pathLength={1}
            style={trace(0.28, 0.42)}
          />
          <path
            className="sr-trace"
            d="M339 226 C355 231 371 233 396 233 L514 233 C538 233 550 220 550 202"
            pathLength={1}
            style={trace(0.61, 0.34)}
          />
          <g>
            <path
              className="sr-slab sr-slab--bottom"
              d="M327 200 Q327 194 336 191 L429 158 Q436 156 445 159 L540 193 Q548 196 548 202 Q548 208 540 211 L445 246 Q437 249 428 246 L336 212 Q327 209 327 200 Z"
            />
            <path className="sr-slab-edge" d="M336 191 L429 224 Q437 227 445 224 L540 193" />
            <path
              className="sr-slab sr-slab--mid"
              d="M327 157 Q327 151 336 148 L429 115 Q436 113 445 116 L540 150 Q548 153 548 159 Q548 165 540 168 L445 203 Q437 206 428 203 L336 169 Q327 166 327 157 Z"
            />
            <path className="sr-slab-edge" d="M336 148 L429 181 Q437 184 445 181 L540 150" />
            <path
              className="sr-slab sr-slab--top"
              d="M327 114 Q327 108 336 105 L429 72 Q436 70 445 73 L540 107 Q548 110 548 116 Q548 122 540 125 L445 160 Q437 163 428 160 L336 126 Q327 123 327 114 Z"
            />
            <path className="sr-slab-edge" d="M336 105 L429 138 Q437 141 445 138 L540 107" />
          </g>
          {/* The weave over the object, then the exit toward the result. */}
          <path
            className="sr-trace sr-trace--over"
            d="M550 202 C550 184 536 176 512 176 L443 176"
            pathLength={1}
            style={trace(0.83, 0.3)}
          />
          <path
            className="sr-trace sr-trace--over"
            d="M443 176 L354 176 C326 176 312 162 312 147 C312 130 328 121 353 121 L407 121"
            pathLength={1}
            style={trace(1.02, 0.32)}
          />
          <path
            className="sr-trace sr-trace--over"
            d="M407 121 L487 121 C521 121 539 106 558 88 C594 54 629 61 662 76 C697 92 713 82 742 60"
            pathLength={1}
            style={trace(1.2, 0.42)}
          />
          <circle className="sr-endpoint" cx="18" cy="230" r="4" style={delay(0.24)} />
          {view.crossed ? (
            <>
              <circle className="sr-breach-halo" cx="487" cy="121" r="10" style={delay(1.38)} />
              <circle className="sr-breach-ring" cx="487" cy="121" r="4.5" style={delay(1.38)} />
            </>
          ) : null}
          <circle className="sr-endpoint" cx="742" cy="60" r="4" style={delay(1.6)} />
          <g className="sr-stack-state">
            <StateLabel layer={limits} y={112} at={1.27} />
            <StateLabel layer={rules} y={155} at={0.92} />
            <StateLabel layer={resolution} y={198} at={0.72} />
          </g>
        </svg>
        <p className="sr-micro sr-flow-note">
          Recorded sequence
          <br />
          <span className="font-mono normal-case tracking-normal">{workloadRange}</span>
        </p>
      </div>
      <dl className="sr-layers" data-testid="hero-layers">
        {[resolution, rules, limits].map((layer, index) => (
          <div key={layer.key}>
            <dt className="sr-micro">{layer.label}</dt>
            <dd data-open={layer.open} style={delay(0.72 + index * 0.27)}>
              {layer.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StateLabel({
  layer,
  y,
  at,
}: {
  layer: HeroTargetView["layers"][number];
  y: number;
  at: number;
}) {
  return (
    <>
      <line className="sr-leader" style={delay(at)} x1="548" x2="600" y1={y} y2={y} />
      <text className="sr-state-label" x="608" y={y - 3}>
        {layer.label.toUpperCase()}
      </text>
      <text
        className={`sr-state-value ${layer.open ? "sr-state-value--open" : ""}`}
        style={delay(at)}
        x="608"
        y={y + 11}
      >
        {layer.value.toUpperCase()}
      </text>
    </>
  );
}

function Result({ view }: { view: HeroTargetView }) {
  const result = view.result;
  return (
    <aside className="sr-col sr-col--result" data-testid="hero-result">
      <p className="sr-micro sr-section-id">03 / Counterfactual result</p>
      <div className="sr-result sr-settle">
        <p className="sr-status sr-micro" data-testid="hero-result-status">
          {result.status.map((status) => (
            <span data-tone={status.tone} key={status.text}>
              {status.text}
            </span>
          ))}
        </p>
        <p className="sr-figure" data-testid="hero-result-figure">
          {result.figure.whole}
          {result.figure.cents === undefined ? null : (
            <small className="sr-figure-minor">{result.figure.cents}</small>
          )}
          {result.figure.unit === undefined ? null : (
            <small className="sr-figure-minor sr-figure-unit">{result.figure.unit}</small>
          )}
        </p>
        <p className="sr-micro sr-caption">{result.caption}</p>
        <p className="sr-sentence" data-testid="hero-result-sentence">
          {result.sentence}
        </p>
        <hr className="sr-result-rule" data-testid="hero-result-rule" />
        <dl>
          {result.ledger.map((row) => (
            <div className="sr-ledger-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                {row.value}
                {row.note === undefined ? null : <small>{row.note}</small>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}

function Tape({ hero, view }: { hero: HeroWorkload; view: HeroTargetView }) {
  const days = hero.workload.days;
  const max = Math.max(1, ...days.map((day) => day.events));
  const n = days.length;
  // The scan passes day i at 0.72s + i/n of its one-second sweep; each bar and
  // any crossing on it react as the scan reaches them.
  const at = (index: number): number => 0.72 + (index / Math.max(1, n - 1)) * 0.96;
  const tape = view.tape;
  const priced = tape.legend.some((item) => item.key === "priced");
  const axis = [0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1];
  return (
    <div className="sr-tape" data-testid="hero-tape">
      <div className="sr-col">
        <p className="sr-micro text-muted-foreground">04 / Recorded demand</p>
        <p className="sr-tape-title">{tape.title}</p>
        <p className="sr-tape-text">{tape.text}</p>
        <p className="sr-legend">
          {tape.legend.map((item) => (
            <span key={item.key}>
              <i aria-hidden="true" className="sr-swatch" data-key={item.key} />
              {item.text}
            </span>
          ))}
        </p>
      </div>
      <div className="sr-col">
        <div className="sr-tape-head">
          <span className="sr-micro">{n}-day recorded demand · events per day</span>
          <strong className="sr-micro sr-tape-headline hidden sm:inline">{tape.headline}</strong>
        </div>
        <div
          aria-label={`${n} days of recorded demand, ${formatDay(days[0]?.date ?? "")} to ${formatDay(days[n - 1]?.date ?? "")}. ${tape.crossings.length > 0 ? `Allowance crossed on ${tape.crossings.map((crossing) => formatDay(crossing.date)).join(" and ")}.` : ""}`}
          className="sr-timeline"
          role="img"
          style={{ "--sr-days": n } as CSSProperties}
        >
          <div className="sr-bars">
            {days.map((day, index) => {
              const above = tape.above[index] ?? 0;
              return (
                <span
                  className="sr-bar"
                  data-peak={tape.peakDayIndex === index}
                  data-priced={priced && day.events > 0}
                  key={day.date}
                  style={
                    {
                      "--h": `${day.events === 0 ? 0 : Math.max(2, (day.events / max) * 100)}%`,
                      "--d": `${at(index)}s`,
                    } as CSSProperties
                  }
                  title={`${formatDay(day.date)}: ${formatCount(day.events)} events`}
                >
                  {above > 0 ? (
                    <span
                      className="sr-bar-cap"
                      style={
                        {
                          "--over": `${above * 100}%`,
                          "--d": `${at(index) + 0.05}s`,
                        } as CSSProperties
                      }
                    />
                  ) : null}
                </span>
              );
            })}
          </div>
          {tape.resets.map((reset) => (
            <span
              className="sr-reset"
              key={reset.date}
              style={
                {
                  left: `calc(${reset.dayIndex} * (var(--sr-slot) + var(--sr-gap)) - var(--sr-gap) / 2)`,
                  "--d": `${at(reset.dayIndex)}s`,
                } as CSSProperties
              }
            />
          ))}
          {tape.crossings.map((crossing) => (
            <span
              className="sr-marker"
              key={crossing.date}
              style={
                {
                  left: `calc(${crossing.dayIndex} * (var(--sr-slot) + var(--sr-gap)) + var(--sr-slot) / 2)`,
                  "--d": `${at(crossing.dayIndex) + 0.06}s`,
                } as CSSProperties
              }
            >
              {crossing.index}
            </span>
          ))}
          <span aria-hidden="true" className="sr-scanhead" />
        </div>
        <div aria-hidden="true" className="sr-axis">
          {axis.map((index) => (
            <span key={index}>{formatDay(days[index]?.date ?? "")}</span>
          ))}
        </div>
      </div>
      <div className="sr-col">
        <p className="sr-micro text-muted-foreground">{tape.detail.kicker}</p>
        <dl className="sr-settle mt-2">
          {tape.detail.rows.map((row) => (
            <div className="sr-detail-row" key={row.label}>
              <dt>
                {row.label}
                {row.note === undefined ? null : <small>{row.note}</small>}
              </dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function ManyTargets({
  views,
  selectedId,
  onLoad,
}: {
  views: readonly HeroTargetView[];
  selectedId: string;
  onLoad: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-4" data-testid="many-targets">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium text-foreground">One workload, many targets</h2>
        <span className="sr-micro text-muted-foreground">
          Same recorded demand · {views.length} real targets
        </span>
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Each row is the engine&apos;s own result for the same history. Loading a target reruns the
        instrument above; it never changes the workload.
      </p>
      {/* One column template for every row: on wide screens each row is a
          subgrid, so a narrower "Loaded" button cannot shift the other rows. */}
      <ul className="flex flex-col border-t border-border lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_auto] lg:gap-x-6">
        {views.map((view) => {
          const active = view.id === selectedId;
          return (
            <li
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 border-b border-border py-4 lg:col-span-4 lg:grid-cols-subgrid"
              data-testid={`many-targets-row-${view.id}`}
              key={view.id}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{view.label}</span>
                <span className="text-xs text-muted-foreground">
                  {view.provider} · {view.kindLabel} · {view.priceLabel}
                </span>
              </span>
              <span className="col-span-2 flex min-w-0 flex-col gap-0.5 lg:col-span-1">
                <span className="text-sm text-foreground">
                  {view.result.status.map((status) => status.text).join(" · ")}
                </span>
                <span className="text-xs text-muted-foreground">{view.replayClass}</span>
              </span>
              <span className="flex flex-col gap-0.5 lg:items-end">
                <span
                  className="font-mono text-base tabular-nums text-foreground"
                  data-testid={`many-targets-figure-${view.id}`}
                >
                  {view.result.figure.whole}
                  {view.result.figure.cents ?? ""}
                  {view.result.figure.unit === undefined ? "" : ` ${view.result.figure.unit}`}
                </span>
                <span className="sr-micro text-muted-foreground">{view.result.caption}</span>
              </span>
              <span className="flex justify-end">
                <button
                  aria-pressed={active}
                  className="min-h-11 w-fit border border-border-strong px-3 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-foreground lg:w-full transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-accent aria-pressed:text-accent"
                  data-testid={`load-target-${view.id}`}
                  onClick={() => onLoad(view.id)}
                  type="button"
                >
                  {active ? "Loaded" : "Load in instrument"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        <span className="sr-micro mr-2 text-foreground">No recommendation</span>
        These rows describe what each target would have done with this demand. StackReplay does not
        rank them or tell you which one to buy.
      </p>
    </section>
  );
}

function trace(start: number, duration: number): CSSProperties {
  return { "--d": `${start}s`, "--dur": `${duration}s` } as CSSProperties;
}

function delay(start: number): CSSProperties {
  return { "--d": `${start}s` } as CSSProperties;
}

/**
 * True once the element has been at least partly on screen. Measured before
 * paint first, so an instrument that is already visible on load never shows a
 * pending frame; after that, an observer waits for the reader to scroll to it.
 */
function useSeen(ref: RefObject<HTMLElement | null>): boolean | undefined {
  const [seen, setSeen] = useState<boolean | undefined>(undefined);
  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const inView = (rect: DOMRect): boolean =>
      rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.1;
    if (inView(node.getBoundingClientRect()) || typeof IntersectionObserver !== "function") {
      setSeen(true);
      return;
    }
    setSeen(false);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return seen;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}
