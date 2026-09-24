"use client";

import type { BundledTargetModel } from "@stackreplay/catalog/bundled";
import { useId } from "react";
import {
  type ModelMapping,
  type SourceModel,
  type SubstituteChoice,
  substituteChoices,
  type WorkloadModels,
} from "./translation-model";

export {
  compatibility,
  type ModelMapping,
  type SourceModel,
  type SubstituteChoice,
  substituteChoices,
  type TargetSelection,
  targetModels,
  translationPolicy,
  type WorkloadModels,
  workloadModels,
} from "./translation-model";

/**
 * Translated Replay: an explicit, user-built model substitution scenario.
 *
 * Exact replay answers "what does this target do with the models I used". When
 * the target does not run those models, that answer is "nothing", which is
 * true and useless for the question the person is asking: what happens if I
 * move this workload over. Translation is the honest way to ask it: the person
 * chooses which of the target's models takes each observed model's demand, the
 * chronology stays real, and the result is labelled as a scenario everywhere.
 *
 * Nothing here maps a model automatically, ranks models or calls two models
 * equivalent. A row starts unmapped (or on its own model, when the target
 * serves it), and every substitution is one the person picked.
 */

const COUNT = new Intl.NumberFormat("en-US");

export function TranslationEntry({
  targetName,
  workload,
  unserved,
  unservedEvents,
  totalEvents,
  open,
  onOpen,
}: {
  targetName: string;
  workload: WorkloadModels;
  unserved: readonly SourceModel[];
  unservedEvents: number;
  totalEvents: number;
  open: boolean;
  onOpen: () => void;
}) {
  const all = unserved.length === workload.sources.length;
  return (
    <div
      className="flex min-w-0 flex-col gap-3 border-l-2 border-accent bg-surface-2/60 px-4 py-4"
      data-testid="translation-required"
      role="status"
    >
      <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
        {all
          ? "This target requires model substitution"
          : "Part of this workload needs a substitution"}
      </p>
      <p className="max-w-prose text-sm leading-relaxed">
        {targetName} does not run{" "}
        {unserved
          .slice(0, 4)
          .map((source) => source.name)
          .join(", ")}
        {unserved.length > 4 ? ` and ${unserved.length - 4} more` : ""}, which carried{" "}
        {COUNT.format(unservedEvents)} of {COUNT.format(totalEvents)} recorded events. An exact
        replay reports that demand as unavailable. To simulate moving the workload, choose which{" "}
        {targetName} models should handle it.
      </p>
      {open ? null : (
        <button
          type="button"
          className="min-h-11 self-start text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          onClick={onOpen}
          data-testid="configure-translation"
        >
          Configure translated replay →
        </button>
      )}
    </div>
  );
}

export function TranslationEditor({
  targetName,
  workload,
  available,
  mapping,
  onChange,
  apiTarget,
}: {
  targetName: string;
  workload: WorkloadModels;
  available: readonly BundledTargetModel[];
  mapping: ModelMapping;
  onChange: (mapping: ModelMapping) => void;
  apiTarget: boolean;
}) {
  const allId = useId();
  // Serving is decided by every model the target runs, family aliases included;
  // the options offered as substitutes are the concrete releases.
  const serves = new Set(available.filter((model) => model.available).map((model) => model.id));
  const choices = substituteChoices(available);
  const unserved = workload.sources.filter((source) => !serves.has(source.modelId));
  const mappedEvents = workload.sources.reduce((sum, source) => {
    const target = mapping[source.modelId];
    return target !== undefined && target !== "" && target !== source.modelId
      ? sum + source.events
      : sum;
  }, 0);
  const unresolvedEvents = workload.unresolved.reduce((sum, model) => sum + model.events, 0);

  const optionLabel = (model: SubstituteChoice) =>
    apiTarget && model.priced !== true ? `${model.label} (no list price in force)` : model.label;

  return (
    <section
      aria-labelledby={`${allId}-heading`}
      className="flex min-w-0 flex-col gap-5 border border-border bg-surface px-4 py-5 sm:px-5"
      data-testid="translation-editor"
    >
      <div className="flex flex-col gap-1.5">
        <p className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
          Translated replay
        </p>
        <h3 id={`${allId}-heading`} className="text-lg font-medium">
          Choose which {targetName} models handle your recorded demand
        </h3>
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          Target models are user-selected scenario substitutions, not claims of model quality
          equivalence. Your chronology, sessions and bursts stay exactly as recorded.
        </p>
      </div>

      {unserved.length > 1 && choices.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <label
            className="flex min-w-0 flex-col gap-1 text-muted-foreground"
            htmlFor={`${allId}-all`}
          >
            Send every unavailable model to
            <select
              id={`${allId}-all`}
              defaultValue=""
              className="min-h-11 w-full max-w-xs rounded-md border border-control-border bg-surface px-2 text-sm text-foreground sm:min-h-9"
              data-testid="translation-apply-all"
              onChange={(event) => {
                const target = event.target.value;
                if (target === "") return;
                const next: Record<string, string> = { ...mapping };
                for (const source of unserved) next[source.modelId] = target;
                onChange(next);
                event.target.value = "";
              }}
            >
              <option value="">Choose one model…</option>
              {choices.map((model) => (
                <option key={model.id} value={model.id}>
                  {optionLabel(model)}
                </option>
              ))}
            </select>
          </label>
          <span className="pb-2.5 text-muted-foreground">
            A convenience for a single-model scenario. You can still change each row.
          </span>
        </div>
      ) : null}

      <table className="w-full text-sm" data-testid="translation-table">
        <caption className="sr-only">Observed models and the target model each replays as</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-normal" scope="col">
              Observed
            </th>
            <th className="hidden py-2 pr-3 text-right font-normal sm:table-cell" scope="col">
              Events
            </th>
            <th className="py-2 font-normal" scope="col">
              Replay as
            </th>
          </tr>
        </thead>
        <tbody>
          {workload.sources.map((source) => {
            const servedAsIs = serves.has(source.modelId);
            const value = mapping[source.modelId] ?? (servedAsIs ? source.modelId : "");
            const selectId = `${allId}-${source.modelId}`;
            return (
              <tr
                key={source.modelId}
                className="border-b border-border align-top"
                data-testid="translation-row"
              >
                <th className="py-3 pr-3 text-left font-normal" scope="row">
                  <label htmlFor={selectId} className="flex flex-col">
                    <span>{source.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      <span className="sm:hidden">{COUNT.format(source.events)} events · </span>
                      {servedAsIs ? `${targetName} runs this model` : "not run by this target"}
                    </span>
                  </label>
                </th>
                <td className="hidden py-3 pr-3 text-right font-mono tabular-nums sm:table-cell">
                  {COUNT.format(source.events)}
                </td>
                <td className="py-3">
                  <select
                    id={selectId}
                    value={value}
                    data-testid={`translation-select-${source.modelId}`}
                    className={`min-h-11 w-full min-w-0 max-w-sm rounded-md border bg-surface px-2 text-sm sm:min-h-9 ${
                      value === ""
                        ? "border-warning/70 text-muted-foreground"
                        : value === source.modelId
                          ? "border-control-border"
                          : "border-accent"
                    }`}
                    onChange={(event) => {
                      const next: Record<string, string> = { ...mapping };
                      next[source.modelId] = event.target.value;
                      onChange(next);
                    }}
                  >
                    {servedAsIs ? (
                      <option value={source.modelId}>Same model (exact)</option>
                    ) : (
                      <option value="">Leave unmapped (reported unavailable)</option>
                    )}
                    {choices
                      .filter((model) => model.id !== source.modelId)
                      .map((model) => (
                        <option key={model.id} value={model.id}>
                          {optionLabel(model)}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <dl className="grid gap-4 text-xs sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="font-mono tracking-[0.12em] text-muted-foreground uppercase">
            Model routing
          </dt>
          <dd data-testid="translation-routing">
            {COUNT.format(mappedEvents)} events substituted
            {unserved.some((source) => (mapping[source.modelId] ?? "") === "")
              ? ` · ${COUNT.format(
                  unserved
                    .filter((source) => (mapping[source.modelId] ?? "") === "")
                    .reduce((sum, source) => sum + source.events, 0),
                )} left unmapped`
              : ""}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-mono tracking-[0.12em] text-muted-foreground uppercase">
            Usage assumption
          </dt>
          <dd data-testid="translation-assumption">
            Recorded usage magnitude is preserved across the selected model substitution. Actual
            target-model token use could differ.
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-mono tracking-[0.12em] text-muted-foreground uppercase">
            Unresolved identities
          </dt>
          <dd>
            {workload.unresolved.length === 0
              ? "None: every observed identifier resolved."
              : `${COUNT.format(workload.unresolved.length)} ${workload.unresolved.length === 1 ? "ID" : "IDs"} (${COUNT.format(unresolvedEvents)} events) have no established model, so they cannot be mapped and stay unknown.`}
          </dd>
        </div>
      </dl>
    </section>
  );
}
