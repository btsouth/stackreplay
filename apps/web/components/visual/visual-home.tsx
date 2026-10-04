"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  chartModels,
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
        <span>{points.length} models plotted</span>
      </div>
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
  const [benchmarkId, setBenchmarkId] = useState(data.benchmarks[0]?.id ?? "");
  const [sort, setSort] = useState<Sort>("coverage");
  const [ascending, setAscending] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(12);
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const sync = () => setLimit(media.matches ? 6 : 12);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const benchmark = data.benchmarks.find((item) => item.id === benchmarkId) ?? data.benchmarks[0];
  if (!benchmark) return null;
  const scored = data.models.filter((model) =>
    data.benchmarks.some((item) => item.scores[model.id]),
  );
  const cheap = scored
    .filter((model) => model.blended !== undefined)
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
  const context = data.models
    .filter((model) => model.context !== undefined)
    .sort((a, b) => (b.context ?? 0) - (a.context ?? 0))
    .slice(0, 6);
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
    <div className="visual v-home">
      <section className="v-hero">
        <h1>
          Compare AI models
          <br className="v-mobile-break" /> and coding plans.
        </h1>
        <Picker
          models={[...data.models].sort(
            (a, b) => Number(Boolean(b.blended)) - Number(Boolean(a.blended)),
          )}
          onPick={(id) => {
            window.location.href = compareHref([id]);
          }}
        />
      </section>
      <section className="v-chart-section" aria-labelledby="capability-heading">
        <div className="v-section-head">
          <div>
            <h2 id="capability-heading">More capability. Less cost.</h2>
          </div>
          <div className="v-controls">
            <select
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
            <Info label="Chart pricing and methodology">
              <strong>Price versus capability</strong>
              <p>
                Blended price = (3 × input + output) / 4, for a 3:1 input to output token mix.
                Standard API base rates; conditional rates may vary.
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
            <BenchmarkInfo benchmark={benchmark} />
          </div>
        </div>
        <Scatter models={data.models} benchmark={benchmark} />
        <p className="v-caption">
          {data.models.length - points.length} models without both price and score are not shown.
        </p>
      </section>
      <div className="v-leaderboards">
        <section>
          <div className="v-section-head">
            <h2>Cheapest frontier models</h2>
            <Info label="Cheapest models selection">
              <p>
                Lowest blended base price among models with at least one published benchmark score.
                Scores can come from different benchmarks; this is a price order, not a capability
                ranking.
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
            <h2>Largest context window</h2>
            <Info label="Context window sources">
              <p>
                Published context token limits, read from model specifications. Max input limits are
                not substituted for context. See each model for conditions and source details.
              </p>
              <Link href="/models">Model specifications →</Link>
            </Info>
          </div>
          <Bars
            items={context.map((model) => ({ model, value: model.context ?? 0 }))}
            format={tokens}
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
              setLimit(12);
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
                      disabled={selected.length === 4 && !selected.includes(model.id)}
                      onClick={() => add(model.id)}
                    >
                      <i style={{ background: labColor(model.lab) }} />
                      {model.name}
                      <span>{selected.includes(model.id) ? "✓" : "+"}</span>
                    </button>
                  </td>
                  <td data-label="Developer">{model.developer || "–"}</td>
                  <td data-label="Input / 1M">{money(model.input)}</td>
                  <td data-label="Output / 1M">{money(model.output)}</td>
                  <td data-label="Context">{tokens(model.context)}</td>
                  <td data-label={benchmark.name}>
                    {benchmark.scores[model.id]?.displayValue ?? "–"}
                  </td>
                  <td data-label="Plans">{model.plans.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {limit < rows.length && (
          <button type="button" className="v-more" onClick={() => setLimit(limit + 12)}>
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
