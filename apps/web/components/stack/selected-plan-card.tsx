"use client";

import { BookOpen, ChevronDown, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { type buildMyStack, publishedPriceText } from "@/lib/my-stack";

type Target = ReturnType<typeof buildMyStack>["targets"][number];

/** Published access stays compact until the person chooses to inspect it. */
export function SelectedPlanCard({
  target,
  disabled,
  onRemove,
  onEdit,
}: {
  target: Target;
  disabled: boolean;
  onRemove: () => void;
  onEdit?: ((trigger: HTMLButtonElement) => void) | undefined;
}) {
  const [query, setQuery] = useState("");
  const models =
    target.access?.models.filter((model) =>
      model.name.toLocaleLowerCase("en-US").includes(query.trim().toLocaleLowerCase("en-US")),
    ) ?? [];
  return (
    <article className="stack-target" data-testid={`stack-target-${target.id}`}>
      <div className="stack-target-heading">
        <span className="stack-eyebrow">
          {target.kind === "api" ? "API target" : "Selected plan"}
        </span>
        {!target.available ? <span className="stack-badge">Unlisted</span> : null}
      </div>
      <h3>{target.name}</h3>
      <p className="stack-target-price">
        {target.publishedPrice ? (
          <>
            <span>Published price:</span>
            <strong>{publishedPriceText(target.publishedPrice)}</strong>
          </>
        ) : target.kind === "api" && target.available ? (
          <>
            <span>Published pricing</span>
            <strong className="stack-variable-price">Billed by usage</strong>
          </>
        ) : (
          <span>Current catalog facts unavailable</span>
        )}
      </p>
      {target.access ? (
        <details
          className="stack-access"
          onToggle={(event) => {
            if (!event.currentTarget.open) setQuery("");
          }}
        >
          <summary>
            <BookOpen aria-hidden="true" className="size-4" />
            <span>Published model access · {target.access.modelCount} models</span>
            <ChevronDown aria-hidden="true" className="stack-disclosure-icon size-4" />
          </summary>
          <div className="stack-access-body">
            <p>{target.access.summary}</p>
            <label className="stack-model-search">
              <Search aria-hidden="true" className="size-4 shrink-0" />
              <span className="sr-only">Search models in {target.name}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a model…"
              />
            </label>
            <p className="stack-caption" aria-live="polite">
              {models.length} {models.length === 1 ? "listed entry" : "listed entries"}
              {query.trim() ? " matching your search" : " · route variants shown separately"}
            </p>
            {models.length > 0 ? (
              <section
                className="stack-model-list"
                aria-label={`Published models in ${target.name}`}
                // biome-ignore lint/a11y/noNoninteractiveTabindex: A bounded scroll region must be keyboard-scrollable.
                tabIndex={0}
              >
                <ul>
                  {models.map((model) => (
                    <li key={`${model.modelId ?? model.name}:${model.variant ?? "default"}`}>
                      <span>{model.name}</span>
                      {model.note ? <small>{model.note}</small> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="stack-caption">No matching entries in this published lineup.</p>
            )}
            <p className="stack-caption">
              Reviewed {target.access.checkedAt}. Published access does not establish exact
              capacity.
            </p>
          </div>
        </details>
      ) : null}
      {!target.available ? (
        <p className="stack-caption">
          Your selection is preserved. Update it when you know your current plan.
        </p>
      ) : null}
      <div className="stack-target-actions">
        {onEdit ? (
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => onEdit(event.currentTarget)}
            aria-label={`Edit ${target.name}`}
            className="stack-link"
          >
            <Pencil aria-hidden="true" className="size-3.5" /> Edit plan
          </button>
        ) : target.kind === "plan" ? (
          <Link
            href="/app/settings#manual-plans"
            aria-label={`Edit ${target.name}`}
            className="stack-link"
          >
            <Pencil aria-hidden="true" className="size-3.5" /> Edit plan
          </Link>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label={`Remove ${target.name}`}
          className="stack-quiet-action"
        >
          <Trash2 aria-hidden="true" className="size-3.5" /> Remove
        </button>
      </div>
      {target.kind === "plan" && target.available ? (
        <Link
          href={`/plans/${encodeURIComponent(target.id)}`}
          className="stack-caption stack-facts-link"
        >
          View published plan facts →
        </Link>
      ) : null}
    </article>
  );
}
