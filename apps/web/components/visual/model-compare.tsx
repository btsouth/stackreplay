"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import type { VisualData, VisualModel } from "@/lib/visual-model-data";
import {
  BenchmarkInfo,
  compareHref,
  Info,
  labColor,
  ModelInfo,
  money,
  Picker,
  tokens,
} from "./primitives";

function readSelection(data: VisualData, fallback: string[]) {
  const params = new URLSearchParams(window.location.search);
  const ids = params.has("models")
    ? [...new Set((params.get("models") ?? "").split(","))]
        .filter((id) => data.models.some((model) => model.id === id))
        .slice(0, 4)
    : fallback;
  return { ids, all: params.get("benchmarks") === "all" };
}
export function ModelCompare({ data }: { data: VisualData }) {
  const defaults = useMemo(
    () =>
      ["gpt-6-1-sol", "claude-opus-5-5", "deepseek-v4-1-flash"].filter((id) =>
        data.models.some((model) => model.id === id),
      ),
    [data],
  );
  const [ids, setIds] = useState(defaults);
  const [all, setAll] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      const state = readSelection(data, defaults);
      setIds(state.ids);
      setAll(state.all);
    };
    sync();
    setReady(true);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [data, defaults]);
  const update = (next: string[], coverage = all) => {
    setIds(next);
    setAll(coverage);
    setCopied(false);
    window.history.pushState(null, "", compareHref(next) + (coverage ? "&benchmarks=all" : ""));
  };
  const selected = ids.flatMap((id) => {
    const model = data.models.find((item) => item.id === id);
    return model ? [model] : [];
  });
  const benchmarks = data.benchmarks.filter((benchmark) =>
    all
      ? selected.some((model) => benchmark.scores[model.id])
      : selected.every((model) => benchmark.scores[model.id]),
  );
  const columns = { "--columns": Math.max(selected.length, 1) } as CSSProperties;
  const share = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + compareHref(ids) + (all ? "&benchmarks=all" : ""),
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const metric = (
    label: string,
    key: "input" | "output" | "cached" | "context",
    formatter: (value: string | number | undefined) => string,
    lower: boolean,
  ) => {
    if (!selected.some((model) => model[key] !== undefined)) return null;
    const values = selected.flatMap((model) =>
      model[key] === undefined ? [] : [Number(model[key])],
    );
    const max = Math.max(...values) || 1;
    const best = (lower ? Math.min : Math.max)(...values);
    return (
      <div className="v-metric" key={key}>
        <h3>{label}</h3>
        <div className="v-comparison-grid" style={columns}>
          {selected.map((model) => {
            const value = model[key];
            return (
              <div
                key={model.id}
                data-missing={value === undefined}
                className={
                  value !== undefined && Number(value) === best && values.length > 1
                    ? "v-metric-cell v-winner"
                    : "v-metric-cell"
                }
              >
                <span className="v-metric-model">{model.name}</span>
                <strong>{formatter(value)}</strong>
                {value !== undefined && (
                  <span className="v-bar-track">
                    <span
                      style={{
                        width: `${(Number(value) / max) * 100}%`,
                        background: labColor(model.lab),
                      }}
                    />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  return (
    <div className="visual v-compare" data-ready={ready}>
      <div className="v-compare-intro">
        <Link href="/">← Explore models</Link>
        <div className="v-section-head">
          <h1>Find the right fit.</h1>
          <button type="button" className="v-outline" disabled={!ready} onClick={share}>
            {copied ? "Link copied ✓" : "Copy comparison link ↗"}
          </button>
        </div>
        <p className="v-caption">Compare two to four models, side by side.</p>
      </div>
      <Picker
        models={data.models}
        exclude={ids}
        disabled={!ready || ids.length >= 4}
        label="Add a model to compare"
        onPick={(id) => update([...ids, id])}
      />
      {selected.length > 0 && (
        <div className="v-comparison-grid v-model-cards" style={columns}>
          {selected.map((model) => (
            <article key={model.id} style={{ borderTopColor: labColor(model.lab) }}>
              <button
                type="button"
                className="v-remove"
                disabled={!ready}
                aria-label={`Remove ${model.name}`}
                onClick={() => update(ids.filter((id) => id !== model.id))}
              >
                ×
              </button>
              <span className="v-caption">{model.developer}</span>
              <h2>{model.name}</h2>
              <div className="v-card-bottom">
                <Link href={`/models/${model.id}`}>Model details ↗</Link>
                <ModelInfo model={model} />
              </div>
            </article>
          ))}
        </div>
      )}
      {selected.length < 2 ? (
        <div className="v-pick-prompt">
          <h2>
            Add {selected.length === 0 ? "two models" : "one more model"} to see the comparison.
          </h2>
          <div className="v-suggestions">
            {data.models
              .filter(
                (model) =>
                  !ids.includes(model.id) && model.blended && data.benchmarks[0]?.scores[model.id],
              )
              .slice(0, 4)
              .map((model) => (
                <button
                  type="button"
                  className="v-outline"
                  key={model.id}
                  onClick={() => update([...ids, model.id])}
                >
                  {model.name} +
                </button>
              ))}
          </div>
        </div>
      ) : (
        <>
          <section className="v-compare-section">
            <div className="v-section-head">
              <h2>API price</h2>
              <Info label="Price comparison conditions">
                <p>
                  Standard API base rates in USD per 1M tokens. Shorter bars mean lower base rates.
                  The lowest figure in each row is shaded; conditions can change the billed amount.
                </p>
                <p>
                  Cached means cached input reads. See the info icon on each model for tiers,
                  promotions, checked dates and sources.
                </p>
              </Info>
            </div>
            <p className="v-caption">USD per 1M tokens · lower is cheaper</p>
            {metric(
              "Input",
              "input",
              (value) => money(value === undefined ? undefined : String(value)),
              true,
            )}
            {metric(
              "Output",
              "output",
              (value) => money(value === undefined ? undefined : String(value)),
              true,
            )}
            {metric(
              "Cached input",
              "cached",
              (value) => money(value === undefined ? undefined : String(value)),
              true,
            )}
          </section>
          {selected.some((model) => model.context !== undefined) && (
            <section className="v-compare-section">
              <div className="v-section-head">
                <h2>Room to work</h2>
                <Info label="Context comparison methodology">
                  <p>
                    Published context window in tokens. Larger is highlighted. Max input is not used
                    as a substitute. Model source links and conditions are in each card's info icon.
                  </p>
                </Info>
              </div>
              {metric(
                "Context window",
                "context",
                (value) => tokens(value === undefined ? undefined : Number(value)),
                false,
              )}
            </section>
          )}
          <section className="v-compare-section">
            <div className="v-section-head">
              <h2>Benchmark scores</h2>
              <label className="v-switch">
                <input
                  type="checkbox"
                  disabled={!ready}
                  checked={all}
                  onChange={(event) => {
                    update(ids, event.target.checked);
                    setExpanded(false);
                  }}
                />
                Include unshared benchmarks
              </label>
            </div>
            <p className="v-caption">
              {all
                ? "All published results for your selection."
                : "Only benchmarks with a score for every selected model."}
            </p>
            {benchmarks.length === 0 && (
              <div className="v-empty">
                No shared benchmarks for this selection. Turn on unshared benchmarks to see
                available scores.
              </div>
            )}
            {benchmarks.slice(0, expanded ? benchmarks.length : 8).map((benchmark) => {
              const max =
                benchmark.unit === "percent"
                  ? 100
                  : Math.max(...selected.map((model) => benchmark.scores[model.id]?.value ?? 0), 1);
              const present = selected.flatMap((model) =>
                benchmark.scores[model.id] ? [benchmark.scores[model.id]?.value ?? 0] : [],
              );
              const best = (benchmark.higherIsBetter ? Math.max : Math.min)(...present);
              return (
                <div className="v-benchmark-group" key={benchmark.id}>
                  <div className="v-section-head">
                    <h3>{benchmark.name}</h3>
                    <BenchmarkInfo benchmark={benchmark} ids={ids} />
                  </div>
                  <div className="v-grouped-bars">
                    {selected.flatMap((model) => {
                      const score = benchmark.scores[model.id];
                      return score
                        ? [
                            <div
                              className={
                                score.value === best && present.length > 1
                                  ? "v-grouped-row v-best-score"
                                  : "v-grouped-row"
                              }
                              key={model.id}
                            >
                              <span>{model.name}</span>
                              <div className="v-bar-track">
                                <span
                                  style={{
                                    width: `${(score.value / max) * 100}%`,
                                    background: labColor(model.lab),
                                  }}
                                />
                              </div>
                              <strong>{score.displayValue}</strong>
                            </div>,
                          ]
                        : [];
                    })}
                  </div>
                </div>
              );
            })}
            {benchmarks.length > 8 && (
              <button type="button" className="v-more" onClick={() => setExpanded(!expanded)}>
                {expanded
                  ? "Show fewer benchmarks ↑"
                  : `Show all ${benchmarks.length} benchmarks ↓`}
              </button>
            )}
          </section>
          <section className="v-compare-section">
            <div className="v-section-head">
              <h2>Included in coding plans</h2>
              <Info label="Subscription model access">
                <p>
                  Only explicitly catalogued included access is shown. Usage allowances and plan
                  restrictions vary. Follow a plan link for its complete terms.
                </p>
                <Link href="/compare">Compare plan allowances →</Link>
              </Info>
            </div>
            <div className="v-comparison-grid v-plan-columns" style={columns}>
              {selected.map((model: VisualModel) => (
                <div key={model.id}>
                  <h3>
                    <i style={{ background: labColor(model.lab) }} />
                    {model.name}
                  </h3>
                  {model.plans.length ? (
                    model.plans.slice(0, 4).map((plan) => (
                      <Link href={`/plans/${plan.id}`} key={plan.id}>
                        <span>{plan.name}</span>
                        <small>{plan.price} ↗</small>
                      </Link>
                    ))
                  ) : (
                    <Link href={`/models/${model.id}`}>Explore API access ↗</Link>
                  )}
                  {model.plans.length > 4 && (
                    <details className="v-extra-plans">
                      <summary>{model.plans.length - 4} more plans ↓</summary>
                      {model.plans.slice(4).map((plan) => (
                        <Link href={`/plans/${plan.id}`} key={plan.id}>
                          <span>{plan.name}</span>
                          <small>{plan.price} ↗</small>
                        </Link>
                      ))}
                    </details>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
