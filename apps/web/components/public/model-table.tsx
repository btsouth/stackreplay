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

const COLUMNS = {
  model: { label: "Model", sort: "name" },
  developer: { label: "Developer" },
  input: { label: "Input", unit: "$/1M", sort: "input", numeric: true },
  output: { label: "Output", unit: "$/1M", sort: "output", numeric: true },
  cacheRead: { label: "Cache read", unit: "$/1M", sort: "cacheRead", numeric: true },
  context: { label: "Context", unit: "tokens", sort: "context", numeric: true },
  maxOutput: { label: "Max output", unit: "tokens", sort: "maxOutput", numeric: true },
  reasoning: { label: "Reasoning" },
  plans: { label: "Included in", unit: "plans", sort: "plans", numeric: true },
} as const satisfies Record<string, Column>;

/** The column name a reader hears and, in stacked rows, sees beside each value. */
const heading = (column: Column) => (column.unit ? `${column.label} ${column.unit}` : column.label);

const notPublished = <span className="market-muted">Not published</span>;

function Cell({ column, children }: { column: Column; children: ReactNode }) {
  return (
    <td data-numeric={column.numeric || undefined}>
      <span className="market-table-label">{heading(column)}</span>
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
          {Object.values(COLUMNS).map((column: Column) => {
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
                  <>
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
                    {/* Stacked rows hide the sort buttons (the Order by and Direction
                        controls sort there); the header keeps its name for screen readers. */}
                    <span className="market-table-heading">{heading(column)}</span>
                  </>
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
              <Cell column={COLUMNS.developer}>{model.developerName ?? notPublished}</Cell>
              <Cell column={COLUMNS.input}>{rate("input")}</Cell>
              <Cell column={COLUMNS.output}>{rate("output")}</Cell>
              <Cell column={COLUMNS.cacheRead}>{rate("cacheRead")}</Cell>
              <Cell column={COLUMNS.context}>
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
              <Cell column={COLUMNS.maxOutput}>
                {specifications?.maxOutputTokens === undefined
                  ? notPublished
                  : tokenSize(specifications.maxOutputTokens)}
              </Cell>
              <Cell column={COLUMNS.reasoning}>
                {specifications?.reasoning === undefined
                  ? notPublished
                  : specifications.reasoning
                    ? "Yes"
                    : "No"}
              </Cell>
              <Cell column={COLUMNS.plans}>{facts.planCounts[model.id] ?? 0}</Cell>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
