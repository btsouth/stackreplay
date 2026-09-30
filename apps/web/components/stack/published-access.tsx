"use client";

import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import type { buildMyStack } from "@/lib/my-stack";

type Access = NonNullable<ReturnType<typeof buildMyStack>["targets"][number]["access"]>;

/** Published access stays compact until the person chooses to inspect it. */
export function PublishedAccess({
  access,
  planName,
  testId,
}: {
  access: Access;
  planName: string;
  testId?: string | undefined;
}) {
  const [query, setQuery] = useState("");
  const models = access.models.filter((model) =>
    model.name.toLocaleLowerCase("en-US").includes(query.trim().toLocaleLowerCase("en-US")),
  );
  return (
    <details
      className="stack-access"
      data-testid={testId}
      onToggle={(event) => {
        if (!event.currentTarget.open) setQuery("");
      }}
    >
      <summary>
        <span>Published model access · {access.modelCount} models</span>
        <ChevronDown aria-hidden="true" className="stack-disclosure-icon size-4" />
      </summary>
      <div className="stack-access-body">
        <p>{access.summary}</p>
        <label className="stack-model-search">
          <Search aria-hidden="true" className="size-4 shrink-0" />
          <span className="sr-only">Search models in {planName}</span>
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
            aria-label={`Published models in ${planName}`}
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
          Reviewed {access.checkedAt}. Published access does not establish exact capacity.
        </p>
      </div>
    </details>
  );
}
