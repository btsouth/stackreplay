"use client";

import { useEffect, useState } from "react";
import type {
  PublishedTermsTable,
  SubscriptionPublishedTerms,
} from "@/lib/subscription-published-terms";

export function PublishedUsageTable({ table }: { table: PublishedTermsTable }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const matches = table.rows.filter((row) =>
    row[0]?.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const visible = query.trim() || all ? matches : matches.slice(0, 8);
  return (
    <div className="my-4" data-testid={`published-${table.id}`}>
      <p className="mb-4 max-w-4xl text-sm text-muted-foreground">{table.note}</p>
      {table.rows.length > 8 && (
        <label className="mb-4 block max-w-md text-sm">
          Find in {table.title.toLowerCase()}
          <input
            type="search"
            disabled={!ready}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-2 min-h-11 w-full border border-border bg-background px-3 text-foreground"
            placeholder="Model or client name"
          />
        </label>
      )}
      <dl className="divide-y divide-border sm:hidden" aria-label={table.title}>
        {visible.map((row) => (
          <div key={row.join("|")} className="py-4">
            <dt className="font-medium text-sm">{row[0]}</dt>
            <dd className={`mt-3 ${row.length > 2 ? "grid grid-cols-2 gap-x-5 gap-y-3" : ""}`}>
              {row.slice(1).map((cell, index) => (
                <div key={table.columns[index + 1]}>
                  <span className="block text-xs text-muted-foreground">
                    {table.columns[index + 1]}
                  </span>
                  <span className="mt-1 block break-words text-sm tabular-nums">{cell}</span>
                </div>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <section className="hidden overflow-x-auto sm:block" tabIndex={0} aria-label={table.title}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {table.columns.map((column) => (
                <th key={column} scope="col" className="px-3 py-3 font-medium first:pl-0">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.join("|")} className="border-b border-border/60">
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th
                      key={table.columns[index]}
                      scope="row"
                      className="min-w-36 py-3 pr-3 font-normal"
                    >
                      {cell}
                    </th>
                  ) : (
                    <td key={table.columns[index]} className="px-3 py-3 tabular-nums">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {!matches.length && (
        <p role="status" className="py-4 text-sm">
          No matching published entry.
        </p>
      )}
      {matches.length > visible.length && (
        <button
          type="button"
          disabled={!ready}
          className="market-link mt-3 min-h-11"
          onClick={() => setAll(true)}
        >
          Show all {matches.length} entries ↓
        </button>
      )}
      <a
        href={table.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="market-link mt-3 block text-xs"
      >
        Official table ↗
      </a>
    </div>
  );
}
export function PublishedSubscriptionTerms({ terms }: { terms: SubscriptionPublishedTerms }) {
  return (
    <div data-testid="published-subscription-terms">
      <p className="mb-6 max-w-4xl text-xl leading-relaxed">{terms.allowanceSummary}</p>
      {terms.tables?.map((table, index) => (
        <details
          key={table.id}
          open={index === 0 || undefined}
          className="border-t border-border py-2"
        >
          <summary className="min-h-11 cursor-pointer content-center text-base font-medium">
            {table.title}
          </summary>
          <PublishedUsageTable table={table} />
        </details>
      ))}
      <dl className="mt-6 border-t border-border">
        {terms.terms.map((term) => (
          <div
            key={term.label}
            className="grid gap-3 border-b border-border py-5 md:grid-cols-[16rem_1fr]"
          >
            <dt className="font-medium">{term.label}</dt>
            <dd className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {term.value}{" "}
              <a
                href={term.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="market-link whitespace-nowrap"
              >
                Source ↗
              </a>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Published terms checked {terms.checkedAt}. Provider terms can change.
      </p>
    </div>
  );
}
