"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  apiPriceModels,
  chartModels,
  featuredApiModels,
  homepageModels,
  planLeaders,
  type VisualBenchmark,
  type VisualData,
  type VisualModel,
} from "@/lib/visual-model-data";
import {
  Bars,
  BenchmarkInfo,
  compareHref,
  Info,
  labColor,
  ModelInfo,
  money,
  Picker,
  tokens,
} from "./primitives";

function Scatter({ models, benchmark }: { models: VisualModel[]; benchmark: VisualBenchmark }) {
  const [active, setActive] = useState<string>();
  const points = chartModels(models, benchmark);
  const values = points.map((model) => Number(model.blended));
  const minLog = Math.floor(Math.log10(Math.min(...values, 1)));
  const maxLog = Math.max(minLog + 1, Math.ceil(Math.log10(Math.max(...values, 1))));
  const scores = points.map((model) => benchmark.scores[model.id]?.value ?? 0);
  const step = benchmark.unit === "percent" ? 5 : 100;
  const yMin = Math.max(0, Math.floor((Math.min(...scores, 100) - step) / step) * step);
  const yMax = Math.max(yMin + step * 4, Math.ceil((Math.max(...scores, 0) + step) / step) * step);
  const x = (value: number) => 70 + ((Math.log10(value) - minLog) / (maxLog - minLog)) * 780;
  const y = (value: number) => 350 - ((value - yMin) / (yMax - yMin)) * 280;
  const boxes: { x: number; y: number; width: number }[] = [];
  const placed = [...points]
    .sort((a, b) => (benchmark.scores[b.id]?.value ?? 0) - (benchmark.scores[a.id]?.value ?? 0))
    .map((model) => {
      const px = x(Number(model.blended));
      const py = y(benchmark.scores[model.id]?.value ?? 0);
      const width = model.name.length * 7;
      let label = { x: px + 14, y: py - 12, width };
      const candidates = [0, -24, 24, -48, 48, -72, 72, -96, 96].flatMap((offset) => [
        { x: px + 14, y: py - 12 + offset, width },
        { x: px - width - 14, y: py - 12 + offset, width },
      ]);
      label =
        candidates.find(
          (box) =>
            box.x > 70 &&
            box.x + width < 1030 &&
            box.y > 40 &&
            box.y < 348 &&
            !boxes.some(
              (other) =>
                Math.abs(box.y - other.y) < 22 &&
                box.x < other.x + other.width + 8 &&
                box.x + width + 8 > other.x,
            ),
        ) ?? label;
      boxes.push(label);
      return { model, px, py, label };
    });
  const selected = points.find((model) => model.id === active);
  const score = selected ? benchmark.scores[selected.id] : undefined;
  return (
    <>
      <div className="v-scatter">
        {/* biome-ignore lint/a11y/useSemanticElements: SVG point links need a group role; an HTML fieldset cannot replace this SVG. */}
        <svg
          viewBox="0 0 1060 420"
          aria-label={`API blended price versus ${benchmark.name}`}
          role="group"
        >
          <title>Price versus benchmark score. Select a model for its price and evidence.</title>
          {[0, 1, 2, 3, 4].map((tick) => {
            const value = yMin + (tick * (yMax - yMin)) / 4;
            return (
              <g key={tick}>
                <line x1="70" x2="1020" y1={y(value)} y2={y(value)} className="v-gridline" />
                <text x="54" y={y(value) + 5} textAnchor="end" className="v-axis">
                  {value}
                  {benchmark.unit === "percent" ? "%" : ""}
                </text>
              </g>
            );
          })}
          {Array.from({ length: maxLog - minLog + 1 }, (_, index) => minLog + index).map((tick) => (
            <g key={tick}>
              <line
                x1={x(10 ** tick)}
                x2={x(10 ** tick)}
                y1="62"
                y2="350"
                className="v-gridline v-gridline-vertical"
              />
              <text x={x(10 ** tick)} y="380" textAnchor="middle" className="v-axis">
                {money(String(10 ** tick))}
              </text>
            </g>
          ))}
          <text x="70" y="27" className="v-axis">
            {benchmark.higherIsBetter ? "Higher score ↑" : "Lower score ↓"}
          </text>
          <text x="545" y="410" textAnchor="middle" className="v-axis">
            Blended API price / 1M tokens · log scale
          </text>
          {placed.map(({ model, px, py, label }) => (
            <g key={model.id}>
              <line
                x1={px}
                y1={py}
                x2={label.x > px ? label.x - 4 : label.x + label.width + 4}
                y2={label.y - 4}
                className="v-leader"
              />
              <a
                href={compareHref([model.id])}
                onMouseEnter={() => setActive(model.id)}
                onFocus={() => setActive(model.id)}
                onClick={(event) => {
                  event.preventDefault();
                  setActive(model.id);
                }}
                aria-label={`${model.name}, ${money(model.blended)}, ${benchmark.scores[model.id]?.displayValue}`}
              >
                <circle cx={px} cy={py} r="16" fill="transparent" />
                <circle
                  cx={px}
                  cy={py}
                  r={active === model.id ? 8 : 6}
                  fill={labColor(model.lab)}
                  className="v-dot"
                />
                <text x={label.x} y={label.y} className="v-point-label">
                  {model.name}
                </text>
              </a>
            </g>
          ))}
        </svg>
        {selected && score && (
          <div className="v-chart-tip">
            <button
              className="v-tip-close"
              type="button"
              onClick={() => setActive(undefined)}
              aria-label="Close model details"
            >
              ×
            </button>
            <strong>{selected.name}</strong>
            <div className="v-tip-numbers">
              <span>
                {money(selected.blended)}
                <small>per 1M tokens</small>
              </span>
              <span>
                {score.displayValue}
                <small>{benchmark.name}</small>
              </span>
            </div>
            <a href={score.sourceUrl} target="_blank" rel="noreferrer">
              {score.evaluator} ↗
            </a>
            <div className="v-tip-actions">
              <Link href={compareHref([selected.id])}>Compare model →</Link>
              <ModelInfo model={selected} />
            </div>
          </div>
        )}
      </div>
      <div className="v-mobile-chart">
        <Bars
          items={[...points]
            .sort(
              (a, b) =>
                ((benchmark.scores[b.id]?.value ?? 0) - (benchmark.scores[a.id]?.value ?? 0)) *
                (benchmark.higherIsBetter ? 1 : -1),
            )
            .map((model) => ({ model, value: benchmark.scores[model.id]?.value ?? 0 }))}
          max={benchmark.unit === "percent" ? 100 : yMax}
          detail={(model) => `${money(model.blended)} / 1M tokens`}
          format={(value) => `${value.toFixed(1)}${benchmark.unit === "percent" ? "%" : ""}`}
        />
      </div>
      <div className="v-chart-foot">
        <div className="v-legend">
          {[...new Set(points.map((model) => model.lab))].map((lab) => (
            <span key={lab}>
              <i style={{ background: labColor(lab) }} />
              {points.find((model) => model.lab === lab)?.developer}
            </span>
          ))}
        </div>
        <span>{points.length} models with scores</span>
      </div>
    </>
  );
}

function ApiPrices({ models }: { models: VisualModel[] }) {
  const [lab, setLab] = useState("");
  const [expanded, setExpanded] = useState(false);
  const all = apiPriceModels(models);
  const filtered = apiPriceModels(models, lab);
  const rows = (expanded || lab ? filtered : featuredApiModels(models)).reverse();
  const positive = rows
    .flatMap((model) => [Number(model.input), Number(model.output)])
    .filter((value) => value > 0);
  const min = Math.floor(Math.log10(positive.length ? Math.min(...positive) : 0.1));
  const max = Math.max(min + 1, Math.log10(positive.length ? Math.max(...positive) : 1));
  const ticks = Array.from({ length: Math.floor(max) - min + 1 }, (_, i) => 10 ** (min + i));
  const upper = 10 ** max;
  // Keep the endpoint labeled without crowding the nearest decade tick.
  if (max % 1 > 0.25) ticks.push(upper);
  const position = (value: string | undefined) =>
    Number(value) === 0 ? 0 : 4 + ((Math.log10(Number(value)) - min) / (max - min)) * 92;
  return (
    <>
      <div className="v-price-tools">
        <select
          aria-label="Chart developer"
          value={lab}
          onChange={(event) => setLab(event.target.value)}
        >
          <option value="">All developers</option>
          {[...new Set(all.map((model) => model.lab))].sort().map((id) => (
            <option key={id} value={id}>
              {all.find((model) => model.lab === id)?.developer}
            </option>
          ))}
        </select>
        <span>{!expanded && !lab ? "Popular & flagship" : `${rows.length} priced models`}</span>
      </div>
      <div className="v-price-axis" aria-hidden="true">
        <span>Model</span>
        <div>
          {ticks.map((tick) => (
            <span key={tick} style={{ left: `${position(String(tick))}%` }}>
              {money(String(tick))}
            </span>
          ))}
        </div>
        <span>In / Out</span>
      </div>
      <section
        className="v-price-list"
        id="homepage-api-prices"
        aria-label="API prices, highest input price first"
      >
        {rows.map((model) => (
          <Link
            className="v-price-row"
            key={model.id}
            href={compareHref([model.id])}
            title={`${model.name} · ${model.developer} · Input $${model.input}, output $${model.output} per 1M tokens`}
          >
            <span className="v-price-name">
              <i style={{ background: labColor(model.lab) }} />
              {model.name}
            </span>
            <span className="v-price-plot" aria-hidden="true">
              <span
                className="v-price-line"
                style={{
                  left: `${Math.min(position(model.input), position(model.output))}%`,
                  width: `${Math.abs(position(model.output) - position(model.input))}%`,
                  background: labColor(model.lab),
                }}
              />
              <i
                className="v-price-input"
                style={{ left: `${position(model.input)}%`, background: labColor(model.lab) }}
              />
              <i
                className="v-price-output"
                style={{ left: `${position(model.output)}%`, borderColor: labColor(model.lab) }}
              />
            </span>
            <span className="v-price-values">
              <span>
                <small>Input </small>
                {money(model.input)}
              </span>
              <span>
                <small>Output </small>
                {money(model.output)}
              </span>
            </span>
          </Link>
        ))}
      </section>
      <div className="v-price-foot">
        <span>● Input &nbsp; ○ Output</span>
        <span>USD / 1M tokens · log scale</span>
      </div>
      {!lab && all.length > featuredApiModels(models).length && (
        <button
          type="button"
          className="v-more"
          aria-expanded={expanded}
          aria-controls="homepage-api-prices"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show popular models ↑" : `Show all ${all.length} priced models ↓`}
        </button>
      )}
    </>
  );
}

type Sort = "coverage" | "name" | "developer" | "input" | "output" | "context" | "score" | "plans";
export function VisualHome({
  data,
  events,
}: {
  data: VisualData;
  events: { id: string; title: string; day: string; href: string }[];
}) {
  data = { ...data, models: homepageModels(data.models) };
  const [chartTab, setChartTab] = useState("prices");
  const [benchmarkId, setBenchmarkId] = useState(data.benchmarks[0]?.id ?? "");
  const [sort, setSort] = useState<Sort>("coverage");
  const [ascending, setAscending] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(7);
  const [selected, setSelected] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const sync = () => setLimit(media.matches ? 3 : 7);
    sync();
    setReady(true);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const benchmark = data.benchmarks.find((item) => item.id === benchmarkId) ?? data.benchmarks[0];
  if (!benchmark) return null;
  const cheap = apiPriceModels(data.models)
    .sort((a, b) => Number(a.blended) - Number(b.blended))
    .slice(0, 6);
  const best = data.models
    .filter((model) => benchmark.scores[model.id])
    .sort(
      (a, b) =>
        ((benchmark.scores[b.id]?.value ?? 0) - (benchmark.scores[a.id]?.value ?? 0)) *
        (benchmark.higherIsBetter ? 1 : -1),
    )
    .slice(0, 6);
  const included = planLeaders(data.models);
  const richness = (model: VisualModel) =>
    [model.input, model.output, model.context, benchmark.scores[model.id]].filter(
      (item) => item !== undefined,
    ).length;
  const value = (model: VisualModel): string | number | undefined =>
    sort === "coverage"
      ? richness(model)
      : sort === "name"
        ? model.name
        : sort === "developer"
          ? model.developer || undefined
          : sort === "score"
            ? benchmark.scores[model.id]?.value
            : sort === "plans"
              ? model.plans.length
              : sort === "context"
                ? model.context
                : model[sort] === undefined
                  ? undefined
                  : Number(model[sort]);
  const rows = data.models
    .filter((model) =>
      `${model.name} ${model.developer}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av === undefined)
        return bv === undefined ? richness(b) - richness(a) || a.name.localeCompare(b.name) : 1;
      if (bv === undefined) return -1;
      const diff =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);
      if (diff !== 0) return diff * (ascending ? 1 : -1);
      return (
        richness(b) - richness(a) ||
        (sort === "coverage"
          ? (benchmark.scores[b.id]?.value ?? 0) - (benchmark.scores[a.id]?.value ?? 0)
          : 0) ||
        a.name.localeCompare(b.name)
      );
    });
  const add = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 4
          ? [...current, id]
          : current,
    );
  const columns: { id: Sort; label: string }[] = [
    { id: "name", label: "Model" },
    { id: "developer", label: "Developer" },
    { id: "input", label: "Input / 1M" },
    { id: "output", label: "Output / 1M" },
    { id: "context", label: "Context" },
    { id: "score", label: benchmark.name },
    { id: "plans", label: "Plans" },
  ];
  const points = chartModels(data.models, benchmark);
  return (
    <div className="visual v-home" data-ready={ready}>
      <section className="v-hero">
        <h1>
          Compare AI models
          <br className="v-mobile-break" /> and coding plans.
        </h1>
        <Picker
          disabled={!ready}
          models={[...data.models].sort(
            (a, b) => Number(Boolean(b.blended)) - Number(Boolean(a.blended)),
          )}
          onPick={(id) => {
            window.location.href = compareHref([id]);
          }}
        />
      </section>
      <section
        className="v-chart-section"
        data-chart-view={chartTab}
        aria-labelledby="capability-heading"
      >
        <div className="v-section-head">
          <div>
            <h2 id="capability-heading">
              {chartTab === "prices" ? "API prices at a glance." : "Price meets performance."}
            </h2>
          </div>
          <div className="v-controls">
            {chartTab === "scores" && (
              <select
                disabled={!ready}
                aria-label="Chart benchmark"
                value={benchmark.id}
                onChange={(event) => setBenchmarkId(event.target.value)}
              >
                {data.benchmarks.slice(0, 4).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.coverage} models
                  </option>
                ))}
              </select>
            )}
            <Info label="Chart pricing and methodology">
              <strong>API prices and benchmark scores</strong>
              <p>
                API price opens with selected flagship comparisons. Current releases, plan inclusion
                and developer coverage fill the remaining places. Expand to see every eligible model
                with published input and output base rates. Historical releases are excluded from
                the homepage. Filled dots are input; hollow dots are output. Zero rates sit at the
                left edge. Blended price = (3 × input + output) / 4, for a 3:1 input to output token
                mix. Standard API base rates; conditional rates may vary.
              </p>
              <p>
                The horizontal price axis is logarithmic. Scores retain their original benchmark
                definition and reviewed primary observation. Evaluation setups can differ.
              </p>
              <p>
                {data.models.length - points.length} models without both a positive published base
                price and this score are not plotted. Catalog as of {data.asOf}.
              </p>
              <Link href="/methodology">Methodology →</Link>
            </Info>
            {chartTab === "scores" && <BenchmarkInfo benchmark={benchmark} />}
          </div>
        </div>
        <fieldset className="v-chart-tabs" aria-label="Chart view">
          <button
            type="button"
            aria-pressed={chartTab === "prices"}
            onClick={() => setChartTab("prices")}
          >
            API price
          </button>
          <button
            type="button"
            aria-pressed={chartTab === "scores"}
            onClick={() => setChartTab("scores")}
          >
            Price vs score
          </button>
        </fieldset>
        {chartTab === "prices" ? (
          <ApiPrices models={data.models} />
        ) : (
          <Scatter models={data.models} benchmark={benchmark} />
        )}
      </section>
      <div className="v-leaderboards">
        <section>
          <div className="v-section-head">
            <h2>Lowest API price</h2>
            <Info label="Cheapest models selection">
              <p>
                Lowest blended published API base price, using three input tokens per output token.
                This ranks price across homepage models with published rates. Historical releases
                are excluded.
              </p>
            </Info>
          </div>
          <Bars
            items={cheap.map((model) => ({ model, value: Number(model.blended) }))}
            format={(value) => money(String(value))}
          />
        </section>
        <section>
          <div className="v-section-head">
            <h2>{benchmark.higherIsBetter ? "Highest" : "Lowest"} score</h2>
            <BenchmarkInfo benchmark={benchmark} />
          </div>
          <p className="v-caption">{benchmark.name}</p>
          <Bars
            items={best.map((model) => ({ model, value: benchmark.scores[model.id]?.value ?? 0 }))}
            max={benchmark.unit === "percent" ? 100 : undefined}
            format={(value) => `${value.toFixed(1)}${benchmark.unit === "percent" ? "%" : ""}`}
          />
        </section>
        <section>
          <div className="v-section-head">
            <h2>Most included in coding plans</h2>
            <Info label="Coding plan inclusion">
              <p>
                Number of distinct catalogued coding plans that include each model. Plan inclusion
                does not imply unlimited usage; see each plan for limits.
              </p>
              <Link href="/compare">Compare coding plans →</Link>
            </Info>
          </div>
          <Bars
            items={included.map((model) => ({
              model,
              value: new Set(model.plans.map((plan) => plan.id)).size,
            }))}
            format={(value) => `${value} plans`}
          />
        </section>
      </div>
      <section className="v-model-section" aria-labelledby="models-heading">
        <div className="v-section-head">
          <h2 id="models-heading">Find your next model</h2>
          <Link href="/compare">Compare coding plans ↗</Link>
        </div>
        <div className="v-table-tools">
          <input
            aria-label="Filter model table"
            placeholder="Filter by model or developer…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(window.matchMedia("(max-width: 760px)").matches ? 3 : 7);
            }}
          />
          <span>
            {rows.length} models{" "}
            <Info label="Model table sources">
              <p>
                API base rates in USD per 1M tokens. Select a model row to add it to comparison. A
                dash means no published value in this catalog. Models with scores and richer data
                appear first.
              </p>
              <Link href="/models">Full catalog and sources →</Link>
            </Info>
          </span>
        </div>
        <label className="v-mobile-sort">
          Sort models{" "}
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as Sort);
              setAscending(["name", "developer", "input", "output"].includes(event.target.value));
            }}
          >
            <option value="coverage">Most complete</option>
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.label}
              </option>
            ))}
          </select>
        </label>
        <div className="v-table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      sort === column.id ? (ascending ? "ascending" : "descending") : "none"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSort(column.id);
                        setAscending(
                          sort === column.id
                            ? !ascending
                            : ["name", "developer", "input", "output"].includes(column.id),
                        );
                      }}
                    >
                      {column.label}
                      {sort === column.id ? (ascending ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((model) => (
                <tr key={model.id} className={selected.includes(model.id) ? "v-selected" : ""}>
                  <td>
                    <button
                      type="button"
                      className="v-row-select"
                      aria-label={`${selected.includes(model.id) ? "Remove" : "Add"} ${model.name} ${selected.includes(model.id) ? "from" : "to"} compare`}
                      aria-pressed={selected.includes(model.id)}
                      disabled={!ready || (selected.length === 4 && !selected.includes(model.id))}
                      onClick={() => add(model.id)}
                    >
                      <i style={{ background: labColor(model.lab) }} />
                      {model.name}
                      <span>{selected.includes(model.id) ? "✓" : "+"}</span>
                    </button>
                  </td>
                  <td data-label="Developer" data-missing={!model.developer}>
                    {model.developer || "–"}
                  </td>
                  <td
                    title={model.input === undefined ? undefined : `$${model.input} / 1M tokens`}
                    data-label="Input / 1M"
                    data-missing={model.input === undefined}
                  >
                    {money(model.input)}
                  </td>
                  <td
                    title={model.output === undefined ? undefined : `$${model.output} / 1M tokens`}
                    data-label="Output / 1M"
                    data-missing={model.output === undefined}
                  >
                    {money(model.output)}
                  </td>
                  <td data-label="Context" data-missing={model.context === undefined}>
                    {tokens(model.context)}
                  </td>
                  <td data-label={benchmark.name} data-missing={!benchmark.scores[model.id]}>
                    {benchmark.scores[model.id]?.displayValue ?? "–"}
                  </td>
                  <td data-label="Plans">{model.plans.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {limit < rows.length && (
          <button
            type="button"
            className="v-more"
            onClick={() =>
              setLimit(limit + (window.matchMedia("(max-width: 760px)").matches ? 3 : 7))
            }
          >
            Show more models ↓
          </button>
        )}
      </section>
      <section className="v-latest">
        <div className="v-section-head">
          <h2>Latest changes</h2>
          <Link href="/changelog">All changes →</Link>
        </div>
        {events.map((event) => (
          <Link key={event.id} href={event.href}>
            <time dateTime={event.day}>
              {new Date(`${event.day}T12:00:00Z`).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}
            </time>
            <span>{event.title}</span>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </section>
      {selected.length > 0 && (
        <aside className="v-compare-tray" aria-label="Selected models">
          <span>{selected.length} of 4 selected</span>
          <button type="button" onClick={() => setSelected([])}>
            Clear
          </button>
          <Link className="v-primary" href={compareHref(selected)}>
            Compare models →
          </Link>
        </aside>
      )}
    </div>
  );
}
