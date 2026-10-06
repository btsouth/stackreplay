"use client";
import {
  type BenchmarkData,
  type BenchmarkDefinition,
  type BenchmarkObservation,
  benchmarkCategories,
  benchmarkEdition,
  benchmarkName,
  comparisonSets,
  evidenceLabel,
  frontierModelIds,
  observationId,
} from "@stackreplay/benchmarks";
import { PageHeader, Select } from "@stackreplay/ui";
import Link from "next/link";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { CatalogSelect } from "@/components/public/catalog-select";
import {
  type BenchmarkExport,
  benchmarkEvidenceSummary,
  buildBenchmarkExport,
  resolveBenchmarkView,
} from "@/lib/benchmark-export";
import { benchmarkSourceDate } from "@/lib/benchmark-source-date";
import { type BenchmarkState, benchmarkUrl, parseBenchmarkState } from "@/lib/benchmark-state";

const BenchmarkImageDialog = lazy(() =>
  import("./benchmark-image-dialog").then((module) => ({ default: module.BenchmarkImageDialog })),
);

export interface BenchmarkModel {
  id: string;
  name: string;
  developer: string;
}
/** Only observations establish score coverage, not a source's model list. */
export function reportedModelIds(data: BenchmarkData, models: readonly BenchmarkModel[]): string[] {
  const scored = new Set(data.sourceSets.flatMap((set) => set.observations.map((o) => o.modelId)));
  return models.filter((model) => scored.has(model.id)).map((model) => model.id);
}

/** Explicit recovery uses this edition and clears incompatible source/observation pins. */
export function reportedScoresSelection(
  data: BenchmarkData,
  models: readonly BenchmarkModel[],
): Partial<BenchmarkState> {
  const scored = reportedModelIds(data, models);
  const preset = frontierModelIds.filter((id) => scored.includes(id));
  return {
    modelIds: [...preset, ...scored.filter((id) => !preset.includes(id))].slice(0, 6),
    coverage: "all",
    category: "all",
    sourceSetId: undefined,
    observationIds: [],
  };
}

const epochGpqaDefinitionId = "epoch-gpqa-diamond-revision-unreported";

/**
 * Epoch's exact labels stay stored, exported and disclosed unchanged.
 * This compact projection applies only to its admitted GPQA comparison cells.
 */
export function benchmarkComparisonDisplayValue(
  definition: BenchmarkDefinition,
  observation: BenchmarkObservation,
) {
  if (
    definition.id !== epochGpqaDefinitionId ||
    definition.unit !== "percent" ||
    definition.decimalPlaces !== 1 ||
    observation.evaluator !== "Epoch AI" ||
    observation.evidenceClass !== "independent_evaluation"
  )
    return observation.displayValue;

  return `${observation.value.toFixed(definition.decimalPlaces)}%`;
}

const date = (s: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${s}T12:00:00Z`),
  );
export function BenchmarkEvidence({
  data,
  observation,
}: {
  data: BenchmarkData;
  observation: BenchmarkObservation;
}) {
  const set = data.sourceSets.find((s) => s.id === observation.sourceSetId);
  if (!set) throw new Error("Unknown observation source");
  return (
    <div className="bench-evidence">
      <p className="bench-source-label">
        {set.evaluator} · {benchmarkSourceDate(set)} · {evidenceLabel(set.evidenceClass)}
      </p>
      <dl>
        <div>
          <dt>Reporting source</dt>
          <dd>
            {set.evaluator} · {set.title}
          </dd>
        </div>
        <div>
          <dt>Evaluation origin</dt>
          <dd>
            {observation.originLabel} (
            {observation.evaluationOrigin === "reporter_computed"
              ? "source-computed"
              : observation.evaluationOrigin === "external_result_reported"
                ? "republished result"
                : "evaluation runner not reported"}
            )
          </dd>
        </div>
        {[
          ["Effort", observation.effort],
          ["Harness", observation.harness],
          ["Tools", observation.tools],
          ["Fallback", observation.fallback],
          ["Provider", observation.provider],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value ?? "Not reported"}</dd>
          </div>
        ))}
        <div>
          <dt>Checked</dt>
          <dd>{date(observation.checkedAt)}</dd>
        </div>
      </dl>
      {observation.notes && <p>{observation.notes}</p>}
      {observation.uncertainty && <p>{observation.uncertainty}</p>}
      <p>
        <a href={set.methodologyUrl} target="_blank" rel="noreferrer">
          Original methodology ↗
        </a>{" "}
        ·{" "}
        <a href={observation.sourceUrl} target="_blank" rel="noreferrer">
          Original evidence ↗
        </a>
      </p>
    </div>
  );
}
export function BenchmarkExplorer({
  data: currentData,
  editions,
  models,
  initial,
}: {
  data: BenchmarkData;
  editions: Record<string, BenchmarkData>;
  models: BenchmarkModel[];
  initial: BenchmarkState;
}) {
  const [state, setState] = useState(initial);
  const imageExportButton = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false);
  const [imageExport, setImageExport] = useState<{
    payload: BenchmarkExport;
    state: BenchmarkState;
  } | null>(null);
  const editionData = Object.hasOwn(editions, state.edition) ? editions[state.edition] : undefined;
  const data = editionData ?? currentData;
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<{
    definition: BenchmarkDefinition;
    modelId?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const completeSets = comparisonSets(data);
  useEffect(() => {
    setReady(true);
    const pop = () =>
      setState(
        parseBenchmarkState(
          new URLSearchParams(location.search),
          models.map((m) => m.id),
        ),
      );
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [models]);
  useEffect(() => {
    if (detail) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [detail]);
  function change(patch: Partial<BenchmarkState>) {
    const next = { ...state, error: undefined, ...patch };
    setState(next);
    setCopied(false);
    window.history.pushState(null, "", benchmarkUrl(next));
  }
  const { rows, visible, error } = resolveBenchmarkView(editionData, state);
  const source = data.sourceSets.find((s) => s.id === state.sourceSetId);
  const selectedModels = state.modelIds
    .map((id) => models.find((m) => m.id === id))
    .filter((m): m is BenchmarkModel => Boolean(m));
  const scoredModels = editionData ? reportedModelIds(editionData, models) : [];
  const unscoredModels = editionData
    ? selectedModels.filter((model) => !scoredModels.includes(model.id))
    : [];
  const evidence = benchmarkEvidenceSummary(data, visible);
  const presentSources = evidence.sources;
  const visibleSource = presentSources.length === 1 ? presentSources[0] : undefined;
  const checkedAt = evidence.checkedDates.at(-1);
  const activeRow = detail ? rows.find((r) => r.definition.id === detail.definition.id) : undefined;
  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(benchmarkUrl(state), location.origin).href);
      setCopied(true);
    } catch {
      window.history.replaceState(null, "", benchmarkUrl(state));
    }
  }
  function download() {
    if (error) return;
    const payload = buildBenchmarkExport({ editions, models, state, origin: location.origin });
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `stackreplay-benchmarks-${state.edition}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    // Leave the URL alive until the browser has started consuming the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="bench-page">
      {imageExport?.state === state && (
        <Suspense fallback={<p role="status">Preparing image preview…</p>}>
          <BenchmarkImageDialog
            payload={imageExport.payload}
            onClose={() => {
              setImageExport(null);
              imageExportButton.current?.focus();
            }}
          />
        </Suspense>
      )}
      <header className="market-header bench-header">
        <div>
          <PageHeader
            eyebrow="The evidence, in context"
            title="Model benchmarks"
            description="Choose models to explore their reported results. Every score keeps its exact test version, source and evaluation setup."
          />
          <p className="bench-source-label">
            {error ? "Evidence unavailable for this selection." : evidence.line}
          </p>
        </div>
        <aside className="bench-source-card">
          <p className="market-kicker">{source ? "Source sheet" : "Reviewed evidence"}</p>
          <h2>
            {error
              ? "Evidence unavailable"
              : presentSources.length > 1
                ? "Multiple sources"
                : (visibleSource?.evaluator ?? "No evidence in this view")}
          </h2>
          <p>
            {error
              ? "Choose a valid comparison"
              : (visibleSource?.title ?? "Compare the models you choose")}
          </p>
          <p>
            {!error && visibleSource && `${benchmarkSourceDate(visibleSource)} · `}
            {!error && checkedAt
              ? `Latest check ${date(checkedAt)}`
              : "No visible evidence to summarize"}
          </p>
          <div className="bench-card-counts">
            <span>
              <strong>{selectedModels.length}</strong> models
            </span>
            <span>
              <strong>{visible.length}</strong>{" "}
              {state.coverage === "shared" ? "shared" : "reported"} benchmarks
            </span>
          </div>
          <a href="#benchmark-methodology">Methodology & sources ↓</a>
        </aside>
      </header>
      <div className="bench-toolbar">
        <div className="bench-edition">
          <span className="market-muted">Evidence edition</span>
          <Select
            label="Evidence edition"
            placeholder="Select evidence edition"
            value={state.edition}
            options={Object.keys(editions).map((id) => ({ value: id, label: id }))}
            onValueChange={(edition) =>
              change({ edition, sourceSetId: undefined, observationIds: [] })
            }
          />
        </div>
        <fieldset className="bench-selection" aria-label="Selected benchmark models">
          {selectedModels.map((m) => (
            <button
              type="button"
              key={m.id}
              disabled={state.modelIds.length === 1 || Boolean(source)}
              aria-label={`Remove ${m.name}`}
              onClick={() =>
                change({
                  modelIds: state.modelIds.filter((id) => id !== m.id),
                  observationIds: state.observationIds.filter((id) => !id.endsWith(`.${m.id}`)),
                })
              }
            >
              {m.name} <span aria-hidden="true">×</span>
            </button>
          ))}
        </fieldset>
        <button
          type="button"
          className="bench-text-button"
          onClick={() =>
            change({
              modelIds: [...frontierModelIds],
              sourceSetId: undefined,
              observationIds: [],
              edition: benchmarkEdition,
              coverage: "all",
            })
          }
        >
          Frontier preset
        </button>
        <button type="button" className="bench-text-button" onClick={copy}>
          {copied ? "Link copied" : "Copy comparison link"}
        </button>
        <button
          type="button"
          className="bench-text-button"
          onClick={download}
          disabled={!ready || Boolean(error)}
          aria-describedby={error ? "benchmark-selection-error" : undefined}
        >
          Download JSON
        </button>
        <button
          type="button"
          className="bench-text-button"
          ref={imageExportButton}
          aria-haspopup="dialog"
          onClick={() => {
            if (!error)
              setImageExport({
                payload: buildBenchmarkExport({ editions, models, state, origin: location.origin }),
                state,
              });
          }}
          disabled={!ready || Boolean(error)}
          aria-describedby={error ? "benchmark-selection-error" : undefined}
        >
          Export images
        </button>
      </div>
      {!source && (
        <details className="bench-picker">
          <summary>
            Add or change models <span className="market-muted">Up to six</span>
          </summary>
          <label>
            Find a model
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="DeepSeek, Sonnet, Grok…"
            />
          </label>
          <div className="bench-picker-options">
            {models
              .filter((m) =>
                `${m.name} ${m.developer}`
                  .toLowerCase()
                  .replace(/[^\p{L}\p{N}]+/gu, "")
                  .includes(search.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")),
              )
              .map((m) => (
                <label key={m.id}>
                  <input
                    type="checkbox"
                    checked={state.modelIds.includes(m.id)}
                    disabled={
                      (!state.modelIds.includes(m.id) && state.modelIds.length === 6) ||
                      (state.modelIds.includes(m.id) && state.modelIds.length === 1)
                    }
                    onChange={(e) =>
                      change({
                        modelIds: e.target.checked
                          ? [...state.modelIds, m.id]
                          : state.modelIds.filter((id) => id !== m.id),
                        observationIds: [],
                      })
                    }
                  />
                  <span>
                    {m.name}
                    <small>
                      {m.developer} ·{" "}
                      {!editionData
                        ? "Coverage unknown for this edition"
                        : error
                          ? "Coverage unavailable for this selection"
                          : scoredModels.includes(m.id)
                            ? "Evidence available"
                            : "No verified scores yet"}
                    </small>
                  </span>
                </label>
              ))}
          </div>
        </details>
      )}
      <div className="bench-view-controls">
        <fieldset className="market-tabs" aria-label="Benchmark coverage">
          {(["all", "shared"] as const).map((c) => (
            <button
              type="button"
              key={c}
              aria-pressed={state.coverage === c}
              onClick={() => change({ coverage: c })}
            >
              {c === "all" ? "All reported results" : "Shared benchmarks"}
            </button>
          ))}
        </fieldset>
        <div className="bench-source-views">
          {source && (
            <button
              type="button"
              onClick={() => change({ sourceSetId: undefined, observationIds: [] })}
            >
              Compare selected models
            </button>
          )}
          {completeSets.map((s) => (
            <button
              type="button"
              key={s.id}
              aria-pressed={source?.id === s.id}
              onClick={() =>
                change({
                  sourceSetId: s.id,
                  modelIds: [...s.modelIds],
                  observationIds: [],
                  coverage: "shared",
                  category: "all",
                })
              }
            >
              {s.evaluator} source sheet ↗
            </button>
          ))}
        </div>
      </div>
      <fieldset className="bench-categories" aria-label="Benchmark categories">
        <button
          type="button"
          aria-pressed={state.category === "all"}
          onClick={() => change({ category: "all" })}
        >
          All {rows.length}
        </button>
        {benchmarkCategories.map((c) => (
          <button
            type="button"
            key={c.id}
            aria-pressed={state.category === c.id}
            onClick={() => change({ category: c.id })}
          >
            {c.label}
          </button>
        ))}
      </fieldset>
      {!error && (
        <p className="bench-table-guide">
          Scores verified against original reports, not independently reproduced. Select a score for
          its setup and evidence.
          {!source && " Shared benchmarks appear first."} Highlighted: highest reported score, or
          lowest where lower is better. Setups may differ.
        </p>
      )}
      {!error && visible.some((row) => row.definition.id === epochGpqaDefinitionId) && (
        <p className="bench-table-guide bench-epoch-rounding-note">
          Epoch scores are rounded to one decimal here. Open a score or download JSON for exact
          values.
        </p>
      )}
      {error ? (
        <section className="bench-empty" aria-labelledby="benchmark-empty-title">
          <h2 id="benchmark-empty-title">Comparison unavailable</h2>
          <p id="benchmark-selection-error" role="alert">
            {error}
          </p>
          <p>
            No benchmark coverage is asserted for this selection. Your selected models remain
            unchanged.
          </p>
          <button
            type="button"
            className="market-link"
            disabled={!ready}
            onClick={() =>
              change({
                edition: benchmarkEdition,
                ...reportedScoresSelection(currentData, models),
              })
            }
          >
            Show current edition with reported scores
          </button>
        </section>
      ) : visible.length > 0 ? (
        <section
          className="bench-table-scroll"
          tabIndex={0}
          aria-label="Benchmark comparison table. Scroll horizontally to see all models."
        >
          <table className="bench-table">
            <caption className="sr-only">
              {source ? `${source.evaluator} ${source.title}` : "Selected model benchmark evidence"}
              . Different evaluation setups are identified per row. Missing scores are not reported.
            </caption>
            <thead>
              <tr>
                <th scope="col">Benchmark</th>
                {selectedModels.map((m) => (
                  <th scope="col" key={m.id}>
                    <Link href={`/models/${m.id}`}>{m.name}</Link>
                    <span>{m.developer}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.definition.id} data-benchmark-id={row.definition.id}>
                  <th scope="row">
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => setDetail({ definition: row.definition })}
                    >
                      {benchmarkName(row.definition)}
                    </button>
                    <span>
                      {benchmarkCategories.find((c) => c.id === row.definition.category)?.label}
                    </span>
                    <small>
                      {row.setup === "matched"
                        ? "Matched evaluation setup"
                        : "Different or unreported setups"}
                    </small>
                  </th>
                  {row.cells.map((cell) => {
                    const displayValue = cell.observation
                      ? benchmarkComparisonDisplayValue(row.definition, cell.observation)
                      : null;
                    return (
                      <td
                        key={cell.modelId}
                        data-model-id={cell.modelId}
                        data-highlighted={row.highestModelIds.includes(cell.modelId) || undefined}
                      >
                        {cell.observation ? (
                          <button
                            type="button"
                            className="bench-score"
                            aria-haspopup="dialog"
                            aria-label={`${benchmarkName(row.definition)}, ${models.find((m) => m.id === cell.modelId)?.name}, ${displayValue}${row.highestModelIds.includes(cell.modelId) ? `, ${row.definition.higherIsBetter ? "highest" : "lowest"} reported score in this view` : ""}. View evidence.`}
                            onClick={() =>
                              setDetail({ definition: row.definition, modelId: cell.modelId })
                            }
                          >
                            {displayValue}
                            <sup aria-hidden="true">
                              {data.sourceSets.findIndex(
                                (s) => s.id === cell.observation?.sourceSetId,
                              ) + 1}
                            </sup>
                          </button>
                        ) : (
                          <span className="bench-not-reported">Not reported</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="bench-empty">
          <h2>
            No{" "}
            {state.category !== "all"
              ? "matching "
              : state.coverage === "shared"
                ? "shared "
                : "reported "}
            benchmarks for this selection.
          </h2>
          <p>
            {unscoredModels.length > 0
              ? `${unscoredModels.map((model) => model.name).join(", ")}: no reported scores in this edition. Your models stay selected until you choose another selection.`
              : "Your models stay selected. View all reported results or change the category to explore available evidence."}
          </p>
          <button
            type="button"
            className="market-link"
            disabled={!ready}
            onClick={() =>
              change(
                unscoredModels.length > 0
                  ? reportedScoresSelection(data, models)
                  : { coverage: "all", category: "all" },
              )
            }
          >
            {unscoredModels.length > 0
              ? "Show models with reported scores"
              : "View all reported results →"}
          </button>
        </div>
      )}
      {!error && !source && unscoredModels.length > 0 && (
        <p className="bench-coverage-note">
          {unscoredModels.map((m) => m.name).join(", ")}: no reported scores in this edition. These
          models remain selected until you choose another selection.
        </p>
      )}
      <section
        id="benchmark-methodology"
        className="bench-methodology"
        aria-labelledby="benchmark-methodology-title"
      >
        <div className="market-section-title">
          <h2 id="benchmark-methodology-title">Methodology & sources</h2>
          <span>{editionData ? state.edition : "Requested edition unavailable"}</span>
        </div>
        <p>
          Benchmark versions, metrics and task subsets remain distinct. Different efforts, tools,
          harnesses, fallbacks or deployments can produce different results. We do not normalize
          scores or calculate a composite rating. Highlighting identifies each row’s highest
          reported value, or lowest for lower-is-better metrics, including every tie. It does not
          establish matching evaluation setups or an overall model ranking.
        </p>
        <details>
          <summary>How results are selected and verified</summary>
          <p>
            We check each numerical result against the original publication and retain its date and
            configuration. A source marker identifies the reporting organization, which can differ
            from the model developer and the original evaluator. Google’s reviewed launch snapshot
            stays primary where it has a result. OpenAI’s launch defaults use Max effort
            consistently, including benchmarks where High scores higher. Otherwise we use the sole
            verified provider observation. Selection never maximizes a score. Alternative
            observations are available by selecting a cell and are pinned in your comparison link.
          </p>
          <p>
            Shared benchmarks requires a reported result for every selected model. All reported
            results shows explicit coverage gaps. Complete source sheets require every declared
            model × benchmark cell. Changes to benchmark evidence have no effect on pricing, plan
            terms or model identity.
          </p>
        </details>
        {(editionData?.sourceSets ?? []).map((s, i) => (
          <details key={s.id}>
            <summary>
              <span className="bench-source-number">{i + 1}</span> {s.evaluator} · {s.title} ·{" "}
              {benchmarkSourceDate(s)}
            </summary>
            <p className="bench-source-label">
              {evidenceLabel(s.evidenceClass)} ·{" "}
              {s.modelIds.map((id) => models.find((m) => m.id === id)?.name).join(", ")}
            </p>
            <p>{s.methodologySummary}</p>
            <ul>
              {s.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p>
              <a href={s.methodologyUrl} target="_blank" rel="noreferrer">
                Original methodology ↗
              </a>{" "}
              ·{" "}
              <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                Original source ↗
              </a>
            </p>
            <p>
              {s.evaluator} · {s.title}. {s.redistribution.rationale} Checked{" "}
              {date(s.redistribution.checkedAt)}.{" "}
              <a href={s.redistribution.termsUrl} target="_blank" rel="noreferrer">
                Redistribution terms ↗
              </a>
            </p>
          </details>
        ))}
      </section>
      <dialog
        ref={dialog}
        className="bench-dialog"
        aria-labelledby="benchmark-detail-title"
        onClose={() => setDetail(null)}
      >
        <button
          type="button"
          className="bench-dialog-close"
          onClick={() => dialog.current?.close()}
        >
          Close ×
        </button>
        {detail && (
          <>
            <p className="market-kicker">Benchmark evidence</p>
            <h2 id="benchmark-detail-title">{benchmarkName(detail.definition)}</h2>
            <p>{detail.definition.description}</p>
            <p className="bench-definition-meta">
              Version: {detail.definition.version ?? "Not reported"} · {detail.definition.metric} ·{" "}
              {detail.definition.unit} · {detail.definition.higherIsBetter ? "Higher" : "Lower"} is
              better · {benchmarkCategories.find((c) => c.id === detail.definition.category)?.label}
            </p>
            <p>Task subset: {detail.definition.taskSubset ?? "Not separately specified"}</p>
            {activeRow?.cells
              .filter((c) => !detail.modelId || c.modelId === detail.modelId)
              .map((cell) => (
                <section key={cell.modelId}>
                  <h3>{models.find((m) => m.id === cell.modelId)?.name}</h3>
                  {cell.observation ? (
                    <>
                      <p className="bench-detail-score">{cell.observation.displayValue}</p>
                      <p className="market-muted">{cell.selectionReason}</p>
                      <BenchmarkEvidence data={data} observation={cell.observation} />
                      {cell.alternatives.length > 1 && (
                        <div className="catalog-control bench-alternatives">
                          Reported results
                          <CatalogSelect
                            label={`Reported result for ${models.find((m) => m.id === cell.modelId)?.name}`}
                            portalContainer={dialog.current}
                            value={observationId(cell.observation)}
                            onChange={(e) =>
                              change({
                                observationIds: [
                                  ...state.observationIds.filter(
                                    (id) =>
                                      !id.endsWith(`.${detail.definition.id}.${cell.modelId}`),
                                  ),
                                  e.target.value,
                                ],
                              })
                            }
                          >
                            {cell.alternatives.map((o) => (
                              <option key={observationId(o)} value={observationId(o)}>
                                {o.displayValue} ·{" "}
                                {data.sourceSets.find((s) => s.id === o.sourceSetId)?.evaluator}
                                {o.effort && ` · ${o.effort}`}
                              </option>
                            ))}
                          </CatalogSelect>
                        </div>
                      )}
                    </>
                  ) : (
                    <p>Not reported in this evidence edition.</p>
                  )}
                </section>
              ))}
          </>
        )}
      </dialog>
    </div>
  );
}
