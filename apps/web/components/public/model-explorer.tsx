"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { lifecycleText, verificationText } from "@/lib/catalog-copy";
import {
  developerOptions,
  type ModelLibraryView,
  matchesDeveloper,
  modelsInView,
  placesSummary,
  searchModels,
} from "@/lib/model-library";
import type { PublicModelSummary } from "@/lib/public-catalog";

const VIEWS: readonly { id: ModelLibraryView; label: string }[] = [
  { id: "models", label: "Models" },
  { id: "legacy", label: "Legacy" },
  { id: "identity", label: "Aliases and identity" },
];

const DEFAULT_ROWS = 12;

const toggleClass =
  "min-h-11 border border-border-strong px-3 text-sm text-foreground hover:border-accent aria-pressed:border-accent aria-pressed:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring";

function ModelMeta({ model }: { model: PublicModelSummary }) {
  if (model.kind === "family") {
    return (
      <p className="mt-1 text-sm text-muted-foreground">
        Family name{model.developerName === undefined ? "" : ` · ${model.developerName}`}
      </p>
    );
  }
  const status = lifecycleText(model.lifecycle);
  return (
    <p className="mt-1 text-sm text-muted-foreground">
      {model.developerName ?? "Developer not recorded"}
      {status === undefined ? "" : ` · ${status}`}
    </p>
  );
}

function ModelWhere({
  model,
  nameOf,
}: {
  model: PublicModelSummary;
  nameOf: (id: string) => string;
}) {
  if (model.kind === "family") {
    const [first, ...rest] = model.releaseIds;
    return (
      <p className="mt-2 text-sm text-foreground">
        {first === undefined
          ? "No release in the catalog names this family yet."
          : `Points to releases such as ${nameOf(first)}${rest.length === 0 ? "" : ` and ${rest.length} more`}.`}
      </p>
    );
  }
  const { labels, more } = placesSummary(model);
  return (
    <p className="mt-2 text-sm text-foreground">
      {labels.length === 0
        ? "No catalogued plan or API offers this model yet."
        : `${labels.join(" · ")}${more === 0 ? "" : ` · +${more} more ${more === 1 ? "place" : "places"}`}`}
    </p>
  );
}

export function ModelExplorer({ models }: { models: readonly PublicModelSummary[] }) {
  const [view, setView] = useState<ModelLibraryView>("models");
  const [developer, setDeveloper] = useState("all");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const developers = useMemo(
    () => developerOptions(models.filter((model) => model.kind === "release")),
    [models],
  );
  const nameOf = useMemo(() => {
    const names = new Map(models.map((model) => [model.id, model.name]));
    return (id: string) => names.get(id) ?? id;
  }, [models]);

  const searching = query.trim().length > 0;
  const visible = useMemo(
    () =>
      (searching ? searchModels(models, query) : modelsInView(models, view)).filter((model) =>
        matchesDeveloper(model, developer),
      ),
    [models, view, developer, query, searching],
  );
  const familyExamples = useMemo(
    () =>
      modelsInView(models, "identity")
        .slice(0, 2)
        .map((model) => model.name),
    [models],
  );
  const displayed = searching || showAll ? visible : visible.slice(0, DEFAULT_ROWS);
  const noun =
    view === "identity" && !searching
      ? visible.length === 1
        ? "family name"
        : "family names"
      : visible.length === 1
        ? "model"
        : "models";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 border-y border-border-strong py-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Show
          </p>
          <fieldset className="mt-2 flex flex-wrap gap-2">
            <legend className="sr-only">Choose which records to list</legend>
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={!searching && view === item.id}
                onClick={() => {
                  setView(item.id);
                  setQuery("");
                  setShowAll(false);
                }}
                className={toggleClass}
                data-testid={`model-view-${item.id}`}
              >
                {item.label}
              </button>
            ))}
          </fieldset>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Developer
            </p>
            <fieldset className="mt-2 flex flex-wrap gap-2">
              <legend className="sr-only">Filter models by developer</legend>
              <button
                type="button"
                aria-pressed={developer === "all"}
                onClick={() => setDeveloper("all")}
                className={toggleClass}
              >
                All
              </button>
              {developers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={developer === item.id}
                  onClick={() => setDeveloper(item.id)}
                  className={toggleClass}
                >
                  {item.name}
                </button>
              ))}
            </fieldset>
          </div>
          <label className="flex flex-col gap-2 text-xs text-muted-foreground">
            Find a model, family name or exact alias
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Claude Opus, opus, gpt-5.6"
              className="min-h-11 w-full border border-control-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            />
          </label>
        </div>
      </div>

      {view === "identity" && !searching ? (
        <p className="max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
          {familyExamples.length === 0
            ? "Family names"
            : `Family names such as ${familyExamples.join(" or ")}`}{" "}
          are not models of their own. Tools and plans use them to mean whichever release they point
          to at the time. StackReplay keeps them so workloads and plans that use them still resolve.
          Exact aliases and route IDs are listed on each model page, and search matches them too.
        </p>
      ) : null}

      <p className="font-mono text-xs text-muted-foreground" role="status">
        {searching
          ? `${visible.length} ${visible.length === 1 ? "match" : "matches"} across models, legacy models and family names`
          : `${displayed.length} of ${visible.length} ${noun} shown`}
      </p>

      <div className="divide-y divide-border border-t border-border" data-testid="model-table">
        {displayed.map((model) => (
          <article
            key={model.id}
            className="grid gap-x-7 gap-y-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
            data-testid="model-row"
            data-model-kind={model.kind}
          >
            <div className="min-w-0">
              <h2 className="text-base font-medium text-foreground">
                <Link href={`/models/${model.id}`} className="hover:text-accent hover:underline">
                  {model.name}
                </Link>
              </h2>
              <ModelMeta model={model} />
              <ModelWhere model={model} nameOf={nameOf} />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 sm:flex-col sm:items-end sm:gap-1">
              <p className="text-xs text-muted-foreground">
                {verificationText(model.verificationStatus, model.lastVerifiedAt)}
              </p>
              <Link
                href={`/models/${model.id}`}
                className="inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4"
              >
                Inspect model<span className="sr-only">: {model.name}</span> →
              </Link>
            </div>
          </article>
        ))}
      </div>
      {displayed.length < visible.length ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="min-h-11 self-start border border-border-strong px-4 text-sm text-foreground hover:border-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          Show all {visible.length} {noun}
        </button>
      ) : null}
      {visible.length === 0 ? (
        <p className="py-5 text-sm text-muted-foreground">
          Nothing matches. Try another developer, or search for an exact model ID or alias.
        </p>
      ) : null}
    </div>
  );
}
