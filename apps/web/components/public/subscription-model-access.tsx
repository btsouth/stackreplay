"use client";

import Link from "next/link";
import { useState } from "react";
import type { SubscriptionAccess } from "@/lib/subscription-access";

/** Product lineup, including named models that have no Replay route yet. */
export function SubscriptionModelAccess({ access }: { access: SubscriptionAccess }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const count = new Set(access.groups.flatMap((group) => group.models.map((model) => model.name)))
    .size;
  return (
    <div data-testid="subscription-model-access">
      <p className="market-muted max-w-3xl mb-5">{access.summary}</p>
      {count > 12 && (
        <label className="block max-w-lg mb-5 text-sm">
          Find a model in this plan
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Model name…"
            className="mt-2 min-h-11 w-full border border-border bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
        </label>
      )}
      {access.groups.map((group) => {
        const matches = group.models.filter((model) =>
          model.name.toLowerCase().includes(query.toLowerCase().trim()),
        );
        if (query.trim() && !matches.length) return null;
        const visible = query.trim() || expanded ? matches : matches.slice(0, 12);
        return (
          <section key={group.label} className="border-t border-border py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
              <h3 className="font-medium text-base">
                {group.label}
                {group.models.length ? (
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {matches.length}
                  </span>
                ) : null}
              </h3>
              <a
                href={group.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="market-link text-sm"
              >
                Provider lineup ↗
              </a>
            </div>
            {group.note && <p className="market-muted mb-3 max-w-3xl">{group.note}</p>}
            <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((model) => (
                <li key={model.name} className="min-w-0 border-b border-border/60 py-3 text-sm">
                  {model.modelId ? (
                    <Link href={`/models/${model.modelId}`} className="hover:text-accent">
                      {model.name}
                    </Link>
                  ) : (
                    <span>{model.name}</span>
                  )}
                  {model.note && (
                    <span className="mt-1 block text-xs text-muted-foreground">{model.note}</span>
                  )}
                </li>
              ))}
            </ul>
            {matches.length > visible.length && (
              <button
                type="button"
                className="market-link mt-3 min-h-11"
                onClick={() => setExpanded(true)}
              >
                Show all {matches.length} models ↓
              </button>
            )}
          </section>
        );
      })}
      {query.trim() &&
        !access.groups.some((group) =>
          group.models.some((model) =>
            model.name.toLowerCase().includes(query.toLowerCase().trim()),
          ),
        ) && (
          <p role="status" className="py-5 text-muted-foreground">
            No published model matches that name on this plan.
          </p>
        )}
      <p className="market-muted mt-4">
        Model access checked {access.checkedAt}. Named access does not establish how much of that
        model a plan includes or a predictable usage allowance.
      </p>
    </div>
  );
}
