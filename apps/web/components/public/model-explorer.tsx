"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ModelPriceComparison } from "@/components/public/model-price-comparison";
import type { ModelPrices } from "@/lib/market-discovery";
import { basePrice, priceNumber } from "@/lib/market-prices";
import {
  byDiscoveryOrder,
  developerOptions,
  type ModelLibraryView,
  matchesDeveloper,
  modelsInView,
  searchModels,
} from "@/lib/model-library";
import {
  modelCapabilities,
  modelContext,
  modelSpecifications,
  tokenSize,
} from "@/lib/model-specifications";
import type { PublicModelSummary } from "@/lib/public-catalog";

export function ModelExplorer({
  models,
  prices = {},
}: {
  models: readonly PublicModelSummary[];
  prices?: Record<string, ModelPrices[]>;
}) {
  const [view, setView] = useState<ModelLibraryView>("models");
  const [capability, setCapability] = useState("all");
  const [developer, setDeveloper] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const developers = developerOptions(models.filter((m) => m.kind === "release"));
  const visible = useMemo(() => {
    const list = (query.trim() ? searchModels(models, query) : modelsInView(models, view)).filter(
      (m) =>
        matchesDeveloper(m, developer) &&
        (capability === "all" ||
          (capability === "long-context"
            ? (modelContext(m).value ?? 0) >= 1_000_000
            : modelCapabilities(m).includes(capability))),
    );
    if (sort === "featured") {
      if (!query.trim()) list.sort(byDiscoveryOrder);
    } else if (sort !== "name")
      list.sort(
        (a, b) =>
          Number(basePrice(prices[a.id] ?? [])?.rates[sort as "input" | "output"] ?? Infinity) -
          Number(basePrice(prices[b.id] ?? [])?.rates[sort as "input" | "output"] ?? Infinity),
      );
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [models, view, query, developer, capability, sort, prices]);
  return (
    <div>
      <ModelPriceComparison models={models} prices={prices} selected={selected} />
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
          Capability
          <select value={capability} onChange={(e) => setCapability(e.target.value)}>
            <option value="all">All capabilities</option>
            {[
              "Reasoning",
              "Tool calling",
              "Vision",
              "Audio input",
              "Video input",
              "Structured output",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
            <option value="long-context">1M+ input / context</option>
          </select>
        </label>
        <label>
          Order by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured first</option>
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
          <p className="market-muted">Your selected models are compared above and below.</p>
          <button type="button" onClick={() => setSelected([])} className="market-link">
            Clear comparison
          </button>
        </div>
      )}
      {selected.length > 0 && (
        <section className="market-comparison" aria-label="Selected model specifications">
          {models
            .filter((m) => selected.includes(m.id))
            .map((model) => (
              <article key={model.id}>
                <Link
                  href={`/models/${model.id}`}
                  className="text-base font-medium hover:text-accent"
                >
                  {model.name} ↗
                </Link>
                <p
                  className={
                    modelContext(model).value ? "market-profile-number" : "market-muted mt-4"
                  }
                >
                  {tokenSize(modelContext(model).value)}
                </p>
                <p className="market-muted">{modelContext(model).label} tokens</p>
                <p className="market-muted mt-4">
                  Max output {tokenSize(modelSpecifications(model)?.maxOutputTokens)}
                </p>
                <p className="market-muted mt-2">
                  {modelCapabilities(model).join(" · ") || "Capabilities on model page"}
                </p>
              </article>
            ))}
        </section>
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
                  {model.kind === "release" && (
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
                  {model.developerName ?? "Model release"} ·{" "}
                  {model.kind === "family" ? "Family name" : (model.lifecycle ?? "Release")}
                </p>
                {modelSpecifications(model) && (
                  <p className="market-model-spec-line">
                    {modelContext(model).value
                      ? `${tokenSize(modelContext(model).value)} ${modelContext(model).label}`
                      : ""}
                    {modelContext(model).value && modelCapabilities(model).length ? " · " : ""}
                    {modelCapabilities(model).slice(0, 2).join(" · ")}
                  </p>
                )}
              </div>
              {rate ? (
                (["input", "output", "cacheRead"] as const).map((key, i) => (
                  <div key={key}>
                    <p className="market-muted">{["Input", "Output", "Cache read"][i]}</p>
                    <p className={rate ? "market-rate" : "market-muted"}>
                      {rate ? priceNumber(rate.rates[key]) : "See details"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="market-model-price-context">
                  <p className="market-kicker mb-2">Pricing context</p>
                  <p className="market-muted">
                    {model.pricingNote?.split(/(?<=[.!?])\s+(?=[A-Z])/u)[0] ??
                      (model.kind === "family"
                        ? "Choose an exact release to inspect its pricing."
                        : "See available plans and provider pricing details.")}
                  </p>
                </div>
              )}
              <div>
                <p className="market-muted">
                  {[
                    model.places.some((p) => p.kind === "api") ? "Published API" : undefined,
                    model.planIds.length ? `${model.planIds.length} documented plans` : undefined,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "View access details"}
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
