"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { basePrice, priceNumber } from "@/lib/market-prices";
import {
  defaultSortDirection,
  type ModelFacts,
  type ModelSortKey,
  type SortDirection,
} from "@/lib/model-library";
import { modelContext, modelSpecifications, tokenSize } from "@/lib/model-specifications";
import type { PublicModelSummary } from "@/lib/public-catalog";

interface Column {
  label: string;
  unit?: string;
  sort?: ModelSortKey;
  numeric?: boolean;
}

const COLUMNS: readonly Column[] = [
  { label: "Model", sort: "name" },
  { label: "Developer" },
  { label: "Input", unit: "$/1M", sort: "input", numeric: true },
  { label: "Output", unit: "$/1M", sort: "output", numeric: true },
  { label: "Cache read", unit: "$/1M", sort: "cacheRead", numeric: true },
  { label: "Context", unit: "tokens", sort: "context", numeric: true },
  { label: "Max output", unit: "tokens", sort: "maxOutput", numeric: true },
  { label: "Reasoning" },
  { label: "Plans", sort: "plans", numeric: true },
];

const notPublished = <span className="market-muted">Not published</span>;

function Cell({
  label,
  numeric,
  children,
}: {
  label: string;
  numeric?: boolean;
  children: ReactNode;
}) {
  return (
    <td data-numeric={numeric || undefined}>
      <span className="market-table-label">{label}</span>
      {children}
    </td>
  );
}

/** One dense row per model. Values come from the same records as the cards and model pages. */
export function ModelTable({
  models,
  facts,
  sort,
  direction,
  onSort,
}: {
  models: readonly PublicModelSummary[];
  facts: ModelFacts;
  sort: ModelSortKey;
  direction: SortDirection;
  onSort: (key: ModelSortKey, direction: SortDirection) => void;
}) {
  return (
    <table className="market-table" data-testid="model-data-table">
      <caption className="sr-only">
        Models with published API list prices in US dollars per million tokens, token limits,
        reasoning support and the number of catalogued plans that include each one. Each model page
        lists its sources and check dates.
      </caption>
      <thead>
        <tr>
          {COLUMNS.map((column) => {
            const key = column.sort;
            const active = key !== undefined && key === sort;
            return (
              <th
                key={column.label}
                scope="col"
                aria-sort={key === undefined ? undefined : active ? direction : "none"}
                data-numeric={column.numeric || undefined}
              >
                {key === undefined ? (
                  column.label
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onSort(
                        key,
                        active
                          ? direction === "ascending"
                            ? "descending"
                            : "ascending"
                          : defaultSortDirection(key),
                      )
                    }
                  >
                    {column.label}
                    {column.unit && <span className="market-table-unit">{column.unit}</span>}
                    <span aria-hidden="true" className="market-table-arrow">
                      {active ? (direction === "ascending" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {models.map((model) => {
          const rates = basePrice(facts.prices[model.id] ?? [])?.rates;
          const specifications = modelSpecifications(model);
          const context = modelContext(model);
          const rate = (key: "input" | "output" | "cacheRead") =>
            rates?.[key] === undefined ? notPublished : priceNumber(rates[key]);
          return (
            <tr key={model.id} data-testid="model-table-row" data-model-id={model.id}>
              <th scope="row">
                <Link href={`/models/${model.id}`}>{model.name}</Link>
                {model.lifecycle === "legacy" && <span className="market-muted"> · Legacy</span>}
              </th>
              <Cell label="Developer">{model.developerName ?? notPublished}</Cell>
              <Cell label="Input $/1M" numeric>
                {rate("input")}
              </Cell>
              <Cell label="Output $/1M" numeric>
                {rate("output")}
              </Cell>
              <Cell label="Cache read $/1M" numeric>
                {rate("cacheRead")}
              </Cell>
              <Cell label="Context tokens" numeric>
                {context.value === undefined ? (
                  notPublished
                ) : (
                  <>
                    {context.label === "max input" && (
                      <span className="market-muted">max input </span>
                    )}
                    {tokenSize(context.value)}
                  </>
                )}
              </Cell>
              <Cell label="Max output tokens" numeric>
                {specifications?.maxOutputTokens === undefined
                  ? notPublished
                  : tokenSize(specifications.maxOutputTokens)}
              </Cell>
              <Cell label="Reasoning">
                {specifications?.reasoning === undefined
                  ? notPublished
                  : specifications.reasoning
                    ? "Yes"
                    : "No"}
              </Cell>
              <Cell label="Included in plans" numeric>
                {facts.planCounts[model.id] ?? 0}
              </Cell>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
