"use client";

import Link from "next/link";
import { useState } from "react";
import { PromoTag } from "@/components/public/promo-tag";
import type { ModelPrices } from "@/lib/market-discovery";
import { basePrice, priceNumber } from "@/lib/market-prices";
import { FEATURED_ALTERNATIVE_MODELS, FEATURED_MODEL_PAIRS } from "@/lib/model-library";
import type { PublicModelSummary } from "@/lib/public-catalog";

const CATEGORIES = [
  ["output", "Output"],
  ["input", "Input"],
  ["cacheRead", "Cache read"],
] as const;
type Metric = (typeof CATEGORIES)[number][0];

export function ModelPriceComparison({
  models,
  prices,
  selected,
}: {
  models: readonly PublicModelSummary[];
  prices: Record<string, ModelPrices[]>;
  selected: readonly string[];
}) {
  const [metric, setMetric] = useState<Metric>("output");
  const label = CATEGORIES.find(([id]) => id === metric)?.[1] ?? "Output";
  const modelById = new Map(models.map((model) => [model.id, model]));
  const rate = (id: string) => basePrice(prices[id] ?? [])?.rates[metric];
  const amount = (id: string) => Number(rate(id) ?? -1);
  const selectedModels = selected
    .filter((id) => modelById.has(id))
    .toSorted((a, b) => amount(b) - amount(a));
  const pairs = FEATURED_MODEL_PAIRS.filter((pair) =>
    pair.every((id) => modelById.has(id)),
  ).toSorted((a, b) => Math.max(...b.map(amount)) - Math.max(...a.map(amount)));
  const alternatives = FEATURED_ALTERNATIVE_MODELS.filter((id) => modelById.has(id)).toSorted(
    (a, b) => amount(b) - amount(a),
  );
  const shown = selected.length ? selectedModels : [...pairs.flat(), ...alternatives];
  const max = Math.max(0, ...shown.map(amount));
  const bar = (id: string) => {
    const model = modelById.get(id);
    if (!model) return null;
    const value = rate(id);
    return (
      <Link key={id} href={`/models/${id}`} className="market-price-bar" data-model-id={id}>
        <span className="market-price-bar-name">
          {model.name}
          <PromoTag promotion={basePrice(prices[id] ?? [])?.promotion} />
        </span>
        <span className="market-price-bar-value">
          {value === undefined ? "See details" : priceNumber(value)}
        </span>
        <span className="market-price-bar-track" aria-hidden="true">
          {value !== undefined && (
            <span
              className="market-price-bar-fill block"
              style={{ width: `${max > 0 ? (Number(value) / max) * 100 : 0}%` }}
            />
          )}
        </span>
      </Link>
    );
  };

  return (
    <section aria-label="Published API rates" className="market-price-comparison">
      <div className="market-section-title">
        <span>01 / Published API rates</span>
        <span>USD per million tokens</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="market-tabs" aria-label="Price category">
          {CATEGORIES.map(([id, name]) => (
            <button
              key={id}
              type="button"
              aria-pressed={metric === id}
              onClick={() => setMetric(id)}
            >
              {name}
            </button>
          ))}
        </fieldset>
        <p className="market-muted">Shorter bar = lower {label.toLowerCase()} price</p>
      </div>
      <div className="market-price-guide">
        <p>
          {selected.length
            ? "Your comparison · highest price first"
            : "Claude & OpenAI · higher-priced pairs first"}
        </p>
        <p data-testid="price-chart-scale">
          {max > 0
            ? `Shared scale: $0 to $${max.toLocaleString("en-US", { maximumFractionDigits: 4 })}`
            : "No numeric rates in this comparison"}
        </p>
      </div>
      <fieldset aria-label={`${metric} price comparison`} className="market-price-bars">
        {selected.length ? (
          <div className="market-price-selection">{selectedModels.map(bar)}</div>
        ) : (
          <>
            <div className="market-price-column-labels" aria-hidden="true">
              <span>Anthropic / Claude</span>
              <span>OpenAI / GPT</span>
            </div>
            {pairs.map((pair) => (
              <div key={pair[0]} className="market-price-pair" data-testid="price-comparison-pair">
                {pair.map(bar)}
              </div>
            ))}
            <div className="market-price-alternatives">
              <p className="market-kicker">More coding models · highest price first</p>
              {alternatives.map(bar)}
            </div>
          </>
        )}
      </fieldset>
      <details className="market-price-notes">
        <summary>About these prices & pairings</summary>
        <p>
          Bars show the selected token price on one shared scale. Pair rows are ordered by the
          higher price in each pair. Pairings are editorial comparisons, not claims of equal
          capability or measured popularity.
        </p>
        <p>
          Current published base rates; context tiers, time-based rates and cache-write duration can
          change the price. Inspect each model for conditions and sources. Missing rates are not
          zero.
        </p>
      </details>
    </section>
  );
}
