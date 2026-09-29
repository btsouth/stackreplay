"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ModelPriceComparison } from "@/components/public/model-price-comparison";
import { ModelTable } from "@/components/public/model-table";
import { PromoTag } from "@/components/public/promo-tag";
import type { ModelPrices } from "@/lib/market-discovery";
import { basePrice, priceNumber } from "@/lib/market-prices";
import { type ModelLayout, modelLibrarySearch, readModelLibraryUrl } from "@/lib/model-layout";
import {
  defaultSortDirection,
  developerOptions,
  hasPublishedApiPrice,
  isIncludedInSubscription,
  type ModelLibraryView,
  type ModelSortKey,
  matchesDeveloper,
  modelsInView,
  type SortDirection,
  searchModels,
  sortDirectionLabels,
  sortModels,
} from "@/lib/model-library";
import {
  modelCapabilities,
  modelContext,
  modelSpecifications,
  tokenSize,
} from "@/lib/model-specifications";
import type { PublicModelSummary } from "@/lib/public-catalog";

const SORT_OPTIONS: readonly [ModelSortKey, string][] = [
  ["featured", "Featured first"],
  ["name", "Model name"],
  ["input", "Input price"],
  ["output", "Output price"],
  ["cacheRead", "Cache read price"],
  ["context", "Context window"],
  ["maxOutput", "Max output"],
  ["plans", "Most plans"],
];
const CAPABILITIES = [
  "Reasoning",
  "Tool calling",
  "Vision",
  "Audio input",
  "Video input",
  "Structured output",
] as const;
const sortDirection = (key: string) => defaultSortDirection(key as ModelSortKey);

export function ModelExplorer({
  models,
  prices = {},
  planCounts = {},
}: {
  models: readonly PublicModelSummary[];
  prices?: Record<string, ModelPrices[]>;
  planCounts?: Record<string, number>;
}) {
  const [view, setView] = useState<ModelLibraryView>("models");
  // Undefined until the URL is read: both layouts render and the root layout's
  // bootstrap script decides which one shows, so the static page never flashes.
  const [layout, setLayout] = useState<ModelLayout>();
  const pending = (part: ModelLayout) => (layout === undefined ? part : undefined);
  const [capability, setCapability] = useState("all");
  const [developer, setDeveloper] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ModelSortKey>("featured");
  const [direction, setDirection] = useState<SortDirection>("ascending");
  const [inSubscription, setInSubscription] = useState(false);
  const [withApiPrice, setWithApiPrice] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const developers = useMemo(
    () => developerOptions(models.filter((m) => m.kind === "release")),
    [models],
  );
  // Apply a shared URL before first paint, then release the bootstrap marks.
  useLayoutEffect(() => {
    const state = readModelLibraryUrl(window.location.search, {
      developers: developers.map((d) => d.id),
      capabilities: [...CAPABILITIES, "long-context"],
      sorts: SORT_OPTIONS.map(([id]) => id),
      defaultDirection: sortDirection,
    });
    setLayout(state.layout);
    setQuery(state.query);
    setView(state.tab);
    setDeveloper(state.developer);
    setCapability(state.capability);
    setSort(state.sort as ModelSortKey);
    setDirection(state.direction);
    setInSubscription(state.included);
    setWithApiPrice(state.priced);
    document.documentElement.removeAttribute("data-model-layout");
    document.documentElement.removeAttribute("data-model-filters");
  }, [developers]);
  // Keep the URL shareable as the view changes, without adding history entries.
  useEffect(() => {
    if (layout === undefined) return;
    const search = modelLibrarySearch(
      {
        layout,
        query,
        tab: view,
        developer,
        capability,
        sort,
        direction,
        included: inSubscription,
        priced: withApiPrice,
      },
      sortDirection,
    );
    const next = `${window.location.pathname}${search}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`)
      window.history.replaceState(window.history.state, "", next);
  }, [layout, query, view, developer, capability, sort, direction, inSubscription, withApiPrice]);
  const facts = useMemo(() => ({ prices, planCounts }), [prices, planCounts]);
  const visible = useMemo(() => {
    const list = (query.trim() ? searchModels(models, query) : modelsInView(models, view)).filter(
      (m) =>
        matchesDeveloper(m, developer) &&
        (!inSubscription || isIncludedInSubscription(m, facts)) &&
        (!withApiPrice || hasPublishedApiPrice(m, facts)) &&
        (capability === "all" ||
          (capability === "long-context"
            ? (modelContext(m).value ?? 0) >= 1_000_000
            : modelCapabilities(m).includes(capability))),
    );
    // A search keeps its relevance order until another order is chosen.
    if (sort === "featured" && query.trim()) return list;
    return sortModels(list, sort, direction, facts);
  }, [
    models,
    view,
    query,
    developer,
    capability,
    sort,
    direction,
    inSubscription,
    withApiPrice,
    facts,
  ]);
  const changeSort = (key: ModelSortKey, next: SortDirection = defaultSortDirection(key)) => {
    setSort(key);
    setDirection(next);
  };
  const directionLabels = sortDirectionLabels(sort);
  return (
    <div data-model-results>
      <ModelPriceComparison models={models} prices={prices} selected={selected} />
      <div className="market-section-title">
        <span>02 / Explore models</span>
        <span>
          {modelsInView(models, "models").length} models · {modelsInView(models, "legacy").length}{" "}
          legacy
        </span>
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
            {CAPABILITIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
            <option value="long-context">1M+ input / context</option>
          </select>
        </label>
        <label>
          Order by
          <select value={sort} onChange={(e) => changeSort(e.target.value as ModelSortKey)}>
            {SORT_OPTIONS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Direction
          <select
            value={directionLabels ? direction : "fixed"}
            disabled={!directionLabels}
            onChange={(e) => setDirection(e.target.value as SortDirection)}
            data-testid="model-sort-direction"
          >
            {directionLabels ? (
              (["ascending", "descending"] as const).map((id) => (
                <option key={id} value={id}>
                  {directionLabels[id]}
                </option>
              ))
            ) : (
              <option value="fixed">Fixed order</option>
            )}
          </select>
        </label>
        <fieldset className="market-filter-checks">
          <legend>Access</legend>
          <label>
            <input
              type="checkbox"
              checked={inSubscription}
              onChange={(e) => setInSubscription(e.target.checked)}
            />
            Included in a subscription
          </label>
          <label>
            <input
              type="checkbox"
              checked={withApiPrice}
              onChange={(e) => setWithApiPrice(e.target.checked)}
            />
            Published API price
          </label>
        </fieldset>
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
        <div className="flex w-full items-center justify-between gap-x-5 gap-y-2 pb-2 sm:w-auto sm:justify-end sm:pb-0">
          <p role="status" className="market-muted min-w-0">
            {visible.length} {query ? "matches" : "models"}
            {layout !== "table" && visible.length > 0 && (
              <span data-layout-pending={pending("cards")}> · Select up to 4 to compare rates</span>
            )}
          </p>
          <fieldset
            className="market-layout-toggle shrink-0"
            data-layout-pending={layout === undefined || undefined}
          >
            <legend className="sr-only">Layout</legend>
            <div>
              {(
                [
                  ["cards", "Cards"],
                  ["table", "Table"],
                ] as const
              ).map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={layout === id}
                  data-layout={id}
                  data-testid={`model-layout-${id}`}
                  onClick={() => setLayout(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
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
      {visible.length === 0 && (
        <div className="py-10" data-testid="model-empty">
          <p>No models match these filters.</p>
          <button
            type="button"
            className="market-link"
            onClick={() => {
              setQuery("");
              setDeveloper("all");
              setCapability("all");
              setInSubscription(false);
              setWithApiPrice(false);
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      {layout !== "cards" && visible.length > 0 && (
        <div data-layout-pending={pending("table")}>
          <ModelTable
            models={visible}
            facts={facts}
            sort={sort}
            direction={direction}
            onSort={changeSort}
          />
        </div>
      )}
      {layout !== "table" && (
        <div data-testid="model-table" data-layout-pending={pending("cards")}>
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
                    <PromoTag promotion={rate?.promotion} />
                  </div>
                  <p className="market-muted mt-1">
                    {model.developerName ?? "Model release"}
                    {model.kind === "family"
                      ? " · Family name"
                      : model.lifecycle === "legacy"
                        ? " · Legacy"
                        : ""}
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
                    {model.places.some((p) => p.kind === "api") ? "Published API" : undefined}
                    {model.places.some((p) => p.kind === "api") && planCounts[model.id]
                      ? " · "
                      : undefined}
                    {planCounts[model.id] ? (
                      <Link
                        href={`/models/${model.id}#where-to-use`}
                        className="underline-offset-4 hover:text-accent hover:underline"
                        data-testid="model-plan-count"
                      >
                        In {planCounts[model.id]} {planCounts[model.id] === 1 ? "plan" : "plans"}
                      </Link>
                    ) : undefined}
                    {!model.places.some((p) => p.kind === "api") && !planCounts[model.id]
                      ? "View access details"
                      : undefined}
                  </p>
                  <Link href={`/models/${model.id}`} className="market-link">
                    Explore model <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {layout !== "table" && visible.length > 12 && (
        <button
          type="button"
          className="market-link my-4"
          data-layout-pending={pending("cards")}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show fewer models ↑" : `Show all ${visible.length} models ↓`}
        </button>
      )}
    </div>
  );
}
