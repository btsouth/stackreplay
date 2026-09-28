"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ModelPrices } from "@/lib/market-discovery";
import { basePrice, priceNumber } from "@/lib/market-prices";
import {
  developerOptions,
  type ModelLibraryView,
  matchesDeveloper,
  modelsInView,
  searchModels,
} from "@/lib/model-library";
import type { PublicModelSummary } from "@/lib/public-catalog";

export function ModelExplorer({
  models,
  prices = {},
}: {
  models: readonly PublicModelSummary[];
  prices?: Record<string, ModelPrices[]>;
}) {
  const [view, setView] = useState<ModelLibraryView>("models");
  const [developer, setDeveloper] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [metric, setMetric] = useState<"input" | "output" | "cacheRead">("output");
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const developers = developerOptions(models.filter((m) => m.kind === "release"));
  const visible = useMemo(() => {
    const list = (query.trim() ? searchModels(models, query) : modelsInView(models, view)).filter(
      (m) => matchesDeveloper(m, developer),
    );
    if (sort !== "name")
      list.sort(
        (a, b) =>
          Number(basePrice(prices[a.id] ?? [])?.rates[sort as "input" | "output"] ?? Infinity) -
          Number(basePrice(prices[b.id] ?? [])?.rates[sort as "input" | "output"] ?? Infinity),
      );
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [models, view, query, developer, sort, prices]);
  const chartModels = selected.length
    ? models.filter((m) => selected.includes(m.id))
    : (() => {
        const available = visible.filter(
          (m) => m.kind === "release" && basePrice(prices[m.id] ?? []),
        );
        const featured = [
          "claude-opus-5-5",
          "claude-sonnet-5",
          "gpt-6-astra",
          "gpt-6-sol",
          "gpt-6-luna",
          "glm-5-3-flash",
          "deepseek-v4-1-flash",
          "gemini-3-1-pro",
        ];
        const choices = available.filter((m) => featured.includes(m.id));
        return (choices.length ? choices : available).slice(0, 8);
      })();
  const max = Math.max(
    1,
    ...chartModels.map((m) => Number(basePrice(prices[m.id] ?? [])?.rates[metric] ?? 0)),
  );
  return (
    <div>
      <div className="market-section-title">
        <span>01 / Published API rates</span>
        <span className="text-muted-foreground">USD per million tokens</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="market-tabs" aria-label="Price category">
          {(
            [
              ["output", "Output"],
              ["input", "Input"],
              ["cacheRead", "Cache read"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={metric === id}
              onClick={() => setMetric(id)}
            >
              {label}
            </button>
          ))}
        </fieldset>
        <p className="market-muted">
          {selected.length ? `${selected.length} selected models` : "Featured models in this view"}{" "}
          · standard rates
        </p>
      </div>
      <fieldset className="market-price-bars" aria-label={`${metric} price comparison`}>
        {chartModels.map((m) => {
          const value = basePrice(prices[m.id] ?? [])?.rates[metric];
          return (
            <Link key={m.id} href={`/models/${m.id}`} className="market-price-bar">
              <span>{m.name}</span>
              <span className="market-price-bar-track" aria-hidden="true">
                <span
                  className="market-price-bar-fill block"
                  style={{ width: `${(Number(value ?? 0) / max) * 100}%` }}
                />
              </span>
              <span className="text-right font-mono">
                {value === undefined ? "Unknown" : priceNumber(value)}
              </span>
            </Link>
          );
        })}
        {!chartModels.length && (
          <p className="market-muted">No verified standard API rates in this view.</p>
        )}
      </fieldset>
      <p className="market-muted mb-8">
        Token categories are compared separately. Context tiers, cache-write assumptions and pricing
        evidence are on each model page. These bars do not measure model quality.
      </p>
      <div className="market-section-title">
        <span>02 / Explore models</span>
        <span>{models.filter((m) => m.kind === "release").length} releases</span>
      </div>
      <div className="market-filters">
        <label className="grow">
          Find a model, family name or exact alias
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models…"
          />
        </label>
        <label>
          Developer
          <select value={developer} onChange={(e) => setDeveloper(e.target.value)}>
            <option value="all">All developers</option>
            {developers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Order by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Model name</option>
            <option value="input">Input price</option>
            <option value="output">Output price</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="market-tabs">
          {(
            [
              ["models", "Models"],
              ["legacy", "Legacy"],
              ["identity", "Aliases and identity"],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              key={id}
              data-testid={`model-view-${id}`}
              aria-pressed={!query && view === id}
              onClick={() => {
                setView(id);
                setQuery("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p role="status" className="market-muted">
          {visible.length} {query ? "matches" : "models"} · Select up to 4 to compare rates
        </p>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between py-3">
          <p className="market-muted">Rate comparison above uses your selection.</p>
          <button type="button" onClick={() => setSelected([])} className="market-link">
            Clear comparison
          </button>
        </div>
      )}
      <div data-testid="model-table">
        {visible.slice(0, expanded ? undefined : 12).map((model) => {
          const rate = basePrice(prices[model.id] ?? []);
          return (
            <article
              key={model.id}
              className="market-model-row"
              data-testid="model-row"
              data-model-kind={model.kind}
            >
              <div>
                <div className="flex items-center gap-3">
                  {rate && (
                    <input
                      type="checkbox"
                      aria-label={`Compare ${model.name}`}
                      checked={selected.includes(model.id)}
                      disabled={selected.length >= 4 && !selected.includes(model.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, model.id]
                            : selected.filter((id) => id !== model.id),
                        )
                      }
                      className="size-5 accent-accent"
                    />
                  )}
                  <h2>
                    <Link href={`/models/${model.id}`} className="hover:text-accent">
                      {model.name}
                    </Link>
                  </h2>
                </div>
                <p className="market-muted mt-1">
                  {model.developerName ?? "Developer not recorded"} ·{" "}
                  {model.kind === "family" ? "Family name" : (model.lifecycle ?? "Release")}
                </p>
              </div>
              {(["input", "output", "cacheRead"] as const).map((key, i) => (
                <div key={key}>
                  <p className="market-muted">{["Input", "Output", "Cache read"][i]}</p>
                  <p className={rate ? "market-rate" : "market-muted"}>
                    {priceNumber(rate?.rates[key])}
                  </p>
                </div>
              ))}
              <div>
                <p className="market-muted">
                  {model.places.length
                    ? `${model.places.filter((p) => p.kind === "api").length} API routes · ${model.planIds.length} plans`
                    : "Access under review"}
                </p>
                <Link href={`/models/${model.id}`} className="market-link">
                  Explore model <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      {visible.length > 12 && (
        <button type="button" className="market-link my-4" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show fewer models ↑" : `Show all ${visible.length} models ↓`}
        </button>
      )}
      {!visible.length && (
        <p className="py-8 text-muted-foreground">
          Nothing matches. Try another developer or model name.
        </p>
      )}
    </div>
  );
}
